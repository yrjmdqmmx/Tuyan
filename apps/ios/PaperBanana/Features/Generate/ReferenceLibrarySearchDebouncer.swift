import Foundation

/// Keeps transient search edits from reaching the gallery API and treats every
/// cancelled edit as expected control flow rather than a user-facing failure.
@MainActor
final class ReferenceLibrarySearchDebouncer<Value> {
  static var delay: Duration { .milliseconds(320) }

  private let sleep: (Duration) async throws -> Void
  private var task: Task<Void, Never>?

  init(sleep: @escaping (Duration) async throws -> Void = { try await Task.sleep(for: $0) }) {
    self.sleep = sleep
  }

  func schedule(
    _ value: Value,
    operation: @escaping (Value) async throws -> Void,
    onError: @escaping (Error) -> Void
  ) {
    task?.cancel()
    let sleep = self.sleep
    task = Task { [weak self] in
      do {
        try await sleep(Self.delay)
        try Task.checkCancellation()
        try await operation(value)
        try Task.checkCancellation()
      } catch is CancellationError {
        // Replaced input and dismissed sheets are normal cancellation paths.
      } catch {
        guard !Task.isCancelled else { return }
        onError(error)
      }
      self?.task = nil
    }
  }

  func cancel() {
    task?.cancel()
    task = nil
  }
}

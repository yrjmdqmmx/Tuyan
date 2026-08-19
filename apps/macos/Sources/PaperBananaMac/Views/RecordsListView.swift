import SwiftUI

struct RecordsListView: View {
  @ObservedObject var model: AppModel

  var body: some View {
    VStack(spacing: 0) {
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text("任务记录")
            .font(.title2)
            .fontWeight(.semibold)
          Text(model.currentUser == nil ? "登录后从 Sealos 读取账号任务记录。" : "当前账号最近提交的生成任务。")
            .foregroundStyle(.secondary)
        }
        Spacer()
        Button {
          Task { await model.loadUserJobs(silent: false) }
        } label: {
          Label("刷新", systemImage: "arrow.clockwise")
        }
        .disabled(model.currentUser == nil || model.recordsLoading)
      }
      .padding(20)

      Divider()

      if model.currentUser == nil {
        ContentUnavailableView {
          Label("需要登录", systemImage: "person.crop.circle.badge.exclamationmark")
        } description: {
          Text("任务记录由 Sealos auth-gateway 保护，需要登录后读取。")
        } actions: {
          Button("登录 / 注册") {
            model.isAuthSheetPresented = true
          }
        }
      } else if model.recordsLoading {
        ProgressView("正在加载任务记录")
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      } else if !model.recordsError.isEmpty {
        ContentUnavailableView("无法加载记录", systemImage: "exclamationmark.triangle", description: Text(model.recordsError))
      } else if model.userJobs.isEmpty {
        ContentUnavailableView("暂无记录", systemImage: "tray", description: Text("这个账号还没有提交过生成任务。"))
      } else {
        List(selection: $model.selectedRecordID) {
          ForEach(model.userJobs) { job in
            JobRecordRow(job: job)
              .tag(job.id)
          }
        }
        .listStyle(.inset)
      }
    }
    .background(PaperWorkspaceBackground().ignoresSafeArea())
    .task {
      if model.currentUser != nil, model.userJobs.isEmpty {
        await model.loadUserJobs(silent: true)
      }
    }
  }
}

struct JobRecordRow: View {
  let job: Job

  var body: some View {
    HStack(spacing: 10) {
      Image(systemName: systemImage)
        .foregroundStyle(.secondary)
        .frame(width: 18)

      VStack(alignment: .leading, spacing: 3) {
        Text(job.title)
          .lineLimit(1)
        HStack(spacing: 8) {
          Text("任务来源：\(job.clientPlatformDisplayName)")
          Text(job.provider.ifEmpty("未知平台"))
          Text(job.mainModelDisplayName.ifEmpty("主模型未知"))
          Text(job.imageModelDisplayName.ifEmpty("图像模型未知"))
          Text(job.createdAt)
        }
        .font(.caption)
        .foregroundStyle(.secondary)
        .lineLimit(1)

        if job.statusKind == .failed, !job.failureText.isEmpty {
          Label(job.formattedFailureText, systemImage: "exclamationmark.triangle")
            .font(.caption)
            .foregroundStyle(.red)
            .lineLimit(2)
        }
      }

      Spacer()
      StatusBadge(status: job.statusKind)
    }
    .padding(.vertical, 4)
  }

  private var systemImage: String {
    switch job.statusKind {
    case .succeeded: "checkmark.circle"
    case .failed: "xmark.circle"
    case .running: "clock"
    case .queued: "hourglass"
    case .unknown: "questionmark.circle"
    }
  }
}

private extension String {
  func ifEmpty(_ fallback: String) -> String {
    isEmpty ? fallback : self
  }
}

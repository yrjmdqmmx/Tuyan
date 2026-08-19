import SwiftUI

struct JobDetailView: View {
  @ObservedObject var model: AppModel
  let job: Job?

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        if let job {
          HStack {
            VStack(alignment: .leading, spacing: 5) {
              Text(job.title)
                .font(.title3)
                .fontWeight(.semibold)
                .lineLimit(2)
              Text(job.id)
                .font(.caption)
                .foregroundStyle(.secondary)
                .textSelection(.enabled)
            }
            Spacer()
            StatusBadge(status: job.statusKind)
          }

          Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 8) {
            detailRow("任务来源", job.clientPlatformDisplayName)
            detailRow("模型平台", job.provider)
            detailRow("信息图类别", job.infographicCategory)
            detailRow("主模型", job.mainModelDisplayName)
            detailRow("图像模型", job.imageModelDisplayName)
            detailRow("生成流程", job.pipelineMode)
            detailRow("画面比例", job.aspectRatio)
            detailRow("候选图数量", "\(job.numCandidates)")
          }
          .padding(14)
          .paperGlass(cornerRadius: 16)

          if job.statusKind == .failed, !job.failureText.isEmpty {
            VStack(alignment: .leading, spacing: 6) {
              Label("失败原因", systemImage: "exclamationmark.triangle")
                .font(.headline)
              Text(job.formattedFailureText)
                .foregroundStyle(.red)
                .textSelection(.enabled)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .paperGlass(cornerRadius: 16)
          }

          if !job.methodContent.isEmpty {
            Text("论文方法内容")
              .font(.headline)
            Text(job.methodContent)
              .textSelection(.enabled)
              .frame(maxWidth: .infinity, alignment: .leading)
              .padding(14)
              .paperGlass(cornerRadius: 16)
          }

          if !job.logsTail.isEmpty {
            Text("日志")
              .font(.headline)
            Text(job.logsTail)
              .font(.system(.caption, design: .monospaced))
              .foregroundStyle(.secondary)
              .textSelection(.enabled)
              .frame(maxWidth: .infinity, alignment: .leading)
              .padding(14)
              .paperGlass(cornerRadius: 16)
          }

          JobResultPanel(model: model, job: job)
        } else {
          ContentUnavailableView("选择一条记录", systemImage: "sidebar.left", description: Text("在左侧选择任务记录，查看详情和生成结果。"))
            .frame(maxWidth: .infinity, minHeight: 360)
        }
      }
      .padding(20)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .background(PaperWorkspaceBackground().ignoresSafeArea())
  }

  private func detailRow(_ label: String, _ value: String) -> some View {
    GridRow {
      Text(label)
        .foregroundStyle(.secondary)
      Text(value.isEmpty ? "-" : value)
        .textSelection(.enabled)
    }
  }
}

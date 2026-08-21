import SwiftUI

struct GuideView: View {
  @Bindable var model: AppModel

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
          hero
          runtimePanel
          presetPanel
          GuideStepSection(title: "三步上手", steps: PaperBananaGuide.onboardingSteps)
          GuideStepSection(
            title: "它是怎么生成的（多智能体流程）",
            note: "专业模式下，一张图大致经历这些阶段；结果区会实时展示生成演化。",
            style: .flow,
            steps: PaperBananaGuide.workflowSteps
          )
          GuideTermSection(title: "模型相关", systemImage: "cpu", terms: PaperBananaGuide.modelTerms)
          GuideTermSection(title: "生成参数", systemImage: "slider.horizontal.3", terms: PaperBananaGuide.parameterTerms)
          GuideTermSection(title: "检索与参考图", systemImage: "magnifyingglass", terms: PaperBananaGuide.referenceTerms)
          GuideTermSection(title: "结果区", systemImage: "photo.on.rectangle", terms: PaperBananaGuide.resultTerms)
          faqSection
        }
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.top, Theme.Spacing.md)
        .padding(.bottom, 128)
      }
      .background(AppBackground(isGenerating: model.jobs.isActivelyGenerating))
      .toolbar(.hidden, for: .navigationBar)
    }
  }

  private var hero: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        Label("使用教程", systemImage: "book")
          .font(.title3.bold())
          .accessibilityAddTraits(.isHeader)
        Text(PaperBananaGuide.intro)
          .font(.footnote)
          .foregroundStyle(.secondary)
          .fixedSize(horizontal: false, vertical: true)
        ViewThatFits(in: .horizontal) {
          HStack(spacing: Theme.Spacing.md) {
            quickActionButtons
          }
          VStack(spacing: Theme.Spacing.md) {
            quickActionButtons
          }
        }
        .padding(.top, Theme.Spacing.sm)
      }
    }
  }

  private var runtimeSummary: GuideRuntimeSummary {
    GuideRuntimeSummary(
      registry: model.modelRegistry.registry,
      hasLiveRegistry: model.modelRegistry.hasLiveRegistry,
      draft: model.generation.draft
    )
  }

  private var runtimePanel: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
        SectionHeader(title: "当前运行时目录", systemImage: runtimeSummary.isAvailable ? "checkmark.seal" : "exclamationmark.triangle")
        Text(runtimeSummary.statusText)
          .font(.footnote.weight(.semibold))
          .foregroundStyle(runtimeSummary.isAvailable ? Theme.Palette.paperGreenText : Theme.Palette.warningText)
        if runtimeSummary.isAvailable {
          Text("registry \(runtimeSummary.registryVersion) · route contract v\(runtimeSummary.routeContractVersion ?? 0)")
            .font(.footnote.monospacedDigit())
          Text("当前渠道：\(runtimeSummary.providers.map { ProviderCatalog.config(for: $0).label }.joined(separator: "、"))")
            .font(.footnote)
            .foregroundStyle(.secondary)
          Text(runtimeSummary.routeSummary)
            .font(.footnote)
            .foregroundStyle(.secondary)
            .fixedSize(horizontal: false, vertical: true)
        } else {
          Text("缓存目录只供展示，不能冒充 live registry；请重试后再创建任务。")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
        Button(model.modelRegistry.isRefreshing ? "正在重试…" : "重试获取目录") {
          Task {
            await model.modelRegistry.refresh(apiBase: model.settings.apiBase)
            model.generation.normalizeDraftWithLiveRegistry()
            model.refine.normalizeWithLiveRegistry()
          }
        }
        .paperGlassButton()
        .disabled(model.modelRegistry.isRefreshing)
        .accessibilityIdentifier("guide.runtime.retry")
      }
    }
  }

  private var presetPanel: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        SectionHeader(title: "一键生成预设", systemImage: "slider.horizontal.3")
        Text("所有预设保持当前 live provider，并使用服务端默认三路；不会保留自定义或过期路由，也不写死模型 ID。省成本只下调流程参数，不凭空承诺成本。")
          .font(.footnote)
          .foregroundStyle(.secondary)
          .fixedSize(horizontal: false, vertical: true)
        ForEach(GuidePreset.allCases) { preset in
          Button {
            let result = GuidePreset.apply(preset, to: &model.generation.draft, registry: model.modelRegistry.registry, hasLiveRegistry: model.modelRegistry.hasLiveRegistry)
            switch result {
            case .applied:
              model.selectedTab = .generate
              model.presentAlert("已应用\(preset.title)：\(preset.detail)。请在生成设置中确认当前路线与 Key。")
            case .directoryUnavailable:
              model.presentAlert("目录不可用，新任务已禁用。请先重试获取 live registry。")
            case .noCompatibleRoutes:
              model.presentAlert("当前 live registry 没有可组成三路的可选模型，未修改设置。")
            }
          } label: {
            VStack(alignment: .leading, spacing: 2) {
              Text(preset.title).font(.callout.weight(.semibold))
              Text(preset.detail).font(.caption).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
          }
          .paperGlassButton()
          .disabled(!runtimeSummary.isAvailable)
          .accessibilityIdentifier("guide.preset.\(preset.rawValue)")
        }
      }
    }
  }

  @ViewBuilder
  private var quickActionButtons: some View {
    Button {
      model.selectedTab = .generate
    } label: {
      Label("开始生成", systemImage: "wand.and.stars")
        .frame(maxWidth: .infinity)
    }
    .paperGlassButton(prominent: true)

    Button {
      model.selectedTab = .settings
    } label: {
      Label("联系作者", systemImage: "message")
        .frame(maxWidth: .infinity)
    }
    .paperGlassButton()
  }

  private var faqSection: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        SectionHeader(title: "提示与常见问题", systemImage: "questionmark.circle")
        ForEach(PaperBananaGuide.faq) { item in
          GuideFAQRow(item: item)
        }
      }
    }
  }

}

/// FAQ 行：有详情的条目折叠为 DisclosureGroup，其余保持单行提示。
struct GuideFAQRow: View {
  let item: GuideFAQItem

  @State private var isExpanded: Bool
  @Environment(\.accessibilityReduceMotion) private var reduceMotion

  /// `initiallyExpanded` 仅供 #Preview / 视觉验证展开态使用，业务入口走默认收起。
  init(item: GuideFAQItem, initiallyExpanded: Bool = false) {
    self.item = item
    _isExpanded = State(initialValue: initiallyExpanded)
  }

  var body: some View {
    if let detail = item.detail {
      DisclosureGroup(isExpanded: animatedExpansion) {
        Text(detail)
          .font(.footnote)
          .foregroundStyle(.secondary)
          .fixedSize(horizontal: false, vertical: true)
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(.top, Theme.Spacing.xs)
      } label: {
        Label(item.title, systemImage: "questionmark.circle")
          .font(.footnote.weight(.semibold))
      }
      .tint(Theme.Palette.banana)
      .accessibilityHint(isExpanded ? "点按收起" : "点按展开详情")
    } else {
      Label(item.title, systemImage: "checkmark.circle")
        .font(.footnote)
        .foregroundStyle(.secondary)
    }
  }

  private var animatedExpansion: Binding<Bool> {
    Binding(
      get: { isExpanded },
      set: { newValue in
        withAnimation(reduceMotion ? nil : Theme.Motion.stateChange) {
          isExpanded = newValue
        }
      }
    )
  }
}

struct GuideStepSection: View {
  let title: String
  var systemImage: String?
  var note: String?
  var style: GuideStepStyle = .numbered
  let steps: [GuideStep]

  var body: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        SectionHeader(title: title, systemImage: systemImage)
        if let note {
          Text(note)
            .font(.footnote)
            .foregroundStyle(.secondary)
            .fixedSize(horizontal: false, vertical: true)
        }
        ForEach(Array(steps.enumerated()), id: \.element.id) { index, step in
          stepRow(index: index, step: step)
        }
      }
    }
  }

  private func stepRow(index: Int, step: GuideStep) -> some View {
    HStack(alignment: .top, spacing: Theme.Spacing.md) {
      if style == .numbered {
        Text("\(index + 1)")
          .font(.caption.monospacedDigit().bold())
          .foregroundStyle(.white)
          .frame(width: 24, height: 24)
          .background(Circle().fill(Theme.Palette.paperGreen))
          .accessibilityLabel("第 \(index + 1) 步")
      }
      VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
        Text(step.title)
          .font(.callout.weight(.semibold))
        Text(step.detail)
          .font(.footnote)
          .foregroundStyle(.secondary)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(style == .flow ? Theme.Spacing.md : 0)
    .background {
      if style == .flow {
        RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous)
          .fill(Theme.Palette.paperPanel)
      }
    }
    .overlay {
      if style == .flow {
        RoundedRectangle(cornerRadius: Theme.Radius.control, style: .continuous)
          .strokeBorder(Theme.Palette.paperBorder, lineWidth: 1)
      }
    }
    .accessibilityElement(children: .combine)
  }
}

enum GuideStepStyle {
  case numbered
  case flow
}

struct GuideTermSection: View {
  let title: String
  let systemImage: String
  let terms: [GuideTerm]

  var body: some View {
    GlassPanel {
      VStack(alignment: .leading, spacing: Theme.Spacing.md) {
        SectionHeader(title: title, systemImage: systemImage)
        ForEach(terms) { term in
          VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
            Text(term.name)
              .font(.callout.weight(.semibold))
            Text(term.detail)
              .font(.footnote)
              .foregroundStyle(.secondary)
              .fixedSize(horizontal: false, vertical: true)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .fieldWell()
          .accessibilityElement(children: .combine)
        }
      }
    }
  }
}

#if DEBUG
#Preview("使用指南") {
  GuideView(model: AppModel())
}

#Preview("FAQ 展开态") {
  GlassPanel {
    VStack(alignment: .leading, spacing: Theme.Spacing.md) {
      ForEach(Array(PaperBananaGuide.faq.enumerated()), id: \.offset) { index, item in
        GuideFAQRow(item: item, initiallyExpanded: index == 0)
      }
    }
  }
  .padding()
  .background(AppBackground())
}
#endif

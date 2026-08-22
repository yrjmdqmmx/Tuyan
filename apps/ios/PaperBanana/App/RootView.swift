import SwiftUI

struct RootView: View {
  @Bindable var model: AppModel
  @State private var isFeedbackSheetPresented = false

  var body: some View {
    tabs
      .overlay(alignment: .bottomTrailing) {
        if showsFeedbackFloatingButton {
          FeedbackFloatingButton {
            isFeedbackSheetPresented = true
          }
          .padding(.trailing, Theme.Spacing.lg)
          .padding(.bottom, feedbackBottomPadding)
        }
      }
      .sheet(item: $model.exports.exportedResultFile) { file in
        ShareSheet(items: [file.url])
          .presentationDetents([.medium, .large])
      }
      .sheet(isPresented: $isFeedbackSheetPresented) {
        FeedbackSheet(model: model)
      }
      .alert("图研 Tuyan", isPresented: $model.isAlertPresented) {
        Button("好", role: .cancel) {}
      } message: {
        Text(model.alertMessage)
      }
  }

  @ViewBuilder
  private var tabs: some View {
    #if DEBUG
    if DebugPreviewConfiguration.usesAccessibilityXXLPreview {
      previewAdjustedTabs
        .dynamicTypeSize(.accessibility4)
    } else {
      previewAdjustedTabs
    }
    #else
    baseTabs
    #endif
  }

  #if DEBUG
  @ViewBuilder
  private var previewAdjustedTabs: some View {
    if DebugPreviewConfiguration.usesDarkPreview && DebugPreviewConfiguration.usesReduceMotionPreview {
      baseTabs
        .preferredColorScheme(.dark)
        .transaction { transaction in
          transaction.animation = nil
          transaction.disablesAnimations = true
        }
    } else if DebugPreviewConfiguration.usesDarkPreview {
      baseTabs.preferredColorScheme(.dark)
    } else if DebugPreviewConfiguration.usesReduceMotionPreview {
      baseTabs.transaction { transaction in
        transaction.animation = nil
        transaction.disablesAnimations = true
      }
    } else {
      baseTabs
    }
  }
  #endif

  private var baseTabs: some View {
    TabView(selection: $model.selectedTab) {
      Tab(value: AppTab.generate) {
        GenerateView(model: model)
      } label: {
        Label(AppTab.generate.title, systemImage: AppTab.generate.symbol).frame(minHeight: 44)
      }
      .accessibilityIdentifier("tab.generate")
      Tab(value: AppTab.refine) {
        RefineView(model: model)
      } label: {
        Label(AppTab.refine.title, systemImage: AppTab.refine.symbol).frame(minHeight: 44)
      }
      .accessibilityIdentifier("tab.refine")
      Tab(value: AppTab.records) {
        RecordsView(model: model)
      } label: {
        Label(AppTab.records.title, systemImage: AppTab.records.symbol).frame(minHeight: 44)
      }
      .accessibilityIdentifier("tab.records")
      Tab(value: AppTab.guide) {
        GuideView(model: model)
      } label: {
        Label(AppTab.guide.title, systemImage: AppTab.guide.symbol).frame(minHeight: 44)
      }
      .accessibilityIdentifier("tab.guide")
      Tab(value: AppTab.settings) {
        SettingsView(model: model)
      } label: {
        Label(AppTab.settings.title, systemImage: AppTab.settings.symbol).frame(minHeight: 44)
      }
      .accessibilityIdentifier("tab.settings")
    }
    .tabViewStyle(.sidebarAdaptable)
    .tabBarMinimizeBehavior(.onScrollDown)
  }

  private var feedbackBottomPadding: CGFloat {
    return 88
  }

  private var showsFeedbackFloatingButton: Bool {
    false
  }
}

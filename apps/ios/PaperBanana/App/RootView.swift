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
    baseTabs
  }

  private var baseTabs: some View {
    TabView(selection: $model.selectedTab) {
      Tab(AppTab.generate.title, systemImage: AppTab.generate.symbol, value: AppTab.generate) {
        GenerateView(model: model)
      }
      Tab(AppTab.refine.title, systemImage: AppTab.refine.symbol, value: AppTab.refine) {
        RefineView(model: model)
      }
      Tab(AppTab.records.title, systemImage: AppTab.records.symbol, value: AppTab.records) {
        RecordsView(model: model)
      }
      Tab(AppTab.guide.title, systemImage: AppTab.guide.symbol, value: AppTab.guide) {
        GuideView(model: model)
      }
      Tab(AppTab.settings.title, systemImage: AppTab.settings.symbol, value: AppTab.settings) {
        SettingsView(model: model)
      }
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

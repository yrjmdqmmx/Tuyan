import SwiftUI

struct ModelRouteProviderSelectionView: View {
  @Bindable var model: AppModel
  let role: ModelRole

  var body: some View {
    Group {
      if let registry = model.modelRegistry.registry {
        let catalog = ModelRouteSelectionCatalog(registry: registry, role: role)
        List {
          Section {
            ForEach(catalog.providers) { provider in
              NavigationLink {
                ModelVendorSelectionView(model: model, role: role, provider: provider, catalog: catalog)
              } label: {
                providerRow(provider, registry: registry)
              }
              .accessibilityIdentifier("route.provider.\(provider.rawValue)")
            }
          } header: {
            Text("API 接入渠道")
          } footer: {
            Text("先选择实际调用渠道，再按模型开发厂商筛选。")
          }
        }
      } else {
        ContentUnavailableView("模型目录不可用", systemImage: "wifi.exclamationmark", description: Text("请返回并重试加载在线注册表。"))
      }
    }
    .navigationTitle("\(role.displayTitle)路由")
    .navigationBarTitleDisplayMode(.inline)
  }

  private func providerRow(_ provider: ProviderID, registry: ModelRegistry) -> some View {
    HStack(spacing: Theme.Spacing.md) {
      Image(systemName: "antenna.radiowaves.left.and.right")
        .foregroundStyle(Theme.Palette.paperGreenText)
        .frame(width: 28, height: 28)
      VStack(alignment: .leading, spacing: 2) {
        Text(ProviderCatalog.config(for: provider).label).font(.headline)
        Text(registry.providers[provider]?.accessKind == "direct" ? "官方直连" : "聚合渠道")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      Spacer()
      if model.generation.route(for: role)?.accessProvider == provider {
        Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.Palette.paperGreenText)
      }
    }
    .padding(.vertical, 4)
  }
}

private struct ModelVendorSelectionView: View {
  @Bindable var model: AppModel
  let role: ModelRole
  let provider: ProviderID
  let catalog: ModelRouteSelectionCatalog

  var body: some View {
    List(catalog.vendors(for: provider), id: \.self) { vendor in
      NavigationLink {
        ModelSelectionView(model: model, role: role, provider: provider, vendor: vendor, catalog: catalog)
      } label: {
        HStack(spacing: Theme.Spacing.md) {
          Image(systemName: "building.2").foregroundStyle(Theme.Palette.paperGreenText)
          Text(vendor).font(.headline)
          Spacer()
          Text("\(catalog.models(for: provider, vendor: vendor).count) 个模型")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 6)
      }
      .accessibilityIdentifier("route.vendor.\(provider.rawValue).\(vendor)")
    }
    .navigationTitle("选择模型厂商")
    .navigationBarTitleDisplayMode(.inline)
  }
}

private struct ModelSelectionView: View {
  @Bindable var model: AppModel
  let role: ModelRole
  let provider: ProviderID
  let vendor: String
  let catalog: ModelRouteSelectionCatalog

  var body: some View {
    List {
      ForEach(catalog.models(for: provider, vendor: vendor)) { registryModel in
        Button {
          model.generation.selectProvider(provider, for: role)
          model.generation.selectModel(registryModel, for: role)
        } label: {
          modelCard(registryModel)
        }
        .buttonStyle(.plain)
        .disabled(!registryModel.selectable)
        .accessibilityIdentifier("route.model.\(registryModel.id)")
      }
    }
    .navigationTitle("选择\(role.displayTitle)")
    .navigationBarTitleDisplayMode(.inline)
  }

  private func modelCard(_ registryModel: RegistryModel) -> some View {
    VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 2) {
          Text(registryModel.label).font(.headline).foregroundStyle(.primary)
          Text(registryModel.id).font(.caption.monospaced()).foregroundStyle(.secondary)
        }
        Spacer(minLength: Theme.Spacing.sm)
        if model.generation.route(for: role)?.modelId == registryModel.id,
           model.generation.route(for: role)?.accessProvider == provider {
          Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.Palette.paperGreenText)
        }
      }
      LazyVGrid(columns: [GridItem(.adaptive(minimum: 72), spacing: 6)], alignment: .leading, spacing: 6) {
        if registryModel.recommended { modelBadge("推荐") }
        modelBadge(lifecycleLabel(registryModel.lifecycle))
        modelBadge(verificationLabel(registryModel.verificationState))
        modelBadge(registryModel.requiresEntitlement ? "需权益" : "标准权限")
      }
      if let reason = disabledReason(registryModel) {
        Label(reason, systemImage: "exclamationmark.triangle")
          .font(.caption)
          .foregroundStyle(Theme.Palette.warningText)
          .fixedSize(horizontal: false, vertical: true)
      } else if !registryModel.availabilityNotes.isEmpty {
        Text(registryModel.availabilityNotes)
          .font(.caption)
          .foregroundStyle(.secondary)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
    .padding(.vertical, 6)
    .opacity(registryModel.selectable ? 1 : 0.58)
  }

  private func modelBadge(_ text: String) -> some View {
    Text(text)
      .font(.caption2.weight(.semibold))
      .padding(.horizontal, 7)
      .padding(.vertical, 4)
      .background(Theme.Palette.paperGreenWell, in: .capsule)
      .foregroundStyle(Theme.Palette.paperGreenText)
  }

  private func lifecycleLabel(_ value: String) -> String {
    switch value {
    case "stable": "稳定版"
    case "preview": "预览版"
    case "deprecated": "即将下线"
    default: "状态未知"
    }
  }

  private func verificationLabel(_ value: String) -> String {
    switch value {
    case "inference-verified": "真实调用已验证"
    case "account-visible": "账号可见"
    case "catalog": "目录兼容"
    case "registry": "注册信息"
    default: "未验证"
    }
  }

  private func disabledReason(_ registryModel: RegistryModel) -> String? {
    if registryModel.selectable { return nil }
    return registryModel.disabledReason ?? registryModel.roleReasons[role] ?? (registryModel.availabilityNotes.isEmpty ? "当前路线不可用" : registryModel.availabilityNotes)
  }
}

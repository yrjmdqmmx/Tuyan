import { useMemo } from 'react';
import ModelPicker from '../components/ModelPicker.jsx';
import { ROLE_NAMES, modelOption, selectedModelReference, libraryModelMissingFromCatalog } from './workspaceModels.js';

// Adapt the saved library to the existing picker; its layout, cards, search,
// pagination and mobile navigation remain shared with the original workbench.
export default function WorkspaceModelPicker({ models, role, path, editing, current, onChange }) {
  const registry = useMemo(() => {
    const providers = {};
    const connectionProviders = new Map(models.library.connections.map(c => [c.id, c.provider]));
    const channelConnections = new Map();
    for (const entry of models.library.models) {
      const provider = connectionProviders.get(entry.connectionId);
      if (!channelConnections.has(provider)) channelConnections.set(provider, new Set());
      channelConnections.get(provider).add(entry.connectionId);
    }
    for (const entry of models.library.models) {
      const option = modelOption(entry, models.library, models.registry, role, path, editing, models.summary?.tokenDance);
      if (!option.connection || !(option.model?.roles?.includes(role) || entry.id === current?.libraryModelId)) continue;
      const provider = option.connection.provider;
      const channel = providers[provider] ||= { ...models.registry?.providers?.[provider], models: [] };
      const multipleConnections = channelConnections.get(provider).size > 1;
      channel.models.push({
        ...(option.model || { id: entry.modelId, roleReasons: { [role]: option.reason } }),
        savedChoice: {
          id: entry.id,
          reference: selectedModelReference(option),
          // Keep the saved reference available to the trigger, while omitting
          // models absent from the channel's current catalogue from choices.
          hidden: !option.model || libraryModelMissingFromCatalog(entry, models.library, models.registry),
          description: multipleConnections ? `${option.connection.label} · ${option.connectionId.slice(0, 8)}` : '',
          disabledReason: option.reason || (models.registryStatus !== 'ready' ? '正在等待可用模型目录，已有配置保留。' : ''),
        },
      });
    }
    return { providers };
  }, [models.library, models.registry, models.registryStatus, models.summary?.tokenDance, role, path, editing, current?.libraryModelId]);

  const selectedProvider = models.library.connections.find(c => c.id === models.library.models.find(m => m.id === current?.libraryModelId)?.connectionId)?.provider;
  return <ModelPicker label={ROLE_NAMES[role]} role={role} registry={registry}
    route={current ? { accessProvider: selectedProvider, ...current } : { accessProvider: '', modelId: '' }} outputFormat={path} operation={editing ? 'editing' : 'generation'}
    savedSelection={{ id: current?.libraryModelId, onChange }}
    visionMode={role === 'vision' ? (current ? 'assist' : 'none') : undefined}
    onVisionModeChange={role === 'vision' ? mode => { if (mode === 'none') onChange(null); } : undefined}
  />;
}

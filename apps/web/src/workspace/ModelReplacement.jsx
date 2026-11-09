import { useState } from 'react';
import { removedModel, auditedModelLifecycle, withModelAudit } from '../lib/modelAudit.js';
import { modelUnavailableForSelection } from '../lib/modelRegistry.js';
import { modelOption } from './workspaceModels.js';
import { modelDisplayName } from '../lib/modelUnavailablePresentation.js';
import WorkspaceDialog from './WorkspaceDialog.jsx';
import { useAppLocale } from '../components/BenchmarkLocale.jsx';

// Only exact, selectable replacements on the same channel can be switched.
// Historical identities and other presets are never rewritten by rendering.
export function replacementModel(provider, modelId, registry) {
  const lifecycle = auditedModelLifecycle(provider, modelId);
  const replacementId = removedModel(provider, modelId)?.replacementApiId || lifecycle?.replacement;
  if (!replacementId) return null;
  const replacement = registry?.providers?.[provider]?.models?.find(model => model.id === replacementId);
  return replacement && !modelUnavailableForSelection(withModelAudit(provider, replacement)) ? replacement : null;
}

export default function ModelReplacement({ provider, modelId, models, entry, onReplace, role, path, editing }) {
  const { t } = useAppLocale();
  const [confirming, setConfirming] = useState(false), [error, setError] = useState('');
  const replacement = replacementModel(provider, modelId, models.registry);
  const lifecycle = auditedModelLifecycle(provider, modelId);
  const removed = removedModel(provider, modelId);
  const available = () => replacement && entry && (!role || !modelOption({ ...entry, modelId: replacement.id, disabled: false }, models.library, models.registry, role, path, editing, models.summary?.tokenDance).reason);
  if ((!lifecycle && !removed) || !available()) return null;
  async function confirm() {
    if (!available() || !models.ready || models.busy || models.registryStatus !== 'ready' || !replacementModel(provider, modelId, models.registry)) return;
    const existing = models.library.models.find(item => item.connectionId === entry.connectionId && item.modelId === replacement.id && !item.disabled);
    const target = existing || { id: crypto.randomUUID(), connectionId: entry.connectionId, modelId: replacement.id, disabled: false };
    const next = { ...models.library, models: [...models.library.models.filter(item => item.id !== target.id), target] };
    if (!await models.save(next, undefined, { intent: 'add' })) { setError(t('切换未完成，请重试。')); return; }
    onReplace?.({ libraryModelId: target.id, connectionId: target.connectionId, accessProvider: provider, modelId: target.modelId });
    setConfirming(false);
  }
  return <>
    <button className="tw-secondary" disabled={!models.ready || models.busy || models.registryStatus !== 'ready'} onClick={() => { setConfirming(true); setError(''); }}>{removed ? t('改选') : `${t('切换到')} ${modelDisplayName(provider, replacement.id, models.registry)}`}</button>
    {confirming && <WorkspaceDialog className="tw-model-reselect-dialog" title={t('确认切换模型')} onClose={() => setConfirming(false)}>
      <p>{modelDisplayName(provider, modelId, models.registry)} → {modelDisplayName(provider, replacement.id, models.registry)}</p>
      <p>{t('使用同一渠道连接。原型号保留原状态，替代型号加入我的模型；其他已保存预设和历史任务保持原型号。')}{onReplace ? t('当前预设的此角色会切换为替代型号。') : ''}</p>
      <p>{t('替代型号的能力和账户可用性可能不同，请核对后确认。')}</p>
      {error && <p role="alert">{error}</p>}
      <footer className="tw-connection-footer"><div><button disabled={models.busy} onClick={() => setConfirming(false)}>{t('取消')}</button><button className="tw-primary" disabled={models.busy || !models.ready} onClick={confirm}>{t('确认切换')}</button></div></footer>
    </WorkspaceDialog>}
  </>;
}

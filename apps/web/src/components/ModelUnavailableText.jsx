import { removedModel } from '../lib/modelAudit.js';

export default function ModelUnavailableText({ provider, modelId, as: Tag = 'span' }) {
  const removed = removedModel(provider, modelId);
  if (!removed) return null;
  return <Tag className="model-unavailable-text"><span className="model-name-nowrap">{removed.displayName}</span>：原型号已不可用，请重新选择。{removed.replacementApiId && <>推荐：<span className="model-name-nowrap">{removed.replacementDisplayName}</span></>}</Tag>;
}

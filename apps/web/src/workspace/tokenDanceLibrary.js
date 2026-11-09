// Import catalogue identities only. Authorization, role eligibility and invocation
// remain separate checks; existing models (including disabled ones) are untouched.
export function tokenDanceLibraryAddition(library, registry, createId = () => crypto.randomUUID()) {
  const catalog = registry?.providers?.tokendance?.models;
  if (!catalog?.length) return null;
  const previous = library.connections.find(c => c.provider === 'tokendance' && !c.disabled)
    || library.connections.find(c => c.provider === 'tokendance');
  if (previous?.disabled) return null;
  const connection = previous || { id: createId(), provider: 'tokendance', label: '观猹 TokenDance', scope: 'authorization', region: 'global', disabled: false };
  const added = new Set(library.models.filter(m => m.connectionId === connection.id).map(m => m.modelId));
  const missing = [...new Set(catalog.map(m => m.id))].filter(id => !added.has(id));
  if (previous && !missing.length) return null;
  if (library.models.length + missing.length > 500 || !previous && library.connections.length >= 64) {
    throw Error('模型库容量不足，TokenDance 型号尚未自动添加。请先整理模型库。');
  }
  return { ...library, connections: previous ? library.connections : [...library.connections, connection],
    models: [...library.models, ...missing.map(modelId => ({ id: createId(), connectionId: connection.id, modelId, disabled: false }))] };
}

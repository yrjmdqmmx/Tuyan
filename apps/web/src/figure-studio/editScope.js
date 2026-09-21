/** A panel's move is a subtree edit, so all descendants must be named before requesting a model. */
export function selectedEditScope(document, selectedId, maximum = 40) {
  const selected = document.elements.find((element) => element.id === selectedId);
  if (!selected) return { objectIds: [], relatedCount: 0, maximum, error: '请先选择一个已有对象。' };
  const ids = new Set([selected.id]);
  if (selected.type === 'panel') {
    let added;
    do {
      added = false;
      for (const element of document.elements) {
        if (element.parentId && ids.has(element.parentId) && !ids.has(element.id)) { ids.add(element.id); added = true; }
      }
    } while (added);
  }
  const objectIds = document.elements.filter((element) => ids.has(element.id)).map((element) => element.id);
  const relatedCount = objectIds.length - 1;
  const limit = Number.isInteger(maximum) && maximum > 0 ? Math.min(maximum, 40) : 40;
  return { objectIds, relatedCount, maximum: limit, error: objectIds.length > limit ? `此面板包含 ${objectIds.length} 个编辑对象，超过单次 ${limit} 个对象的限制，尚未发送请求。请改选较小面板或子对象，或直接拖动画布编辑。` : '' };
}

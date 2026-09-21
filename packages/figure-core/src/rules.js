import { validateDocument, connectorEndpoints } from './document.js';
import { PROFILES } from './profiles.js';

function inspectRule(doc, rule) {
  const result = { id: rule.id, label: rule.label, status: 'passed', message: '' };
  if (rule.sourceUrl) result.sourceUrl = rule.sourceUrl;
  if (rule.enabled === false) return { ...result, status: 'unverified', message: '工作规则已关闭；期刊原始基线仍独立检查，不代表符合该要求。' };
  const texts = doc.elements.filter((e) => e.type === 'text');
  const images = doc.elements.filter((e) => e.type === 'image');
  function failures(elements, passed, failed) {
    if (elements.length) { result.status = 'problem'; result.objectIds = elements.map((e) => e.id); result.message = failed; }
    else result.message = passed;
  }
  switch (rule.kind) {
    case 'text-size': {
      const relevant = texts.filter((e) => e.role !== 'panel-label');
      failures(relevant.filter((e) => e.fontSize < rule.value.min || e.fontSize > rule.value.max), relevant.length ? `普通文字字号在 ${rule.value.min}–${rule.value.max} pt 范围内。` : '当前没有普通文字对象。', `普通文字须在最终尺寸保持 ${rule.value.min}–${rule.value.max} pt。`);
      break;
    }
    case 'panel-label-size': {
      const relevant = texts.filter((e) => e.role === 'panel-label');
      failures(relevant.filter((e) => Math.abs(e.fontSize - rule.value) > 0.001 || ![700, 'bold'].includes(e.fontWeight) || !/^[a-z]$/.test(e.text)), relevant.length ? `面板标签为 ${rule.value} pt 粗体小写字母。` : '当前没有标记为面板标签的文字；多面板图需作者补齐。', `面板标签须为 ${rule.value} pt、粗体、直立的小写 a、b、c 等单字母。`);
      const panels = doc.elements.filter((e) => e.type === 'panel');
      const unlabelled = panels.filter((panel) => !relevant.some((label) => label.parentId === panel.id));
      if (result.status === 'passed' && panels.length > 1 && unlabelled.length) {
        result.status = 'manual';
        result.objectIds = unlabelled.map((panel) => panel.id);
        result.message = `检测到 ${panels.length} 个面板，其中 ${unlabelled.length} 个未绑定独立面板标签；请确认哪些分组构成正式面板，并补齐 ${rule.value} pt 粗体小写编号。`;
      }
      break;
    }
    case 'max-height':
      result.status = doc.canvas.heightMm <= rule.value ? 'passed' : 'problem';
      result.message = `当前高度 ${doc.canvas.heightMm} mm；此规则上限 ${rule.value} mm。`;
      break;
    case 'column-width':
      result.status = rule.value.some((v) => Math.abs(doc.canvas.widthMm - v) < 0.01) ? 'passed' : 'problem';
      result.message = `当前宽度 ${doc.canvas.widthMm} mm；建议栏宽 ${rule.value.join(' / ')} mm，最终尺寸由期刊决定。`;
      break;
    case 'standard-font': {
      const allowed = rule.value.map((v) => v.toLowerCase());
      failures(texts.filter((e) => !allowed.includes(e.fontFamily.toLowerCase())), '文字对象使用所列标准字体；嵌入和字体替换仍需外部导出检查。', `请核对字体，规则接受：${rule.value.join('、')}。Courier / Symbol 仅适用于相应序列或符号用途。`);
      break;
    }
    case 'rgb':
      result.status = images.length ? 'manual' : 'passed';
      result.message = images.length ? '矢量颜色使用 RGB；内嵌位图的色彩配置与印刷转换仍需人工核验。' : '矢量对象颜色使用 RGB 十六进制值。';
      break;
    case 'text-editable':
      result.status = images.length ? 'manual' : 'passed';
      result.message = images.length ? '独立文字对象会导出为 SVG text；需检查位图是否包含已合并的标签或比例尺。' : '源文档文字为独立对象，SVG 导出保留 text，不转轮廓；目标编辑器兼容性另行验证。';
      break;
    case 'image-resolution':
    case 'min-dpi': {
      if (!images.length) { result.message = '当前没有位图对象，DPI 不适用于矢量元素。'; break; }
      const values = images.map((e) => ({ element: e, dpi: Math.min(doc.assets[e.assetId].pixelWidth / (e.width / 25.4), doc.assets[e.assetId].pixelHeight / (e.height / 25.4)) }));
      const threshold = rule.kind === 'min-dpi' ? rule.value : 300;
      const low = values.filter((v) => v.dpi < threshold);
      result.status = low.length ? 'problem' : rule.kind === 'min-dpi' ? 'passed' : 'manual';
      result.objectIds = (low.length ? low : values).map((v) => v.element.id);
      const observed = values.map((v) => `${v.element.id}: ${Math.floor(v.dpi)} dpi`).join('；');
      result.message = rule.kind === 'min-dpi'
        ? `按最终放置尺寸测得 ${observed}；用户阈值 ${threshold} dpi。`
        : `按最终放置尺寸测得 ${observed}。官方同页摄影图段落写 300 dpi、导出段落写 450 dpi；需按图种与编辑部要求确认，不能据此一律判定达标。`;
      break;
    }
    case 'unverified': result.status = 'unverified'; result.message = rule.message || '尚未取得足够证据。'; break;
    case 'manual': {
      result.status = 'manual'; result.message = rule.message || '此项需要作者人工检查。';
      if (rule.id === 'aesthetic-review') {
        const outside = doc.elements.filter((element) => {
          if (element.type === 'line' || element.type === 'arrow') {
            const endpoints = connectorEndpoints(element, doc.elements);
            return Math.min(endpoints.x1, endpoints.x2) < 0 || Math.min(endpoints.y1, endpoints.y2) < 0 || Math.max(endpoints.x1, endpoints.x2) > doc.canvas.widthMm || Math.max(endpoints.y1, endpoints.y2) > doc.canvas.heightMm;
          }
          return element.x < 0 || element.y < 0 || element.x + element.width > doc.canvas.widthMm || element.y + element.height > doc.canvas.heightMm;
        });
        if (outside.length) {
          result.status = 'problem'; result.objectIds = outside.map((element) => element.id);
          result.message = `图研辅助边界检查：${outside.length} 个对象的几何边界超出当前画布，导出可能裁切。请调整位置、尺寸或画布；这不是期刊原文的数值要求，真实文字排版与可读性仍需人工检查。`;
        }
      }
      break;
    }
    default: result.status = 'manual'; result.message = rule.message || '此项需要作者人工检查。';
  }
  return result;
}

export function evaluateRules(input) {
  const doc = validateDocument(input);
  const profile = PROFILES.find((p) => p.id === doc.profileId);
  return {
    documentRevision: doc.revision,
    profileId: doc.profileId,
    baseline: profile.rules.map((rule) => inspectRule(doc, rule)),
    working: [...profile.rules, ...doc.customRules].map((rule) => inspectRule(doc, { ...rule, ...doc.ruleOverrides[rule.id] })),
  };
}

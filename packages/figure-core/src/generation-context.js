import { copyJsonData, validateDocument } from './document.js';
import { PROFILES } from './profiles.js';

export const GENERATION_CONTEXT_VERSION = 1;
export const MAX_GENERATION_CONTEXT_BYTES = 64 * 1024;
const conflict = (message) => { throw new Error(`生成规则冲突：${message}请调整工作规则后重试。`); };
const familyKey = (value) => value.toLowerCase();
const renderableFamily = (value) => /^[\p{L}\p{N} ,_-]+$/u.test(value);
const intersect = (lists, equal) => lists.length ? lists[0].filter((value) => lists.every((list) => list.some((other) => equal(value, other)))) : null;

/** A bounded description of trusted profile evidence and separately editable working rules.
 * No document text, raster bytes, credentials or client-supplied official metadata is included.
 */
export function generationContextFromDocument(input) {
  const document = validateDocument(input);
  const profile = copyJsonData(PROFILES.find((candidate) => candidate.id === document.profileId));
  const rules = [...profile.rules.map((rule) => ({ ...rule, origin: 'official' })), ...document.customRules.map((rule) => ({ ...rule, origin: 'custom' }))].map((rule) => {
    const override = document.ruleOverrides[rule.id];
    const result = { ...rule, ...override, enabled: override?.enabled ?? rule.enabled ?? true, overridden: Boolean(override && Object.keys(override).length) };
    // An explicit user value is a working whitelist, not an official example list.
    if (override && Object.hasOwn(override, 'value')) delete result.coverage;
    return result;
  });
  const active = (kind) => rules.filter((rule) => rule.enabled && rule.kind === kind);
  const sizes = active('text-size').map((rule) => rule.value);
  const textSizePt = { min: Math.max(1, ...sizes.map((value) => value.min)), max: Math.min(200, ...sizes.map((value) => value.max)) };
  if (textSizePt.min > textSizePt.max) conflict('正文的字号范围没有交集。');
  const panelSizes = active('panel-label-size').map((rule) => rule.value);
  if (new Set(panelSizes).size > 1) conflict('面板标号要求了不同字号。');
  const fontRules = active('standard-font');
  const requiredFonts = intersect(fontRules.filter((rule) => rule.coverage !== 'examples').map((rule) => rule.value), (a, b) => familyKey(a) === familyKey(b));
  if (requiredFonts && (!requiredFonts.length || !requiredFonts.some(renderableFamily))) conflict('启用的字体列表没有可排版的共同字体。');
  const preferredFonts = [...new Set(fontRules.filter((rule) => rule.coverage === 'examples').flatMap((rule) => rule.value))].filter(renderableFamily);
  const allowedFonts = requiredFonts?.filter(renderableFamily) ?? null;
  const fonts = allowedFonts ?? preferredFonts;
  const fontFamily = fonts.find((font) => familyKey(font) === 'arial') ?? fonts[0] ?? 'Arial';
  const widthRules = active('column-width');
  const allowedWidthsMm = intersect(widthRules.filter((rule) => rule.coverage !== 'examples').map((rule) => rule.value), (a, b) => Math.abs(a - b) < 0.01);
  const preferredWidthsMm = [...new Set(widthRules.filter((rule) => rule.coverage === 'examples').flatMap((rule) => rule.value))];
  const maxHeightMm = active('max-height').length ? Math.min(...active('max-height').map((rule) => rule.value)) : null;
  const canvasWarnings = [];
  if (allowedWidthsMm && !allowedWidthsMm.length) canvasWarnings.push('启用的栏宽列表没有交集；保留作者画布尺寸，需要人工调整或确认偏离。');
  if (maxHeightMm !== null && document.canvas.heightMm > maxHeightMm) canvasWarnings.push('当前画布高度超出启用的工作规则；保留作者尺寸，需作者确认偏离。');
  if (widthRules.some((rule) => !rule.value.some((width) => Math.abs(width - document.canvas.widthMm) < 0.01))) canvasWarnings.push('当前画布宽度不在部分工作规则的列举尺寸中；示例不代表完整允许范围，保留作者尺寸并人工核对。');
  const context = {
    version: GENERATION_CONTEXT_VERSION, scope: 'document',
    document: { id: document.id, revision: document.revision, canvas: document.canvas },
    officialBaseline: { profileId: profile.id, label: profile.label, scope: profile.scope, checkedAt: profile.checkedAt, sources: profile.sources,
      ...(profile.evidenceVersion ? { evidenceVersion: profile.evidenceVersion } : {}), ...(profile.sourceWarnings ? { sourceWarnings: profile.sourceWarnings } : {}), rules: profile.rules },
    working: { rules },
    constraints: { textSizePt, panelLabelSizePt: panelSizes[0] ?? null, fontFamily, allowedFonts, preferredFonts, maxHeightMm, allowedWidthsMm, preferredWidthsMm,
      minImageDpi: active('min-dpi').length ? Math.max(...active('min-dpi').map((rule) => rule.value)) : null,
      preserveCanvas: true, editableText: rules.some((rule) => rule.enabled && rule.kind === 'text-editable'), canvasWarnings },
    limitations: [
      '工作规则覆盖或停用不改变官方基线；偏离官方要求必须保留为待作者确认，不能宣称期刊合规。',
      'coverage=examples 表示官方举例而非完整白名单；未列举字体、栏宽或用途应人工核对来源。',
      '科学事实、数值、因果关系、AI 政策、排版审美与外部软件兼容性不能由这些规则自动确认。',
      '图像分辨率取决于图像类型、最终放置尺寸与投稿阶段；不能把单个 DPI 数值当作所有图稿的通过标准。',
      '仅使用作者提供的内容；字数或对象无法容纳时应精简呈现方案并提示作者确认，不得删改事实或暗自缩小字号。',
    ],
  };
  if (new TextEncoder().encode(JSON.stringify(context)).byteLength > MAX_GENERATION_CONTEXT_BYTES) throw new Error('生成规则上下文超过 64 KiB，请缩短自定义规则说明。');
  return context;
}

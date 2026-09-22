// Generated from packages/api/src/refine-controls.ts
/** Audited editing combinations, not inferred from a provider name or OpenAI compatibility. */
export const REFINE_PRODUCT_MAX_REFERENCES = 8;
export function refineControlsFor(provider, model) {
    const common = { version: 1, sourceCounts: true, mask: false, maskWithReferences: false, structured: null, checkedAt: '2026-09-22' };
    if (provider === 'fal' && model === 'bria/fibo-edit-1.5/edit')
        return { ...common, maxImages: 4, mask: true, structured: 'bria-fibo', singleImageInheritsSize: true, source: 'https://fal.ai/models/bria/fibo-edit-1.5/edit/api' };
    if (provider === 'replicate' && model === 'qwen/qwen-image-edit-plus')
        return { ...common, maxImages: 3, source: 'https://replicate.com/qwen/qwen-image-edit-plus' };
    if (provider === 'runware' && model === 'alibaba:qwen-image-edit@2511')
        return { ...common, maxImages: 3, autoAspectRatio: '1:1', source: 'https://runware.ai/docs/models/alibaba-qwen-image-edit-2511' };
    if (provider === 'tokenhub' && model === 'hy-image-v3')
        return { ...common, maxImages: 3, autoAspectRatio: '1:1', source: 'https://cloud.tencent.com/document/product/1823/135745' };
    return null;
}
export function refineInputIssue(caps, input, ratio = 'auto', resolution = 'auto') {
    if (input === undefined)
        return '';
    if (!input || typeof input !== 'object' || Array.isArray(input) || input.version !== 1 || Object.keys(input).some(k => !['version', 'references', 'mask', 'structured'].includes(k)))
        return '精修输入契约无效，请刷新页面后重试。';
    const refs = input.references ?? [];
    if (!Array.isArray(refs))
        return '辅助参考图必须为列表。';
    if (refs.length > Math.min(REFINE_PRODUCT_MAX_REFERENCES, Math.max(0, (caps?.maxImages || 1) - 1)))
        return `当前型号最多接收 ${Math.max(0, (caps?.maxImages || 1) - 1)} 张辅助参考图；原图占用 1 个名额。图片已保留，请移除部分参考图或切换模型。`;
    for (const ref of refs) {
        if (!ref || typeof ref.objectKey !== 'string' || !ref.objectKey || ref.objectKey.length > 300 || !['content', 'layout', 'color', 'style'].includes(ref.purpose) || (ref.note !== undefined && (typeof ref.note !== 'string' || ref.note.length > 300)) || Object.keys(ref).some(k => !['objectKey', 'purpose', 'note'].includes(k)))
            return '参考图的文件、用途或说明无效。';
    }
    if (input.mask) {
        if (!caps?.mask)
            return '当前型号未接入遮罩编辑；遮罩已保留，请清除遮罩或切换模型。';
        if (typeof input.mask.objectKey !== 'string' || !input.mask.objectKey || input.mask.objectKey.length > 300 || Object.keys(input.mask).some(k => k !== 'objectKey'))
            return '遮罩文件无效。';
        if (refs.length && !caps.maskWithReferences)
            return '当前型号不能同时使用遮罩与辅助参考图；请移除参考图或清除遮罩。';
    }
    if (input.structured) {
        if (caps?.structured !== 'bria-fibo')
            return '当前型号未接入原生结构化编辑；表单已保留，请关闭结构化编辑或切换模型。';
        if (Object.keys(input.structured).some(k => !['object', 'attributes', 'relationship', 'preserve'].includes(k)))
            return '结构化编辑字段无效。';
        for (const key of ['object', 'attributes', 'relationship', 'preserve'])
            if (typeof input.structured[key] !== 'string' || !input.structured[key].trim() || input.structured[key].length > 500)
                return '请填写修改对象、目标属性、关系及保留约束（每项 1–500 字）。';
    }
    if (caps?.singleImageInheritsSize && !refs.length && (ratio !== 'auto' || resolution !== 'auto'))
        return '当前型号单图或遮罩编辑继承原图尺寸；请手动选择自动清晰度与自动比例。';
    return '';
}
export function refineReferencePrompt(input) {
    const labels = { content: '内容', layout: '布局', color: '配色', style: '风格' };
    return input?.references?.length ? '\n图片 1 是待精修原图。辅助图片仅用于下列指定方面，不改变未要求修改的科研内容：\n' + input.references.map((r, i) => `图片 ${i + 2}：${labels[r.purpose]}。${r.note || ''}`).join('\n') : '';
}
/** These are BRIA's native fields, not a JSON prompt passed to a text field. */
export function briaStructuredInstruction(input, instruction) {
    return { short_description: instruction, edit_instruction: instruction, objects: [{ description: input.object, shape_and_color: input.attributes, relationship: input.relationship }], context: `必须保留：${input.preserve}` };
}

// Canonical upload policy. Run scripts/sync-reference-upload.mjs after editing.
// Bytes are exact; official MB ceilings use decimal bytes, platform MiB uses 1024².
export const REFERENCE_UPLOAD_VERSION = 2
export const REFERENCE_UPLOAD_PLATFORM = {
  maxCount: 8, maxBytes: 20 * 1024 * 1024, maxTotalBytes: 80 * 1024 * 1024,
  maxDimension: 16384, maxPixels: 32000000, maxSvgBytes: 5 * 1024 * 1024, uploadConcurrency: 2,
  mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
  accept: 'image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg',
}
export type ReferenceSubmissionPolicy = {
  maxCount: number; maxBytes: number; maxTotalBytes: number; maxDimension: number; maxPixels: number;
  minDimension: number; maxAspectRatio: number; requestMaxBytes: number;
  mimeTypes: string[]; status: 'documented' | 'partial' | 'unconfirmed'; source: string; note: string;
}
export function referenceSubmissionPolicy(provider: string, model: string, workflow = 'generation'): ReferenceSubmissionPolicy {
  const p: ReferenceSubmissionPolicy = {
    maxCount: 3, maxBytes: 4 * 1024 * 1024, maxTotalBytes: 12 * 1024 * 1024,
    maxDimension: 4096, maxPixels: 8000000, minDimension: 1, maxAspectRatio: 200,
    requestMaxBytes: 20 * 1000000, mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    status: 'unconfirmed', source: '', note: '该渠道和精确型号未公布完整图片限额，使用平台保守提交额度；上游仍可能拒绝。',
  }
  if (workflow === 'refine') {
    p.maxCount = 1
    // The product edits one source. Vendor multi-image support does not turn it into a multi-source editor.
    p.maxBytes = 4 * 1024 * 1024; p.maxTotalBytes = p.maxBytes
    if ((provider === 'tokendance' && ['seedream-5.0-pro', 'seedream-5.0-lite'].includes(model))
      || (provider === 'ark' && /^doubao-seedream-(?:4|5)-/.test(model))) {
      Object.assign(p, { maxBytes: 10000000, maxTotalBytes: 10000000, maxDimension: 6000, maxPixels: 16000000,
        minDimension: 15, maxAspectRatio: 16, status: 'partial', source: 'https://tokendance.space/docs/ark-image-generations',
        note: '单图编辑；生成尺寸与输入尺寸是不同约束。渠道未完整公布输入限额，采用保守提交额度。' })
    } else if (provider === 'openai' && /^(gpt-image-|chatgpt-image-latest)/.test(model)) {
      Object.assign(p, { maxBytes: 16000000, maxTotalBytes: 16000000, maxDimension: 8192, maxPixels: 16000000,
        status: 'partial', source: 'https://developers.openai.com/api/reference/resources/images/methods/edit',
        note: '平台保持单图编辑；精确新版型号的独立输入上限仍待确认。' })
    } else if (provider === 'recraft') {
      Object.assign(p, { minDimension: 256, maxDimension: 4095, maxBytes: 8000000, maxTotalBytes: 8000000,
        status: 'partial', source: 'https://www.recraft.ai/docs/api-reference/endpoints',
        note: '当前图生图接口要求单图小于 10MB、16MP、4096px；平台保留 256px 最小短边，整包限额仍待确认。' })
    } else if (provider === 'stability' && /^sd3\.5-/.test(model)) {
      Object.assign(p, { minDimension: 64, maxBytes: 8 * 1024 * 1024, maxTotalBytes: 8 * 1024 * 1024, requestMaxBytes: 10 * 1024 * 1024,
        status: 'partial', source: 'https://platform.stability.ai/docs/api-reference',
        note: 'SD3.5 图生图要求每边至少 64px、整包最多 10MiB；平台预留表单和文字空间。' })
    } else if (provider === 'ideogram' && model === 'ideogram-v3') {
      Object.assign(p, { maxBytes: 20 * 1024 * 1024, maxTotalBytes: 20 * 1024 * 1024,
        status: 'partial', source: 'https://developer.ideogram.ai/api-reference/edit-images/remix-v3',
        note: 'V3 Remix 官方单图 25MB、整包 50MB；输入尺寸与像素上限未完整公布，采用平台处理尺寸。' })
    } else if (provider === 'fal' && /^openai\/gpt-image-2\.5\/(flare|sunburst)\//.test(model)) {
      Object.assign(p, { status: 'partial', source: 'https://fal.ai/models/' + model.replace(/\/text-to-image$/, '/edit') + '/api',
        note: '该编辑端点官方最多 16 张；图研保持单图编辑，单图大小与像素限额未完整公布。' })
    }
    p.mimeTypes = ['image/png'] // Current editing snapshots are lossless PNG.
    return p
  }
  if (provider === 'bailian' && /^qwen(?:3\.[5-8]|3-vl)/.test(model) && !model.includes('omni')) {
    Object.assign(p, { maxCount: 8, maxBytes: 8000000, maxTotalBytes: 32000000, maxDimension: 4096,
      maxPixels: 8000000, minDimension: 11, status: 'partial', source: 'https://help.aliyun.com/zh/model-studio/vision/',
      mimeTypes: ['image/png', 'image/jpeg'], note: 'URL 输入单图官方上限 20MB；平台同时兼容旧 VL 回退模型，采用二者较严格的提交额度，图文总量仍受上下文限制。' })
  } else if (provider === 'bailian' && /^(qwen-vl-|qvq-)/.test(model)) {
    Object.assign(p, { maxCount: 8, maxBytes: 8000000, maxTotalBytes: 32000000, minDimension: 11,
      status: 'partial', source: 'https://help.aliyun.com/zh/model-studio/vision/', note: 'URL 输入单图官方上限 10MB；数量和图文总量受该型号上下文限制。' })
  } else if (provider === 'anthropic') {
    Object.assign(p, { maxCount: 8, maxBytes: 7000000, maxTotalBytes: 21000000, maxDimension: 8000, maxPixels: 32000000,
      requestMaxBytes: 32000000, status: 'documented', source: 'https://platform.claude.com/docs/en/build-with-claude/vision',
      note: '直连 Claude：单图编码后 10MB、整包 32MB；模型内部仍会缩放，4.7 及更新型号可读取更高分辨率。' })
  } else if (provider === 'gemini') {
    Object.assign(p, { maxCount: 8, maxBytes: 12000000, maxTotalBytes: 13000000, maxDimension: 8192, maxPixels: 16000000,
      requestMaxBytes: 20000000, status: 'partial', source: 'https://ai.google.dev/gemini-api/docs/image-understanding',
      note: '当前使用内联图片，包含 Base64、文字及 JSON 的整包不得超过 20MB；未使用 Files API。' })
  } else if (provider === 'deepseek' && model === 'deepseek-v4-flash-vision-exp') {
    Object.assign(p, { maxCount: 8, maxBytes: 20 * 1024 * 1024, maxTotalBytes: 48 * 1024 * 1024, maxDimension: 8192,
      maxPixels: 32000000, requestMaxBytes: 48 * 1024 * 1024, status: 'documented', source: 'https://api-docs.deepseek.com/guides/vision/',
      note: 'URL 输入官方单图 32MiB、合计 64MiB；模型内部约缩至 800×800，密集小字建议局部裁剪。' })
  } else if (provider === 'openai') {
    Object.assign(p, { maxCount: 8, maxBytes: 16000000, maxTotalBytes: 48000000, maxDimension: 8192, maxPixels: 32000000,
      requestMaxBytes: 50000000, status: 'partial', source: 'https://developers.openai.com/api/docs/guides/images-vision',
      note: '平台额度低于当前通用 API 上限；模型和 detail 各自的缩放、patch 与上下文限制仍适用。' })
  } else if (provider === 'xai') {
    Object.assign(p, { maxCount: 8, maxBytes: 16000000, maxTotalBytes: 48000000, maxDimension: 8192, maxPixels: 32000000,
      mimeTypes: ['image/png', 'image/jpeg'], status: 'partial', source: 'https://docs.x.ai/developers/model-capabilities/images/understanding',
      note: '官方单图 20MiB、PNG/JPEG；平台限制同批数量和总量，完整请求总量仍待确认。' })
  } else if (provider === 'mistral') {
    Object.assign(p, { maxCount: 8, maxBytes: 16000000, maxTotalBytes: 32000000, status: 'partial',
      source: 'https://docs.mistral.ai/resources/known-limitations', note: '官方单图 20MB；不同型号数量与总量受上下文限制。' })
  } else if (provider === 'tokendance' && /^qwen(?:3\.[5-8]|3-vl)/.test(model)) {
    Object.assign(p, { maxCount: 8, maxBytes: 8000000, maxTotalBytes: 24000000, status: 'unconfirmed',
      source: 'https://tokendance.space/docs/protocol-openai-chat-completions',
      note: '观猹该型号支持识图，但渠道未公布完整图片限额；8 张是平台额度，不代表上游保证，原厂额度不直接沿用。' })
  } else if (provider === 'fireworks') {
    Object.assign(p, { maxTotalBytes: 6500000, requestMaxBytes: 10000000, source: 'https://docs.fireworks.ai/guides/querying-vision-language-models',
      note: '保守按官方 Base64 合计小于 10MB 收紧；所选型号数量与 URL 输入的完整限额待确认。' })
  }
  return p
}
export function referenceUploadContract(platform = REFERENCE_UPLOAD_PLATFORM) {
  return { version: REFERENCE_UPLOAD_VERSION, checkedAt: '2026-09-10', platform }
}
export function activeReferenceUploadPolicy(contract: any, route: any, workflow = 'generation') {
  const platform = contract?.version >= 2 ? { ...REFERENCE_UPLOAD_PLATFORM, ...contract.platform } : {
    ...REFERENCE_UPLOAD_PLATFORM, maxCount: 3, maxBytes: 5 * 1024 * 1024, maxTotalBytes: 15 * 1024 * 1024,
    maxPixels: 20000000,
  }
  const submission = referenceSubmissionPolicy(route?.accessProvider || '', route?.modelId || '', workflow)
  const maxCount = Math.min(platform.maxCount, submission.maxCount)
  return { platform, submission, maxCount, modelLabel: route?.modelId || '未选择模型', workflow, version: contract?.version || 1 }
}
export function referenceUploadSelectionError(images: { size: number; width?: number; height?: number; filename?: string; mimeType?: string }[], policy: ReturnType<typeof activeReferenceUploadPolicy>) {
  const raw = policy.platform
  if (images.some(x => x.mimeType === 'image/svg+xml' && x.size > raw.maxSvgBytes)) return 'SVG 原文件最多 5MiB；请简化路径或导出 PNG。已选文件会保留。'
  if (images.length > policy.maxCount) return `当前 ${policy.modelLabel} 最多提交 ${policy.maxCount} 张，已选 ${images.length} 张。文件已保留，请移除部分图片或切换模型。`
  if (images.some(x => !Number.isSafeInteger(x.size) || x.size < 1 || x.size > raw.maxBytes)) return `单张原图须大于 0 且不超过 ${referenceBytesLabel(raw.maxBytes)}。文件已保留，请重新导出。`
  if (images.reduce((sum, x) => sum + x.size, 0) > raw.maxTotalBytes) return `原图合计不能超过 ${referenceBytesLabel(raw.maxTotalBytes)}。请减少图片或重新导出，已选文件会保留。`
  if (images.some(x => x.width && x.height && (x.width > raw.maxDimension || x.height > raw.maxDimension || x.width * x.height > raw.maxPixels))) return `原图单边最多 ${raw.maxDimension}px、单张 ${raw.maxPixels / 1e6}MP。请裁剪或缩小，已选文件会保留。`
  return images.map(image => referenceModelDimensionsError(image, policy)).find(Boolean) || ''
}
export function referenceModelDimensionsError(image: {width?: number; height?: number}, policy: ReturnType<typeof activeReferenceUploadPolicy>) {
  const {width, height} = image
  if (!width || !height) return ''
  const s = policy.submission
  const scale = Math.min(1, s.maxDimension / Math.max(width, height), Math.sqrt(s.maxPixels / (width * height)))
  if (Math.max(width / height, height / width) > s.maxAspectRatio || Math.floor(Math.min(width, height) * scale) < s.minDimension) {
    return `当前 ${policy.modelLabel} 要求处理后短边至少 ${s.minDimension}px、长短边之比不超过 ${s.maxAspectRatio}。原图已保留，请裁剪长边、重新导出或切换模型。`
  }
  return ''
}
export function referenceBytesLabel(bytes: number) { return `${Number((bytes / 1024 / 1024).toFixed(1))}MiB` }
export function referencePolicyHint(policy: ReturnType<typeof activeReferenceUploadPolicy>) {
  const p = policy.platform
  return `平台原图最多 ${p.maxCount} 张（当前模型可提交 ${policy.maxCount} 张），单张 ${referenceBytesLabel(p.maxBytes)}，合计 ${referenceBytesLabel(p.maxTotalBytes)}；单边 ${p.maxDimension}px、单张 ${p.maxPixels / 1e6}MP；SVG 最多 5MiB，文字需转曲。${policy.workflow === 'refine' ? '直接编辑原图' : '参考图用于识图与提示词规划'}：${policy.modelLabel}。`
}
export function referenceProcessingHint(policy: ReturnType<typeof activeReferenceUploadPolicy>) {
  if (policy.version < 2) return '当前后端使用旧上传协议，按原有限额校验；升级后将提供模型所需的无损处理与动态提交限额。'
  const s = policy.submission
  return `提交模型前校正方向；符合要求且无需旋转缩放的 JPEG/WebP 保留原字节，其余优先无损 PNG，必要时等比缩至 ${s.maxDimension}px / ${s.maxPixels / 1e6}MP，不放大小图；短边至少 ${s.minDimension}px、长短边之比≤${s.maxAspectRatio}；单张 ${referenceBytesLabel(s.maxBytes)}，合计 ${referenceBytesLabel(s.maxTotalBytes)}。原文件保留，不自动有损压缩；仍超限请裁剪或更换模型。${s.note}`
}

// Use the server-issued deadline, including time already spent in the PUT queue.
// Keep five seconds for finalize; older backends use the existing 15-minute TTL.
export function referenceUploadTimeout(expiresAt?: number, now = Date.now()) {
  const deadline = Number.isSafeInteger(expiresAt) && Number(expiresAt) > 0 ? Number(expiresAt) : now + 900000
  return Math.max(0, Math.min(2147483647, deadline - now - 5000))
}

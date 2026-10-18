import { materialError } from './material-files.js'

// Read complete, bounded originals before making the single optimization call.
// No model-driven reader loop: a failed read must not consume inference quota.
export async function readOptimizationMaterials(service: any, owner: any, refs: any[], maxImages: number, signal?: AbortSignal) {
  const files = await service.bind(owner, refs), records: any[] = [], images: any[] = []
  let reads = 0
  async function read(file: any, operation: any) {
    signal?.throwIfAborted()
    if (++reads > 50) materialError('附件读取范围过大，请精简后再优化；没有忽略剩余内容。')
    const result = await service.read(owner, file.id, operation)
    signal?.throwIfAborted()
    if (result.chunks?.some((c: any) => c.notice)) materialError(`${file.filename} 内容超出单次读取容量，请精简后再优化。`)
    for (const image of result.images || []) images.push({ ...image, filename: file.filename })
    if (images.length > maxImages) materialError(`附件共有超过 ${maxImages} 张页面图片，超出当前主模型读取能力，请减少附件或页数。`)
    records.push({ filename: file.filename, format: file.format, sourceHash: result.sourceHash, operation, chunks: result.chunks,
      // Per-chunk coverage warnings no longer apply once all ranges are read.
      warnings: (result.warnings || []).filter((w: string) => !/^本次仅读取第/.test(w)),
      imagePages: (result.images || []).map((im: any) => im.page) })
    if (JSON.stringify(records).length > 100000) materialError('附件内容超过优化读取容量，请精简文件；没有截断内容。')
    return result
  }
  for (const file of files) {
    if (['txt', 'md', 'csv', 'tsv', 'json'].includes(file.format)) {
      let result = await read(file, { op: 'read', startLine: 1, endLine: 1001 })
      for (let start = 1002; start <= result.lineCount; start += 1001) await read(file, { op: 'read', startLine: start, endLine: start + 1000 })
    } else if (file.format === 'xlsx') {
      const info = await service.read(owner, file.id, { op: 'overview' })
      if (!info.sheetRanges) materialError('当前材料服务缺少完整工作表范围，请更新服务后再优化。')
      for (const sheet of info.sheetRanges) for (let start = 1; start <= Math.max(1, sheet.lastRow); start += 100) {
        await read(file, { op: 'read', sheet: sheet.name, startRow: start, endRow: Math.min(start + 99, Math.max(1, sheet.lastRow)) })
      }
    } else {
      if (!maxImages) materialError('附件需要读取页面画面，请在模型配置中选择支持看图的主模型。')
      const first = await read(file, { op: 'render', pages: [1] })
      if (images.length + first.pageCount - 1 > maxImages) materialError(`${file.filename} 共 ${first.pageCount} 页，超出当前主模型的页面读取容量，请截取相关页。`)
      for (let page = 2; page <= first.pageCount; page += 3) await read(file, { op: 'render', pages: Array.from({ length: Math.min(3, first.pageCount - page + 1) }, (_, i) => page + i) })
    }
  }
  return { records, images, warnings: [...new Set(records.flatMap(r => r.warnings))] }
}

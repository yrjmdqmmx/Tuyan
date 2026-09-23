import { createHash } from 'node:crypto'
import { inflateSync } from 'node:zlib'

/** Technical evidence from bytes emitted by our converter, not a general PDF/PS validator. */
export type ExportInspectionCheck = {
  id: string
  scope: 'exported-file'
  status: 'passed' | 'problem' | 'manual' | 'unverified'
  message: string
  actual: Record<string, unknown>
}
export type ExportInspectionExpected = { widthMm: number; heightMm: number }
const LIMIT = 8 * 1024 * 1024
const MAX_OBJECTS = 4096
const MAX_TOKENS = 200_000
type Name = { name: string }
type Ref = { ref: number; generation: number }
type Bytes = { bytes: Buffer }
type Value = null | boolean | number | Name | Ref | Bytes | Value[] | Dict
type Dict = { [key: string]: Value }
type PdfObject = { value: Value; stream?: Buffer }
class Unsupported extends Error {}
function unsupported(message: string): never { throw new Unsupported(message) }
const isDict = (v: Value | undefined): v is Dict => Boolean(v && typeof v === 'object' && !Array.isArray(v) && !('name' in v) && !('ref' in v) && !('bytes' in v))
const isName = (v: Value | undefined): v is Name => Boolean(v && typeof v === 'object' && 'name' in v)
const isRef = (v: Value | undefined): v is Ref => Boolean(v && typeof v === 'object' && 'ref' in v)
const isBytes = (v: Value | undefined): v is Bytes => Boolean(v && typeof v === 'object' && 'bytes' in v)
const named = (v: Value | undefined, name: string) => isName(v) && v.name === name
const check = (id: string, status: ExportInspectionCheck['status'], message: string, actual: Record<string, unknown> = {}): ExportInspectionCheck => ({ id, scope: 'exported-file', status, message, actual })
const rounded = (n: number) => Math.round(n * 100_000) / 100_000
const whitespace = (c: number) => c === 0 || c === 9 || c === 10 || c === 12 || c === 13 || c === 32
const delimiter = (c: number) => !Number.isFinite(c) || whitespace(c) || '()<>[]{}/%'.includes(String.fromCharCode(c))

/** Strict PDF lexical subset. Strings/comments cannot masquerade as dictionaries/operators. */
class Reader {
  position = 0
  tokens = 0
  constructor(readonly data: Buffer, readonly budget: { tokens: number }) {}
  skip() {
    while (this.position < this.data.length) {
      if (whitespace(this.data[this.position])) { this.position++; continue }
      if (this.data[this.position] !== 37) break
      while (this.position < this.data.length && ![10, 13].includes(this.data[this.position])) this.position++
    }
  }
  word() {
    this.skip()
    const start = this.position
    while (this.position < this.data.length && !delimiter(this.data[this.position])) this.position++
    if (start === this.position) unsupported('不支持或不完整的 PDF 标记')
    return this.data.toString('latin1', start, this.position)
  }
  expect(word: string) { if (this.word() !== word) unsupported('PDF 对象结构不完整') }
  value(depth = 0, allowRef = true): Value {
    if (++this.budget.tokens > MAX_TOKENS || depth > 32) unsupported('PDF 解析复杂度超过核验上限')
    this.skip()
    const c = this.data[this.position++]
    if (c === 47) {
      const start = this.position
      while (this.position < this.data.length && !delimiter(this.data[this.position])) this.position++
      const raw = this.data.toString('latin1', start, this.position)
      if (!raw || /#(?![a-fA-F0-9]{2})/.test(raw)) unsupported('PDF 名称编码不受支持')
      return { name: raw.replace(/#([a-fA-F0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))) }
    }
    if (c === 40) {
      let nesting = 1
      const bytes: number[] = []
      while (this.position < this.data.length && nesting) {
        let next = this.data[this.position++]
        if (next === 92) {
          next = this.data[this.position++]
          if (next === 13 || next === 10) { if (next === 13 && this.data[this.position] === 10) this.position++; continue }
          if (next >= 48 && next <= 55) {
            let octal = String.fromCharCode(next)
            for (let i = 0; i < 2 && this.data[this.position] >= 48 && this.data[this.position] <= 55; i++) octal += String.fromCharCode(this.data[this.position++])
            bytes.push(parseInt(octal, 8) & 255); continue
          }
          next = ({ 110: 10, 114: 13, 116: 9, 98: 8, 102: 12 } as Record<number, number>)[next] ?? next
          if (!Number.isFinite(next)) unsupported('PDF 字符串截断')
          bytes.push(next); continue
        }
        if (next === 40) { if (++nesting > 32) unsupported('PDF 字符串嵌套过深') }
        if (next === 41 && --nesting === 0) break
        bytes.push(next)
      }
      if (nesting) unsupported('PDF 字符串未闭合')
      return { bytes: Buffer.from(bytes) }
    }
    if (c === 60 && this.data[this.position] !== 60) {
      const start = this.position, end = this.data.indexOf(62, start)
      if (end < 0) unsupported('PDF 十六进制字符串未闭合')
      let hex = this.data.toString('latin1', start, end).replace(/[\x00\t\n\f\r ]/g, '')
      if (!/^[\da-fA-F]*$/.test(hex)) unsupported('PDF 十六进制字符串无效')
      if (hex.length % 2) hex += '0'
      this.position = end + 1
      return { bytes: Buffer.from(hex, 'hex') }
    }
    if (c === 60 && this.data[this.position++] === 60) {
      const dict = Object.create(null) as Dict
      while (true) {
        this.skip()
        if (this.data[this.position] === 62 && this.data[this.position + 1] === 62) { this.position += 2; return dict }
        const key = this.value(depth + 1)
        if (!isName(key) || Object.hasOwn(dict, key.name)) unsupported('PDF 字典名称重复或无效')
        dict[key.name] = this.value(depth + 1)
      }
    }
    if (c === 91) {
      const array: Value[] = []
      while (true) {
        this.skip()
        if (this.data[this.position] === 93) { this.position++; return array }
        if (array.length >= MAX_OBJECTS) unsupported('PDF 数组超过核验上限')
        array.push(this.value(depth + 1))
      }
    }
    this.position--
    const token = this.word()
    if (token === 'null') return null
    if (token === 'true' || token === 'false') return token === 'true'
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) unsupported('PDF 值不属于受支持语法')
    const n = Number(token)
    if (!Number.isFinite(n) || Math.abs(n) > 1e12) unsupported('PDF 数字超出核验范围')
    if (allowRef && Number.isSafeInteger(n) && n >= 0) {
      const position = this.position
      try {
        const generation = this.word()
        if (/^\d+$/.test(generation) && this.word() === 'R') return { ref: n, generation: Number(generation) }
      } catch { /* not an indirect reference */ }
      this.position = position
    }
    return n
  }
}

class Pdf {
  readonly budget = { tokens: 0 }
  readonly xref = new Map<number, { offset: number; generation: number }>()
  readonly objects = new Map<number, PdfObject>()
  readonly resolving = new Set<number>()
  readonly trailer: Dict
  decodedBytes = 0
  constructor(readonly bytes: Buffer) {
    if (!/^%PDF-1\.[0-7][\r\n]/.test(bytes.subarray(0, 16).toString('latin1'))) unsupported('PDF 版本或文件头不受支持')
    const ending = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(bytes.subarray(Math.max(0, bytes.length - 4096)).toString('latin1'))
    if (!ending) unsupported('PDF 缺少最终交叉引用位置')
    const offset = Number(ending[1])
    if (!Number.isSafeInteger(offset) || offset < 8 || offset >= bytes.length) unsupported('PDF 交叉引用位置无效')
    const r = new Reader(bytes, this.budget); r.position = offset
    if (r.word() !== 'xref') unsupported('当前仅核验传统 xref；交叉引用流或对象流尚未核实')
    const indexed = new Set<number>()
    while (true) {
      const token = r.word()
      if (token === 'trailer') break
      const countWord = r.word(), start = Number(token), count = Number(countWord)
      if (!/^\d+$/.test(token) || !/^\d+$/.test(countWord) || start + count > MAX_OBJECTS || count < 1) unsupported('PDF 交叉引用范围无效或过大')
      for (let i = 0; i < count; i++) {
        const o = r.word(), g = r.word(), state = r.word(), id = start + i
        if (!/^\d{10}$/.test(o) || !/^\d{5}$/.test(g) || !['n', 'f'].includes(state) || indexed.has(id)) unsupported('PDF 交叉引用条目无效')
        indexed.add(id)
        if (state === 'n') {
          const objectOffset = Number(o)
          if (id === 0 || objectOffset < 8 || objectOffset >= offset) unsupported('PDF 对象位置超出有效范围')
          this.xref.set(id, { offset: objectOffset, generation: Number(g) })
        }
      }
    }
    const parsedTrailer = r.value()
    if (!isDict(parsedTrailer)) unsupported('PDF trailer 字典缺失')
    const trailer = parsedTrailer as Dict
    if (trailer.Encrypt !== undefined || trailer.Prev !== undefined || trailer.XRefStm !== undefined) unsupported('加密、增量或混合交叉引用 PDF 尚未核实')
    if (typeof trailer.Size !== 'number' || trailer.Size > MAX_OBJECTS || trailer.Size <= Math.max(0, ...this.xref.keys())) unsupported('PDF trailer Size 与索引不符')
    this.trailer = trailer
  }
  object(ref: Ref): PdfObject {
    const entry = this.xref.get(ref.ref)
    if (!entry || entry.generation !== ref.generation) unsupported('PDF 引用缺失或代次不一致')
    const cached = this.objects.get(ref.ref)
    if (cached) return cached
    if (this.resolving.has(ref.ref) || this.resolving.size > 32) unsupported('PDF 对象解析循环或嵌套过深')
    this.resolving.add(ref.ref)
    try {
      const r = new Reader(this.bytes, this.budget); r.position = entry.offset
      if (r.word() !== String(ref.ref) || r.word() !== String(ref.generation)) unsupported('PDF xref 未指向声明对象')
      r.expect('obj'); const value = r.value(); const next = r.word()
      let stream: Buffer | undefined
      if (next === 'stream') {
        if (!isDict(value)) unsupported('PDF 流缺少字典')
        const length = this.resolve((value as Dict).Length)
        if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0 || length > LIMIT) unsupported('PDF 流长度无效')
        if (r.data[r.position] === 13) r.position++
        if (r.data[r.position++] !== 10) unsupported('PDF stream 缺少换行')
        const end = r.position + length
        if (end > this.bytes.length) unsupported('PDF 流数据截断')
        stream = this.bytes.subarray(r.position, end); r.position = end
        r.expect('endstream'); r.expect('endobj')
      } else if (next !== 'endobj') unsupported('PDF 对象未结束')
      const object = { value, stream }; this.objects.set(ref.ref, object); return object
    } finally { this.resolving.delete(ref.ref) }
  }
  resolve(value: Value | undefined): Value {
    if (value === undefined) return null
    return isRef(value) ? this.object(value).value : value
  }
  dictionary(value: Value | undefined): Dict {
    const resolved = this.resolve(value)
    if (!isDict(resolved)) unsupported('PDF 所需字典缺失')
    return resolved
  }
  stream(ref: Value): Buffer {
    if (!isRef(ref)) unsupported('PDF 内容流不是独立对象')
    const object = this.object(ref), dict = this.dictionary(ref)
    if (!object.stream) unsupported('PDF 内容对象缺少流')
    let bytes = object.stream
    const filter = this.resolve(dict.Filter)
    if (filter !== null) {
      if (!(named(filter, 'FlateDecode') || Array.isArray(filter) && filter.length === 1 && named(filter[0], 'FlateDecode')) || dict.DecodeParms !== undefined) unsupported('PDF 压缩过滤器或预测参数尚未核实')
      try { bytes = inflateSync(bytes, { maxOutputLength: LIMIT - this.decodedBytes }) } catch { return unsupported('PDF 压缩流无效或解压大小超过上限') }
    }
    this.decodedBytes += bytes.length
    if (this.decodedBytes > LIMIT) unsupported('PDF 解压总量超过核验上限')
    return bytes
  }
}

type Page = { ref: Ref; dict: Dict; resources: Dict; media: number[]; crop: number[]; rotate: number; userUnit: number }
function pdfPages(pdf: Pdf): Page[] {
  const catalog = pdf.dictionary(pdf.trailer.Root)
  if (!named(catalog.Type, 'Catalog')) unsupported('PDF 根对象不是 Catalog')
  const pages: Page[] = [], visited = new Set<number>()
  const box = (value: Value | undefined) => {
    const v = pdf.resolve(value)
    if (!Array.isArray(v) || v.length !== 4 || v.some(n => typeof n !== 'number' || !Number.isFinite(n)) || Number(v[2]) <= Number(v[0]) || Number(v[3]) <= Number(v[1])) unsupported('PDF 页面范围不完整或无效')
    return v as number[]
  }
  const walk = (value: Value, inherited: Dict, parent?: Ref, depth = 0): number => {
    if (!isRef(value) || depth > 16 || visited.has(value.ref)) unsupported('PDF 页面树循环、重复或过深')
    visited.add(value.ref)
    const d = pdf.dictionary(value), props = { ...inherited }
    if (parent && (!isRef(d.Parent) || d.Parent.ref !== parent.ref || d.Parent.generation !== parent.generation)) unsupported('PDF 页面父引用不一致')
    for (const key of ['MediaBox', 'CropBox', 'Rotate', 'Resources']) if (d[key] !== undefined) props[key] = d[key]
    if (named(d.Type, 'Pages')) {
      const kids = pdf.resolve(d.Kids)
      if (!Array.isArray(kids) || !kids.length || kids.length > 64) unsupported('PDF 页面分支不完整或过多')
      const count = kids.reduce<number>((sum, child) => sum + walk(child, props, value, depth + 1), 0)
      if (pdf.resolve(d.Count) !== count) unsupported('PDF 页面树 Count 与实际页数不同')
      return count
    }
    if (!named(d.Type, 'Page') || pages.length >= 64) unsupported('PDF 页面类型不受支持或页数过多')
    const media = box(props.MediaBox), rawCrop = props.CropBox === undefined ? media : box(props.CropBox)
    const crop = [Math.max(media[0], rawCrop[0]), Math.max(media[1], rawCrop[1]), Math.min(media[2], rawCrop[2]), Math.min(media[3], rawCrop[3])]
    const rotate = props.Rotate === undefined ? 0 : pdf.resolve(props.Rotate), userUnit = d.UserUnit === undefined ? 1 : pdf.resolve(d.UserUnit)
    if (typeof rotate !== 'number' || ![0, 90, 180, 270, -90, -180, -270].includes(rotate) || typeof userUnit !== 'number' || userUnit <= 0 || userUnit > 75000 || crop[2] <= crop[0] || crop[3] <= crop[1]) unsupported('PDF 页面变换或可见范围不受支持')
    pages.push({ ref: value, dict: d, resources: props.Resources === undefined ? Object.create(null) : pdf.dictionary(props.Resources), media, crop, rotate, userUnit })
    return 1
  }
  walk(catalog.Pages, Object.create(null))
  return pages
}

function dimensions(pages: Page[], expected?: ExportInspectionExpected) {
  const measured = pages.map(page => {
    let width = (page.crop[2] - page.crop[0]) * page.userUnit, height = (page.crop[3] - page.crop[1]) * page.userUnit
    if (Math.abs(page.rotate) % 180 === 90) [width, height] = [height, width]
    return { mediaBoxPt: page.media, visibleBoxPt: page.crop, rotate: page.rotate, userUnit: page.userUnit, widthMm: rounded(width * 25.4 / 72), heightMm: rounded(height * 25.4 / 72) }
  })
  const matches = !expected || measured.length === 1 && Math.abs(measured[0].widthMm - expected.widthMm) <= 0.02 && Math.abs(measured[0].heightMm - expected.heightMm) <= 0.02
  return check('export-page-size', matches ? 'passed' : 'problem', matches ? '已从完整 PDF 页面树核验实际页数、可见页面尺寸及页面旋转；不表示内容边界或全部期刊规则通过。' : '实际 PDF 页数或页面尺寸与本次导出画布不一致。', { unit: 'mm', pages: measured, ...(expected ? { expected, toleranceMm: 0.02 } : {}) })
}

/** Operator evidence only: no claim about glyph meaning, visual size or editability. */
function pdfTextEvidence(pdf: Pdf, pages: Page[]): ExportInspectionCheck[] {
  let operations = 0, encodedBytes = 0
  const fonts: Record<string, unknown>[] = [], knownFonts = new Set<string>()
  const safeOperators = new Set('q Q cm w J j M d ri i gs m l c v y h re S s f F f* B B* b b* n W W* CS cs SC SCN sc scn G g RG rg K k sh MP DP BMC BDC EMC Tc Tw Tz TL Td TD Tm T* Tr Ts'.split(' '))
  const inspectFont = (resources: Dict, key: string) => {
    const fontResources = pdf.dictionary(resources.Font), ref = fontResources[key]
    if (!isRef(ref)) unsupported('文字使用的 PDF 字体不是已解析的独立资源')
    const identity = `${ref.ref}:${ref.generation}`
    if (knownFonts.has(identity)) return
    const font = pdf.dictionary(ref)
    if (!named(font.Type, 'Font') || !isName(font.Subtype) || !isName(font.BaseFont)) unsupported('PDF 字体类型或名称尚未核实')
    let descriptor: Dict
    if (named(font.Subtype, 'Type0')) {
      const descendants = pdf.resolve(font.DescendantFonts)
      if (!Array.isArray(descendants) || descendants.length !== 1) unsupported('PDF 复合字体后代结构尚未核实')
      const child = pdf.dictionary(descendants[0])
      if (!named(child.Subtype, 'CIDFontType2') && !named(child.Subtype, 'CIDFontType0')) unsupported('PDF 复合字体类型尚未核实')
      descriptor = pdf.dictionary(child.FontDescriptor)
    } else if (named(font.Subtype, 'TrueType') || named(font.Subtype, 'Type1')) {
      descriptor = font.FontDescriptor === undefined ? Object.create(null) : pdf.dictionary(font.FontDescriptor)
    } else return unsupported('PDF Type3 或其他字体尚未核实')
    const embedded: string[] = []
    for (const field of ['FontFile', 'FontFile2', 'FontFile3']) if (descriptor[field] !== undefined) {
      const value = descriptor[field]
      if (!isRef(value) || !pdf.stream(value).length) unsupported('PDF 声明的嵌入字体数据缺失')
      embedded.push(field)
    }
    knownFonts.add(identity)
    fonts.push({ resource: key, object: identity, baseFont: font.BaseFont.name, subtype: font.Subtype.name, embeddedStreamFields: embedded, embedded: embedded.length > 0 })
  }
  try {
    let formVisits = 0
    const activeForms = new Set<number>()
    const inspectContents = (contents: Value[], resources: Dict, depth = 0) => {
      if (depth > 8) unsupported('PDF Form 嵌套超过核验上限')
      if (resources.Pattern !== undefined) unsupported('PDF 平铺图案内文字尚未核实')
      const streams = contents.map(value => pdf.stream(value))
      const reader = new Reader(Buffer.concat(streams.flatMap((b, i) => i ? [Buffer.from('\n'), b] : [b])), pdf.budget)
      let operands: Value[] = [], inText = false, font: string | undefined
      const savedFonts: (string | undefined)[] = []
      while (true) {
        reader.skip(); if (reader.position >= reader.data.length) break
        const c = reader.data[reader.position]
        if (c === 47 || c === 40 || c === 60 || c === 91 || c === 43 || c === 45 || c === 46 || c >= 48 && c <= 57) {
          if (operands.length > 256) unsupported('PDF 内容操作数过多')
          operands.push(reader.value(0, false)); continue
        }
        const op = reader.word()
        if (++pdf.budget.tokens > MAX_TOKENS) unsupported('PDF 内容操作超过核验上限')
        if (op === 'BT') { if (inText || operands.length) unsupported('PDF 文字对象边界无效'); inText = true }
        else if (op === 'ET') { if (!inText || operands.length) unsupported('PDF 文字对象边界无效'); inText = false }
        else if (op === 'Tf') {
          if (!inText || operands.length !== 2 || !isName(operands[0]) || typeof operands[1] !== 'number') unsupported('PDF 字体选择指令无效')
          font = operands[0].name
        } else if (['Tj', 'TJ', "'", '"'].includes(op)) {
          if (!inText || !font) unsupported('PDF 文字指令缺少文字对象或字体')
          const value = operands.at(-1)
          const strings = op === 'TJ' && Array.isArray(value) ? value.filter(isBytes) : isBytes(value) ? [value] : []
          const requiredOperands = op === '"' ? 3 : 1
          if (operands.length !== requiredOperands || !strings.length || op === 'TJ' && (!Array.isArray(value) || value.some(v => !isBytes(v) && typeof v !== 'number')) || op === '"' && operands.slice(0, 2).some(v => typeof v !== 'number')) unsupported('PDF 文字绘制操作数不受支持')
          inspectFont(resources, font)
          operations++; encodedBytes += strings.reduce((sum, s) => sum + s.bytes.length, 0)
        } else if (op === 'Do') {
          if (operands.length !== 1 || !isName(operands[0])) unsupported('PDF 外部对象指令无效')
          const ref = pdf.dictionary(resources.XObject)[operands[0].name]
          if (!isRef(ref)) unsupported('PDF 外部对象引用无效')
          const object = pdf.dictionary(ref)
          if (named(object.Subtype, 'Form')) {
            if (activeForms.has(ref.ref) || ++formVisits > 256) unsupported('PDF Form 引用循环或数量过多')
            for (const [key, length] of [['BBox', 4], ['Matrix', 6]] as const) {
              if (key === 'Matrix' && object.Matrix === undefined) continue
              const v = pdf.resolve(object[key])
              if (!Array.isArray(v) || v.length !== length || v.some(n => typeof n !== 'number' || !Number.isFinite(n))) unsupported('PDF Form 范围或变换尚未核实')
            }
            if (object.Ref !== undefined || object.PS !== undefined || object.OC !== undefined) unsupported('PDF Form 外部或条件内容尚未核实')
            activeForms.add(ref.ref)
            inspectContents([ref], object.Resources === undefined ? resources : pdf.dictionary(object.Resources), depth + 1)
            activeForms.delete(ref.ref)
          } else if (!named(object.Subtype, 'Image')) unsupported('PDF 外部对象类型尚未核实')
        } else if (op === 'gs') {
          if (operands.length !== 1 || !isName(operands[0])) unsupported('PDF 图形状态引用无效')
          const state = pdf.dictionary(pdf.dictionary(resources.ExtGState)[operands[0].name])
          if (state.Font !== undefined) unsupported('PDF 图形状态中的字体切换尚未核实')
          if (state.SMask !== undefined && !named(state.SMask, 'None')) unsupported('PDF 软遮罩中的文字尚未核实')
        } else if (op === 'q') {
          if (operands.length || savedFonts.length > 64) unsupported('PDF 图形状态栈无效或过深')
          savedFonts.push(font)
        } else if (op === 'Q') {
          if (operands.length || !savedFonts.length) unsupported('PDF 图形状态栈不平衡')
          font = savedFonts.pop()
        } else if (op === 'cm' || op === 'Tm') {
          if (operands.length !== 6 || operands.some(v => typeof v !== 'number')) unsupported('PDF 变换矩阵尚未核实')
        } else if (!safeOperators.has(op)) unsupported('PDF 内容含未支持的操作符')
        operands = []
      }
      if (inText || operands.length || savedFonts.length) unsupported('PDF 内容、文字对象或图形状态未闭合')
    }
    for (const page of pages) {
      if (page.dict.Annots !== undefined) unsupported('PDF 注释中的附加文字尚未核实')
      const contents = page.dict.Contents === undefined ? [] : Array.isArray(pdf.resolve(page.dict.Contents)) ? pdf.resolve(page.dict.Contents) as Value[] : [page.dict.Contents]
      inspectContents(contents, page.resources)
    }
    return [
      check('export-text-operators', operations && encodedBytes ? 'passed' : 'unverified', operations && encodedBytes ? '实际 PDF 内容流含文字绘制指令及编码字符串；此证据不验证字形内容、可见性、字号或外部软件可编辑性。' : '实际 PDF 未发现含字符数据的文字绘制指令；可能没有文字或已经转为轮廓，不能据此认证文字可编辑。', { textShowOperations: operations, encodedStringBytes: encodedBytes, evidenceKind: 'operators-only' }),
      check('export-font-embedding', fonts.length ? fonts.every(f => f.embedded) ? 'passed' : 'problem' : 'unverified', fonts.length ? fonts.every(f => f.embedded) ? '已核对文字所引用字体的非空嵌入数据流；未验证字体程序、字形映射、字体替代或授权。' : '实际 PDF 文字所引用的部分字体没有嵌入数据流。' : '没有可核验的已使用字体资源。', { fonts, evidenceKind: 'resource-stream-presence' }),
    ]
  } catch (error) {
    return [check('export-text-operators', 'unverified', `当前检查器不能完整核验 PDF 文字：${reason(error)}。`, { partialTextShowOperations: operations, partialEncodedStringBytes: encodedBytes }), check('export-font-embedding', 'unverified', '文字路径未完整解析，不能认证所有已使用字体的嵌入情况。', { partialFonts: fonts })]
  }
}

function inspectEps(bytes: Buffer, expected?: ExportInspectionExpected): ExportInspectionCheck[] {
  const text = bytes.toString('latin1')
  if (!/^%!PS-Adobe-3\.0 EPSF-3\.0\r?\n/.test(text) || !/%%EOF\s*$/.test(text)) unsupported('EPS 文件头或结束标记不完整')
  if (/^%%Begin(?:Binary|Data|Document|File)\b/m.test(text)) unsupported('嵌套文档或二进制 DSC 段尚未核实')
  const endComments = text.search(/^%%EndComments\r?$/m), trailers = [...text.matchAll(/^%%Trailer\r?$/gm)]
  const trailer = trailers.length === 1 ? trailers[0].index! : -1
  if (endComments < 0 || endComments > 16_384 || trailer <= endComments) unsupported('EPS 缺少受支持的 DSC 头部或 trailer')
  const header = text.slice(0, endComments), tail = text.slice(trailer)
  if (header.split(/\r?\n/).some(line => line.trim() && !line.startsWith('%'))) unsupported('EPS DSC 头部包含可执行内容')
  const readBox = (name: string): number[] | null => {
    const expression = new RegExp(`^%%${name}:([^\\r\\n]*)$`, 'gm')
    const headerValues = [...header.matchAll(expression)].map(m => m[1].trim())
    if (!headerValues.length) return null
    if (headerValues.length !== 1) unsupported('EPS 页面范围声明重复')
    let value = headerValues[0]
    if (value === '(atend)') {
      const endValues = [...tail.matchAll(expression)].map(m => m[1].trim())
      if (endValues.length !== 1) unsupported('EPS 延迟页面范围缺失或重复')
      value = endValues[0]
    }
    const parts = value.split(/\s+/)
    if (parts.length !== 4 || parts.some(v => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v))) unsupported('EPS 页面范围不是有效数字')
    const box = parts.map(Number)
    if (box.some(n => !Number.isFinite(n) || Math.abs(n) > 1e7) || box[2] <= box[0] || box[3] <= box[1]) unsupported('EPS 页面范围无效')
    return box
  }
  const coarse = readBox('BoundingBox'), high = readBox('HiResBoundingBox')
  if (!coarse) unsupported('EPS 缺少 BoundingBox')
  if (coarse.some(n => !Number.isInteger(n))) unsupported('EPS BoundingBox 必须使用整数坐标')
  if (high && (high[0] < coarse[0] || high[1] < coarse[1] || high[2] > coarse[2] || high[3] > coarse[3])) unsupported('EPS 高精度范围与整数范围矛盾')
  const box = high || coarse, widthMm = rounded((box[2] - box[0]) * 25.4 / 72), heightMm = rounded((box[3] - box[1]) * 25.4 / 72)
  const toleranceMm = high ? 0.02 : 2 * 25.4 / 72
  const matches = !expected || Math.abs(widthMm - expected.widthMm) <= toleranceMm && Math.abs(heightMm - expected.heightMm) <= toleranceMm
  return [
    check('export-page-size', !matches ? 'problem' : high ? 'passed' : 'manual', !matches ? 'EPS 文件声明的边界尺寸与导出画布不一致。' : high ? '已读取实际 EPS 文件的高精度 DSC 范围；这是文件声明边界，没有执行 PostScript 核实渲染范围。' : 'EPS 只提供取整的 BoundingBox；已读出声明范围，但无法据此精确认证画布毫米尺寸。', { evidenceKind: 'dsc-declared-bounds', boundingBoxPt: coarse, hiResBoundingBoxPt: high, widthMm, heightMm, ...(expected ? { expected, toleranceMm } : {}) }),
    check('export-text-operators', 'unverified', 'EPS 的文字操作依赖 PostScript 程序及编码；当前检查器不执行 PostScript，未核验实际文字。', { evidenceKind: 'not-executed' }),
    check('export-font-embedding', 'unverified', 'EPS 字体资源声明不能证明字体可用或文字可编辑；需要受控外部检查。', { declaredFontResources: [...text.matchAll(/^%%BeginResource: font ([^\r\n]+)$/gm)].slice(0, 256).map(m => m[1]), evidenceKind: 'dsc-declarations-only' }),
  ]
}
const reason = (error: unknown) => error instanceof Unsupported ? error.message : '文件结构无法安全解析'

/** expected is comparison-only. No source document can turn missing file evidence into a pass. */
export function inspectFigureExport(bytes: Buffer, format: 'pdf' | 'eps', expected?: ExportInspectionExpected): { checks: ExportInspectionCheck[] } {
  const identity = { format, byteLength: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), inspectorVersion: 1 }
  let checks: ExportInspectionCheck[]
  try {
    if (!bytes.length || bytes.length > LIMIT) unsupported('文件为空或超过 8 MiB 核验上限')
    if (expected && (![expected.widthMm, expected.heightMm].every(n => Number.isFinite(n) && n > 0))) unsupported('尺寸比较目标无效')
    if (format === 'pdf') {
      const pdf = new Pdf(bytes), pages = pdfPages(pdf)
      checks = [dimensions(pages, expected), ...pdfTextEvidence(pdf, pages)]
    } else if (format === 'eps') checks = inspectEps(bytes, expected)
    else unsupported('文件格式不受支持')
  } catch (error) {
    checks = ['export-page-size', 'export-text-operators', 'export-font-embedding'].map(id => check(id, 'unverified', `实际文件未完成此项核验：${reason(error)}。`, { reason: reason(error) }))
  }
  checks = checks.map(value => ({ ...value, actual: { ...identity, ...value.actual } }))
  checks.push(check('export-visual-and-editing-review', 'manual', '实际文件的视觉一致性、完整文字内容、字号、字体替代、独立对象及外部软件编辑后保存重开，仍需人工核验；技术证据不等同于符合全部投稿要求。', identity))
  return { checks }
}

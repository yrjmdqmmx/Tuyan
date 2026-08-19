import { common } from '@kit.AbilityKit'
import { fileIo, picker } from '@kit.CoreFileKit'
import { REFERENCE_IMAGE_LIMITS } from '../constants/AppConstants'
import { PreparedUpload, ReferenceImageUpload, UploadedReferenceImage, UploadPrepareFile } from '../models/Types'
import { filenameFromUri, guessMimeType } from '../utils/Format'
import { ApiClient } from './ApiClient'

export class FileService {
  private context: common.UIAbilityContext
  private api: ApiClient

  constructor(context: common.UIAbilityContext, api: ApiClient) {
    this.context = context
    this.api = api
  }

  async pickReferenceFiles(currentCount: number): Promise<ReferenceImageUpload[]> {
    const remaining = REFERENCE_IMAGE_LIMITS.maxCount - currentCount
    if (remaining <= 0) return []

    const options = new picker.DocumentSelectOptions()
    options.maxSelectNumber = remaining
    options.fileSuffixFilters = ['图片|.png,.jpg,.jpeg,.webp,.svg']

    const viewPicker = new picker.DocumentViewPicker(this.context)
    const uris = await viewPicker.select(options)
    const files: ReferenceImageUpload[] = []
    for (let index = 0; index < uris.length; index += 1) {
      const uri = uris[index]
      const mimeType = guessMimeType(uri)
      const size = this.fileSize(uri)
      if (size > REFERENCE_IMAGE_LIMITS.maxBytes) {
        throw new Error(`参考图不能超过 ${Math.floor(REFERENCE_IMAGE_LIMITS.maxBytes / 1024 / 1024)}MB：${filenameFromUri(uri, index, mimeType)}`)
      }
      files.push({
        id: `${Date.now()}-${index}`,
        uri,
        filename: filenameFromUri(uri, index, mimeType),
        mimeType,
        size,
      })
    }
    return files
  }

  async uploadReferences(files: ReferenceImageUpload[]): Promise<UploadedReferenceImage[]> {
    if (!files.length) return []
    const prepareFiles: UploadPrepareFile[] = files.map((file: ReferenceImageUpload) => {
      const item: UploadPrepareFile = {
        clientId: `${file.id}:original`,
        role: 'original',
        filename: file.filename,
        mimeType: file.mimeType,
        size: file.size,
      }
      return item
    })
    const prepared = await this.api.prepareReferenceUpload(prepareFiles)
    const result: UploadedReferenceImage[] = []
    const lifecycleUploads: UploadedReferenceImage[] = []
    for (const file of files) {
      const upload = prepared.find((item: PreparedUpload) => item.clientId === `${file.id}:original`)
      if (!upload) continue
      lifecycleUploads.push({
        filename: file.filename,
        mimeType: file.mimeType,
        size: file.size,
        objectKey: upload.objectKey,
        uploadToken: upload.uploadToken,
      })
    }
    if (lifecycleUploads.length !== files.length) {
      await this.api.abortReferenceUploads(lifecycleUploads)
      throw new Error('参考图上传地址创建失败。')
    }
    try {
    for (const file of files) {
      const upload = prepared.find((item: PreparedUpload) => item.clientId === `${file.id}:original`)
      if (!upload || !upload.uploadUrl.length) throw new Error('参考图上传地址创建失败。')
      await this.api.putObject(upload.uploadUrl, file.mimeType, this.readFile(file.uri, file.size))
      result.push({
        filename: file.filename,
        mimeType: file.mimeType,
        size: file.size,
        objectKey: upload.objectKey,
        uploadToken: upload.uploadToken,
      })
    }
      await this.api.finalizeReferenceUploads(lifecycleUploads)
    } catch (error) {
      await this.api.abortReferenceUploads(lifecycleUploads)
      throw error
    }
    return result
  }

  private fileSize(uri: string): number {
    try {
      return fileIo.statSync(uri).size
    } catch (_) {
      return 0
    }
  }

  private readFile(uri: string, size: number): ArrayBuffer {
    const file = fileIo.openSync(uri, fileIo.OpenMode.READ_ONLY)
    try {
      const length = Math.max(size, fileIo.statSync(uri).size)
      const buffer = new ArrayBuffer(length)
      fileIo.readSync(file.fd, buffer)
      return buffer
    } finally {
      fileIo.closeSync(file)
    }
  }
}

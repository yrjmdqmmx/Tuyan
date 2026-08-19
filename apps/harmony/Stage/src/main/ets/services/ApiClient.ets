import { http } from '@kit.NetworkKit'
import { API_BASE_DEFAULT, CLIENT_VERSION } from '../constants/AppConstants'
import {
  CreateJobResult,
  CurrentUser,
  HealthInfo,
  Job,
  PreparedUpload,
  RetrievedReference,
  UploadedReferenceImage,
  UploadPrepareFile,
} from '../models/Types'
import { normalizeJob, normalizeJobList, normalizeRetrievedReference, stringValue } from '../utils/Normalize'
import { authBase, formatErrorMessage, normalizeApiBase, paperbananaEndpoint } from '../utils/Format'
import { StorageService } from './StorageService'

interface RequestOptions {
  method?: http.RequestMethod
  body?: Object | string | ArrayBuffer
  contentType?: string
  includeAuth?: boolean
  timeoutMs?: number
}

interface JsonResponse {
  data: Record<string, Object>
  responseCode: number
  headers: Record<string, Object>
}

interface GetHeader {
  Accept: string
  Cookie: string
}

interface JsonHeader {
  Accept: string
  Cookie: string
  'Content-Type': string
}

interface PutHeader {
  Accept: string
  'Content-Type': string
}

interface ActionBody {
  action: string
}

interface AuthEmailBody {
  email: string
  password: string
  name?: string
}

interface JobIdBody {
  action: string
  jobId: string
}

interface LimitBody {
  action: string
  limit: number
}

interface ReferenceLibraryBody {
  action: string
  taskName: string
  limit: number
}

interface PrepareReferenceUploadBody {
  action: string
  files: UploadPrepareFile[]
}

interface FeedbackBody {
  action: string
  message: string
  category: string
  jobId: string
  platform: string
  clientVersion: string
  contact: string
}

export class ApiClient {
  private storage: StorageService
  apiBase: string = API_BASE_DEFAULT

  constructor(storage: StorageService) {
    this.storage = storage
  }

  async restoreApiBase(): Promise<void> {
    this.apiBase = normalizeApiBase(await this.storage.getApiBase(API_BASE_DEFAULT))
  }

  async setApiBase(value: string): Promise<void> {
    this.apiBase = normalizeApiBase(value)
    await this.storage.setApiBase(this.apiBase)
  }

  async fetchHealth(): Promise<HealthInfo> {
    const body: ActionBody = { action: 'health' }
    const response = await this.requestJson(paperbananaEndpoint(this.apiBase), {
      method: http.RequestMethod.POST,
      body,
      includeAuth: false,
      timeoutMs: 12000,
    })
    const data = response.data
    return {
      code: Number(data.code || 0),
      ok: Boolean(data.ok),
      runtime: stringValue(data.runtime),
      backendMode: stringValue(data.runtime) === 'gateway' ? 'gateway' : stringValue(data.runtime),
      auth: stringValue(data.auth),
      laf: data.laf as HealthInfo,
    }
  }

  async getSession(): Promise<CurrentUser | undefined> {
    const response = await this.requestJson(`${authBase(this.apiBase)}/get-session`, {
      method: http.RequestMethod.GET,
      includeAuth: true,
    }).catch(() => undefined)
    const user = response?.data?.user as Record<string, Object> | undefined
    if (!user || !user.id) return undefined
    return {
      id: stringValue(user.id),
      email: stringValue(user.email),
      name: stringValue(user.name),
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    const body: AuthEmailBody = { email, password }
    await this.requestJson(`${authBase(this.apiBase)}/sign-in/email`, {
      method: http.RequestMethod.POST,
      body,
      includeAuth: true,
    })
  }

  async signUp(email: string, password: string, name: string): Promise<void> {
    const body: AuthEmailBody = { email, password, name }
    await this.requestJson(`${authBase(this.apiBase)}/sign-up/email`, {
      method: http.RequestMethod.POST,
      body,
      includeAuth: true,
    })
  }

  async signOut(): Promise<void> {
    const body: ActionBody = { action: 'signOut' }
    await this.requestJson(`${authBase(this.apiBase)}/sign-out`, {
      method: http.RequestMethod.POST,
      body,
      includeAuth: true,
    }).catch(() => undefined)
    await this.storage.setCookie('')
  }

  async createJob(payload: Object): Promise<CreateJobResult> {
    const response = await this.requestJson(paperbananaEndpoint(this.apiBase), {
      method: http.RequestMethod.POST,
      body: payload,
      includeAuth: true,
      timeoutMs: 60000,
    })
    const data = response.data
    return {
      id: stringValue(data.jobId || data.id),
      status: stringValue(data.status, 'queued'),
    }
  }

  async getJob(jobId: string): Promise<Job> {
    const body: JobIdBody = { action: 'getJob', jobId }
    const response = await this.requestJson(paperbananaEndpoint(this.apiBase), {
      method: http.RequestMethod.POST,
      body,
      includeAuth: true,
      timeoutMs: 60000,
    })
    return normalizeJob(response.data.job)
  }

  async myJobs(): Promise<Job[]> {
    const body: LimitBody = { action: 'myJobs', limit: 50 }
    const response = await this.requestJson(paperbananaEndpoint(this.apiBase), {
      method: http.RequestMethod.POST,
      body,
      includeAuth: true,
      timeoutMs: 60000,
    })
    return normalizeJobList(response.data.jobs)
  }

  async referenceLibrary(taskName: string): Promise<RetrievedReference[]> {
    const body: ReferenceLibraryBody = { action: 'referenceLibrary', taskName, limit: 24 }
    const response = await this.requestJson(paperbananaEndpoint(this.apiBase), {
      method: http.RequestMethod.POST,
      body,
      includeAuth: false,
      timeoutMs: 30000,
    })
    const refs = response.data.references
    if (!Array.isArray(refs)) return []
    return (refs as Object[]).map((item: Object) => normalizeRetrievedReference(item))
  }

  async prepareReferenceUpload(files: UploadPrepareFile[]): Promise<PreparedUpload[]> {
    const body: PrepareReferenceUploadBody = { action: 'prepareReferenceUpload', files }
    const response = await this.requestJson(paperbananaEndpoint(this.apiBase), {
      method: http.RequestMethod.POST,
      body,
      includeAuth: true,
      timeoutMs: 30000,
    })
    const uploads = response.data.uploads
    if (!Array.isArray(uploads)) return []
    return (uploads as Object[]).map((item: Object) => {
      const upload = item as Record<string, Object>
      const prepared: PreparedUpload = {
        clientId: stringValue(upload.clientId),
        objectKey: stringValue(upload.objectKey),
        uploadToken: stringValue(upload.uploadToken),
        uploadUrl: stringValue(upload.uploadUrl),
      }
      return prepared
    })
  }

  async finalizeReferenceUploads(uploads: UploadedReferenceImage[]): Promise<void> {
    await this.referenceUploadLifecycle('finalizeReferenceUpload', uploads)
  }

  async abortReferenceUploads(uploads: UploadedReferenceImage[]): Promise<void> {
    await this.referenceUploadLifecycle('abortReferenceUpload', uploads)
  }

  private async referenceUploadLifecycle(action: string, uploads: UploadedReferenceImage[]): Promise<void> {
    await this.requestJson(paperbananaEndpoint(this.apiBase), {
      method: http.RequestMethod.POST,
      body: { action, uploads },
      includeAuth: true,
      timeoutMs: 30000,
    })
  }

  async putObject(uploadUrl: string, mimeType: string, body: ArrayBuffer): Promise<void> {
    const response = await this.requestJson(uploadUrl, {
      method: http.RequestMethod.PUT,
      contentType: mimeType,
      body,
      includeAuth: false,
      timeoutMs: 60000,
    })
    if (response.responseCode < 200 || response.responseCode >= 300) {
      throw new Error(`参考图上传失败：HTTP ${response.responseCode}`)
    }
  }

  async submitFeedback(message: string, category: string, jobId: string, contact: string): Promise<void> {
    const body: FeedbackBody = {
      action: 'submitFeedback',
      message,
      category,
      jobId,
      platform: 'harmony',
      clientVersion: CLIENT_VERSION,
      contact,
    }
    await this.requestJson(paperbananaEndpoint(this.apiBase), {
      method: http.RequestMethod.POST,
      body,
      includeAuth: true,
      timeoutMs: 30000,
    })
  }

  private async requestJson(url: string, options: RequestOptions): Promise<JsonResponse> {
    const request = http.createHttp()
    try {
      let extraData: string | Object | ArrayBuffer | undefined = undefined
      if (options.body !== undefined) {
        if (typeof options.body === 'string' || options.body instanceof ArrayBuffer) {
          extraData = options.body
        } else {
          extraData = JSON.stringify(options.body)
        }
      }

      const cookie = options.includeAuth !== false ? await this.storage.getCookie() : ''
      let header: Object
      if (extraData instanceof ArrayBuffer) {
        const putHeader: PutHeader = {
          Accept: 'application/json',
          'Content-Type': options.contentType || 'application/octet-stream',
        }
        header = putHeader
      } else if (extraData !== undefined) {
        const jsonHeader: JsonHeader = {
          Accept: 'application/json',
          Cookie: cookie,
          'Content-Type': options.contentType || 'application/json',
        }
        header = jsonHeader
      } else {
        const getHeader: GetHeader = {
          Accept: 'application/json',
          Cookie: cookie,
        }
        header = getHeader
      }

      const response = await request.request(url, {
        method: options.method || (extraData === undefined ? http.RequestMethod.GET : http.RequestMethod.POST),
        header,
        extraData,
        expectDataType: http.HttpDataType.STRING,
        readTimeout: options.timeoutMs || 60000,
        connectTimeout: options.timeoutMs || 60000,
      })

      await this.persistCookies(response.header as Record<string, Object>)
      const text = String(response.result || '')
      let data: Record<string, Object> = JSON.parse('{}') as Record<string, Object>
      if (text.length) {
        try {
          data = JSON.parse(text) as Record<string, Object>
        } catch (_) {
          throw new Error(text)
        }
      }

      const code = Number(data.code || 0)
      if (response.responseCode < 200 || response.responseCode >= 300 || (code !== 0 && !Number.isNaN(code))) {
        throw new Error(stringValue(data.error || data.detail || data.message, `HTTP ${response.responseCode}`))
      }

      return {
        data,
        responseCode: response.responseCode,
        headers: response.header as Record<string, Object>,
      }
    } catch (error) {
      throw new Error(formatErrorMessage(error))
    } finally {
      request.destroy()
    }
  }

  private async persistCookies(headers: Record<string, Object>): Promise<void> {
    const values: string[] = []
    Object.keys(headers).forEach((key: string) => {
      if (key.toLowerCase() !== 'set-cookie') return
      const value = headers[key]
      if (Array.isArray(value)) {
        const lines = value as Object[]
        lines.forEach((line: Object) => values.push(String(line)))
      } else if (value !== undefined && value !== null) {
        values.push(String(value))
      }
    })
    if (!values.length) return

    const cookieMap = parseCookieHeader(await this.storage.getCookie())
    values.forEach((line: string) => {
      splitSetCookieHeader(line).forEach((entry: string) => {
        const pair = entry.split(';')[0]
        const index = pair.indexOf('=')
        if (index <= 0) return
        const name = pair.slice(0, index).trim()
        const value = pair.slice(index + 1).trim()
        if (value.length) {
          cookieMap.set(name, value)
        } else {
          cookieMap.delete(name)
        }
      })
    })
    const next = Array.from(cookieMap.entries()).map((entry: [string, string]) => `${entry[0]}=${entry[1]}`).join('; ')
    await this.storage.setCookie(next)
  }
}

function splitSetCookieHeader(header: string): string[] {
  return header.split(/,(?=\s*[^;,=\s]+=[^;,]*)/g).map((item: string) => item.trim()).filter((item: string) => item.length > 0)
}

function parseCookieHeader(header: string): Map<string, string> {
  const map = new Map<string, string>()
  header.split(';').forEach((part: string) => {
    const pair = part.trim()
    const index = pair.indexOf('=')
    if (index <= 0) return
    map.set(pair.slice(0, index), pair.slice(index + 1))
  })
  return map
}

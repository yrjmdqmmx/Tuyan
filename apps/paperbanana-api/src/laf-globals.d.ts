interface FunctionContext {
  request?: { method?: string }
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
  response: {
    setHeader(name: string, value: string): void
    status(code: number): void
  }
}

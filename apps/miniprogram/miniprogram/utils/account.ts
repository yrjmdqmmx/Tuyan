export const ACCOUNT_CLEAR_STORAGE_KEYS = [
  'paperbanana_auth_cookie',
  'paperbanana_mini_jobs',
  'paperbanana_mini_draft',
] as const

export function buildDeleteAccountPayload(email: string, password: string): { email: string; password: string } {
  return { email: email.trim(), password }
}

export function validateDeleteAccountInput(input: {
  currentEmail: string
  email: string
  password: string
  confirmed: boolean
}): string {
  if (input.email.trim().toLocaleLowerCase() !== input.currentEmail.trim().toLocaleLowerCase()) return '请输入当前账号邮箱。'
  if (!input.password) return '请输入当前密码。'
  if (!input.confirmed) return '请完成二次确认。'
  return ''
}

export function clearAccountClientState(removeStorage: (key: string) => void, clearMemorySecrets: () => void): void {
  for (const key of ACCOUNT_CLEAR_STORAGE_KEYS) removeStorage(key)
  clearMemorySecrets()
}

export function accountLifecycleMessage(state: string): string {
  if (state === 'review_required') return '此前的注销没有完整结束，需要核对已清理的数据后处理。当前账号保持冻结，请联系作者处理。'
  if (state === 'deleting') return '注销申请已受理，后台会自动继续处理。处理完成后才能重新注册。'
  if (state === 'deleted') return '账号注销已完成。'
  return ''
}

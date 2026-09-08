export async function deleteAccountRequest(apiBase, credentials, fetchImpl = fetch) {
  const base = String(apiBase || '').replace(/\/$/, '')
  const response = await fetchImpl(`${base}/api/account/delete`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials?.verification === 'identity' ? { verification: 'identity' } : {
      email: String(credentials?.email || '').trim(),
      password: String(credentials?.password || ''),
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 202 && data?.accepted === true) return data
  if (!response.ok || Number(data?.code) !== 0 || data?.ok !== true) {
    throw Object.assign(new Error(data?.error || `Account deletion failed: HTTP ${response.status}`), { code: data?.error })
  }
  return data
}

export async function accountStatusRequest(apiBase, fetchImpl = fetch) {
  const response = await fetchImpl(`${String(apiBase || '').replace(/\/$/, '')}/api/account/status`, { credentials: 'include' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.code !== 0) throw new Error(data.error || '账号状态暂时无法获取，请稍后重试。')
  return data
}

export function accountLifecycleMessage(status) {
  if (!status) return ''
  if (status.state === 'review_required') return '此前的注销没有完整结束，需要核对已清理的数据后处理。当前账号保持冻结，请联系作者处理。'
  if (status.state === 'deleted') return '账号注销已完成。'
  if (status.state === 'deleting') return '注销申请已受理，后台将继续处理；等待上传结束或服务恢复时会自动重试。处理完成后才能重新注册。'
  return ''
}

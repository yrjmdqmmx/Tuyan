export async function deleteAccountRequest(apiBase, credentials, fetchImpl = fetch) {
  const base = String(apiBase || '').replace(/\/$/, '')
  const response = await fetchImpl(`${base}/api/account/delete`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: String(credentials?.email || '').trim(),
      password: String(credentials?.password || ''),
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || Number(data?.code) !== 0 || data?.ok !== true) {
    throw new Error(data?.error || `Account deletion failed: HTTP ${response.status}`)
  }
  return data
}

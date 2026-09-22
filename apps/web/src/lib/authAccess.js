/** Distinguish a usable session, an anonymous visitor and unavailable auth. */
export function getAuthAccess(auth, currentUser = auth?.session?.user) {
  if (auth?.authEnabled === false) return { state: 'unavailable', notice: '账号服务尚未配置，受保护功能暂不可用。' };
  if (!auth || auth.isPending) return { state: 'pending', notice: '正在检查登录状态…' };
  if (auth.error) return { state: 'error', notice: `登录状态检查失败：${auth.error.message || String(auth.error)}。请稍后重试。` };
  if (!currentUser?.id) return { state: 'anonymous', notice: '登录后可使用结构规划、语言编辑和 PDF/EPS 服务端导出。' };
  return { state: 'authenticated', notice: '' };
}

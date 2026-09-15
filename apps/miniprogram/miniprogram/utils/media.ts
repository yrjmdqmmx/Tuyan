export function imageExtension(mimeType: string): string {
  if (mimeType.includes('svg')) return 'svg'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg'
  if (mimeType.includes('webp')) return 'webp'
  return 'png'
}

// 远端 URL 复制到剪贴板；data:URL 落盘后的本地文件改走文件分享（复制 wxfile:// 路径对用户无意义）
export function copyImageUrl(url: string) {
  if (/^https?:\/\//i.test(url)) {
    wx.setClipboardData({
      data: url,
      success() {
        wx.showToast({ title: '链接已复制', icon: 'success' })
      },
    })
    return
  }
  shareLocalFile(url, '', '')
}

// SVG 等非位图资产的"下载"：小程序无法存相册/openDocument，下载到本地后走微信文件分享
// （发给自己或文件传输助手即可转存/传电脑）。下载失败时退回复制链接。
export function downloadShareFile(url: string, fileName = '') {
  if (!url) return
  let inferredName = url.split('?')[0].split('/').pop() || ''
  try { inferredName = decodeURIComponent(inferredName) } catch { /* Keep a malformed remote filename downloadable. */ }
  const name = fileName || inferredName || 'paperbanana.svg'
  if (!/^https?:\/\//i.test(url)) {
    shareLocalFile(url, name, '')
    return
  }
  wx.showLoading({ title: '下载中' })
  wx.downloadFile({
    url,
    success(result) {
      wx.hideLoading()
      if (result.statusCode < 200 || result.statusCode >= 300 || !result.tempFilePath) {
        copyImageUrl(url)
        return
      }
      shareLocalFile(result.tempFilePath, name, url)
    },
    fail() {
      wx.hideLoading()
      copyImageUrl(url)
    },
  })
}

// shareFileMessage 仅真机支持（开发者工具模拟器必失败）。失败时：
// 用户主动取消 → 静默；环境不支持等 → 有远端链接就复制链接兜底，否则提示需真机。
function shareLocalFile(filePath: string, fileName: string, fallbackUrl: string) {
  const fallback = () => {
    if (fallbackUrl) {
      wx.setClipboardData({
        data: fallbackUrl,
        success() {
          wx.showToast({ title: '当前环境不支持文件分享，已复制下载链接', icon: 'none' })
        },
      })
      return
    }
    wx.showToast({ title: '文件分享需在真机上使用', icon: 'none' })
  }

  const shareFileMessage = (wx as any).shareFileMessage
  if (typeof shareFileMessage !== 'function') {
    fallback()
    return
  }
  const options: Record<string, unknown> = {
    filePath,
    fail(error: { errMsg?: string }) {
      const message = String((error && error.errMsg) || '')
      if (message.indexOf('cancel') >= 0) return
      fallback()
    },
  }
  if (fileName) options.fileName = fileName
  shareFileMessage(options)
}

// PNG 等位图保存到相册；SVG 走 copyImageUrl（见 SYNC.md 2026-06-07 基线条目的用户反馈）。
export function saveImageToAlbum(url: string) {
  if (!/^https?:\/\//i.test(url)) {
    saveLocalImageToAlbum(url)
    return
  }

  wx.downloadFile({
    url,
    success(result) {
      if (result.statusCode < 200 || result.statusCode >= 300 || !result.tempFilePath) {
        wx.showToast({ title: '下载失败', icon: 'none' })
        return
      }
      saveLocalImageToAlbum(result.tempFilePath)
    },
    fail(error) {
      wx.showToast({ title: error.errMsg || '下载失败', icon: 'none' })
    },
  })
}

function saveLocalImageToAlbum(filePath: string) {
  wx.saveImageToPhotosAlbum({
    filePath,
    success() {
      wx.showToast({ title: '已保存到相册', icon: 'success' })
    },
    fail(error) {
      const message = String(error.errMsg || '')
      // 用户曾拒绝相册授权后，调用会直接 fail 且不再弹授权框，需要引导去设置页恢复
      if (message.indexOf('auth deny') >= 0 || message.indexOf('auth denied') >= 0 || message.indexOf('authorize') >= 0) {
        wx.showModal({
          title: '需要相册权限',
          content: '保存图片需要"添加到相册"权限，请在设置中开启后重试。',
          confirmText: '去设置',
          success(res) {
            if (res.confirm) {
              wx.openSetting({})
            }
          },
        })
        return
      }
      wx.showToast({ title: message || '保存失败', icon: 'none' })
    },
  })
}

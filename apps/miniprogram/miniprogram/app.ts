import { cleanupCachedImages } from './utils/jobs'
import { refreshSession } from './utils/session'

App<IAppOption>({
  globalData: {
    launchTime: Date.now(),
  },
  onLaunch() {
    wx.setStorageSync('paperbanana_last_launch', Date.now())
    // 先同步清理旧缓存，再恢复会话；避免页面读到文件后又被异步清理删除。
    cleanupCachedImages()
    // 启动即恢复登录态（cookie 在 storage 里），各页面通过 utils/session 订阅
    void refreshSession()
  },
})

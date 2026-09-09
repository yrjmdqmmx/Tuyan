# 本机真实消费预览

这是面向用户手动操作的真实 TokenDance 接入环境，不使用模拟模型、模拟余额或模拟支付。

启动（Node 24，Docker 已启动，依赖已安装）：

~~~sh
cd apps/paperbanana-api
node --import tsx ../../scripts/tokendance-local.mjs
~~~

访问 http://127.0.0.1:5173/ 。先注册/登录一个本地测试账号，再通过“TokenDance 连接与钱包”授权已有的 TokenDance 账号。线上登录服务对 localhost 返回 403，本环境使用独立的真实 Better Auth + Mongo 账号库，不转发密码到生产，也不绕过线上 Origin 规则。

初始选择 TokenDance、1 张候选图、0 轮评审。用户点击生成、精修、优化输入时会调用真实模型并消耗其 TokenDance 余额；创建充值单使用真实支付接口，付款由用户完成。脚本不会自动授权、调用付费模型、创建订单或付款。产品方管理价目未配置凭据。

Mongo 容器为 tuyan-tokendance-local，使用专属持久卷，只绑定 loopback 随机端口。用户 Key、任务执行凭据和步骤结果由正式 Core 服务加密；稳定随机密钥保存在 ~/.config/tuyan-tokendance-local/secrets.json（0600），父目录 0700。图片以本地文件保存，上传/下载 URL 使用限时 HMAC 签名；公开网关拒绝外来 Origin、错误 Host、匿名 TokenDance 操作和未签名图片读取。正式 Gateway/Core、真实 Better Auth 和真实 TokenDance 适配器均参与执行；只替换 OSS 为本机持久存储。其他渠道的付费调用在该预览运行器中关闭。

Ctrl+C 停止 Web/Gateway/Core，并等待已启动的任务完成；保留 Mongo 容器/卷、本地账号、图片与加密连接，下次启动可继续使用。不要在有待恢复任务时删除本地密钥文件。生产账号、任务库及线上部署不受影响。

2026-09-09 本地启动验证：真实本地注册/登录、登录后连接状态、S256 授权入口、固定 app_url、localhost 回调及取消流程通过；匿名 TokenDance 请求 401，错误 Host/外来 Origin/未签名图片 403。使用随机专属验证账号，结束后删除该账号数据，未执行任何真实模型或支付调用。真实 TokenDance 登录、授权交换和消费由用户在页面中继续完成。

# 图研按版本整理的更新日志

从 `apps/web/src/data/changelog.json` 导出的审阅稿，整理截止 2026-09-22。数据源是唯一维护入口；本文不能反向作为上线证据。

## 3.8.0 · 模型接入、思考设置与工作台体验升级

状态：待发布；已核实发布日期：待定或待核实；公告日期：无；适用端：Web、微信小程序。

汇总 3.7.1 之后完成的图示生成、精修、模型接入、排行榜和使用体验改进。

> 3.8.0 尚未正式发布：部分条目此前已单独上线，其余完成本地验证；本次更新实际部署并验收后，再确认版本发布日期。

> 各渠道的目录接入、账号权限和真实推理分别核验。小程序条目不代表已上传、审核或正式发布。

### 新增

- 通用 API 接入：可为主模型、识图和图像模型分别选择已适配的协议、地址与准确型号，支持目录搜索、选择和手动填写。（Web；已上线）
- 三角色思考设置：只展示当前渠道与型号已核实的开关、强度或预算；各角色独立保存，服务商默认不发送思考参数。（Web；本地已验证）
- 接入商汤 SenseNova、阶跃星辰、百度千帆、讯飞星辰 MaaS、美团 LongCat，并补齐 Grok 4.7 等准确型号；各角色和限制按接口分别标明。（Web；本地已验证）
- 精修按型号支持辅助参考图、遮罩和结构化修改目标，提交前提示图片数量、尺寸及编辑能力限制。（Web；已上线）
- 排行榜提供帕累托视图，可对照模型能力与费用；模型详情展示合计和逐题费用，区分实际账单、历史估算和未调用。（Web；已上线）
- 排行榜补充 Nano Banana 系列、GPT Image 2 和 GPT Image 2.5 Sunburst / Flare 的评测结果、图片与评分依据。（Web；已上线）
- 新增按图研版本整理的更新日志，可搜索版本号、功能、模型和日期，并查看公开来源。（Web；本地已验证）
- 提供智能体接入口令复制入口，方便交给 Agent 继续配置和验证；复制成功不代表已完成接入。（Web；已上线）

### 优化

- 补齐腾讯 TokenHub、小米 MiMo、Runware 的模型目录；显示具体版本、滚动别名和调用 ID，渠道按国内聚合、国内直连、国外直连、国外聚合排列。（Web；已上线）
- MiniMax 接入渠道统一显示为“稀宇科技”，保留 MiniMax 品牌与搜索别名，以及已有配置和任务记录。（Web；本地已验证）
- 手机工作台按输入、设置、生成和结果组织，模板支持横向浏览；设置控件、模型目录选择和空配置提示更清晰。（Web；已上线）
- 工作台与排行榜保持固定顺序和当前页选中状态，新增更新日志入口；移动端统一收进“更多”。（Web；本地已验证）
- 排行榜、模型详情与方法说明支持中英文切换，统一研发方名称、搜索和筛选。（Web；已上线）
- 对 40 个模型的既有图片重新独立评审与仲裁，7 个指定模型保留原评分；更新名次，保留原题目、图片和费用。（Web；已上线）
- 小程序完善移动设置、账户布局和观猹身份接续；已完成源码与本地验证，微信正式版本状态仍待确认。（微信小程序；本地已验证）

### 修复

- 参考图按相关性及当前模型预算选择；失败提示说明步骤、原因与费用状态。恢复任务复用已完成步骤，未知提交不自动重发。（Web；已上线）
- 目录中单条异常不再拖垮整个渠道；刷新或切换后保留已有选择，防止旧请求覆盖新配置。确认不可用的型号从可选列表隐藏，历史记录仍保留。（Web；已上线）
- 撤下不再符合收录条件的 Riverflow V2 Pro 排行榜条目，保留历史证据，其他模型按原有规则重新排名。（Web；已上线）
- 小程序明确失败的充值订单允许重新尝试，不确定结果禁止重复下单；清理本地任务时只处理当前账号记录。（微信小程序；本地已验证）

来源：[变更 #216](https://github.com/yrjmdqmmx/Tuyan/pull/216)；[发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35501960459)；[配套发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35501840089)；[变更 #219](https://github.com/yrjmdqmmx/Tuyan/pull/219)；[发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35505004154)；[配套发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35504895519)；三角色思考设置与任务恢复（本地已验证，公开发布记录待补）；官方渠道目录与请求适配（本地已验证，公开发布记录待补）；[变更 #226](https://github.com/yrjmdqmmx/Tuyan/pull/226)；[发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35684170270)；[配套发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35683970466)；[变更 #221](https://github.com/yrjmdqmmx/Tuyan/pull/221)；[变更 #222](https://github.com/yrjmdqmmx/Tuyan/pull/222)；[变更 #223](https://github.com/yrjmdqmmx/Tuyan/pull/223)；[发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35561997844)；[变更 #205](https://github.com/yrjmdqmmx/Tuyan/pull/205)；[发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35138774787)；[发布核验记录](https://github.com/yrjmdqmmx/Tuyan/blob/7b3b99114b617a96e5c6a104574dae89b9d1b83b/docs/releases/2026-09-17-replicate-five-models.md)；[GPT Image 2.5 评测变更](https://github.com/yrjmdqmmx/Tuyan/pull/198)；版本更新日志页面（本地已验证，公开发布记录待补）；[变更 #224](https://github.com/yrjmdqmmx/Tuyan/pull/224)；[发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35603884753)；[配套发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35601906465)；固定导航与移动端更多菜单（本地已验证，公开发布记录待补）；[变更 #209](https://github.com/yrjmdqmmx/Tuyan/pull/209)；[变更 #210](https://github.com/yrjmdqmmx/Tuyan/pull/210)；[发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35188561140)；[小程序设置与身份接续](https://github.com/yrjmdqmmx/Tuyan/pull/196)；[变更 #200](https://github.com/yrjmdqmmx/Tuyan/pull/200)；[发布核验记录](https://github.com/yrjmdqmmx/Tuyan/blob/de855a96a201e7b39a972fe0437d7617130dbc94/docs/releases/2026-09-16-reference-budget.md)；[变更 #214](https://github.com/yrjmdqmmx/Tuyan/pull/214)；[发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35447224666)；[配套发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35447222365)；[变更 #212](https://github.com/yrjmdqmmx/Tuyan/pull/212)；[发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/35194175508)；[小程序订单与记录修复](https://github.com/yrjmdqmmx/Tuyan/pull/197)；[GPT Image 2.5 评测发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/docs/releases/2026-09-16-replicate-image25-benchmark.md)；[智能体接入口令与页头改进](https://github.com/yrjmdqmmx/Tuyan/pull/218)

## 3.7.1 · 观猹登录与账户绑定

状态：已发布；已核实发布日期：2026-09-10；公告日期：2026-09-10；适用端：Web。

新增观猹身份登录、已有图研账户绑定与解绑，并补齐官方登录标识。

> 新增的是观猹身份登录与账户绑定；TokenDance 模型消费授权属于独立功能，不能用登录成功替代消费权限验证。

### 新增

- 支持通过观猹登录图研，并在明确确认后绑定已有图研账户。（Web；已上线）
- 提供账户绑定、邮箱验证码解绑及再次绑定流程。（Web；已上线）

### 修复

- 改善观猹授权登录的可用性，并采用官方登录标识。（Web；已上线）

来源：[观猹身份登录与绑定](https://github.com/yrjmdqmmx/Tuyan/pull/193)；[观猹授权访问修复](https://github.com/yrjmdqmmx/Tuyan/pull/194)；[官方观猹登录标识及发布验收评论](https://github.com/yrjmdqmmx/Tuyan/pull/195)；[9 月 10 日 OAuth 后端部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34466186148)；[9 月 10 日 OAuth Web 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34466422367)；[9 月 10 日官方标识 Web 补发](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34468283117)；[观猹 OAuth 发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/docs/releases/2026-09-10-watcha-oauth.md)；历史微信公告整理稿（版本号与公告日期依据）

## 3.7.0 · TokenDance 接入与账户体系升级

状态：已发布；已核实发布日期：2026-09-10；公告日期：2026-09-10；适用端：Web。

接入 TokenDance 渠道，集中管理账户与钱包，并升级默认模型、主导航和参考图上传。

> 本版汇总 9 月 9–10 日分批上线的功能，发布日期按该批内容完成上线日记录。

> 上传数量和体积是平台原文件上限，实际提交仍受所选模型限制；账户页往返保留不等于整页刷新后仍保留。

### 新增

- 接入 62 个适用的 TokenDance 模型，覆盖主模型、视觉识别、输入优化及 Seedream 5.0 Lite / Pro 生图与精修。（Web；已上线）
- 独立账户页面集中展示渠道授权、钱包、充值入口和充值记录。（Web；已上线）

### 优化

- 首次使用默认选择 TokenDance 与 Seedream 5.0 Pro；设置及账户往返保留有效模型选择、输入、参数和图片。（Web；已上线）
- 主导航调整为生成候选图、任务记录、精修图片、账户、使用教程，并改善窄屏布局。（Web；已上线）
- 参考图平台上限提高到 8 张、单张 20 MiB、合计 80 MiB；最长边 16,384 px、单图 3,200 万像素；SVG 单独限 5 MiB，精修保持单张来源。（Web；已上线）
- 按模型与工作流显示实际上传限制，切换模型时保留文件并提示调整，按需校正方向、等比缩小或转换格式。（Web；已上线）

来源：[TokenDance 渠道、钱包与工作流](https://github.com/yrjmdqmmx/Tuyan/pull/188)；[上线前恢复与授权修正](https://github.com/yrjmdqmmx/Tuyan/pull/189)；[9 月 9 日 TokenDance 后端部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34351104624)；[9 月 9 日 TokenDance Web 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34351477913)；[TokenDance 发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/docs/releases/2026-09-09-tokendance.md)；[默认模型、主导航与参考图上传](https://github.com/yrjmdqmmx/Tuyan/pull/191)；[9 月 10 日上传后端部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34449122494)；[9 月 10 日上传 Web 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34449410067)；[参考图上传 v2 发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/docs/releases/2026-09-10-reference-upload.md)；历史微信公告整理稿（版本号与公告日期依据）

## 3.6.0 · 图片精修工作流重构

状态：已发布；已核实发布日期：2026-09-09；公告日期：2026-09-09；适用端：Web。

支持直接上传原图精修，加入精修指令优化、模型适配比例与 GPT Image 2.5 渠道支持。

> 精修流程于 9 月 8 日先行上线，9 月 9 日补齐新模型；按该批内容完成上线日记录。

> 模型目录与参数适配不等于全部账号权限或真实推理质量均已验证。

### 新增

- 精修支持 PNG、JPG、WebP 原图点击或拖拽上传，提供预览、替换、移除、进度和失败提示；保留结果与任务记录入口。（Web；已上线）
- 精修指令增加“优化输入”，支持预览、采用、取消和恢复原文。（Web；已上线）
- 在 OpenAI、OpenRouter、fal、Replicate 增加 GPT Image 2.5 Sunburst / Flare 对应能力。（Web；已上线）

### 优化

- 按原图、指令、参数、提交组织流程，分开展示原图、处理中与结果；比例用等比矩形表示并按模型及清晰度过滤。（Web；已上线）

### 修复

- 修复恢复身份后参考图与精修原图上传的路径校验问题。（Web；已上线）

来源：[原图精修上传与指令优化](https://github.com/yrjmdqmmx/Tuyan/pull/178)；[恢复身份上传修复](https://github.com/yrjmdqmmx/Tuyan/pull/179)；[9 月 8 日精修 Web 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34198181074)；[9 月 8 日上传修复部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34199774340)；[精修上传发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/docs/releases/2026-09-08-refine-upload.md)；[GPT Image 2.5 四渠道接入](https://github.com/yrjmdqmmx/Tuyan/pull/185)；[OpenRouter 原生精修尺寸修复](https://github.com/yrjmdqmmx/Tuyan/pull/186)；[9 月 9 日 GPT Image 2.5 Web 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34313236102)；[GPT Image 2.5 发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/docs/releases/2026-09-09-image25.md)；历史微信公告整理稿（版本号与公告日期依据）

## 3.5.1 · 邮箱验证与登录体验优化

状态：已发布；已核实发布日期：2026-09-08；公告日期：2026-09-08；适用端：Web。

改善验证结果提示和注册页状态同步，修复普通登录后的错误跳转。

> 验证邮箱不会自动登录，已有正常账户无需重新注册。

### 优化

- 邮箱验证完成后原注册页自动更新状态，重复打开仍在有效期内的链接可正确提示已验证。（Web；已上线）
- 验证链接打开后由用户显式确认完成验证，减少链接预取提前消耗验证令牌的风险。（Web；已上线）

### 修复

- 区分链接过期、无效及临时异常，修复普通登录后误跳邮箱验证结果页的问题。（Web；已上线）

来源：[邮箱验证与登录跳转修复](https://github.com/yrjmdqmmx/Tuyan/pull/174)；[邮箱验证 Web 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34185016924)；[邮箱验证发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/docs/releases/2026-09-08-email-verification.md)；[邮箱验证显式确认](https://github.com/yrjmdqmmx/Tuyan/pull/176)；[显式确认后端部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34187832204)；[显式确认 Web 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34187824622)；[显式确认发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/docs/releases/2026-09-08-email-confirmation.md)；历史微信公告整理稿（版本号与公告日期依据）

## 3.5.0 · 模型接入体系与选择器扩充

状态：已发布；已核实发布日期：2026-09-07；公告日期：2026-09-08；适用端：Web。

扩展模型厂商与 API 平台接入，统一模型展示、版本排序及有效比例。

> 公告日期为 9 月 8 日，目录与选择器的部署记录确认功能已于 9 月 7 日上线。

### 新增

- 扩充 DeepSeek、Kimi、智谱、MiniMax、Anthropic、Grok、FLUX、Stability AI、Ideogram、Mistral AI、Recraft，以及硅基流动、Together AI、Fireworks AI、fal、Replicate 接入。（Web；已上线）

### 优化

- 调整模型选择器的三栏布局、字号、间距与滚动区，支持查看和复制完整模型 ID，手机端采用逐级选择。（Web；已上线）
- 统一厂商名称与模型归类，按有依据的官方日期和版本关系排序，并清理已结束服务或当前不兼容的条目。（Web；已上线）
- 图片比例随当前模型、生成或编辑操作与清晰度变化；原配置失效时自动回到合法选项。（Web；已上线）

来源：[全渠道模型目录与 API 契约](https://github.com/yrjmdqmmx/Tuyan/pull/166)；[扩展模型能力与地区接入](https://github.com/yrjmdqmmx/Tuyan/pull/170)；[模型选择层级、排序与比例](https://github.com/yrjmdqmmx/Tuyan/pull/172)；[模型目录发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/docs/releases/2026-09-07-model-catalog-v14.md)；[模型选择器发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/docs/releases/2026-09-07-model-picker-v15.md)；[9 月 7 日最终选择器后端部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34140472043)；[9 月 7 日最终选择器 Web 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34140656406)；历史微信公告整理稿（版本号与公告日期依据）

## 3.0.2 · 智能输入优化

状态：已发布；已核实发布日期：2026-09-02；公告日期：2026-09-03；适用端：Web。

结合其他输入字段的上下文，使用当前主模型优化科研图示输入。

> 公告日期为 9 月 3 日，相关功能实际于 9 月 2 日部署。

### 新增

- 文本输入增加“优化输入”，结合当前任务及其他字段整理结构、补全表达。（Web；已上线）

### 优化

- 优化稿经预览确认后采用，支持取消和恢复；失败保留原文，缺少配置时引导设置。（Web；已上线）

来源：[当前主模型输入优化](https://github.com/yrjmdqmmx/Tuyan/pull/152)；[输入优化发布证据](https://github.com/yrjmdqmmx/Tuyan/pull/154)；[9 月 2 日输入优化后端部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/33632618871)；[9 月 2 日输入优化 Web 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/33633364781)；[输入优化同步与发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/SYNC.md)；历史微信公告整理稿（版本号与公告日期依据）

## 3.0.0 · 参考体系与多模型工作台升级

状态：已发布；已核实发布日期：待定或待核实；公告日期：2026-08-24；适用端：Web。

扩充学术参考图库与精选模板，重做模型路由、生成设置及移动端体验。

> 这些功能于 8 月分批上线；未能确认本版统一发布日期。

> 此时仍处于 PaperBanana 品牌阶段，不能根据公告分组认定全部页面已更名为图研。

### 新增

- 参考图库扩充至 306 个有图学术案例，提供中文内容与服务端检索分页。（Web；已上线）
- 加入 6 套精选科研图示模板，支持预览、一键套用与修改。（Web；已上线）
- 增加独立负向提示词与 10 种固定画面比例，按模型能力校验合法配置。（Web；已上线）

### 优化

- 通过主模型、图像模型与识图模型分工，完善五个既有渠道的模型路由和生成设置。（Web；已上线）
- 完善账户安全与数据管理，改进手机布局、教程和生成稳定性。（Web；已上线）

来源：[固定 306 条参考语料](https://github.com/yrjmdqmmx/Tuyan/commit/495434d3d8c26803c30057e4cd40563d2af59070)；[8 月 19 日参考语料部署记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/SYNC.md)；[Web 多模型渠道](https://github.com/yrjmdqmmx/Tuyan/pull/3)；[精选模板、负向提示词及比例](https://github.com/yrjmdqmmx/Tuyan/pull/10)；[8 月 21 日模板后端部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/32447300980)；[8 月 21 日模板 Web 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/32447545386)；[8 月 21 日模板与比例契约](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/SYNC.md)；[手机布局优化](https://github.com/yrjmdqmmx/Tuyan/pull/18)；[8 月 22 日移动布局 Web 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/32553566239)；[账户安全共享更新](https://github.com/yrjmdqmmx/Tuyan/pull/19)；[8 月 23 日账户相关 Web 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/32615951816)；[9 月 3 日工作台更名](https://github.com/yrjmdqmmx/Tuyan/commit/81e321d26fdcf24832202e17e7fb871cba893f99)；历史微信公告整理稿（版本号与公告日期依据）

## 2.0.0 · 参考图、案例检索与高清输出

状态：已发布；已核实发布日期：2026-06-09；公告日期：2026-06-09；适用端：Web。

增加用户参考图、学术案例检索、按模型适配的输出清晰度与使用教程。

> 清晰度和自动处理取决于具体图像模型，并非所有模型均原生支持 4K。

### 新增

- 支持最多 3 张参考图，并根据主模型图像理解能力选择直接读取或独立视觉模型分析。（Web；已上线）
- 提供不使用、自动检索、随机参考和手动参考模式，手动最多选 10 个案例，展示实际使用的检索参考。（Web；已上线）
- 增加按图像模型能力提供的 1K / 2K / 4K 清晰度及相应自动精修或放大流程。（Web；已上线）
- 提供完整使用教程、意见反馈与联系作者入口。（Web；已上线）

### 优化

- 参考图用于约束视觉风格，上传用户参考图后关闭论文案例检索，减少风格冲突。（Web；已上线）

### 修复

- 修正百炼视觉模型与参考图读取能力，改进结果宽屏布局和溢出问题。（Web；已上线）

来源：[参考图上传](https://github.com/yrjmdqmmx/Tuyan/commit/a34bf3959c6e384b96dd8fafe5ff9f54b095093d)；[主模型参考图读取](https://github.com/yrjmdqmmx/Tuyan/commit/c69d36738683c11f7e55d65b8f77e4f9488e05c7)；[百炼视觉能力校正](https://github.com/yrjmdqmmx/Tuyan/commit/903e8c8609ca7d15f0d525c0e81a7b2d36f79cb2)；[按模型输出清晰度](https://github.com/yrjmdqmmx/Tuyan/commit/0e54951a9fb82c94e93b49e58862fd4f54d88f29)；[上传参考图后关闭检索](https://github.com/yrjmdqmmx/Tuyan/commit/b13e027472437a3c3b735d3e36b7f5bfc9a65d3d)；[使用教程与联系入口](https://github.com/yrjmdqmmx/Tuyan/commit/757a79d881813874b4d749886c46420fad797207)；[6 月 9 日功能快照](https://github.com/yrjmdqmmx/Tuyan/commit/c907b6161f6dae326477af712c0d89d52656598a)；[6 月 9 日最终 Web 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/27206812299)；[参考图检索互斥后端部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/27204379123)；[输出清晰度后端部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/27190232066)；历史微信公告整理稿（版本号与公告日期依据）

## 1.4.0 · 模型配置与表单体验升级

状态：已发布；已核实发布日期：2026-05-30；公告日期：2026-05-31；适用端：Web。

以固定模型列表替代手填模型名，改进表单显示和失败提示。

> 公告日期为 5 月 31 日，已核实的 Web 部署日期为 5 月 30 日。

> 普通与专业模式在更早源码中已存在，本版记录为配置与交互优化。

### 优化

- 普通与专业模式的模型配置使用固定列表，并更新四个既有渠道的模型选项。（Web；已上线）
- 任务记录展示更明确的失败原因，改善表单输入样式。（Web；已上线）

### 修复

- 改善注册昵称输入的显示及长度约束。（Web；已上线）

来源：[固定模型列表、昵称及错误提示](https://github.com/yrjmdqmmx/Tuyan/commit/091d4bac90455fbe8390d08e6cc859b02d881ee5)；[5 月 30 日模型配置 Web 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/26680085018)；[更早已含普通与专业模式的 Web 快照](https://github.com/yrjmdqmmx/Tuyan/commit/5ad10518a7761a2ea785d84cff43383118b4a3ea)；历史微信公告整理稿（版本号与公告日期依据）

## 1.3.0 · 多端统一与客户端推进

状态：发布信息待核实；已核实发布日期：待定或待核实；公告日期：2026-05-19；适用端：Web、Android、Windows、微信小程序。

开始在统一仓库中推进 Web、桌面、Android 与微信小程序。

> 多端源码可追溯，但各客户端的正式发布日期和本版完整边界尚未确认；不等于所有客户端已发布。

### 新增

- 推进 Android 客户端、Windows 桌面打包与微信小程序源码。（Web、Android、Windows、微信小程序；开发完成）

### 优化

- 将 Web 与桌面代码迁入统一多端仓库。（Web、Android、Windows、微信小程序；开发完成）
- 原公告记载整体 UI、Logo 与视觉风格调整；具体改动和版本归属仍待核对。（Web、Android、Windows、微信小程序；待核实）

来源：[多端仓库初始化](https://github.com/yrjmdqmmx/Tuyan/commit/cc3412efb0b862fd1b6e46187d7975c5f72bd806)；[Web 迁入](https://github.com/yrjmdqmmx/Tuyan/commit/5ad10518a7761a2ea785d84cff43383118b4a3ea)；[Android 客户端源码](https://github.com/yrjmdqmmx/Tuyan/commit/1900f94627b9de7b9a98aa1e5519b9d1560b9a53)；[Windows 桌面打包准备](https://github.com/yrjmdqmmx/Tuyan/commit/c3e948a15c77ac612a89bb4e1746a5db1195a886)；[微信小程序源码](https://github.com/yrjmdqmmx/Tuyan/commit/1bf79984087c033e0fcfd25b41f5cae79e23b178)；[5 月 19 日关联 Web 部署](https://github.com/yrjmdqmmx/Tuyan/actions/runs/26094593750)；历史微信公告整理稿（版本号与公告日期依据）

## 1.1.0 · 账号系统与快速上手

状态：发布信息待核实；已核实发布日期：待定或待核实；公告日期：2026-05-14；适用端：Web。

原公告记载新增注册登录、历史任务与快速上手案例。

> 沿用历史公告的版本号与日期。后来迁入的源码已有这些功能，但首发当日的部署记录仍待补齐。

### 新增

- 注册与登录、账号关联任务记录。（Web；开发完成）
- 快速上手案例与示例输入。（Web；开发完成）

来源：[5 月 18 日 Web 迁入快照](https://github.com/yrjmdqmmx/Tuyan/commit/5ad10518a7761a2ea785d84cff43383118b4a3ea)；[5 月 18 日认证网关归档](https://github.com/yrjmdqmmx/Tuyan/commit/af9929c82baf42a274196ad8d95eda550740220a)；历史微信公告整理稿（版本号与公告日期依据）

## 1.0.0 · PaperBanana Web 首次公告

状态：发布信息待核实；已核实发布日期：待定或待核实；公告日期：2026-05-14；适用端：Web。

原公告将此版记为 PaperBanana Web 的首次公开发布。

> 公告日期早于现仓库的最早提交，首发当日的代码和上线证据尚未确认。

> 未取得首发版本的密钥保存与清理证据，不据此作出“长期不保存”的已验证承诺。

### 新增

- 提供 8 类科研图示场景与 Web 生成入口。（Web；开发完成）
- 提供阿里云百炼、OpenAI、Gemini、OpenRouter 四个渠道配置。（Web；开发完成）
- 原公告记载多智能体生成与评审闭环；首发当日的具体后端与上线证据待补。（Web；待核实）

来源：[现仓库最早提交](https://github.com/yrjmdqmmx/Tuyan/commit/cc3412efb0b862fd1b6e46187d7975c5f72bd806)；[5 月 18 日 Web 迁入快照](https://github.com/yrjmdqmmx/Tuyan/commit/5ad10518a7761a2ea785d84cff43383118b4a3ea)；历史微信公告整理稿（版本号与公告日期依据）

## 版本归属待核实

### 账户恢复与数据管理修复

公告记录：无。9 月 7 日的发布记录已确认修复历史中断状态影响原账号使用的问题，但没有明确对应图研版本，暂不按日期猜测归属。

来源：[变更 #168](https://github.com/yrjmdqmmx/Tuyan/pull/168)；[发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34098748870)；[配套发布结果](https://github.com/yrjmdqmmx/Tuyan/actions/runs/34098510229)

### 排行榜加入 MAI-Image-2.6

公告记录：2026-09-06。加入评测与公开结果已有发布证据；对应图研工作台版本仍待核实。

来源：[相关变更](https://github.com/yrjmdqmmx/Tuyan/pull/165)；[已归档发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/SYNC.md)；历史微信公告整理稿

### Agent Skill 与只读 MCP 接入

公告记录：2026-09-05。公告日期为 9 月 5 日，仓库记录相关服务于 9 月 4 日发布；属于图研工具接入能力，对应图研版本待核实。

来源：[相关变更](https://github.com/yrjmdqmmx/Tuyan/pull/160)；[已归档发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/SYNC.md)；历史微信公告整理稿

### 排行榜扩展科研题集与评分维度

公告记录：2026-09-03。可核实固定 9 题、10 维评分和模型生成证据；此前独立排行榜版本号不转换为未经确认的图研版本号。

来源：[相关变更](https://github.com/yrjmdqmmx/Tuyan/pull/85)；[已归档发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/SYNC.md)；历史微信公告整理稿

### 模型详情证据与社区评估题提交

公告记录：2026-08-30。公开图片、提示词和评审依据，并接受社区题目提交；图研版本归属待核实。每周整理安排不等于已核验持续自动运行。

来源：[相关变更](https://github.com/yrjmdqmmx/Tuyan/pull/84)；[已归档发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/SYNC.md)；历史微信公告整理稿

### 科研图像模型排行榜公开

公告记录：2026-08-29。公开科研图示题集、评分标准和模型结果；图研版本归属待核实，不沿用独立排行榜版本线。

来源：[相关变更](https://github.com/yrjmdqmmx/Tuyan/pull/71)；[已归档发布记录](https://github.com/yrjmdqmmx/Tuyan/blob/d651519872fb1b437041c90ee4167902a124085f/SYNC.md)；历史微信公告整理稿

### 微信小程序首次上线公告

公告记录：2026-05-23。初稿记载小程序上线，早期源码可追溯；尚未取得当次微信正式发布回执，也未确认它对应哪个图研版本。

来源：[早期小程序源码](https://github.com/yrjmdqmmx/Tuyan/commit/1bf79984087c033e0fcfd25b41f5cae79e23b178)；历史微信公告整理稿

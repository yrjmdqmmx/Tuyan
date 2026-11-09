# 期刊书架封面补全 · 2026-10-17

本轮仅更新前端素材、素材来源标注及相关测试，未修改期刊制图规则、规则版本、任务请求或共享契约。保留原有工作树脏改动。

17 本期刊均有本地图片：16 本为期次封面或官方展示封面；PLOS ONE 根据后续明确要求使用用户上传的 PLOS Medicine 图片，素材数据明确记录为用户提供，不能称为 PLOS ONE 官方封面。17 份当前使用的资源共 636,628 字节；本轮新增使用 6 份共 339,924 字节。未调用生成图片或真实/付费模型。

## 来源台账

逐图完整原始地址、SHA-256、原图哈希、尺寸、获取日期及使用条件见 `apps/web/src/data/journal-books.json`。以下日期仅是素材核对/获取日期，不能代替期刊规则核验日期。

| 期刊 | 类型 / 可核实卷期 | 官方来源 | 获取日期 |
| --- | --- | --- | --- |
| PLOS ONE | 用户指定展示图，原图刊名为 PLOS Medicine | 用户附件 `PLOS_Medicine_Postcard.jpeg`（来源链接未核实） | 2026-10-17 |
| Scientific Reports | 官方展示封面 | [来源](https://blog.sciencenet.cn/blog-3432244-1491747.html) | 2026-10-17 |
| Frontiers in Artificial Intelligence | 官方展示封面 | [来源](https://www.frontiersin.org/news/2018/10/16/frontiers-in-artificial-intelligence-collaborating-to-make-the-ai-revolution-happen) | 2026-10-16 |
| IEEE Access | 正式期次封面 · Volume 11 · 2023 | [来源](https://ieee.codeocean.com/) | 2026-10-17 |
| Advanced Materials Interfaces | 官方展示封面 | [来源](https://www.wiley-vch.de/en/44-wiley-vch/journals/400-advanced-materials-interfaces-2706-en) | 2026-10-16 |
| ACS Omega | 官方展示封面 | [来源](https://axial.acs.org/publishing/open-access-with-acs-omega) | 2026-10-16 |
| Cell Reports | 官方展示封面 | [来源](https://info.cell.com/cell-reports-most-read) | 2026-10-16 |
| 经济学家 | 正式期次封面 · 2026年第10期 | [来源](https://jjxj.swufe.edu.cn/CN/home) | 2026-10-17 |
| 财经论丛 | 正式期次封面 · 2026 年 · 第 42 卷第 10 期 | [来源](https://cjlc.zufe.edu.cn/CN/1004-4892/home.shtml) | 2026-10-16 |
| 山西财经大学学报 | 正式期次封面 · 2026年第48卷第8期 | [来源](https://xb.sxufe.edu.cn/info/1009/2423.htm) | 2026-10-17 |
| 中国社会科学 | 官方展示封面 | [来源](https://sscp.cssn.cn/kbw/zgshkx/) | 2026-10-16 |
| Sage Open | 官方展示封面 | [来源](https://journals.sagepub.com/home/sgo) | 2026-10-16 |
| Humanities and Social Sciences Communications | 官方展示封面 | [来源](https://x.com/HSScomms) | 2026-10-17 |
| 人口研究 | 正式期次封面 · 2026 年 · 第 50 卷第 5 期 | [来源](https://rkyj.ruc.edu.cn/CN/home) | 2026-10-16 |
| 心理学报 | 官方展示封面 | [来源](https://journal.psych.ac.cn/xlxb/CN/article/showOldVolumnList.do) | 2026-10-16 |
| 心理科学进展 | 官方展示封面 | [来源](https://journal.psych.ac.cn/xlkxjz/CN/article/showOldVolumnList.do) | 2026-10-16 |
| 图书情报工作 | 正式期次封面 · 2026 年 · 第 70 卷第 20 期 | [来源](https://www.lis.ac.cn/CN/0252-3116/home.shtml) | 2026-10-16 |

## 本轮补全依据

- 经济学家：西南财经大学期刊官网当期目录，2026 年第 10 期。此前给出的 ndhx 页面不是西南财经大学期刊官网，未用作本轮封面依据。
- 山西财经大学学报：官网首页封面链接到第 48 卷第 8 期目录。网页发布日 2026-09-28 与期次月份分别记录。
- IEEE Access：IEEE 与 Code Ocean 合作门户使用的第 11 卷（2023）封面；未把旧卷封面称为最新。
- Scientific Reports：Springer Nature 科研服务官方账号 2025-06-30 发布的期刊展示封面。图片由文章链接的知乎 CDN 承载；其官方来源是发布账号与文章，不把 CDN 域名本身当出版社。无卷期标注。
- HSSC：Nature 官方期刊主页明确链接 HSScomms 社交账号；该账号使用的期刊展示图保留原始方形比例。无卷期标注。
- PLOS ONE：用户最终明确指定上传的 `PLOS_Medicine_Postcard.jpeg`。原图为 PLOS Medicine，已说明刊名不匹配；依照指令保留原图文字与完整画面，在素材数据中记录原刊名与用户指定来源；依最终要求不在界面展示来源说明或标签。`sourceUrl` / `assetUrl` 留空，记录用户原文件名与哈希，不伪造官方来源。期刊名称、规则和版本仍为 PLOS ONE。此前查到的官方标识不再用作书架图片。

## 网络与资源

- Clash 规则按精确域名直连：`jjxj.swufe.edu.cn`（前次已加入）及 `xb.sxufe.edu.cn`（本轮加入）。持久规则、DNS 定向与 fake-IP 排除保持一致；未修改全局代理模式或整站域名后缀规则。山西期刊 DIRECT 规则已命中，页面与封面返回 200。原配置已在 Clash 自身备份目录备份。
- 新素材采用内容哈希文件名，本地 WebP 缓存；不放大原图、不裁切或拉伸。PLOS 用户图片从 523×717 等比缩小至 467×640。
- 官网公开展示不自动等于独立再分发授权；本轮为本地开发核验。尤其 Scientific Reports 来源页明确要求转载联系作者。各条 usageNote 保留边界，未推定论文开放许可覆盖封面。

## 本地验证

- 单项限额运行：素材哈希与元数据、封面加载失败回退、历史规则版本保持、图片中性可访问名称、隐藏封面来源说明及数据来源记录；4 项均通过。一次一个测试，进程组 600 MiB / 10 秒外部上限，峰值约 395 MiB。
- 修正过时的测试断言：素材日期原来固定为 2026-10-16，现验证合法日期格式，不强制所有素材同一天获取。
- Chrome 实际工作台确认 17/17 图片加载；`object-fit: contain` 与原始宽高保持比例。桌面开书、返回书架、窄屏分类显示均另存截图。
- 本轮没有重跑完整生成/精修/导出测试组，没有提交生成任务。历史版本保持是本地自动化结果，不是模型质量或生产验证。
- 未提交、推送、部署或同步上游；未修改小程序。

截图与资源监控记录：`/Users/a1-6/.codex/visualizations/2026/10/17/journal-covers/`。

最终界面要求：移除封面来源折叠区及图片类型标识，图片可访问名称仅为“期刊名 展示图”。来源台账保留在素材数据中；期刊规则的官方来源、核验日期及版本展示保持不变。

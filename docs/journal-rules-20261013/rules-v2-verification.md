# 期刊规则 v2 核验与开发记录

核验日期：2026-10-13。规则版本：`2026-10-13.v2`。当前仅开发环境；本轮直接更新默认目录，没有发布或线上迁移。v1 归档仅用于追溯已有开发任务，不改变旧任务当时依据。

研究报告提供候选和检索方向，不作为官方证据。核验分别查阅专刊指南、其明确链接的出版社政策、官方模板与专项文件；页面没列某项不能推出整个期刊没有要求。源码每条规则保存版本、日期、来源 ID 和阶段/用途条件，部分增加文件格式条件。以下为本轮核验结论的摘要，精确值和适用域以目录数据为准。

## 七本期刊的当前范围

| 期刊 | 本轮确认或修正 | 当前实现状态 |
| --- | --- | --- |
| PLOS ONE | Editorial Accept 前正文图格式豁免；正文与补充材料分开；补充文件可用任意格式、建议小于 10 MB；通用图件不套 SigmaPlot 示例线宽 | 部分支持；正文 PNG 可原像素转 TIFF，EPS 未实现；文件大小边界保留冲突 |
| Frontiers in Artificial Intelligence | 补充图独立格式清单含 PNG、300 dpi、RGB；化学结构键线另有 0.6 pt 规则；AI 条款明确包含图像生成/编辑 | 部分支持；正文与补充图的实际文件检查分开，字体/线宽人工检查 |
| Advanced Materials Interfaces | 本刊明确继承 Wiley AI 条款；示意图、数据可视化、研究照片分别处理；本刊封面禁用生成式 AI；补充图嵌入 Word/PDF | 部分支持；TOC 尺寸保留，本刊 300 dpi 的强制性矛盾保留；未新增补充文件编排 |
| ACS Omega | 正文两份官方格式清单确认 TIFF/PDF，EPS 表述冲突；独立补充图格式另列；TOC 尺寸/字体/按格式 DPI 已补；AI 封面有条件允许，TOC 不允许 | 部分支持；支持 TIFF；EPS/PDF 未导出，TOC AI 操作仍禁止 |
| IEEE Access | 从本刊官方 Word 模板确认 ≥300/600 dpi、字体、色彩、标号、可用中间宽度；录用后正文和 GA 分开；GA 660×295 px、45K、复用已接受图及图注条件 | 部分支持技术检查；PNG 的录用后接收仍有列表冲突；AI 披露已核实，但具体生图/重绘许可未据此推定 |
| Cell Reports | 本刊作者页/图件页/检查表仍读取失败；出版社的新分类政策已读，未用旧转载替代专刊依据 | 待核实，未放开生成/精修 |
| Scientific Reports | 成功读取本刊指南、编辑政策及 AI 风险框架；明确不接受图形摘要；300 dpi 是建议，格式列举非穷尽；补充文件整体 50 MB 与单张图分开 | 从待核实改为部分支持技术规则；不代表已授权当前生图/重绘，仍保留具体操作待确认 |

没有一本标为“已支持全部投稿要求”。人工检查项及导出能力缺口不会因来源读取成功而自动完成。

## 来源、条件与判定

### PLOS ONE

- [Figures](https://journals.plos.org/plosone/s/figures)：直接读取。制作规范用于录用后正文图：TIFF/EPS，宽 66.8–190.5 mm、高至 222.3 mm、300–600 dpi、8–12 pt 的指定字体。多面板应为单文件单页，图注标记允许 (A) 或 (a)。页面的 SigmaPlot 示例不是所有图件线宽标准。
- [Supporting information](https://journals.plos.org/plosone/s/supporting-information)：直接读取。补充文件接受任意格式，不继承正文技术限制；建议小于 10 MB；S1、S2 等编号需与图注引用匹配。
- [Ethical publishing practice](https://journals.plos.org/plosone/s/ethical-publishing-practice)：直接读取。允许符合完整性和权利条件的辅助示意/总结图；披露工具、用法和核验方式。不得将生成内容伪装成原始研究证据。
- 冲突：正文页面表格写小于 10 MB，详情写不超过 10 MB；MB 基数也未定义。低于 10,000,000 bytes 可确认在两种解释内，高于 10 MiB 可确认超限，中间区间继续待确认；不选“最新抓到的值”。

### Frontiers in Artificial Intelligence

- [本刊 Author guidelines](https://www.frontiersin.org/journals/artificial-intelligence/for-authors/author-guidelines)：直接读取。正文 TIF/JPEG，录用后增加 EPS；宽 85/180 mm、最终尺寸 300 dpi、最小文字 8 pt、通用最细线 2 pt。化学结构部分另列键线 0.6 pt、粗线 2 pt，按具体对象人工判断。
- 同页补充图格式为 CDX/EPS/JPEG/PDF/PNG/TIF，300 dpi、RGB；不对补充图强加正文两档宽度。所读指南没有统一图件 MB 上限，仍需核对投稿系统具体限制。
- 同页 AI 条款直接覆盖图像生成/编辑：作者核查数据与权利，在致谢及适用 Methods 披露工具、版本、模型、来源；提示和输出作为补充信息属于建议。

### Advanced Materials Interfaces

- [本刊 Author guidelines](https://advanced.onlinelibrary.wiley.com/hub/journal/21967350/author-guidelines)：直接读取。初投 Free Format 不豁免研究完整性或所有专项图件条件。常用 85/178 mm、10–12 pt、面板小写 12 pt；TOC 的 55×50 或 110×20 mm 及 650/1300 px 条件来自本刊，不套其他 Wiley 期刊尺寸。
- 同页要求补充图放入单独 Word/PDF；封面明确排除生成式 AI。彩色不要求强行指定某一 ICC，关键色彩需与编辑确认。
- [Wiley AI guidelines](https://www.wiley.com/publishing/article/ai-guidelines)：由本刊 AI 条款直接链接，在 Chrome 读取成功，替换旧访问失败记录。允许满足验证/披露/权利条件的示意、流程与数据可视化；研究照片的 AI 增强限制独立存在。方法研究中使用 AI 分析照片，不等于允许生成式重绘原始证据。
- 冲突：本刊一处照片部分写必须 300 dpi，FAQ 写最好 300 dpi。v2 仍标来源冲突；数值密度可展示，强制性未替编辑决定。

### ACS Omega

- [本刊 Author guidelines](https://researcher-resources.acs.org/publish/author_guidelines?coden=acsodf)：直接读取，页面更新标记 2026-10-05。正文分辨率按彩色 300、灰度 600、黑白线稿 1200 dpi；正文至少 4.5 pt、0.5 pt 线宽，Helvetica/Arial 为建议。正文栏宽和图深继续沿专刊规则，未套给 TOC。
- [Acceptable software](https://pubs.acs.org/page/4authors/submission/software.html) 与 [File designations](https://pubs.acs.org/pages/4authors_file-designations)：均由本刊指南链接。本次通过官方页面搜索索引读取，直连受限；前者正文列 TIFF/PDF/EPS，后者正文列 PDF/TIFF。共同项确认；EPS `pendingFormats`，不是确定不接受。补充独立图格式从前者读取，不以正文清单代替。
- [TOC/Abstract graphics PDF](https://pubsapp.acs.org/paragonplus/submission/toc_abstract_graphics_guidelines.pdf)：实际读取官方 2 页 PDF，标记更新 2024-02-28。最大 3.25×1.75 in（82.55×44.45 mm），字体至少 6 pt、推荐 8 pt；TIFF 的彩色 300、黑白 1200 dpi；EPS 要求 RGB 和字体嵌入/轮廓。未明列灰度 TOC 阈值，因此不凭正文 600 dpi 补齐。原创、权利及避免人像/商标等内容仍需人工确认。
- [ACS AI policy](https://researcher-resources.acs.org/publish/aipolicy)：直接读取，页面标记更新 2024-12-13。本刊明确链接。图像披露在致谢和图注，实质研究用途还需 Methods；TOC 不应用 AI 生成图。封面允许有条件使用，需随图披露及商业许可/权利核查，编辑保留决定权。

### IEEE Access

- [Preparing your article](https://ieeeaccess.ieee.org/authors/preparing-your-article/)：直接读取。本刊要求 AI 系统、涉及部分及使用程度披露，禁止捏造。该义务未逐项解决本工作台生成/精修操作的许可，保留待确认，而不是改写成官方全面禁令。
- [官方 Word template](https://ieeeaccess.ieee.org/wp-content/uploads/2025/08/Access-Template-2024.docx)：从上述页面真实链接下载，读取 DOCX 正文 XML。图件段确认彩色/灰度至少 300、线稿至少 600 dpi；图内字约 8–10 pt；矢量字体嵌入/轮廓；面板下方居中 (a)、(b)、(c) 的专门格式。彩色 RGB/CMYK；灰度/线稿按自身模式。通常栏宽约 3.5/7.16 in，明确允许中间尺寸；最大深度还包括图注空间，不能只看图片判通过。
- 初投/修回按模板接受 PS/EPS/TIFF/PDF/PNG 及 Office 原生图件；工作台并未因此增加 Office 导出。
- [Post acceptance guide](https://ieeeaccess.ieee.org/authors/post-acceptance-guide/)：通过官方页面搜索索引读取。录用后单独图件清单未列 PNG，而模板列出 PNG；保留冲突。GA 理想 JPG、660×295 px、45K 上限；优先使用已接受文章内图件，无图时才概括贡献，图注至多 60 词。文件大小等号与 KB 基数的边界保留确认。
- 证据优先级：专刊模板的“至少”优先于 IEEE 泛用网页的“大于”，基于适用范围，并非读取时间。模板内部英寸/mm 为近似换算，宽度作为建议文字展示，不强制两档。

### Cell Reports

- [Information for authors](https://www.cell.com/cell-reports/information-for-authors)、[Cell figure guidelines](https://www.cell.com/information-for-authors/figure-guidelines)、[官方作者检查表](https://download.cell.com/images/EdImages/cellreports/author_checklist.pdf) 均未成功读取；浏览器停在安全验证页，未绕过；备用 ScienceDirect 作者指南也未取得正文。没有把搜索到的旧第三方转载当作已核实专刊规范。
- [Elsevier journal AI policies](https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals)：已直接读取当前分类。示意图有准确性、权利和披露条件；数据图要求直接基于数据、方法可复现；原始科研图和图形摘要限制另列；封面需事前编辑/出版社许可。目录仅记录出版社参考，未完成 Cell Reports 专刊映射。
- 待解决项具体为本刊图件规格、用途差异、专刊政策适用和额外条款；不是“没有要求”。

### Scientific Reports

- [Submission guidelines](https://www.nature.com/srep/author-instructions/submission-guidelines)：官方索引与 Chrome 正文交叉读取。明确不接受图形摘要；初投可嵌图，修回每幅完整图单独上传。出版 300 dpi 带“如可能”条件；EPS/AI 和 TIFF/JPG/PSD 属于示例清单，未列 PNG/SVG 不应直接判拒收。RGB/CMYK、白底、无衬线/Symbol、至少 1 pt 线宽、小写粗体面板标号分别记录；未从 Nature 主刊补造栏宽或固定字号。
- 同页补充材料优先合并 PDF、单文件上限 50 MB；初投稿件的整体上传大小也不能当成每张图上限。没有新增完整补充文件编排，因此该整体上限留给人工判断。
- [Artificial intelligence](https://www.nature.com/srep/journal-policies/ai)：Chrome 读取当前全文。按风险分级处理辅助与解释性使用，强调监督、验证、披露；不可验证输出、替代学术判断、造假与深伪受禁。没有据旧版 Nature 图像禁令概括本刊，也没有把原则性允许解释为当前所有生图/重绘操作获准。
- [Editorial policies](https://www.nature.com/srep/journal-policies/editorial-policies)：Chrome 读取，明确继承 Nature Portfolio、专刊另述除外；科研图像完整性和保留原件要求独立存在。继承关系已核实，具体图像操作许可仍待明确。

## 实现与检查边界

- `journal-catalog-v1.js` 是原目录的逐字节归档，SHA-256 `543814eaa2dd03a9aa841d55ad4b7f3199f3cadfa92489a933f60e303e0d65c0`。v2 克隆后显式修订，不修改旧快照。新选择默认 v2；已有开发任务继续按保存版本恢复和精修。
- 已核实禁令、待确认操作、条件允许使用分开。程序拦截未经核实的执行用途；转换格式不解除政策限制。原始科研图像仍受工具能力约束。
- 格式检查支持通用补充文件清单、未穷尽清单、争议格式和 TIFF 专用 DPI 条件；“待确认”不会得到虚假的通过，也不会作为官方拒收。
- 真实文件检查增加 GA 像素尺寸、KB 上限及按图像构成的色彩检查；按实际像素和排版宽度计算密度。没有 resize、没有通过改 DPI 元数据伪造合格。字体、线宽、科学真实性、图注位置、整套补充文件及原生细节仍需人工检查。
- UI 展示来源访问情况与条件，不再把已成功读取的页面描述为访问失败；保持已有图型复用、精修原图绑定与取消逻辑。

## 本地验证

详见同目录 `rules-v2-validation.md`。本轮只运行本地自动化、浏览器界面检查和严格模拟提供方的链路测试；未调用真实/付费模型，也没有真实模型质量或生产验证。小程序暂停；没有提交、推送、同步上游或部署。

# 2026-09-23 Nature 主图最终制作规则核对

核对日期：2026-09-23。日期表示本次读取时间，不是官方政策生效或更新日期；本次来源页面未提供可确认的完整修订时间。仅更新 Nature 主图最终制作的局部技术检查，不宣称期刊接受，不扩展到全部 Nature 子刊或 Science。

## 官方来源与适用范围

| 来源 | URL | 本次可确认范围 |
| --- | --- | --- |
| Nature specifications | https://research-figure-guide.nature.com/figures/preparing-figures-our-specifications/ | 主图文字、图像、比例尺与导出规范 |
| Nature panels | https://research-figure-guide.nature.com/figures/building-and-exporting-figure-panels/ | 主图尺寸、可编辑性；Extended Data 另有独立段落 |
| Nature final submission | https://www.nature.com/nature/for-authors/final-submission | 原稿原则上接收后、编辑要求制作文件时；不等于初投规范 |
| Nature figure image integrity | https://research-figure-guide.nature.com/figures/image-integrity/ | 图像完整性、生成式 AI 图件限制 |
| Nature Portfolio AI | https://www.nature.com/nature-portfolio/editorial-policies/ai | 跨研究出版活动的 AI 风险、透明披露与人工责任框架 |

## 确认规则、建议与人工检查

- **已确认数值**：普通文字最终 5–7 pt；面板标签 8 pt、粗体、直立、小写。主图高度 170 mm 上限来自 panels；不是网页或整篇论文页面高度。final submission 给出最终线宽 0.25–1 pt。
- **字体不是四项官方白名单**：普通文字应无衬线，Arial/Helvetica 是优先示例；Courier 对应氨基酸序列，Symbol 对应字形/希腊字母。当前对象没有完整字体分类和用途证据，因此其他字体为人工核对；用户显式工作字体列表仍可严格限制，独立官方基线不被覆盖。
- **宽度是建议与编辑决定**：89/183 mm 是常用单/双栏，final submission 另允许必要时 120–136 mm 一栏半；不能把其他尺寸全部宣判不符合官方要求。
- **图像分辨率需注明来源差异**：specifications 的摄影图段落至少 300 dpi，导出段落至少 450 dpi；final submission 的摄影图至少 300 dpi。小于 300 dpi 可提示问题，达到 300 dpi 不代表所有图件终稿要求已满足；保留人工确认，不能将插值放大视作质量提高。
- **编辑属性**：文字不得转轮廓，线、箭头、比例尺和文字应可编辑；比例尺与图像分离。RGB 为推荐。源稿结构通过不能替代成品字体嵌入、外部编辑与真实视觉检查。
- **导出与格式差异**：panels 偏好 AI/EPS/PDF，可接受 plain SVG，并要求嵌入而非链接组件、尽量低于 50 MB；final submission 还描述独立摄影图 TIFF/JPEG。两页范围和接受清单不完全一致，不新增无条件纯位图终稿接受声明。Extended Data 有独立格式、分辨率上限和文件体积要求，本配置不覆盖。
- **人工科学审查**：来源数据、因果、单位、图例、轴、科学符号、比例尺含义、可读性、颜色区分与图片来源不能由技术自动检查替代。

## AI 政策边界

图件 image-integrity 页面仍明确禁止在 figures 中使用任何生成式 AI，并点名内容感知编辑；Nature Portfolio AI 页面同时提供风险分级框架，强调核查、透明度与人工责任。不能自行判定后者覆盖或解除前者，也不能认定“可编辑 SVG”天然不属于 AI 图件。界面记录两个来源及其边界，本图的实际生成/编辑方式、披露与投稿日期适用性继续由作者及编辑部确认。未发送询问或取得编辑部个案许可。

## Science 第二预设：未取得足够正文，不发布已核实配置

2026-09-23 以下官方页面均返回 403：

- https://www.science.org/content/page/instructions-preparing-initial-manuscript
- https://www.science.org/content/page/instructions-preparing-revised-manuscript
- https://www.science.org/content/page/science-journals-editorial-policies
- https://www.science.org/content/page/science-advances-information-authors

搜索可见的 Science Partner Journals 其他刊物不能充当 Science、Science Advances 或 Science Robotics 规则。未使用第三方转述填入尺寸、DPI、字体或 AI 政策。第二个已核实预设须先拿到可追溯的一手正文并区分刊名、阶段及主图/补充材料范围。

## 本轮实现边界

保留 `nature-main-final-v1` 和全部既有规则 ID，避免旧源稿失效；以 `evidenceVersion/checkedAt` 记录本次证据修订。字体和栏宽用 `coverage: examples` 说明非穷尽示例；只有用户显式值覆盖才在工作规则中按严格列表判断。线宽纳入既有 `aesthetic-review` manual 规则，避免新增 ID 与旧用户自定义规则碰撞；仅记录参数，不伪造尚未实现的自动测量。当前 schema 不支持斜体字段，SVG 默认直立，本轮未扩大字体样式接口。未更改科学事实/期刊接受边界，未完成 Science 预设，未部署。

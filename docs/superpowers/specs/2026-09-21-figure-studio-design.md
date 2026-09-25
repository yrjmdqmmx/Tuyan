# 论文图稿：独立页面与第一阶段闭环

用户已批准分阶段路线，并明确新能力与工作台平级。独立 `/figure-studio/` 页面；原工作台生成、精修、账号流程不迁移。桌面支持编辑，手机查看与导出。外部验收目标 Inkscape 与 Illustrator，后者环境缺失时如实记录。

## 本阶段交付

结构化源稿直接生成真正的文字、形状、面板、箭头和图片对象；同一源稿支持网页编辑、撤销/重做、保存/重新打开。生成前先确认结构。自然语言编辑转换为有基础版本的对象命令，不能静默替换整张图片。提供 SVG 导出及服务端 Inkscape PDF/EPS 转换；转换不可用时保留源稿与 SVG 并明确状态。技术文件检查与外部应用手动编辑验证分别记录。

账号、模型调用与错误语义复用已有服务。新图稿本地保存与下载优先；不得声称未实现的云同步。不触发付费模型验收，不发布生产；模型适配以模拟服务测试，不把其结果称为真实调用验证。后续云图稿库、更多期刊、外部改稿重导入和触摸编辑分别交付。

## 共享源稿契约

`schemaVersion=tuyan.figure/v1`，包含 id、revision、title、canvas（widthMm、heightMm、background）、elements、assets、profileId、ruleOverrides、customRules。几何单位 mm，字号 pt。对象类型 text/rect/ellipse/panel/line/arrow/image。每个对象稳定 id；可选 parentId；文字是真 text；连接可绑定 fromId/toId；图片仅允许经过大小及格式验证的 PNG/JPEG/WebP data URL。禁止任意 SVG、脚本、远程资源和外来 HTML。受控 SVG 由源稿渲染。

鼠标和 AI 共用 `applyCommands(document, commands, {baseRevision})`；update/add/remove/canvas/rule 命令原子应用，基础版本不符拒绝覆盖。撤销/重做恢复内容但版本单调增加。局部编辑不重写不相关对象。

## 规则

Nature 主图终稿示例基线单独存储，来源为 https://research-figure-guide.nature.com/figures/preparing-figures-our-specifications/ 与 https://research-figure-guide.nature.com/figures/building-and-exporting-figure-panels/ ，核对日 2026-09-21。一般文字 5–7pt，面板标签 8pt。页面的 300/450 dpi 差异不能伪装成无争议强制要求；保留提示和人工核对。官方基线和用户覆盖分别评估。四状态 passed/problem/manual/unverified；报告绑定源稿版本。关闭工作规则不改变官方检查。科学内容和 AI 政策独立提示，不显示笼统“符合 Nature”。

## 验收

真实独立对象、英文/中文/希腊字母、单字修改、模块移动与连接、撤销/重做、保存重开、冲突拒绝、规则覆盖不抹去官方偏差；输入安全和超限拒绝；SVG/PDF/EPS 以实际文件核验。Inkscape 打开后改文字、移动对象、保存，再检查文件；文字转曲或整张栅格化不得标可编辑。Illustrator 未测保留未验证。桌面与手机只读布局检查，原工作台回归。

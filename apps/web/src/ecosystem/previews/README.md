# 科研工具卡片示例

这些本地静态缩略图均来自合成数据，不包含用户材料，也不需要外部请求或浏览器端科研引擎。页面标注「示例预览」，装饰图不进入键盘和屏幕阅读器导航。

- `semiotic.svg`：Semiotic 3.12.1 的 `semiotic/server.renderChart('SankeyDiagram', …)` 直接输出；三层八节点，11 条合成流量边，720×440，使用图研鼠尾草绿配色。
- `viznoir.png`：VizNoir 0.10.1 `render_impl` 真实渲染 VTK 参数化圆环；合成标量 `sin(3*atan2(y,x))*0.65+z`，Cool to Warm 色标，720×440。Amplitude 是演示函数，不代表实测结果。
- `dataviz.png`：真实 Gateway→DataViz MCP 固定模板生成 80 行确定性合成数据的散点图；经内置浏览器直接截取图表区域，720×440。缩略图本身不提供交互，打开工具后才能操作。

三份资产共 79,088 字节，随 Vite 构建作为本地资源发布。原项目来源及许可仍在各工具工作台中显示。

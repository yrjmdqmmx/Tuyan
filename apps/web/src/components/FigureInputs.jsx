import {getFigureType,getSpecialistSchema,validateFigureRequest,ANALYSIS_METHODS,FIGURE_TYPES} from '../../../../packages/figure-taxonomy/src/index.js'
import {DETERMINISTIC_PLOT_TYPES} from '../../../../packages/figure-taxonomy/src/plot.js'
import {useState} from 'react'
import {suggestedColumns,schemaOptionFields,numericInputFields,syntheticFigureDraft,switchPanelType,figurePayload,validateFigureOptions,parseFigureJson} from '../lib/figureInput.js'

export default function FigureInputs({typeId,draft={},onChange}) {
 const [validation,setValidation]=useState('')
 const type=getFigureType(typeId)
 const schema=getSpecialistSchema(typeId)
 if(!type)return null
 const update=patch=>onChange({...draft,...patch})
 const analysis=patch=>update({analysis:{...draft.analysis,...patch}})
 const number=value=>value.trim()===''?undefined:Number(value)
 const option=(key,value)=>update({options:{...draft.options,[key]:value}})
 if(type.kind==='composite')return <div className="figure-data-editor"><strong>子图构成</strong><p>每个面板保留独立图型、数据、正文与图注。数据由程序绘制，示意子图生成 SVG 后组成同一画面，可导出 PNG 或 SVG。费用与调用量按各子图相加，另计组合评审；选择原生矢量路线时才需要图像模型凭据。</p>
  {type.id==='small_multiples'?<><p>小多图仅支持所有面板使用同一基础图型；每个面板使用独立坐标尺度，当前未实现共享尺度。</p><label>面板坐标尺度<select value={draft.analysis?.panelScales||'independent'} onChange={e=>analysis({panelScales:e.target.value})}><option value="independent">独立尺度（当前唯一支持）</option>{draft.analysis?.panelScales&&draft.analysis.panelScales!=='independent'?<option value={draft.analysis.panelScales}>已保存：{draft.analysis.panelScales}（当前不可提交）</option>:null}</select></label></>:null}
  {(draft.panels||[]).map((panel,i)=>{const change=patch=>update({panels:draft.panels.map((p,j)=>j===i?{...p,...patch}:p)});return <fieldset key={i}><legend>面板 {i+1}</legend><label>面板名称<input value={panel.label||''} onChange={e=>change({label:e.target.value})}/></label><label>子图类型<select value={panel.typeId} onChange={e=>change(switchPanelType(panel,e.target.value))}>{FIGURE_TYPES.filter(t=>t.kind!=='composite').map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label><label>本面板正文<textarea value={panel.methodContent||''} onChange={e=>change({methodContent:e.target.value})} placeholder="只描述本面板的研究内容、对象、关系及证据"/></label><label>本面板图注<textarea value={panel.caption||''} onChange={e=>change({caption:e.target.value})}/></label><FigureInputs key={panel.typeId} typeId={panel.typeId} draft={panel.draft} onChange={value=>change({draft:value})}/><button type="button" onClick={()=>update({panels:draft.panels.filter((_,j)=>j!==i)})}>移除此面板</button></fieldset>})}
  <button type="button" disabled={(draft.panels||[]).length>=12} onClick={()=>update({panels:[...(draft.panels||[]),{label:String.fromCharCode(65+(draft.panels||[]).length),typeId:'method_framework',methodContent:'',caption:'',draft:{}}]})}>添加子图</button>
 </div>
 if(type.kind!=='data')return <div className="figure-data-editor"><p><b>{type.label}需要：</b>{type.requiredInputs.join('；')}。请在正文中提供；未知部分请明确标记。</p></div>
 return <div className="figure-data-editor">
  <strong>{type.label} · 数据输入</strong>
  {!DETERMINISTIC_PLOT_TYPES.includes(type.id)?<p role="status">此图型的规范已收录，专用程序渲染尚未验证。可以查看输入要求，当前不能提交生成。</p>:null}
  <p>{type.requiredInputs.join('；')}。数值由程序绘制，生图模型不补造数据。</p>
  {baseLimits[type.id]?<p className="figure-support-note">当前基础实现限制：{baseLimits[type.id]}</p>:null}
  <p className="figure-support-note">基础形态：PNG / SVG 已完成本地合成数据程序渲染检查；不代表真实研究数据、专业方法或变体已验收。</p>
  {schema?<section className="figure-specialist-contract"><strong>专用输入规范</strong><p>{specialistHelp[type.id]||schema.help}</p><details><summary>技术字段与原始规范</summary><p lang="en">{schema.help}</p><p>行字段：{schema.fields.join('；')}</p></details><button type="button" onClick={()=>{onChange(syntheticFigureDraft(type.id));setValidation('已填入明确标记的模拟教学数据；请替换后再用于研究。')}}>填入模拟教学示例（会替换当前数据）</button><details><summary>查看完整模拟示例（不会自动填入）</summary><pre>{JSON.stringify(schema.example,null,2)}</pre></details></section>:null}
  <label>数据输入格式<select value={draft.dataMode||(schema?'json':'csv')} onChange={e=>update({dataMode:e.target.value})}><option value="csv">CSV 表格</option><option value="json">JSON 对象数组（支持数组、null 与动态数值列）</option></select></label>
  <p>CSV 与 JSON 各自保留填写草稿；提交使用当前选择格式的内容。</p>
  {(draft.dataMode||(schema?'json':'csv'))==='json'?<label>数据行 JSON<textarea aria-label={`${type.label}数据行 JSON`} spellCheck={false} value={draft.rowsJson||''} onChange={e=>update({rowsJson:e.target.value})} placeholder={schema?JSON.stringify(schema.example.figureData.rows,null,2):'[{"label":"填写对象名","value":填写数值}]'}/></label>:<label>数据表（CSV，第一行为列名）<textarea aria-label={`${type.label}数据表`} spellCheck={false} value={draft.csv||''} onChange={e=>update({csv:e.target.value})} placeholder={suggestedColumns(type).join(',')}/></label>}
  <p>列名：{suggestedColumns(type).join('、')}。集合成员用分号分隔；原始数据不能只填写均值和“显著差异”。</p>
  <label>数据来源<input value={draft.source||''} onChange={e=>update({source:e.target.value})} placeholder="例如：实验批次与文件名；若为模拟教学数据请明确说明"/></label>
  <div className="figure-variants">{numericInputFields(type.id,draft.options).map(field=><label key={field}>{field} 单位<input aria-label={`${field}单位`} value={draft.units?.[field]||''} onChange={e=>{const units={...draft.units,[field]:e.target.value};update({units,...(draft.unitsJson!==undefined?{unitsJson:JSON.stringify(units,null,2)}:{})})}} placeholder="无量纲填 dimensionless"/></label>)}</div>
  {schema?<section className="figure-schema-options" aria-label={`${type.label}专用参数`}>{schemaOptionFields(type.id).map(field=><label key={field.key}>{optionLabel(field.key)} · options.{field.key}{field.optional?'（可选）':''}
   {field.kind==='select'?<select aria-label={`options.${field.key}`} value={draft.optionInputs?.[field.key]??(draft.options?.[field.key]===undefined?'':String(draft.options[field.key]))} onChange={e=>update({optionInputs:{...draft.optionInputs,[field.key]:e.target.value}})}><option value="">请选择</option>{field.choices.map(v=><option key={String(v)} value={String(v)}>{String(v)}</option>)}</select>:field.kind==='json'?<textarea aria-label={`options.${field.key}`} spellCheck={false} value={draft.optionInputs?.[field.key]??(draft.options?.[field.key]===undefined?'':JSON.stringify(draft.options[field.key],null,2))} onChange={e=>update({optionInputs:{...draft.optionInputs,[field.key]:e.target.value}})} placeholder={JSON.stringify(field.example,null,2)||field.shape}/>:<input aria-label={`options.${field.key}`} type={field.kind==='number'?'number':'text'} step="any" value={draft.optionInputs?.[field.key]??draft.options?.[field.key]??''} onChange={e=>update({optionInputs:{...draft.optionInputs,[field.key]:e.target.value}})} placeholder={field.example===undefined?field.shape:String(field.example)}/>}
   <small>{field.spec}</small>
  </label>)}</section>:null}
  {type.id==='ordination'?<label>分析方法<select value={draft.analysis?.method||''} onChange={e=>analysis({method:e.target.value})}><option value="">请选择方法</option>{ANALYSIS_METHODS.filter(m=>m.typeId===type.id).map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>:null}
  <label>计算方法与数据处理说明<textarea value={draft.analysis?.description||''} onChange={e=>analysis({description:e.target.value})} placeholder="说明预处理、统计量、置信水平、P值校正等；没有做过的分析请勿填入结论。"/></label>
  {['bubble','bubble_matrix'].includes(type.id)?<label>面积比例系数<input type="number" min="0.000001" step="any" value={draft.options?.areaScale??''} onChange={e=>option('areaScale',number(e.target.value))} placeholder={type.id==='bubble'?'默认20':'默认25'}/></label>:null}
  {type.id==='dumbbell'?<div className="figure-schema-options">{['startLabel','endLabel'].map(key=><label key={key}>{key==='startLabel'?'起始系列名称':'结束系列名称'}<input value={draft.options?.[key]||''} onChange={e=>option(key,e.target.value)}/></label>)}</div>:null}
  {type.id==='histogram'?<label>分箱数<input type="number" min="1" max="200" value={draft.options?.bins??''} onChange={e=>option('bins',number(e.target.value))}/></label>:null}
  {type.id==='waterfall'?<label>累计初值<input type="number" step="any" value={draft.options?.initialValue??''} onChange={e=>option('initialValue',number(e.target.value))}/></label>:null}
  {['density','raincloud','ridgeline','violin'].includes(type.id)?<label>{type.id==='violin'?'密度带宽系数':'密度带宽（同数值单位）'}<input type="number" min="0.000001" step="any" value={draft.options?.bandwidth??''} onChange={e=>option('bandwidth',number(e.target.value))}/></label>:null}
  {type.id==='forest'?<label>无效应参考值<select value={draft.options?.nullValue??''} onChange={e=>option('nullValue',number(e.target.value))}><option value="">请选择效应尺度</option><option value="0">差值：0</option><option value="1">比值：1</option></select></label>:null}
  {['volcano','enrichment'].includes(type.id)?<label>P值口径<select value={draft.analysis?.pKind||''} onChange={e=>analysis({pKind:e.target.value})}><option value="">请选择</option><option value="p">原始P值</option><option value="adjusted_p">经过校正的P值</option></select></label>:null}
  {['parallel_coordinates','dendrogram'].includes(type.id)?<label>动态数值字段单位（JSON 对象）<textarea value={draft.unitsJson??JSON.stringify(draft.units||{},null,2)} onChange={e=>{const unitsJson=e.target.value;try{update({unitsJson,units:parseFigureJson(unitsJson,'单位')})}catch{update({unitsJson})}}} placeholder='{"height":"cm","distance":"dimensionless"}'/></label>:null}
  <details><summary>基础形态与变体边界</summary><p>当前数据渲染仅接受基础形态；方法描述不自动执行未声明的统计检验。变体需单独实现与验证。</p>{type.variants.map(v=><p key={v.id}>{v.label} · 尚未验证，当前不可提交</p>)}{draft.variants?.length?<button type="button" onClick={()=>update({variants:[]})}>移除草稿中未支持的变体</button>:null}</details>
  <button type="button" onClick={()=>{try{if(draft.unitsJson)parseFigureJson(draft.unitsJson,'单位');const body=figurePayload(type.id,draft);validateFigureRequest(body);validateFigureOptions(body);setValidation('数据与专用参数检查通过；未发起模型调用。')}catch(e){setValidation(e.message)}}}>检查数据与参数（不调用模型）</button>
  {validation?<p role="status">{validation}</p>:null}
  {type.id==='contour'?<label>等值线数值（逗号分隔）<input value={(draft.options?.levels||[]).join(',')} onChange={e=>option('levels',e.target.value.trim()?e.target.value.split(',').map(number):[])}/></label>:null}
 </div>
}

const optionLabels={nodes:'节点与分期',directed:'有向关系',layout:'布局',weightUnit:'边权单位',areaMode:'面积含义',flowSemantics:'流量口径',axes:'轴名、范围与单位',normalization:'归一化',reference:'参考分布',plottingPosition:'分位点位置',mean:'参考均值',sd:'参考标准差',referenceValues:'参考样本',referenceUnit:'参考单位',baseline:'基线',causes:'事件原因',estimator:'估计方法',censoring:'删失',entry:'进入时间',links:'连接关系',matrixStatistic:'矩阵统计量',linkStatistic:'连线统计量',linkUnit:'连线单位',valueSemantics:'数值口径',stages:'有序阶段',cohortSemantics:'队列口径',crs:'坐标参考系',projection:'投影',regions:'区域边界（polygon 经纬度数组）',boundarySource:'边界来源',boundaries:'递增分级边界',inputSize:'输入集大小',backgroundSize:'背景集大小',sequences:'序列及长度',assembly:'参考组装',coordinateSystem:'坐标约定',proteins:'蛋白及长度',database:'注释数据库',alphabet:'字母表',input:'输入口径',mode:'展示模式',correction:'校正方法',valueRange:'数值范围',alignmentMethod:'比对方法',root:'根节点',rooting:'定根依据',branchLengthUnit:'分支长度单位',dimensions:'观测维度',linkage:'SciPy linkage 数组',method:'聚类方法',metric:'距离度量',preprocessing:'预处理'}
function optionLabel(key){return optionLabels[key]||key}

const baseLimits={venn:'仅两个集合；圈面积为示意，标签显示实际交集计数。',upset:'2至8个集合；交集来自明确成员，不能由模型补造。',ordination:'绘制用户提供的排序坐标；指定 PCA / PCoA / NMDS 不等于程序已执行该分析。',kaplan_meier:'由用户提供的事件与删失数据计算基础曲线；不自动生成置信区间或假设检验。',bland_altman:'至少3组同单位配对观测；采用均差±1.96倍样本标准差。',forest:'绘制用户提供的估计和置信区间；需明确差值0或比值1参考线。',roc:'接收已计算的FPR / TPR；不会从模型预测自动推导或添加AUC结论。',pr_curve:'接收用户提供的precision / recall；不会自动训练或评估模型。',calibration:'接收已计算的分箱概率及正整数count；不自动计算校准统计。',contour:'完整无重复的至少2×2规则网格；明确递增等值线，不能隐式插值散点。',confusion_matrix:'只接受整数原始计数；归一化数据不能冒充计数。',binary_matrix:'仅0或1；未测值不能填0。',density:'显式正数带宽；程序不替用户选择平滑参数。',violin:'每组至少2个观测且方差非零；显式带宽系数。',boxplot:'每组至少2个观测；1.5倍IQR须与研究方法相符。'}

const specialistHelp={
 network:'请提供完整节点名单（包括孤立节点）与边，明确有向或无向。当前采用圆形布局，位置不表示科学距离；可选正数边权控制线宽，并须注明单位。',
 euler:'仅支持两个非空集合与唯一成员。交叠关系和计数按成员准确计算；圆圈面积为示意，不能解读为数量比例。',
 sankey:'当前仅支持起点到终点的双列流量。节点必须注明第0或第1阶段，所有流带厚度使用同一数值比例；不会推造中间阶段或守恒关系。',
 chord:'仅支持无向加权关系，每对节点只出现一次且不能自连。每条边的数量同时占用两端的圆弧，流带端点宽度与该数量成比例。',
 radar:'请按顺序提供每个轴的名称、最小值、最大值及单位，每组必须覆盖全部轴。半径按各轴范围归一化；多边形面积不代表综合评分。',
 qq:'正态参考必须填写均值和正标准差；样本参考必须提供参考数值和单位。分位点为(i−0.5)/n，样本比较使用线性插值；不会自动拟合分布或进行正态性检验。',
 streamgraph:'所有组需要完整且相同的横坐标网格，纵值必须非负。基线为各组总量的负二分之一，层厚表示实际纵值；基线下方不表示负观测。',
 cumulative_incidence:'每行是一名独立受试者，所有人从零时刻进入，使用右删失。相同时刻的不同原因事件一起处理，事件先于删失；计算Aalen–Johansen累计发生率，不自动计算置信区间或假设检验。',
 matrix_link_overlay:'请提供完整方阵和使用相同实体名称的连线。矩阵颜色显示已提供的统计量，线宽按连线数值绝对值绘制，标签保留正负号；不会自动推导显著性或进行Mantel检验。',
 parallel_coordinates:'每行是一条观测，每个轴必须给出名称、范围与单位。各数值必须落在声明的范围内，原始轴范围始终保留可见。',
 treemap:'仅支持单根层级树，最多128个节点、深度12。父节点总量必须等于子节点之和；矩形按总量精确分配面积，采用切片布局，不加入改变面积的内边距。',
 circle_packing:'采用确定的相切行布局排列嵌套圆。叶节点圆面积与数值成比例，父圆半径只表示包住子节点，不能解读为可相加的总面积；空白不代表数据。',
 alluvial:'同一路径的id必须在每个有序阶段各出现一次，且始终保持相同正数队列规模。路径连续绘制；新增或流失必须用明确类别表示，不能静默改变队列总量。',
 point_map:'当前仅支持EPSG:4326经纬度及等距圆柱投影，显示坐标网格而不自动补底图。角度坐标不代表等面积或真实距离，不会推造海岸线或测地比例尺。',
 choropleth:'请提供区域标识及简单多边形经纬度边界、边界来源、数值口径和递增分级界限。不支持带洞多边形或跨180度经线；无匹配数值的区域显示灰色缺失，不能填零；总顶点最多20,000个。',
 enrichment:'请提供重叠数量、条目背景数量及已经计算的P值，并注明输入集和背景集大小。程序只计算基因比例及富集倍数，不执行富集检验或P值校正；必须说明P值为原始值还是已校正值。',
 gene_track:'请提供参考组装、序列长度、基因起止位置及正负链方向。当前仅绘制完整基因区间，采用从零开始、终点不包含的坐标；不会推造外显子、内含子或剪接结构。',
 protein_domain:'请提供蛋白长度、氨基酸起止位置、结构域标签、证据和注释数据库。采用从1开始且包含终点的坐标，重叠结构域保留在独立注释行。',
 motif_logo:'每个位置必须包含完整字母表。计数转换为频率；信息模式采用均匀背景，以字母表信息上限减去Shannon熵计算，不做小样本校正。实际矢量字母高度之和表示频率或比特。',
 genome_circos:'请提供参考组装、序列长度、明确数值范围及区间数据，可选提供已知位置连线。仅绘制一条定量区间轨道；染色体角度按长度分配（视觉间隔除外），不会补造基因组特征。',
 synteny:'仅支持两条序列，使用同一碱基长度横坐标尺度。请提供两端对应区间、链方向、参考组装及比对方法；负链反转目标端点顺序。同源统计由用户提供，不自动推断。',
 phylogenetic:'请提供有根边树、非负分支长度、明确根节点、定根依据和长度单位。横向距离为路径长度之和；不解析Newick、不推断拓扑、不补造支持度或隐藏定根步骤。',
 dendrogram:'支持最多150条观测的确定性聚类，须明确维度、同单位特征、欧氏距离、连接方法及不预处理；也可提供合法SciPy连接数组，须包含正确成员数和单调高度并注明distance单位。不自动计算显著性或选择切割阈值。',
}

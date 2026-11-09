import {BASE_NUMERIC_AUDIT} from './base-numeric-audit.js'
import {SPECIALIST_PLOT_TYPES,validateSpecialistData} from './specialist-schemas.js'
import {buildSpecialistPlotCode} from './specialist-renderers.js'
import {validateFigureRequest, getFigureType} from './index.js'
// This list is a capability boundary, not a taxonomic boundary.
import {DETERMINISTIC_PLOT_TYPES} from './capabilities.js'
export {DETERMINISTIC_PLOT_TYPES} from './capabilities.js'
export function deterministicPlotStyle(body,plan='',viewport) {
 let style={}
 try {const parsed=JSON.parse(plan.replace(/^```(?:json)?\s*|\s*```$/g,''));style=parsed.plotStyle||{}}catch{ /* Plain legacy plans use the documented defaults. */ }
 const bounded=(value,min,max,fallback)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback
 const plotStyle={width:bounded(style.width,6,16,9),height:bounded(style.height,4,14,6),fontSize:bounded(style.fontSize,10,20,12)}
 const ratio=String(body.aspectRatio||'auto').match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/)
 if(ratio){const r=Number(ratio[1])/Number(ratio[2]);plotStyle.width=r>=1?9:9*r;plotStyle.height=r>=1?9/r:9}

 if(viewport){
  if(![viewport.width,viewport.height,viewport.minFontPx].every(Number.isFinite)||viewport.width<100||viewport.height<100||viewport.minFontPx<14)throw new Error('FIGURE_PANEL_VIEWPORT_INVALID')
  plotStyle.width=viewport.width/100;plotStyle.height=viewport.height/100;plotStyle.fontSize=viewport.minFontPx*72/100;plotStyle.labelPad=plotStyle.fontSize*.65
 }
 return plotStyle
}
export function deterministicPlotRendererContract(body,viewport) {
 if(!DETERMINISTIC_PLOT_TYPES.includes(body.figureTypeId))return null
 return {id:'deterministic-program-v1',kind:'program',figureTypeId:body.figureTypeId,immutable:'figureData rows, units, validated options, analysis and numeric mappings; the model cannot edit code or marks',planParameters:{plotStyle:{width:'6..16 inches, default 9',height:'4..14 inches, default 6',fontSize:'10..20 pt, default 12'},overrides:viewport?'Allocated panel width/height/fontSize/labelPad override ALL model plotStyle fields; no effective style parameter is adjustable for this panel.':body.aspectRatio&&body.aspectRatio!=='auto'?'Selected aspectRatio overrides width and height; only fontSize remains adjustable.':'Only these three plotStyle fields are read. Plain-text plans use defaults.'},fixed:body.figureTypeId==='bar'?{orientation:'horizontal (barh); not a required convention for all bar charts, but this renderer only supports horizontal',mapping:'input row order top-to-bottom; category labels on y; numeric value maps to bar width on x; x-axis label is supplied value unit',barColor:'#487968',background:'white',font:'Matplotlib renderer default sans-serif; plotStyle sets size only',title:false,grid:false,valueAnnotations:false,topAndRightSpines:false,limitsAndTicks:'Matplotlib automatic axis limits/ticks; no model controls'}:{appearance:'type-specific fixed program; refer to currentCode and programValidation for actual orientation, palette, annotations and supported validated data options; do not apply bar-specific restrictions to other types'},unsupportedPlanControls:['orientation','palette/color','font family/weight','titles','grid','tick/axis limits','value annotations','arbitrary glyph placement'],referencePolicy:'Reference images inform structural understanding only within supported capabilities and original reference scope; they do not add mandatory style requirements.'}
}
export function buildDeterministicPlotCode(body, plan='', viewport) {
 if(!DETERMINISTIC_PLOT_TYPES.includes(body.figureTypeId)) return null
 validateFigureRequest(body)
 validateDeterministicOptions(body)
 const type=getFigureType(body.figureTypeId),plotStyle=deterministicPlotStyle(body,plan,viewport)
 if(SPECIALIST_PLOT_TYPES.includes(type.id))return buildSpecialistPlotCode(body,plotStyle)
 const payload=JSON.stringify({type:type.id,rows:body.figureData.rows,units:body.figureData.units,options:body.figureData.options||{},analysis:body.figureAnalysis||{},variants:body.figureVariantIds||[],pixels:({'1K':1024,'1.5K':1536,'2K':2048,'3K':3072,'4K':4096})[body.imageSize]||1024,plotStyle})
 // JSON encoded twice: no user value is interpolated as executable Python.
 return `# Tuyan deterministic figure renderer v1; values are immutable source data.
import json
import math
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle
from matplotlib.colors import ListedColormap, BoundaryNorm
d = json.loads(${JSON.stringify(payload)})
r, kind, opt = d['rows'], d['type'], d['options']
plt.rcParams.update({'font.size':d['plotStyle']['fontSize'],'axes.labelpad':d['plotStyle'].get('labelPad',4)})
fig, ax = plt.subplots(figsize=(d['plotStyle']['width'], d['plotStyle']['height']), layout='constrained')
fig.set_facecolor('white')
fig._tuyan_target_pixels = d['pixels']
colors = ['#487968','#c58b53','#647da6','#a77592','#a5a659']
labels = [str(row.get('label',i+1)) for i,row in enumerate(r)]
unit = d['units']
def col(name):
    return np.array([row[name] for row in r], dtype=float)
def grouped():
    names = list(dict.fromkeys([str(row.get('group','Data')) for row in r]))
    return names, [np.array([row['value'] for row in r if str(row.get('group','Data')) == name], dtype=float) for name in names]
def density(values):
    # User-specified positive bandwidth; no concealed automatic inference.
    bw=float(opt['bandwidth'])
    grid=np.linspace(float(min(values))-3*bw,float(max(values))+3*bw,256)
    z=(grid[:,None]-values[None,:])/bw
    return grid,np.exp(-0.5*z*z).mean(axis=1)/(bw*math.sqrt(2*math.pi))
if kind in ['bar','dotplot','lollipop','forest']:
    y=np.arange(len(r)); values=col('value')
    if kind=='bar':
        bars=ax.barh(y,values,color=colors[0]); assert np.allclose([b.get_width() for b in bars],values)
    elif kind=='lollipop':
        ax.hlines(y,0,values,color=colors[0]); ax.scatter(values,y,color=colors[0])
    elif kind=='forest':
        ax.errorbar(values,y,xerr=np.vstack([values-col('low'),col('high')-values]),fmt='o',color=colors[0],capsize=3)
        ax.axvline(float(opt['nullValue']),color='#969e96',linestyle='--')
    else: ax.scatter(values,y,color=colors[0])
    ax.set_yticks(y,labels);ax.invert_yaxis();ax.set_xlabel(unit['value'])
elif kind in ['dumbbell','gantt']:
    y=np.arange(len(r));start,end=col('start'),col('end')
    if kind=='gantt': ax.barh(y,end-start,left=start,color=colors[0])
    else:
        ax.hlines(y,start,end,color='#9da99e');ax.scatter(start,y,label=opt.get('startLabel','Start'),color=colors[0]);ax.scatter(end,y,label=opt.get('endLabel','End'),color=colors[1]);ax.legend()
    ax.set_yticks(y,labels);ax.invert_yaxis();ax.set_xlabel(unit['start'])
elif kind=='waterfall':
    values=col('value');start=float(opt['initialValue'])+np.r_[0,np.cumsum(values)[:-1]]
    ax.bar(np.arange(len(r)),values,bottom=start,color=[colors[0] if v>=0 else colors[1] for v in values]);ax.set_xticks(np.arange(len(r)),labels,rotation=30);ax.set_ylabel(unit['value']);ax.axhline(0,color='#adb3a9')
elif kind=='histogram':
    values=col('value');counts,edges=np.histogram(values,bins=opt['bins'])
    assert int(counts.sum())==len(values)
    artists=ax.bar(edges[:-1],counts,width=np.diff(edges),align='edge',color=colors[0],edgecolor='white')
    assert np.allclose([p.get_height() for p in artists],counts)
    ax.set_xlabel(unit['value']);ax.set_ylabel('Count')
elif kind=='stripplot':
    names,groups=grouped()
    for i,values in enumerate(groups):ax.scatter(np.full(len(values),i),values,color=colors[i%len(colors)],s=22,alpha=.7)
    ax.set_xticks(np.arange(len(names)),names);ax.set_ylabel(unit['value'])
elif kind in ['boxplot','violin','raincloud','density','ridgeline']:
    names,groups=grouped()
    if kind=='boxplot': ax.boxplot(groups,whis=1.5,showfliers=True);ax.set_xticks(np.arange(len(names))+1,names);ax.set_ylabel(unit['value'])
    elif kind=='violin':
        # bw_method is explicit to avoid a hidden bandwidth choice.
        ax.violinplot(groups,showmeans=False,showmedians=True,bw_method=float(opt['bandwidth']));ax.set_xticks(np.arange(len(names))+1,names);ax.set_ylabel(unit['value'])
    else:
        for i,values in enumerate(groups):
            grid,pdf=density(values); color=colors[i%len(colors)]
            if kind=='density': ax.plot(grid,pdf,color=color,label=names[i])
            else:
                base=float(i);scale=0.65/max(pdf) if max(pdf)>0 else 1
                ax.fill_between(grid,base,base+pdf*scale,color=color,alpha=0.45)
                if kind=='raincloud':
                    ax.scatter(values,np.full(len(values),base-0.15),color=color,s=15)
                    ax.boxplot([values],positions=[base-0.35],vert=False,widths=.15,whis=1.5,manage_ticks=False)
        ax.set_xlabel(unit['value'])
        if kind=='density':ax.set_ylabel('Density');ax.legend()
        else:ax.set_yticks(np.arange(len(names)),names)
elif kind=='ecdf':
    values=np.sort(col('value')); p=np.arange(1,len(values)+1)/len(values)
    line=ax.step(values,p,where='post',color=colors[0])[0];assert np.allclose(line.get_ydata(),p)
    ax.set_xlabel(unit['value']);ax.set_ylabel('Cumulative proportion');ax.set_ylim(0,1)
elif kind in ['line','area','scatter','bubble','ordination','ma_plot','volcano','roc','pr_curve','calibration','bland_altman','funnel_meta']:
    xname,yname='x','y'
    if kind=='ma_plot':xname,yname='mean','effect'
    if kind=='roc':xname,yname='fpr','tpr'
    if kind=='pr_curve':xname,yname='recall','precision'
    if kind=='calibration':xname,yname='predicted','observed'
    if kind=='funnel_meta':xname,yname='effect','se'
    if kind=='volcano':x=col('effect');y=-np.log10(col('p'));xlabel='Effect ('+unit['effect']+')';ylabel='-log10('+d['analysis']['pKind']+')'
    elif kind=='bland_altman':
        a,b=col('a'),col('b');x=(a+b)/2;y=a-b;bias=np.mean(y);sd=np.std(y,ddof=1)
        for line,label in [(bias,'Mean difference'),(bias-1.96*sd,'Lower agreement limit'),(bias+1.96*sd,'Upper agreement limit')]:ax.axhline(line,color='#9a9f96',linestyle='--',label=label)
        ax.legend(fontsize=8);xlabel='Mean ('+unit['a']+')';ylabel='A - B ('+unit['a']+')'
    else:x,y=col(xname),col(yname);xlabel=xname+' ('+unit[xname]+')';ylabel=yname+' ('+unit[yname]+')'
    if kind in ['line','area','roc','pr_curve','calibration']:
        order=np.lexsort((y,x)) if kind=='roc' else np.argsort(x,kind='stable');x,y=x[order],y[order]
        artist=ax.plot(x,y,color=colors[0],marker='o',markersize=3)[0];assert np.allclose(artist.get_ydata(),y)
        if kind=='area':ax.fill_between(x,0,y,color=colors[0],alpha=.25)
    else:
        artist=ax.scatter(x,y,s=col('size')*float(opt.get('areaScale',20)) if kind=='bubble' else 26,color=colors[0]);assert np.allclose(artist.get_offsets(),np.column_stack([x,y]))
    ax.set_xlabel(xlabel);ax.set_ylabel(ylabel)
    if kind=='bubble':
        handles,legend_labels=artist.legend_elements(prop='sizes',num=3,func=lambda size:size/float(opt.get('areaScale',20)))
        ax.legend(handles,legend_labels,title='Area ('+unit['size']+')',fontsize=8)
    if kind in ['roc','calibration']:ax.plot([0,1],[0,1],linestyle='--',color='#adb3a9');ax.set_xlim(0,1);ax.set_ylim(0,1)
    if kind=='pr_curve':ax.set_xlim(0,1);ax.set_ylim(0,1)
    if kind=='funnel_meta':ax.invert_yaxis()
    if kind=='ordination':ax.text(.01,1.02,d['analysis']['method'].upper(),transform=ax.transAxes,fontsize=10)
elif kind in ['heatmap','adjacency_matrix','correlation_matrix','confusion_matrix','bubble_matrix','binary_matrix']:
    names_y=list(dict.fromkeys([str(row['row']) for row in r]));names_x=list(dict.fromkeys([str(row['column']) for row in r]))
    matrix=np.full((len(names_y),len(names_x)),np.nan)
    for row in r:matrix[names_y.index(str(row['row'])),names_x.index(str(row['column']))]=row['value']
    if kind=='bubble_matrix':
        for row in r:ax.scatter(names_x.index(str(row['column'])),names_y.index(str(row['row'])),s=row['value']*float(opt.get('areaScale',25)),color=colors[0])
        ax.invert_yaxis()
    elif kind=='binary_matrix':
        cmap=ListedColormap(['#f1f3ed','#487968']);cmap.set_bad('#b7b9b2')
        img=ax.pcolormesh(np.arange(len(names_x)+1)-.5,np.arange(len(names_y)+1)-.5,matrix,cmap=cmap,norm=BoundaryNorm([-.5,.5,1.5],2),shading='flat');ax.invert_yaxis();fig.colorbar(img,ax=ax,ticks=[0,1],label='0 absent / 1 present; grey missing')
        assert np.allclose(img.get_array(),matrix,equal_nan=True)
    else:
        img=ax.pcolormesh(np.arange(len(names_x)+1)-.5,np.arange(len(names_y)+1)-.5,matrix,cmap='RdBu_r' if kind=='correlation_matrix' else 'viridis',vmin=-1 if kind=='correlation_matrix' else None,vmax=1 if kind=='correlation_matrix' else None,shading='flat');ax.invert_yaxis();fig.colorbar(img,ax=ax,label=unit['value'])
        assert np.allclose(img.get_array(),matrix,equal_nan=True)
    ax.set_xticks(np.arange(len(names_x)),names_x,rotation=40,ha='right');ax.set_yticks(np.arange(len(names_y)),names_y)
    if kind=='confusion_matrix':ax.set_xlabel('Predicted class');ax.set_ylabel('True class')
elif kind=='pie':
    values=col('value');wedges,_=ax.pie(values,labels=labels,colors=colors,normalize=True)
    assert np.allclose([(w.theta2-w.theta1)/360 for w in wedges],values/sum(values),atol=1e-6)
elif kind=='rose':
    fig.delaxes(ax);ax=fig.add_subplot(111,projection='polar');values=col('value');theta=np.arange(len(r))*2*np.pi/len(r)
    ax.bar(theta,np.sqrt(values),width=2*np.pi/len(r),color=colors[0],edgecolor='white');ax.set_xticks(theta,labels);ax.set_ylabel('Radius = sqrt(value)')
elif kind in ['gene_track','protein_domain']:
    start,end=col('start'),col('end');ax.barh(np.arange(len(r)),end-start,left=start,color=colors[0]);ax.set_yticks(np.arange(len(r)),labels);ax.set_xlabel(unit['start']);ax.invert_yaxis()
elif kind=='vector_field':
    artist=ax.quiver(col('x'),col('y'),col('u'),col('v'),angles='xy',scale_units='xy',scale=1,color=colors[0]);ax.set_xlabel(unit['x']);ax.set_ylabel(unit['y']);ax.set_aspect('equal')
elif kind=='contour':
    xs=np.unique(col('x'));ys=np.unique(col('y'));z=np.full((len(ys),len(xs)),np.nan)
    for row in r:z[list(ys).index(row['y']),list(xs).index(row['x'])]=row['value']
    cs=ax.contour(xs,ys,z,levels=opt['levels'])
    for label in ax.clabel(cs,inline=False,fontsize=8):label.set_bbox({'facecolor':'white','edgecolor':'none','pad':1})
    ax.set_xlabel(unit['x']);ax.set_ylabel(unit['y'])
elif kind=='kaplan_meier':
    names=list(dict.fromkeys([str(row.get('group','Data')) for row in r]))
    for i,name in enumerate(names):
        data=[row for row in r if str(row.get('group','Data'))==name];times=sorted(set(row['time'] for row in data));xs=[0.];ys=[1.];s=1.
        for t in times:
            risk=sum(row['time']>=t for row in data);events=sum(row['time']==t and row['event']==1 for row in data)
            s=s*(1-events/risk);xs.append(t);ys.append(s)
            cens=sum(row['time']==t and row['event']==0 for row in data)
            if cens:ax.plot(t,s,marker='+',color=colors[i%len(colors)])
        ax.step(xs,ys,where='post',label=name,color=colors[i%len(colors)])
    ax.set_ylim(0,1.03);ax.set_ylabel('Survival probability (no CI estimated)');ax.set_xlabel(unit['time']);ax.legend()
elif kind in ['venn','upset']:
    names=[row['set'] for row in r];sets=[set(row['members']) for row in r];members=set().union(*sets);counts={}
    for item in members:
        mask=tuple(item in s for s in sets);counts[mask]=counts.get(mask,0)+1
    if kind=='venn':
        for x,color,name in [(0.4,colors[0],names[0]),(.65,colors[1],names[1])]:ax.add_patch(Circle((x,.5),.23,facecolor=color,alpha=.25));ax.text(x,.78,name,ha='center')
        for x,key in [(.29,(True,False)),(.525,(True,True)),(.76,(False,True))]:ax.text(x,.5,str(counts.get(key,0)),ha='center')
        ax.set_xlim(0,1.05);ax.set_ylim(0,1);ax.set_aspect('equal');ax.axis('off');ax.text(.5,.1,'Areas are schematic; labels show exact counts',ha='center',fontsize=8)
    else:
        masks=sorted(counts,key=lambda m:(-counts[m],m));ax.bar(np.arange(len(masks)),[counts[m] for m in masks],color=colors[0]);ax.set_xticks(np.arange(len(masks)),[' & '.join(names[i] for i,v in enumerate(m) if v) for m in masks],rotation=35,ha='right');ax.set_ylabel('Exclusive intersection size')
        # Membership matrix below bars is necessary to distinguish UpSet from a bar chart.
        matrix_ax=ax.inset_axes([0,-.48,1,.27]);matrix_ax.set_xlim(-.5,len(masks)-.5)
        for j,m in enumerate(masks):
            ys=[i for i,v in enumerate(m) if v];matrix_ax.plot([j]*len(ys),ys,color=colors[0]);matrix_ax.scatter([j]*len(names),np.arange(len(names)),color=[colors[0] if v else '#dde1d8' for v in m])
        matrix_ax.set_yticks(np.arange(len(names)),names);matrix_ax.set_xticks([]);matrix_ax.invert_yaxis()
${BASE_NUMERIC_AUDIT}
for collection in fig.findobj(matplotlib.collections.Collection):collection.set_rasterized(False)
for spine in ['top','right']:
    if spine in ax.spines: ax.spines[spine].set_visible(False)
`
}

export function validateDeterministicOptions(body) {
 if(!body.figureTypeId||getFigureType(body.figureTypeId)?.kind!=='data')return
 const fail=message=>{const e=new Error(message);e.businessCode='FIGURE_RENDERER_UNAVAILABLE';throw e}
 validateSpecialistData(body)
 const type=body.figureTypeId,rows=body.figureData?.rows||[],opt=body.figureData?.options||{}
 const groupedTypes=['boxplot','violin','raincloud','density','ridgeline','stripplot','kaplan_meier','radar','streamgraph','cumulative_incidence']
 if(!groupedTypes.includes(type)&&rows.some(row=>row.group!==undefined))fail('该图型当前基础渲染未支持 group 分组；请分图生成，不能静默丢失分组。')
 if(['bubble','bubble_matrix'].includes(type)&&opt.areaScale!==undefined&&!(Number.isFinite(opt.areaScale)&&opt.areaScale>0))fail('气泡面积比例必须为正数。')
 if(type==='confusion_matrix'&&rows.some(row=>!Number.isInteger(row.value)))fail('当前混淆矩阵接收原始整数计数；归一化矩阵不能冒充计数。')
 if(body.aspectRatio&&!['auto','1:1','3:2','2:3','4:3','3:4','16:9','9:16'].includes(body.aspectRatio))fail('当前数据绘图支持自动、方形和常用横纵比例；未忽略所选比例。')
 if(!DETERMINISTIC_PLOT_TYPES.includes(type))fail('该图型规范已收录，专用程序渲染尚未完成验证；当前不能通过生图模型代造数据图。')
 if(body.figureVariantIds?.length)fail('当前确定性渲染仅支持基础形态；所选变体尚未验证，未忽略变体提交。')
 if(['density','raincloud','ridgeline','violin'].includes(type)&&!(Number.isFinite(opt.bandwidth)&&opt.bandwidth>0))fail('密度表达需要显式正数带宽 options.bandwidth；violin 使用 Matplotlib bw_method 系数。')
 if(type==='histogram'&&!(Number.isInteger(opt.bins)&&opt.bins>=1&&opt.bins<=200))fail('直方图需要 options.bins（1至200的整数）。')
 if(type==='waterfall'&&!Number.isFinite(opt.initialValue))fail('瀑布增量图需要明确的初值 options.initialValue；每行只表示增量，不混入总计行。')
 if(type==='forest'&&![0,1].includes(opt.nullValue))fail('森林图需要 options.nullValue：差值为0，比值为1。')
 if(type==='forest'&&opt.nullValue===1&&rows.some(r=>r.low<=0||r.value<=0||r.high<=0))fail('比值型森林图的估计与区间必须为正；请核对输入是否已取对数。')
 if(type==='volcano'&&!['p','adjusted_p'].includes(body.figureAnalysis?.pKind))fail('火山图必须声明 figureAnalysis.pKind 是 p 或 adjusted_p。')
 if(type==='bland_altman'&&(rows.length<3||body.figureData.units.a!==body.figureData.units.b))fail('一致性图至少需要3组配对观测，a、b单位相同。')
 if(type==='venn'&&rows.length!==2)fail('当前程序仅验证了两集合韦恩图；更多集合请选择 UpSet。')
 if(type==='upset'&&(rows.length<2||rows.length>8))fail('当前 UpSet 支持2至8个集合。')
 if(['boxplot','violin'].includes(type)) {
  const groups=new Map();for(const r of rows){const k=r.group||'Data';groups.set(k,[...(groups.get(k)||[]),r.value])}
  if([...groups.values()].some(v=>v.length<2||(type==='violin'&&Math.max(...v)===Math.min(...v))))fail('每组至少2个观测，小提琴密度不能使用零方差数据。')
 }
 if(type==='bubble_matrix'&&rows.some(r=>r.value<0))fail('气泡矩阵面积不能为负。')
 if(type==='funnel_meta'&&rows.some(r=>r.se<=0))fail('漏斗图的标准误必须为正。')
 if(type==='calibration'&&rows.some(r=>!Number.isInteger(r.count)||r.count<=0))fail('校准分箱的样本量必须为正整数。')
 if(type==='roc') {
  const ordered=[...rows].sort((a,b)=>a.fpr-b.fpr||a.tpr-b.tpr)
  if(ordered.some((r,i)=>i>0&&r.tpr<ordered[i-1].tpr))fail('ROC真阳性率不能随假阳性率上升而下降，请核对阈值计算。')
 }
 if(type==='binary_matrix'&&rows.some(r=>![0,1].includes(r.value)))fail('存在矩阵只能使用0或1；未测值不能填成0。')
 if(['dumbbell','gantt'].includes(type)&&body.figureData.units.start!==body.figureData.units.end)fail('区间两端必须使用相同单位。')
 if(type==='contour') {
  const xs=new Set(rows.map(r=>r.x)),ys=new Set(rows.map(r=>r.y));
  if(xs.size<2||ys.size<2||rows.length!==xs.size*ys.size||new Set(rows.map(r=>`${r.x},${r.y}`)).size!==rows.length)fail('当前等值线需要完整、无重复的至少2×2规则网格。')
  if(!Array.isArray(opt.levels)||opt.levels.length<1||opt.levels.some((v,i,a)=>!Number.isFinite(v)||(i>0&&v<=a[i-1])))fail('等值线 levels 必须为递增的有限数值数组。')
 }
}

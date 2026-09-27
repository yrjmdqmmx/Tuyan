import { useAppLocale } from './BenchmarkLocale.jsx'
import { officialDeclaration } from '../lib/universalApi.js'
import { allowedCapability, capabilityLabels, incompatibleCapabilities } from '../lib/universalPresentation.js'

const mib=1024*1024
export default function UniversalCapabilities({draft:d, role, label, onChange:change}) {
  const {t}=useAppLocale()
  const audited=officialDeclaration(d)
  const automatic=Boolean(!d.declared&&d.ui?.capabilityMode!=='manual'&&audited)
  const c=automatic?audited:d.custom
  const custom=patch=>change({custom:patch,declared:false,ui:{capabilityMode:'manual',manualDraftPresent:true}})
  const limits=(scope,key,value)=>custom({[scope]:{...c[scope],[key]:value}})
  const inputImages=c.capabilities.vision||c.capabilities.imageEditing
  const outputImages=c.capabilities.imageGeneration||c.capabilities.imageEditing
  const relevant=role==='image'?['imageGeneration','imageEditing',...(allowedCapability(c,'vision')?['vision']:[])]:['text','vision']
  const shown=[...new Set([...relevant,...Object.keys(capabilityLabels).filter(k=>c.capabilities[k])])]
  const invalid=incompatibleCapabilities(c)
  const field=(scope,key,title,unit=1)=><label className="field" key={key}><span>{t(title)}</span><input type="number" aria-label={`${label} ${t(title)}`} min={key==='maxCount'?0:1/unit} step="any" value={c[scope][key]/unit} onChange={e=>limits(scope,key,Math.round(Number(e.target.value)*unit))}/></label>
  const format=scope=><label className="field"><span>{t(scope==='inputLimits'?'允许的输入格式':'允许的输出格式')}</span><input aria-label={`${label} ${scope==='inputLimits'?'输入格式':'输出格式'}`} value={c[scope].mimeTypes.join(',')} onChange={e=>limits(scope,'mimeTypes',e.target.value.split(',').map(x=>x.trim()))}/><small>{t('按服务文档填写 MIME，逗号分隔，例如 image/png,image/jpeg。示例不代表支持能力。')}</small></label>
  return <div className="universal-capability-fields">
    <p className="universal-source">{t(automatic?'来源：图研已有审计记录，精确匹配地址、协议与型号。':d.declared?'来源：你已确认的手动声明；未验证真实调用。':'来源：待确认草稿。初始限额不是服务商能力或最大值。')}</p>
    {automatic?<>
      <p>{Object.keys(capabilityLabels).filter(k=>c.capabilities[k]).map(k=>t(capabilityLabels[k])).join(' · ')}</p>
      <p className="universal-hint">{t('使用图研已有的输入预算与尺寸映射，不表示服务商官方最大限额。无需重复填写；如需缩小范围，可改为手动声明。')}</p>
      {inputImages&&<p>{t('图片输入预算')}：{c.inputLimits.maxCount} 张 · {c.inputLimits.maxBytes/mib} MiB / 张 · {c.inputLimits.mimeTypes.join(', ')}</p>}
      {outputImages&&<div className="universal-size-options" aria-label={`${label} 已核对尺寸`}>{c.outputSizes.map((row,i)=><span key={i} className="universal-size-chip">{row.resolution} · {row.aspectRatio}<code>{row.value}</code></span>)}</div>}
      <button type="button" className="universal-button" onClick={()=>change({...(d.ui?.manualDraftPresent?{}:{custom:audited}),declared:false,ui:{capabilityMode:'manual',manualDraftPresent:true}})}>{t(d.ui?.manualDraftPresent?'恢复手动草稿':'以当前记录开始手动调整')}</button>
    </>:<>
      <p className="universal-hint">{t('只确认服务文档明确支持的能力。勾选不会探测或授权模型；隐藏的历史限额仍保留，平台安全上限不变。')}</p>
      <div className="universal-capabilities">{shown.map(key=><label key={key}><input type="checkbox" checked={c.capabilities[key]} disabled={!allowedCapability(c,key)&&!c.capabilities[key]} onChange={e=>custom({capabilities:{...c.capabilities,[key]:e.target.checked,...(key==='vision'&&e.target.checked?{text:true}:{})}})}/><span>{t(key==='vision'&&role==='image'?'参考图理解（含文字输出）':capabilityLabels[key])}</span></label>)}</div>
      {invalid.length>0&&<div className="universal-status warning"><p>{t('当前协议无法使用这些已保存能力，未自动删除')}：{invalid.map(k=>t(capabilityLabels[k])).join('、')}。{t('可切回原协议，或明确取消这些能力后重新确认。')}</p><button type="button" className="universal-button" onClick={()=>custom({capabilities:{...c.capabilities,...Object.fromEntries(invalid.map(k=>[k,false]))}})}>{t('取消以上不兼容能力')}</button></div>}
      {inputImages&&<section aria-label={`${label} 图片输入要求`}><h4>{t('图片输入要求')}</h4><div className="model-grid">{field('inputLimits','maxCount','输入图片上限')}{field('inputLimits','maxBytes','单图 MiB',mib)}</div>{format('inputLimits')}<details className="universal-details"><summary>{t('更多图片输入限制')}</summary><div className="model-grid">{field('inputLimits','maxTotalBytes','图片合计 MiB',mib)}{field('inputLimits','maxDimension','输入单边 px')}{field('inputLimits','maxPixels','输入百万像素',1e6)}</div></details></section>}
      <details className="universal-details"><summary>{t('高级请求限制')}</summary>{field('inputLimits','requestMaxBytes','完整请求 MiB',mib)}</details>
      {outputImages&&<section aria-label={`${label} 图片输出要求`}><h4>{t('图片输出与尺寸')}</h4><p className="universal-hint">{t('组合必须有文档中的准确接口值；清晰度与比例标签不能推导接口参数。')}</p>
        {audited?.outputSizes.length>0&&<><p>{t('从此官方连接的图研已核对尺寸中选择；不会改动其他手填组合。同一组合已有不同值时，请先在高级编辑中核对或移除原值。')}</p><div className="universal-size-options" role="group" aria-label={`${label} 已核对尺寸选择`}>{audited.outputSizes.map((row,i)=>{const included=c.outputSizes.some(x=>JSON.stringify(x)===JSON.stringify(row));const conflict=!included&&c.outputSizes.some(x=>x.resolution===row.resolution&&x.aspectRatio===row.aspectRatio);return <button disabled={conflict} title={conflict?'此组合已有不同接口值；请在高级编辑中核对或移除原值后再选择。':undefined} type="button" className={`universal-button universal-size-chip ${included?'selected':''}`} key={i} aria-pressed={included} onClick={()=>custom({outputSizes:included?c.outputSizes.filter(x=>JSON.stringify(x)!==JSON.stringify(row)):[...c.outputSizes,{...row}]})}>{row.resolution} · {row.aspectRatio}<code>{row.value}</code></button>})}</div></>}
        <p>{t('已配置组合')}：{c.outputSizes.length?c.outputSizes.map(r=>`${r.resolution} / ${r.aspectRatio} → ${r.value||'未填接口值'}`).join('；'):t('尚未填写。请展开高级手动编辑，按服务文档添加。')}</p>
        <details className="universal-details"><summary>{t('高级手动编辑尺寸与输出限制')}</summary>
          {c.outputSizes.map((row,index)=><div className="universal-size-row" key={index}>{[['resolution','清晰度'],['aspectRatio','比例'],['value','接口尺寸值']].map(([key,title])=><label key={key}>{t(title)}<input aria-label={`${label} 尺寸 ${index+1} ${t(title)}`} value={row[key]} onChange={e=>custom({outputSizes:c.outputSizes.map((r,i)=>i===index?{...r,[key]:e.target.value}:r)})}/></label>)}<button type="button" className="universal-button" aria-label={`${label} 移除尺寸 ${index+1}`} onClick={()=>custom({outputSizes:c.outputSizes.filter((_,i)=>i!==index)})}>{t('移除')}</button></div>)}
          <button type="button" className="universal-button" onClick={()=>custom({outputSizes:[...c.outputSizes,{resolution:'',aspectRatio:'',value:''}]})}>{t('添加尺寸组合')}</button>
          <div className="model-grid">{field('outputLimits','maxBytes','输出单图 MiB',mib)}{field('outputLimits','maxDimension','输出单边 px')}{field('outputLimits','maxPixels','输出百万像素',1e6)}</div>{format('outputLimits')}
        </details>
      </section>}
      <label className="universal-confirm"><input type="checkbox" checked={d.declared} onChange={e=>change({declared:e.target.checked,ui:{capabilityMode:'manual',manualDraftPresent:true}})}/>{t('我已按此地址下的型号文档核对以上能力和限额')}</label>
      {audited&&<button type="button" className="universal-button" onClick={()=>change({declared:false,ui:{capabilityMode:'auto'}})}>{t('使用图研已有审计记录（保留手动草稿）')}</button>}
    </>}
  </div>
}

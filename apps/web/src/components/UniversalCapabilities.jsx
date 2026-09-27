import { useAppLocale } from './BenchmarkLocale.jsx'
import { migrateUniversalLimitPolicy, effectiveUniversalLimits, UNIVERSAL_PLATFORM_LIMITS } from '../lib/universalContract.js'
import { officialDeclaration, officialDeclarationSources } from '../lib/universalApi.js'
import { allowedCapability, capabilityLabels, incompatibleCapabilities, effectiveLimitSummary } from '../lib/universalPresentation.js'

const mib=1024*1024
export default function UniversalCapabilities({draft:d, role, label, onChange:change}) {
  const {t}=useAppLocale()
  const audited=officialDeclaration(d),sources=officialDeclarationSources(d)
  const automatic=Boolean(!d.declared&&d.ui?.capabilityMode!=='manual'&&audited)
  const c=automatic?audited:d.custom
  const custom=patch=>change({custom:patch,declared:false,ui:{capabilityMode:'manual',manualDraftPresent:true}})
  const policy=(()=>{try{return migrateUniversalLimitPolicy(c)}catch{return {version:1,service:{},user:{input:c.inputLimits,output:c.outputLimits}}}})()
  const limits=(scope,key,value,layer='user')=>{
    const part=scope==='inputLimits'?'input':'output'
    const next={...policy,[layer]:{...policy[layer],[part]:{...policy[layer][part],[key]:value}}}
    let effective={};try{effective=effectiveUniversalLimits(next)}catch{/* Keep invalid values editable until validation. */}
    custom({...effective,limitPolicy:next})
  }
  const inputImages=c.capabilities.vision||c.capabilities.imageEditing
  const outputImages=c.capabilities.imageGeneration||c.capabilities.imageEditing
  let effectiveSummary=[], effectiveError=''
  try {effectiveSummary=effectiveLimitSummary(policy,{inputImages,outputImages})} catch(error) {effectiveError=error.message}
  const relevant=role==='image'?['imageGeneration','imageEditing',...(allowedCapability(c,'vision')?['vision']:[])]:['text','vision']
  const shown=[...new Set([...relevant,...Object.keys(capabilityLabels).filter(k=>c.capabilities[k])])]
  const invalid=incompatibleCapabilities(c)
  const field=(scope,key,title,unit=1,layer='user')=>{const part=scope==='inputLimits'?'input':'output',value=policy[layer]?.[part]?.[key];return <label className="field" key={key}><span>{t(title)}{layer==='service'?' · 服务方':''}</span><input type="number" aria-label={`${label} ${t(title)}${layer==='service'?' 服务方':''}`} min={key==='maxCount'?0:1/unit} step="any" value={value==null?'':value/unit} placeholder={layer==='service'?'未知':'不额外限制'} onChange={e=>limits(scope,key,e.target.value===''?null:Math.round(Number(e.target.value)*unit),layer)}/><small>平台上限 {UNIVERSAL_PLATFORM_LIMITS[key]/unit}；{layer==='user'?`服务方 ${policy.service[part]?.[key]==null?'未知':policy.service[part][key]/unit}`:'来源：用户按文档声明；留空表示未知'}</small></label>}
  const format=(scope,layer='user')=>{const part=scope==='inputLimits'?'input':'output';return <label className="field"><span>{t(scope==='inputLimits'?'允许的输入格式':'允许的输出格式')}{layer==='service'?' · 服务方':''}</span><input aria-label={`${label} ${scope==='inputLimits'?'输入格式':'输出格式'}${layer==='service'?' 服务方':''}`} placeholder={layer==='service'?'未知':'不额外限制'} value={policy[layer]?.[part]?.mimeTypes?.join(',')||''} onChange={e=>limits(scope,'mimeTypes',e.target.value?e.target.value.split(',').map(x=>x.trim()):null,layer)}/><small>平台仅接受 PNG、JPEG、WebP；已知格式取交集。填 MIME，例如 image/png,image/jpeg；示例不代表服务能力。</small></label>}
  return <div className="universal-capability-fields">
    <p className="universal-source">{t(automatic?'来源：图研已有审计记录，精确匹配地址、协议与型号。':d.declared?'来源：你已确认的手动声明；未验证真实调用。':'来源：待确认草稿。初始限额不是服务商能力或最大值。')}</p>
    {automatic?<>
      <details className="universal-details"><summary>查看实际采用的审计来源</summary><p>目录快照：{sources.registryVersion} · {sources.provider} · {sources.modelId} · {sources.protocol}</p><p>{sources.baseUrl}</p>{sources.inputSource&&<p><a href={sources.inputSource} target="_blank" rel="noopener noreferrer">输入预算依据</a>（图研执行值可能更严格）</p>}{sources.sizeSources.length>0&&<><p>尺寸映射核查：{sources.sizeCheckedAt}</p>{sources.sizeSources.map(url=><p key={url}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a></p>)}</>}</details>
      <p>{Object.keys(capabilityLabels).filter(k=>c.capabilities[k]).map(k=>t(capabilityLabels[k])).join(' · ')}</p>
      <p className="universal-hint">{t('使用图研已有的输入预算与尺寸映射，不表示服务商官方最大限额。无需重复填写；如需缩小范围，可改为手动声明。')}</p>
      {inputImages&&<p>{t('图片输入预算')}：{c.inputLimits.maxCount} 张 · {c.inputLimits.maxBytes/mib} MiB / 张 · {c.inputLimits.mimeTypes.join(', ')}</p>}
      {outputImages&&<div className="universal-size-options" aria-label={`${label} 已核对尺寸`}>{c.outputSizes.map((row,i)=><span key={i} className="universal-size-chip">{row.resolution} · {row.aspectRatio}<code>{row.value}</code></span>)}</div>}
      <button type="button" className="universal-button" onClick={()=>change({...(d.ui?.manualDraftPresent?{}:{custom:audited}),declared:false,ui:{capabilityMode:'manual',manualDraftPresent:true}})}>{t(d.ui?.manualDraftPresent?'恢复手动草稿':'以当前记录开始手动调整')}</button>
    </>:<>
      <p className="universal-hint">{t('只确认服务文档明确支持的能力。勾选不会探测或授权模型；隐藏的历史限额仍保留，平台安全上限不变。')}</p>
      <div className="universal-capabilities">{shown.map(key=><label key={key}><input type="checkbox" checked={c.capabilities[key]} disabled={!allowedCapability(c,key)&&!c.capabilities[key]} onChange={e=>custom({capabilities:{...c.capabilities,[key]:e.target.checked,...(key==='vision'&&e.target.checked?{text:true}:{})}})}/><span>{t(key==='vision'&&role==='image'?'参考图理解（含文字输出）':capabilityLabels[key])}</span></label>)}</div>
      {invalid.length>0&&<div className="universal-status warning"><p>{t('当前协议无法使用这些已保存能力，未自动删除')}：{invalid.map(k=>t(capabilityLabels[k])).join('、')}。{t('可切回原协议，或明确取消这些能力后重新确认。')}</p><button type="button" className="universal-button" onClick={()=>custom({capabilities:{...c.capabilities,...Object.fromEntries(invalid.map(k=>[k,false]))}})}>{t('取消以上不兼容能力')}</button></div>}
      <section className="universal-details"><h4>当前实际执行的限制</h4>
        {effectiveError?<p role="alert" className="universal-status error">{effectiveError}</p>:<dl className="universal-validation" aria-label={`${label} 有效限制`}>{effectiveSummary.map(row=><div key={row.label}><dt>{row.label}</dt><dd>{row.value}<small>由{row.source}约束</small></dd></div>)}</dl>}
        <p className="universal-hint">服务方未知时仍受平台和你的限制约束，不代表服务方一定接受。完整请求包含编码后的图片和其他字段。</p>
      </section>
      <p className="universal-hint">以下数值是你的主动限制，不是费用预算。旧配置的限额已保留为用户限制；服务方未知时仍执行图研硬上限与用户限制，且不会自动授权未知能力。</p>
      <details className="universal-details"><summary>服务方限制（可留空为未知）</summary><p>只有文档明确给出的字段才填写；本页手填信息标为用户声明。上下文 token 数不能用于推导图片限制。</p><div className="model-grid">{inputImages&&<>{field('inputLimits','maxCount','输入图片上限',1,'service')}{field('inputLimits','maxBytes','单图 MiB',mib,'service')}{field('inputLimits','maxTotalBytes','图片合计 MiB',mib,'service')}{field('inputLimits','maxDimension','输入单边 px',1,'service')}{field('inputLimits','maxPixels','输入百万像素',1e6,'service')}</>}{field('inputLimits','requestMaxBytes','完整请求 MiB',mib,'service')}{outputImages&&<>{field('outputLimits','maxBytes','输出单图 MiB',mib,'service')}{field('outputLimits','maxDimension','输出单边 px',1,'service')}{field('outputLimits','maxPixels','输出百万像素',1e6,'service')}</>}</div>{inputImages&&format('inputLimits','service')}{outputImages&&format('outputLimits','service')}</details>
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
      <label className="universal-confirm"><input type="checkbox" checked={d.declared} onChange={e=>change({declared:e.target.checked,ui:{capabilityMode:'manual',manualDraftPresent:true}})}/>{t('我已核对能力与已知服务限制；未知字段按平台及我的限制执行')}</label>
      {audited&&<button type="button" className="universal-button" onClick={()=>change({declared:false,ui:{capabilityMode:'auto'}})}>{t('使用图研已有审计记录（保留手动草稿）')}</button>}
    </>}
  </div>
}

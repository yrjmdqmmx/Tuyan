// Capability declarations remain explicit and independent of catalog visibility.
const mib = 1024 * 1024
export default function UniversalCapabilities({draft:d, label, onChange:change}) {
  const c = d.custom
  const custom = patch => change({custom:patch})
  const limits = (scope,key,value) => custom({[scope]:{...c[scope],[key]:value}})
  return <div className="universal-capability-fields">
          <p>仅精确匹配官方地址、协议与已审计型号时采用已有声明。兼容服务需按其文档填写。下面的初始值是待确认草稿，不是对上游能力的保证。</p>
          <div className="universal-capabilities">{Object.entries({text:'文本生成',vision:'图片理解',imageGeneration:'图片生成',imageEditing:'直接图片编辑'}).map(([key,title])=><label key={key}><input type="checkbox" checked={c.capabilities[key]} onChange={e=>custom({capabilities:{...c.capabilities,[key]:e.target.checked}})}/>{title}</label>)}</div>
          <div className="model-grid">{[['maxCount','输入图片上限',1],['maxBytes','单图 MiB',mib],['maxTotalBytes','图片合计 MiB',mib],['maxDimension','输入单边 px',1],['maxPixels','输入百万像素',1e6],['requestMaxBytes','完整请求 MiB',mib]].map(([key,title,unit])=><label className="field" key={key}><span>{title}</span><input type="number" aria-label={`${label} ${title}`} min={key==='maxCount'?0:1/unit} step="any" value={c.inputLimits[key]/unit} onChange={e=>limits('inputLimits',key,Math.round(Number(e.target.value)*unit))}/></label>)}</div>
          <label className="field"><span>允许的输入格式</span><input aria-label={`${label} 输入格式`} value={c.inputLimits.mimeTypes.join(',')} onChange={e=>limits('inputLimits','mimeTypes',e.target.value.split(',').map(x=>x.trim()))}/><small>逗号分隔 MIME，例如 image/png,image/jpeg,image/webp。</small></label>
          <div className="model-grid">{[['maxBytes','输出单图 MiB',mib],['maxDimension','输出单边 px',1],['maxPixels','输出百万像素',1e6]].map(([key,title,unit])=><label className="field" key={key}><span>{title}</span><input type="number" aria-label={`${label} ${title}`} min={1/unit} step="any" value={c.outputLimits[key]/unit} onChange={e=>limits('outputLimits',key,Math.round(Number(e.target.value)*unit))}/></label>)}</div>
          <label className="field"><span>允许的输出格式</span><input aria-label={`${label} 输出格式`} value={c.outputLimits.mimeTypes.join(',')} onChange={e=>limits('outputLimits','mimeTypes',e.target.value.split(',').map(x=>x.trim()))}/></label>
          {(c.capabilities.imageGeneration||c.capabilities.imageEditing)&&<div><p>输出尺寸映射：每一行表示一个可执行组合。像素协议填写 1024x1024（百炼可为 1024*1024）；Gemini 填 1K/2K 等实际支持的 image size。</p>{c.outputSizes.map((row,index)=><div className="universal-size-row" key={index}>{[['resolution','清晰度'],['aspectRatio','比例'],['value','接口尺寸值']].map(([key,title])=><label key={key}>{title}<input aria-label={`${label} 尺寸 ${index+1} ${title}`} value={row[key]} onChange={e=>custom({outputSizes:c.outputSizes.map((r,i)=>i===index?{...r,[key]:e.target.value}:r)})}/></label>)}<button type="button" className="universal-button" onClick={()=>custom({outputSizes:c.outputSizes.filter((_,i)=>i!==index)})}>移除</button></div>)}<button type="button" className="universal-button" onClick={()=>custom({outputSizes:[...c.outputSizes,{resolution:'1K',aspectRatio:'1:1',value:''}]})}>添加尺寸组合</button></div>}
          <label className="universal-confirm"><input type="checkbox" checked={d.declared} onChange={e=>change({declared:e.target.checked})}/>我已按此地址下的型号文档核对以上能力和限额</label>

  </div>
}

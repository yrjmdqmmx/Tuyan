import {useEffect,useRef,useState} from 'react';
import RefineMaskEditor,{refineMaskFile} from '../components/RefineMaskEditor.jsx';
import {browserFile,saveBrowserMaterial} from '../lib/browserMaterials.js';
import {refineControlsFor} from '../lib/refineControls.js';
import {ORIGINAL_SCOPE} from './workspaceSync.js';
import {workspaceVersionDataUrl} from './workspaceResultAsset.js';
export default function WorkspaceRefineControls({settings,model,target,source,userId,base,onChange}){
 const [url,setUrl]=useState(''),[mask,setMask]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const live=useRef(true);useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const identity=target?.id||source?.id;
 const latest=useRef({settings,identity});latest.current={settings,identity};
 const caps=model?.capabilities?.refineControls||refineControlsFor(settings.models?.image?.accessProvider,settings.models?.image?.modelId);
 useEffect(()=>{let live=true,objectUrl='';setUrl('');setMask(null);setError('');
  if(caps?.mask&&identity)(async()=>{try{const value=target?await workspaceVersionDataUrl(target,base,userId):(objectUrl=URL.createObjectURL(await browserFile(ORIGINAL_SCOPE,source)));if(live)setUrl(value);}catch(e){if(live)setError(e.message);}})();
  return()=>{live=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[identity,caps?.mask,base,userId]);
 async function save(){setBusy(true);setError('');try{const file=await refineMaskFile(mask);if(!file)throw Error('请先标记修改区域');const ref=await saveBrowserMaterial(ORIGINAL_SCOPE,file);if(!live.current||latest.current.identity!==identity)return;onChange({...latest.current.settings,refineMask:{...ref,purpose:'source',sourceId:identity}});setMask(null);}catch(e){setError(e.message);}finally{setBusy(false);}}
 const structured=settings.refineStructured||null;
 return <section className="tw-settings-section"><h3>精修区域与约束</h3>
  {settings.refineMask&&<p>已保存遮罩（仅当前浏览器）{settings.refineMask.sourceId!==identity?' · 与当前原图不匹配，请清除后重画':''} <button type="button" onClick={()=>onChange({...settings,refineMask:null})}>清除已保存遮罩</button></p>}
  {caps?.mask?url?<><RefineMaskEditor source={{url}} value={mask} onChange={setMask} disabled={busy}/><button type="button" disabled={!mask?.strokes?.length||busy} onClick={save}>保存此遮罩到当前草稿</button><p className="tw-muted">绘制后请保存遮罩。跨设备仅同步文件引用，需要时补传原件或重新绘制。</p></>:<p>正在读取原图；缺少本地原件时请补传。</p>:<p>当前型号未开放遮罩编辑。</p>}
  {(caps?.structured==='bria-fibo'||structured)&&<><label><input type="checkbox" checked={!!structured} disabled={!structured&&caps?.structured!=='bria-fibo'} onChange={e=>onChange({...settings,refineStructured:e.target.checked?{object:'',attributes:'',relationship:'',preserve:''}:null})}/>使用结构化修改约束</label>{structured&&Object.entries({object:'修改对象',attributes:'目标属性',relationship:'关系',preserve:'需要保留'}).map(([key,label])=><label className="tw-field" key={key}>{label}<textarea maxLength={500} value={structured[key]} onChange={e=>onChange({...settings,refineStructured:{...structured,[key]:e.target.value}})}/></label>)}</>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}

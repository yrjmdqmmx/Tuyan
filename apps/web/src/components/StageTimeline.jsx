import { CheckCircle2, Image as ImageIcon, MessageSquareText } from 'lucide-react';
import { resolveImageUrl } from '../utils';
import {elapsedLabel} from '../workspace/workspaceProgress.js';

const labels={content:'观察内容',actual_text:'识别文字',layout:'布局',connections:'连接',problems:'问题',suggestions:'建议',item:'对象',detail:'说明',resolution:'处理方式',plan:'绘图方案',revised_description:'修改方案',assessment:'评审结论',critic_suggestions:'改进建议',missingInputs:'待补充内容',note:'说明',visual:'画面检查',code:'代码检查',numericReview:'数值检查',findings:'发现的问题',checks:'检查项',uncertainties:'不确定项',issue:'问题',location:'位置',evidence:'依据',suggestion:'建议',expected:'预期',observed:'实际',source:'来源',reason:'原因',method:'核对方式',label:'对象',status:'状态'};
const statuses={passed:'通过',issues_found:'发现问题',review_failed:'评审未完成',modified_unreviewed:'修改后未复审',ready:'已完成',needs_input:'需要补充输入',not_applicable:'不适用',uncertain:'尚不能确认'};
function parse(text){try{return JSON.parse(text);}catch{return null;}}
function Fields({value,depth=0}){
  if(value==null)return null;
  if(typeof value!=='object')return <span className="stage-text">{statuses[value]||String(value)}</span>;
  if(Array.isArray(value))return value.length?<ul>{value.map((item,i)=><li key={i}><Fields value={item} depth={depth+1}/></li>)}</ul>:<span>无</span>;
  return <dl className="stage-fields">{Object.entries(value).filter(([key])=>labels[key]).map(([key,item])=><div key={key}><dt>{labels[key]}</dt><dd>{depth>1&&typeof item==='object'?<details><summary>查看内容</summary><Fields value={item}/></details>:<Fields value={item} depth={depth+1}/>}</dd></div>)}</dl>;
}
export default function StageTimeline({job,apiBase}){
  const stages=job?.stages||[],references=job?.retrieved_references||job?.retrievedReferences||[];
  if(!stages.length&&!references.length)return null;
  return <section className="stage-timeline stage-timeline-folded" aria-label="生成过程">
    {references.length>0&&<details className="retrieved-reference-strip"><summary>检索参考 · {references.length} 项</summary><div>{references.map(item=><span key={item.id} title={item.summary}>{item.title||item.id}</span>)}</div></details>}
    {stages.length>0&&<><h4 className="stage-title">生成过程</h4><div className="stage-list">{stages.map((stage,index)=>{
      const parsed=parse(stage.text),details=parsed?.decision||parsed,hasFields=details&&typeof details==='object'&&Object.keys(details).some(k=>labels[k]);
      const candidate=Number(stage.candidateId??stage.candidate_id??0);
      return <details className={`stage-item ${stage.error?'has-error':''}`} key={stage.id||`${stage.type}-${index}`}>
        <summary><span className="stage-marker">{stage.type==='render'?<ImageIcon size={15}/>:stage.type==='critic'?<MessageSquareText size={15}/>:<CheckCircle2 size={15}/>}</span><strong>{stage.title||stage.type}</strong><span className="stage-meta">候选 {String.fromCharCode(65+candidate)}{stage.round?` · 第 ${stage.round} 轮`:''}{stage.durationMs>0&&` · ${elapsedLabel(stage.durationMs)}`}</span></summary>
        <div className="stage-body">{stage.error&&<p role="alert">{stage.error}</p>}
          {hasFields?<Fields value={details}/>:!parsed&&stage.text?<p className="stage-text">{stage.text}</p>:null}
          {stage.image?.url&&<img src={resolveImageUrl(apiBase,stage.image.url)} alt={stage.title||'阶段图'} loading="lazy"/>}
          {parsed&&<details className="stage-raw"><summary>原始记录</summary><pre>{JSON.stringify(parsed,null,2)}</pre></details>}
        </div>
      </details>;
    })}</div></>}
  </section>;
}

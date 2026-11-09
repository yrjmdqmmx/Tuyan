import MenuSelect from './MenuSelect.jsx';
import {JOURNAL_CONTENT,JOURNALS} from '../../../../packages/api/src/journal-rules.js';
import {getFigureType} from '../../../../packages/figure-taxonomy/src/index.js';
import {refineSourceIssue} from '../lib/refineSource.js';

export default function RefineSourceContext({source,onChange,disabled=false}){
  if(!source.url)return null;
  const context=source.taskContext,figure=getFigureType(context?.figureTypeId);
  const inherited=Boolean(context?.contentType),issue=refineSourceIssue(source);
  const journal=JOURNALS.find(j=>j.id===source.journalSelection?.journalId);
  return <div className="journal-content-basis" aria-label="当前原图的设置">
    {inherited?<p>沿用原任务：{figure?.label||JOURNAL_CONTENT[context.contentType]} · {journal?.name||(source.journalSelection?'历史期刊规则':'不指定期刊')}</p>
      :<label>原图性质<MenuSelect value={source.contentType||''} disabled={disabled} onChange={e=>onChange(e.target.value)}>
        <option value="" disabled>请选择这张原图的性质</option>
        {Object.entries(JOURNAL_CONTENT).map(([id,label])=><option key={id} value={id}>{label}</option>)}
      </MenuSelect></label>}
    {!inherited&&<p>{context?'原任务没有保存图型或性质记录，请补充确认。':'此图没有关联任务记录；确认只用于当前原图，更换图片后需重新确认。'}</p>}
    {source.journalSelection&&<p>规则版本 {source.journalSelection.version} · {source.journalSelection.widthMm} mm，可在精修设置中查看。</p>}
    {issue&&source.contentType&&<p role="alert">{issue}</p>}
  </div>;
}

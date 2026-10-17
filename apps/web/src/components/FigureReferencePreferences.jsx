import {useId} from 'react'
import {SlidersHorizontal} from 'lucide-react'

export default function FigureReferencePreferences({mode='none',draft={},onChange}) {
 const titleId=useId()
 if(mode!=='auto')return null
 const value=draft.analysis?.referencePreferences||{}
 const update=(key,next)=>onChange({...draft,analysis:{...draft.analysis,referencePreferences:{...value,[key]:next}}})
 return <section className="figure-reference-preferences" aria-labelledby={titleId}>
  <header className="reference-preferences-head"><span className="reference-preferences-icon"><SlidersHorizontal size={18}/></span><h3 id={titleId}>参考图偏好</h3><span className="reference-preferences-mode">自动检索</span></header>
  <p className="reference-preferences-description">优先匹配当前图型，再按研究领域、排布和内容密度选择论文案例。</p>
   <div className="reference-preferences-fields">
    <label className="field reference-preferences-topic"><span>研究主题或学科关键词 <small>可选</small></span><input value={value.discipline||''} onChange={e=>update('discipline',e.target.value)} placeholder="例如：免疫、材料、ecology"/></label>
    <label className="field"><span>排布偏好</span><select value={value.layout||''} onChange={e=>update('layout',e.target.value)}><option value="">不限</option><option value="grid">面板网格</option><option value="horizontal">横向展开</option><option value="vertical">纵向展开</option><option value="radial">环形展开</option></select></label>
    <label className="field"><span>内容密度</span><select value={value.density||''} onChange={e=>update('density',e.target.value)}><option value="">不限</option><option value="low">疏朗</option><option value="medium">适中</option><option value="high">密集</option></select></label>
   </div>
   <p className="reference-preferences-note">留空或选择“不限”即可。偏好用于选参考案例，最终图的排版要求请写在研究内容中。</p>
 </section>
}

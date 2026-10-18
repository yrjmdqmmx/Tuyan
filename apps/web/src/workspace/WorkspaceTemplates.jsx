import { useEffect, useState } from 'react';
import { ArrowUpRight, Image, Plus, Search } from 'lucide-react';
import { referenceLibraryRequest } from '@paperbanana/api';
import { attachFeaturedTemplateImages, featuredTemplateRequest } from '../lib/featuredTemplates.js';
import { API_BASE_DEFAULT } from '../config.js';
import WorkspaceDialog from './WorkspaceDialog.jsx';

const categories = { method_framework: '方法框架', workflow: '实验流程', mechanism: '机制通路', system_architecture: '系统架构', data_stat: '统计图表' };

export default function WorkspaceTemplates({ onApply }) {
  const [templates, setTemplates] = useState(() => attachFeaturedTemplateImages([]));
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  useEffect(() => {
    const ac = new AbortController();
    referenceLibraryRequest(API_BASE_DEFAULT, { runtime: 'gateway' }, { ...featuredTemplateRequest(), signal: ac.signal })
      .then(result => { if (!ac.signal.aborted) setTemplates(attachFeaturedTemplateImages(result.references)); })
      .catch(() => {});
    return () => ac.abort();
  }, []);
  const selected = templates.find(template => template.id === selectedId);
  const visible = templates.filter(template => `${template.title} ${template.summary} ${categories[template.category]}`.includes(query.trim()));
  return <section className="tw-templates" aria-label="绘图模板库">
    <div className="tw-page-intro"><div><h2>为研究图示找一个起点</h2><p>参考论文插图的结构，选用教学模板，再换成自己的方法与数据。</p></div>
      <label className="tw-template-search"><Search size={16} aria-hidden="true"/><input aria-label="搜索绘图模板" type="search" placeholder="搜索模板" value={query} onChange={event => setQuery(event.target.value)}/></label>
    </div>
    <p className="tw-page-notice">使用模板会新建任务，保留当前任务和草稿；确认内容后再生成图片。</p>
    <div className="tw-template-grid">
      {visible.map(template => <article className="tw-template-card" key={template.id}>
        <button type="button" className="tw-template-preview" aria-label={`预览${template.title}`} onClick={() => setSelectedId(template.id)}>
          {template.imageUrl ? <img src={template.imageUrl} alt={`${template.title}参考图`} loading="lazy"/> : <span className="tw-template-placeholder"><Image size={28} aria-hidden="true"/>参考图暂未载入</span>}
          <span className="tw-template-preview-label">查看参考图与模板 <ArrowUpRight size={14}/></span>
        </button>
        <div className="tw-template-card-body"><span className="tw-template-category">{categories[template.category]}</span><h3>{template.title}</h3><p>{template.summary}</p>
          <div className="tw-template-card-footer"><span>论文原图 · 仅参考结构</span><button type="button" onClick={() => setSelectedId(template.id)}>查看模板 <ArrowUpRight size={14}/></button></div>
        </div>
      </article>)}
    </div>
    {!visible.length && <div className="tw-template-empty"><p>没有找到匹配的模板</p><button type="button" onClick={() => setQuery('')}>查看全部模板</button></div>}
    {selected && <WorkspaceDialog title={selected.title} wide onClose={() => setSelectedId('')}>
      <div className="tw-template-detail">
        {selected.imageUrl && <img src={selected.imageUrl} alt={`${selected.title}参考图`}/>}
        <details className="tw-template-source"><summary>论文原图来源与许可</summary><p>{selected.attribution || '参考图来源暂未载入。'}</p><div>{selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer">查看原论文 <ArrowUpRight size={14}/></a>}{selected.licenseUrl && <a href={selected.licenseUrl} target="_blank" rel="noreferrer">查看许可 <ArrowUpRight size={14}/></a>}</div></details>
        <h3>教学模板内容</h3><p>{selected.methodContent}</p><p className="tw-muted">{selected.caption}</p>
        <div className="tw-template-apply"><p>新建后可修改内容、添加材料并选择模型。此操作不会调用模型。</p><button type="button" className="tw-primary" onClick={() => onApply(selected)}><Plus size={16}/>使用模板新建任务</button></div>
      </div>
    </WorkspaceDialog>}
  </section>;
}

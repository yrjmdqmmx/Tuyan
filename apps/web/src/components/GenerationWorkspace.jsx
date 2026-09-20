import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function GenerationInputPanel({ compact, heading, category, reference, guidance, fields, extras, hasSupplement, supplementError }) {
  const [expanded, setExpanded] = useState(false);
  return <div className="input-col">
    {heading}
    {category}
    {!compact && reference}
    {guidance}
    {fields}
    {compact ? <details className="generation-supplement" open={expanded || supplementError}>
      <summary onClick={event => { event.preventDefault(); setExpanded(value => !value); }}>
        <span><strong>参考图与补充要求</strong><small>{hasSupplement ? '已添加补充内容' : '可选 · 参考图片、负向提示词'}</small></span>
        <ChevronDown size={18} />
      </summary>
      <div className="generation-supplement-body">{reference}{extras}</div>
    </details> : extras}
  </div>;
}

export default function GenerationWorkspace({ compact, template, input, controls, results, connection, jobId }) {
  const resultRef = useRef(null);
  const previousJobId = useRef(jobId);
  useEffect(() => {
    const changed = jobId && jobId !== previousJobId.current;
    previousJobId.current = jobId;
    if (!compact || !changed) return;
    resultRef.current?.scrollIntoView?.({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }, [compact, jobId]);

  if (!compact) return <section className="workspace">
    {template}{controls}
    <section className="input-results">{input}{results}</section>
  </section>;

  return <section className="workspace mobile-generation-workspace">
    <header className="mobile-workflow-intro">
      <h2>创建学术图示</h2>
      <p>准备研究内容，确认设置，再生成候选图。</p>
      <ol aria-label="创作流程"><li>准备内容</li><li>设置与生成</li><li>查看结果</li></ol>
    </header>
    <section className="mobile-flow-step" aria-labelledby="prepare-content-title">
      <header className="mobile-step-heading"><span aria-hidden="true">1</span><h2 id="prepare-content-title">准备内容</h2></header>
      {template}
      {input}
    </section>
    <section className="mobile-flow-step mobile-generation-review" aria-labelledby="confirm-settings-title">
      <header className="mobile-step-heading"><span aria-hidden="true">2</span><h2 id="confirm-settings-title">设置与生成</h2></header>
      <p className="mobile-step-description">确认模型和输出规格后，开始生成。</p>
      {connection}
      {controls}
    </section>
    <section ref={resultRef} className="mobile-flow-step mobile-generation-results" aria-label="查看结果">
      {results}
    </section>
  </section>;
}

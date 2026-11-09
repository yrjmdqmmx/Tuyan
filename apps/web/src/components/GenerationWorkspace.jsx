import { useAppLocale } from './BenchmarkLocale.jsx'
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export function GenerationInputPanel({ compact, heading, category, reference, guidance, fields, extras, hasSupplement, supplementError }) {
  const { t } = useAppLocale()
  const [expanded, setExpanded] = useState(false);
  return <div className="input-col">
    {heading}
    {category}
    {reference}
    {guidance}
    {fields}
    {compact ? <details className="generation-supplement" open={expanded || supplementError}>
      <summary onClick={event => { event.preventDefault(); setExpanded(value => !value); }}>
        <span><strong>{t("补充要求")}</strong><small>{t(hasSupplement ? '已添加补充内容' : '可选 · 负向提示词')}</small></span>
        <ChevronDown size={18} />
      </summary>
      <div className="generation-supplement-body">{extras}</div>
    </details> : extras}
  </div>;
}

export default function GenerationWorkspace({ compact, template, input, controls, results, connection, jobId, preserveResults = false }) {
  const { t } = useAppLocale()
  const resultRef = useRef(null);
  const previousJobId = useRef(jobId);
  // Moving the SVG result between responsive layouts must not remount its editor/history.
  const [resultHost] = useState(() => {
    if (typeof document === 'undefined') return null;
    const node = document.createElement('div');
    node.style.display = 'contents';
    return node;
  });
  const mountResultHost = useCallback(node => { if (node && resultHost) node.appendChild(resultHost); }, [resultHost]);
  const resultSlot = preserveResults && resultHost ? <div ref={mountResultHost} style={{display:'contents'}} /> : results;
  useEffect(() => {
    const changed = jobId && jobId !== previousJobId.current;
    previousJobId.current = jobId;
    if (!compact || !changed) return;
    resultRef.current?.scrollIntoView?.({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }, [compact, jobId]);

  const layout = !compact ? <section className="workspace">
    {template}{controls}
    <section className="input-results">{input}{resultSlot}</section>
  </section> : <section className="workspace mobile-generation-workspace">
    <header className="mobile-workflow-intro">
      <h2>{t("创建学术图示")}</h2>
      <p>{t("准备研究内容，确认设置，再生成候选图。")}</p>
      <ol aria-label={t("创作流程")}><li>{t("准备内容")}</li><li>{t("设置与生成")}</li><li>{t("查看结果")}</li></ol>
    </header>
    <section className="mobile-flow-step" aria-labelledby="prepare-content-title">
      <header className="mobile-step-heading"><span aria-hidden="true">1</span><h2 id="prepare-content-title">{t("准备内容")}</h2></header>
      {template}
      {input}
    </section>
    <section className="mobile-flow-step mobile-generation-review" aria-labelledby="confirm-settings-title">
      <header className="mobile-step-heading"><span aria-hidden="true">2</span><h2 id="confirm-settings-title">{t("设置与生成")}</h2></header>
      <p className="mobile-step-description">{t("确认模型和输出规格后，开始生成。")}</p>
      {connection}
      {controls}
    </section>
    <section ref={resultRef} className="mobile-flow-step mobile-generation-results" aria-label={t("查看结果")}>
      {resultSlot}
    </section>
  </section>;
  return <>{layout}{preserveResults && resultHost ? createPortal(results, resultHost) : null}</>;
}

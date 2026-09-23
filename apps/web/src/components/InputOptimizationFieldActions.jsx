import { useAppLocale } from './BenchmarkLocale.jsx'
import { Sparkles, Undo2 } from 'lucide-react';

const labels = { methodContent: '方法栏', caption: '图注栏', negativePrompt: '负向提示栏', editInstruction: '精修指令' };

export default function InputOptimizationFieldActions({ target, disabledReason, hasUndo, onOptimize, onRestore }) {
  const { t } = useAppLocale()
  const reasonId = `input-optimization-${target}-reason`;
  const controlLabel = t(labels[target]);
  return (
    <div className="input-optimization-field-actions">
      <button type="button" className="input-optimization-trigger" aria-label={t("优化输入：{v0}", {v0: controlLabel})}
        aria-describedby={disabledReason ? reasonId : undefined} title={t(disabledReason || '生成候选优化稿，确认后才会替换原文')}
        disabled={Boolean(disabledReason)} onClick={() => onOptimize(target)}>
        <Sparkles size={14} />{t("优化输入")}</button>
      {hasUndo ? <button type="button" className="input-optimization-restore" aria-label={t("恢复{v0}优化前内容", {v0: controlLabel})} onClick={() => onRestore(target)}><Undo2 size={13} />{t("恢复优化前内容")}</button> : null}
      {disabledReason ? <small className="input-optimization-disabled-reason" id={reasonId}>{t(disabledReason)}</small> : null}
    </div>
  );
}

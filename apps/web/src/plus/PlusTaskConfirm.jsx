import WorkspaceDialog from '../workspace/WorkspaceDialog.jsx';
import {PLUS_PRESETS} from '../../../../packages/api/src/plus.mjs';
export default function PlusTaskConfirm({value,onConfirm,onCancel}){
  if(!value)return null;
  const {quote,spec}=value;
  return <WorkspaceDialog title={quote.simulation?'确认模拟任务':'确认积分使用'} onClose={onCancel}>
    <div className="tw-plus-confirm">
      <p>{spec.path.toUpperCase()} · {PLUS_PRESETS[spec.mode].label} · {spec.candidates} 个候选 · {spec.reviews} 轮评审</p>
      <strong>最多预留 {quote.credits} 积分</strong>
      <p>{quote.simulation?'本地模拟，不调用模型。此数值不作为正式扣分标准。':'按确认的实际模型用量结算，未使用部分释放；费用待核对时保留预留。'}</p>
      <div className="tw-plus-actions"><button type="button" onClick={onCancel}>取消</button><button type="button" className="primary" onClick={onConfirm}>{quote.simulation?'确认模拟执行':'确认并开始'}</button></div>
    </div>
  </WorkspaceDialog>;
}

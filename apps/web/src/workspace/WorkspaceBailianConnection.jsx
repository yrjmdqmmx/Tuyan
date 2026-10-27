import { BAILIAN_WORKSPACE_REGIONS, normalizeBailianWorkspace } from '../lib/bailianWorkspace.js';
export function cleanBailianConnection(form) {
  const {bailian,...rest}=form;
  return {...rest,...(form.provider==='bailian'&&bailian!=null?{bailian:normalizeBailianWorkspace(bailian)}:{})};
}
export default function WorkspaceBailianConnection({value,onChange}) {
  const config=value.bailian;
  return <><label>业务空间接入<select value={config?'workspace':'legacy'} onChange={e=>onChange({...value,bailian:e.target.value==='workspace'?{workspaceId:'',region:'cn-beijing'}:undefined})}><option value="legacy">旧型号原有接口</option><option value="workspace">配置新型号业务空间</option></select></label>
    {config&&<><label>百炼业务空间 ID<input required maxLength={63} placeholder="百炼控制台中的 WorkspaceId" value={config.workspaceId} onChange={e=>onChange({...value,bailian:{...config,workspaceId:e.target.value}})}/></label>
    <label>百炼服务地区<select value={config.region} onChange={e=>onChange({...value,bailian:{...config,region:e.target.value}})}>{Object.entries(BAILIAN_WORKSPACE_REGIONS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <p className="tw-muted">业务空间与 API 密钥须属于所选地区。MiniMax M3.1 Flash、MiMo UltraSpeed 仅支持北京；DeepSeek 1017 支持列表中的五个地区。旧型号仍沿用原有接口。</p></>}
    <p className="tw-muted">保存不会开通百炼模型或发起调用；请先在百炼确认服务已开通。三个新型号均可用于文字分析和图片理解；实际调用仍需对应账户权限。</p></>;
}

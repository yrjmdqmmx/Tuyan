import {RESPONSES_IMAGE_MODELS, AZURE_CALL_MODELS, BEDROCK_TEXT_MODEL, BEDROCK_IMAGE_MODELS} from '../lib/universalContract.js'

/** Service-specific controls stay inside the existing role editor. No arbitrary request fields. */
export default function UniversalExtensions({draft,role,onChange}) {
  const c=draft.custom, patch=custom=>onChange({custom,declared:false}), tool=c.imageTool
  const azure=/\.(openai\.azure\.com|services\.ai\.azure\.com)\/openai\/v1\/?$/.test(c.baseUrl)
  const bedrock=c.protocol.startsWith('bedrock-')
  const provider=azure?'azure':c.baseUrl.replace(/\/$/,'')==='https://api.x.ai/v1'?'xai':c.baseUrl.replace(/\/$/,'')==='https://api.openai.com/v1'?'openai':null
  return <>
    {azure&&['openai-chat','openai-responses','openai-images'].includes(c.protocol)&&<section className="universal-status neutral">
      <p>Azure OpenAI v1：下面的模型 ID 填你已有的部署名；仅支持已核验 OpenAI 模型，不代表其他 Foundry 服务都兼容。{c.protocol==='openai-images'?'Images 使用文档明确的 api-version=preview，由系统生成。':'文字 / Responses 无需 api-version 查询参数。'}</p>
      <label className="field"><span>部署对应的原厂型号（请在 Azure 控制台核对）</span><select aria-label="Azure 部署原厂型号" value={c.azure?.deploymentModel||''} onChange={e=>patch({azure:{deploymentModel:e.target.value}})}><option value="">请选择实际部署型号</option>{(c.protocol==='openai-images'?['gpt-image-1','gpt-image-1-mini','gpt-image-1.5']:AZURE_CALL_MODELS).map(id=><option key={id}>{id}</option>)}</select></label>
      <p>这是你对部署映射的声明，不是账号验证。Entra 令牌须匹配资源受众（教程示例 ai.azure.com，REST 参考也列 cognitiveservices.azure.com）；请按资源文档核对；过期需主动更新，本页不会登录 Azure 或创建部署。</p>
    </section>}
    {role==='image'&&c.protocol==='openai-responses'&&<section className="universal-status neutral" aria-label="Responses 图像工具">
      <label><input type="checkbox" checked={Boolean(tool)} disabled={!provider&&!tool} onChange={e=>patch({imageTool:e.target.checked?{provider,...(provider==='xai'?{}:{model:'gpt-image-1.5'}),...(provider==='azure'?{deployment:''}:{})}:undefined})}/> 使用当前图像连接的 image_generation 工具</label>
      {!provider&&<p>此地址尚无已确认的图像工具适配，不能因协议名称相同继承原厂能力。</p>}
      {tool&&<>
        <p>调用模型在下方填写，属于当前图像连接。连续编辑会重新输入图研保存的图片，store=false，不依赖服务端历史响应。</p>
        {tool.provider==='xai'?<p>xAI：调用模型 grok-4.7；实际图像模型由服务选择。仅自动尺寸，不发送尺寸、质量或格式参数。本轮保守支持单图输入，不承诺提示词能精确控制尺寸。</p>:<>
          <label className="field"><span>工具使用的图像型号</span><select aria-label="工具图像型号" value={tool.model||''} onChange={e=>patch({imageTool:{...tool,model:e.target.value}})}>{RESPONSES_IMAGE_MODELS.filter(id=>tool.provider!=='azure'||id.startsWith('gpt-image-1')).map(id=><option key={id}>{id}</option>)}</select></label>
          {tool.provider==='azure'&&<label className="field"><span>图像型号的 Azure 部署名</span><input aria-label="Azure 图像部署名" value={tool.deployment||''} onChange={e=>patch({imageTool:{...tool,deployment:e.target.value}})}/></label>}
          <details className="universal-details"><summary>图像工具输出选项</summary><div className="universal-detail-body">
            <label className="field"><span>质量</span><select aria-label="图像工具质量" value={tool.quality||''} onChange={e=>patch({imageTool:{...tool,quality:e.target.value||undefined}})}><option value="">服务商默认（省略）</option>{['xhigh','max'].includes(tool.quality)&&!tool.model?.startsWith('gpt-image-2.5-')&&<option value={tool.quality}>{tool.quality}（当前型号不适用，请修改）</option>}{['auto','low','medium','high',...(tool.model?.startsWith('gpt-image-2.5-')?['xhigh','max']:[])].map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="field"><span>格式</span><select aria-label="图像工具格式" value={tool.format||''} onChange={e=>patch({imageTool:{...tool,format:e.target.value||undefined}})}><option value="">服务商默认（省略）</option>{['png','jpeg','webp'].map(x=><option key={x}>{x}</option>)}</select></label>
          </div></details>
        </>}
        <p>一次响应最多接收 4 次完整图像工具结果，全部通过校验后，选最后一张作为当前候选图；混合文字不作为图片。拒绝、未完成或部分失败会明确报错且不自动重发。</p>
      </>}
    </section>}
    {bedrock&&<section className="universal-status neutral">
      <p>仅使用当前角色提供的 Bedrock Bearer API Key；不读取服务器 AWS 凭据，不支持把 Access Key / Secret Key 当作此 Key。区域来自接口域名，目录需手动填写，账号仍须具备 InvokeModel 权限和模型访问权益。</p>
      <label className="field"><span>已核验请求格式的型号</span><select aria-label="Bedrock 已适配型号" value={draft.modelId} onChange={e=>onChange({modelId:e.target.value,declared:false})}><option value="">请选择型号</option>{(c.protocol==='bedrock-converse'?[BEDROCK_TEXT_MODEL]:BEDROCK_IMAGE_MODELS).map(id=><option key={id}>{id}</option>)}</select></label>
      {c.protocol==='bedrock-converse'?<p>此 US 推理配置可能跨美国区域路由；仅支持文字和图片理解，不输出图片。思考参数复用下方现有控件。</p>:<p>图像接口仅接入 us-west-2 的原生 schema；输出尺寸为服务默认，不把“1K”标签转换成未经确认的宽高。型号在文档列出不等于此账号当前可调用。</p>}
      {draft.modelId==='stability.sd3-5-large-v1:0'&&<label className="field"><span>图生图重绘强度（0 保留原图，1 忽略原图）</span><input type="number" aria-label="Bedrock 重绘强度" min="0" max="1" step="0.05" value={c.bedrock?.strength??''} onChange={e=>patch({bedrock:{strength:e.target.value===''?undefined:Number(e.target.value)}})}/><small>精修时必须明确填写；文生图不发送此参数。此能力是整图重绘，不承诺局部遮罩编辑。</small></label>}
    </section>}
    {((tool&&c.protocol!=='openai-responses')||(c.azure&&!azure)||(c.bedrock&&(!bedrock||draft.modelId!=='stability.sd3-5-large-v1:0')))&&<div className="universal-status warning"><p>已保留原协议的扩展草稿，当前连接不适用。切回原连接继续编辑，或主动清除这些扩展；不会静默发送给新服务。</p><button type="button" className="universal-button" onClick={()=>patch({imageTool:undefined,azure:undefined,bedrock:undefined})}>清除当前角色的不适用扩展</button></div>}
  </>
}

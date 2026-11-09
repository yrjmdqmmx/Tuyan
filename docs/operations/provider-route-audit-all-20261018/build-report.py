import pathlib,json,csv,datetime,html,statistics,collections
root=pathlib.Path(__file__).parent
manifest=json.loads(root.joinpath('manifest.json').read_text());summary=json.loads(root.joinpath('summary.json').read_text())
lookup={(r['id'],r['node']):r for r in summary}
raw=[json.loads(line) for f in root.glob('*.jsonl') for line in f.read_text().splitlines()]
nodes=['hangzhou','hongkong','singapore','hangzhou-via-singapore','hangzhou-via-hongkong']
labels=['杭州直连','香港直连','新加坡直连','杭州→新加坡','杭州→香港']
hk_candidates={'openrouter','xai','novita','stability','together','ideogram','runware','mistral','bfl','bfl-us','fal-queue'}
def decision(r):
 k=r['id']
 if k in ['openai','anthropic','gemini']:return '保留新加坡；香港不列入候选，地区与账户要求仍需满足'
 if k=='replicate':return '保留新加坡；完整路径快于本次香港中转'
 if k in ['fireworks','fireworks-inference']:return '保留现网新加坡；杭州直连为优先复核候选，代理路径异常待查'
 if k=='minimax':return '国际端保留新加坡；杭州优势小，不能与国内 Key/端点混用'
 if k.startswith('bedrock'):return '仅根路径可达性；保持原策略，需账户、模型及资源区域验证'
 if k=='fal':return '公开目录出现 429；不以混合状态响应判最优，推理入口另行测量'
 if k=='recraft':return '现网新加坡；香港与杭州直连近似，改善候选仍需推理验证'
 if k=='bfl-eu':return '保留新加坡；香港仅快约 19 ms，不足以证明值得换线'
 if k in hk_candidates:return '香港为网络候选；现网仍保留新加坡，未进行真实模型验证'
 if k=='qianfan':return '保持杭州；三地均 403 AccessDenied，账户/API 权限未证实'
 if k in ['sensenova-inference','antling']:return '保持杭州；GET 返回 404，仅证明网络响应，非推理成功'
 return '保持杭州直连；按现有国内端点，不按模型厂商所在地改线'
for r in manifest:r['recommendation']=decision(r)
routes={'measured_at_utc':max(r['started_at'] for r in raw),'inference_calls':0,'model_api_cost':0,'production_changes_this_audit':False,'match_rule':'Match exact API hostname and channel. Preserve model/version/parameters/account-region. No automatic replay or provider substitution.','routes':manifest,'unmeasured':[{'channel':'custom / Azure OpenAI / Azure Foundry','reason':'缺少账户专属 API 主机名、部署和区域；不臆造地址。'},{'channel':'其他自定义连接','reason':'当前项目未提供固定可核验 API 地址；不能把 32 个内建渠道宣称为全球所有平台。'},{'channel':'模型输出、TTFT、tokens/s、图像生成与下载','reason':'本轮零推理；无免费额度/账户权限实证，未执行。'}]}
root.joinpath('channel-route-candidates.json').write_text(json.dumps(routes,ensure_ascii=False,indent=2)+'\n')
with root.joinpath('results.csv').open('w',newline='') as f:
 writer=csv.writer(f,lineterminator="\n");writer.writerow(['入口','渠道','API 地址','测试类型','线路','样本数','传输完成数','HTTP 状态计数','首响应中位数 ms','最小 ms','最大 ms','TLS 完成中位数 ms','下载字节','建议'])
 for m in manifest:
  for n,label in zip(nodes,labels):
   s=lookup.get((m['id'],n))
   if s:writer.writerow([m['id'],m['provider'],m['url'],m['kind'],label,s['n'],s['transport_ok'],json.dumps(s['http']),s['median_ms'],s['min_ms'],s['max_ms'],s['tls_median_ms'],s['bytes'],m['recommendation']])
def cell(id,node):
 s=lookup.get((id,node))
 if not s:return '未测'
 if not s['transport_ok']:return '超时 '+str(s['n'])+'/'+str(s['n'])
 return str(s['median_ms'])+' ['+'/'.join(s['http'])+']'
start=min(r['started_at'] for r in raw);end=max(r['started_at'] for r in raw)
cn=lambda s:datetime.datetime.fromisoformat(s).astimezone(datetime.timezone(datetime.timedelta(hours=8))).strftime('%Y-%m-%d %H:%M:%S')
report=f'''# 其他模型渠道：三地免费网络实测 · 2026-10-18

本轮覆盖项目全部 **32 个内建固定地址渠道**，并补充 Bedrock 的 3 个区域入口；共 **42 个 API 入口、845 次无密钥 GET 探测**。模型调用 **0 次**，模型调用费用 **0**，没有购买资源、读取模型密钥、改生产线路或创建定时任务。图研和 OpenAcad 继续在杭州运行。

## 直接结论

- **杭州直连**：TokenDance、百炼中国区、方舟北京、DeepSeek、Kimi、智谱、硅基流动、MiniMax 国内、阶跃、腾讯 TokenHub、小米 MiMo、商汤、讯飞、千帆、美团 LongCat、蚂蚁百灵，继续使用现有国内 API 地址。个别出口服务器自身较快，不代表杭州绕行后更快。
- **保留新加坡**：OpenAI、Anthropic/Claude、Gemini；香港不作为这些官方渠道的候选。杭州直连 OpenAI/Gemini/xAI/Mistral/Ideogram 各 5 次连接超时。香港 OpenAI 返回 403 `unsupported_country_region_territory`，Anthropic 返回 403 `Request not allowed`；这是失败响应，不是成功调用。
- **香港可优先验证**：OpenRouter、xAI、Novita、Stability、Together、Ideogram、Runware、Mistral、BFL 默认/美国入口、fal 推理队列。在完整杭州出发路径上较当前新加坡路线快，但尚无账户/模型/输出验证，**没有把候选自动上线**。
- **Replicate 保留新加坡**：杭州经新加坡 504.7 ms，经香港 819.8 ms。仅看香港和新加坡服务器各自约 230 ms 会得出错误结论。
- **Fireworks 优先检查代理路径**：实际推理路径的只读 GET 为杭州直连 153.0 ms、新加坡本机 26.8 ms、杭州经新加坡 841.9 ms。三地直接请求解析到不同 IP；代理具体上游和瓶颈尚未确认，不能把差异全部归因于地理距离，也不能据此断言真实推理快同样倍数。
- MiniMax 国际端杭州 552.7 ms 与经新加坡 587.7 ms 差距不大；BFL 欧洲端香港仅较新加坡快约 19 ms，维持现网。Recraft 香港与杭州直连约 832/835 ms 接近。Bedrock 仅测到根路径 404，不据此切换模型或资源区域。

## 方法与边界

北京时间 **{cn(start)} 至 {cn(end)}**（最后请求开始时间）。三地各入口各 5 次；杭州经既有 WireGuard+Squid 新加坡代理 24 个入口各 5 次；香港候选临时转发 19 个入口各 5 次。HTTP/1.1、每次新连接、TLS 校验开启、DNS 使用各机现有配置、无自动重试、无重定向、连接上限 5 秒、请求上限 12 秒、单次下载最多 2 MiB，每批最多 2 个并发请求。

记录 DNS、TCP、TLS、HTTP 首响应、完整下载与状态。汇总 **820 次传输完成、25 次连接超时**；传输完成包含 4xx，不能叫做 API 成功率。下载累计约 **{sum(r.get('size_download') or 0 for r in raw)/1048576:.2f} MiB**，这不含 SSH/TLS 协议开销；现有服务器/流量/存储仍按原账单规则计费，本轮仅保证没有模型推理费用。

这里的 ms 是 **HTTP 首响应时间**，不是模型首 token、吞吐或出图时间。5 个样本只能说明这段时间的表现，不能报告长期稳定性或可靠的 p95。各路径测试窗口与传输方式不同（香港临时 SSH SOCKS、新加坡既有 WireGuard+Squid），结果包含这些真实路径差异。原始样本与 CSV 保留最小/最大值和失败数。

所有请求均没有身份凭据、提示词或请求体。部分没有目录接口的渠道只对已知推理路径发 **GET**，未发 POST；400/404/405 仅说明服务对该无凭据 GET 的响应。没有测试流式长连接、大图上传/下载、队列等待、模型输出质量、免费额度或账号白名单。

## 逐入口数据

单位 ms；方括号为 HTTP 状态码；“未测”表示没有该完整中转路径样本。401=缺少认证，403=拒绝/权限不足，404/405=路径/方法层响应。Gemini 的 403 明确要求调用身份，并不证明模型地区可用；**这些数字不能脱离状态码选最小值**。

| 入口 | 杭州直连 | 香港直连 | 新加坡直连 | 杭州→新加坡 | 杭州→香港 |
| --- | ---: | ---: | ---: | ---: | ---: |
'''
for m in manifest:report+='| '+m['id']+' | '+' | '.join(cell(m['id'],n) for n in nodes)+' |\n'
report+='''
fal 公开目录在新加坡本机及杭州经新加坡各有 2/5 次 429。表中该行中位数混合了 200 和 429，仅作记录，不用于排名；没有重试消耗更多额度。其 `queue.fal.run` 推理主机另测 GET，不能用目录限流推断推理队列的限流策略。千帆三地均为 AccessDenied，尚不能区分缺少凭据与其他账户/API 条件。商汤和蚂蚁的 GET 404 不能推出其 POST 模型不可用。

Fireworks 管理目录与推理 URL 分别测量；不同路径的状态/处理时间不能混算。BFL 默认/美国/欧洲只用于网络比较，不能任意变更用户选定模型的区域。MiniMax 国内与国际 Key/端点也不能互换。

## 模型与线路对应原则

按 **实际调用渠道和精确 API 主机名** 匹配。通过 TokenDance 调用 GPT/Gemini/Claude，走 TokenDance 入口的线路；通过 OpenRouter 调用则走 OpenRouter 的线路。不能因为型号名称来自某厂商就把请求发向该厂商官网。每个型号保留原模型 ID、版本、角色、参数和上游选择；不自动换模型，也不在请求已发送后自动换地区重放。

同一 API 入口下不同型号共享本次网络测量，但这不意味着它们有相同排队、推理或输出质量。没有额外平台 Key 仍然可以做此次无凭据测量；接入那些平台的真实模型仍须通过已有聚合渠道或取得相应权限，不能把本次连通性当作新增调用权益。

机器可读匹配建议见 [channel-route-candidates.json](channel-route-candidates.json)。`current_route` 记录现网规则，`recommendation` 为候选判断；此文件不是已加载的生产配置。

## 未覆盖与待确认

- Azure OpenAI / Azure Foundry、自建/其他 custom 连接需要账户专属主机名和部署/区域；当前没有地址，未臆造并测试占位域名。
- Bedrock 仅补测已列入现网出口策略的 us-east-1/us-east-2/us-west-2 主机，不代表已配置 AWS 权限或任何模型可用。
- 三家官方地区列表包含新加坡，未列香港；即使使用新加坡主机，也仍须符合账户、主体和模型的服务条件：[OpenAI](https://help.openai.com/en/articles/5347006-openai-api-supported-countries-and-territories)、[Anthropic](https://platform.claude.com/docs/en/api/supported-regions)、[Gemini](https://ai.google.dev/gemini-api/docs/available-regions)。核查于 2026-10-18。
- 无法在零推理前提下判断模型输出质量、真实首 token 和每模型实际速度；这一部分明确保留未验证，不借用旧“passed”或目录状态替代。

## 生产与清理

本轮没有重建/重启生产容器、修改生产 env、调整 Squid ACL 或应用候选路线。沿用上一轮已经上线的 TokenDance/方舟杭州直连、百炼原直连、其他既有海外入口新加坡策略。收尾只读检查杭州 10 个容器均 healthy。

香港完整路径测试仅在杭州回环地址建立临时 SOCKS，授权限杭州来源与 19 个精确目标主机的 443 端口。TLS 仍与原 API 域名握手，没有公开代理、没有传输模型 Key。测试结束已关闭隧道并删除临时私钥与授权，见 [temporary-tunnel-cleanup.json](temporary-tunnel-cleanup.json)。

## 复核材料

- [可筛选查看表](index.html)、[CSV 数据](results.csv)、[统计 JSON](summary.json)
- [端点清单](manifest.json)、各地区/路径 `.jsonl` 原始指标
- `probe.py`、`run.py`、`hk-transit.py`、`summarize.py` 与 `build-report.py` 为可复核脚本；探针只有 GET，没有 POST/推理代码。
- 基线代码为 `301e4bb1` 工作树，现网 Core 为 `e3c2a9d8e0ee207ac1ad313142007eaf964433e3`；本轮不发布新镜像。
'''
root.joinpath('report.md').write_text(report)
# Local, standalone table; no telemetry or external assets.
rowshtml=''
for m in manifest:
 cells=''.join('<td>'+html.escape(cell(m['id'],n))+'</td>' for n in nodes)
 rowshtml+='<tr><th>'+html.escape(m['id'])+'<small>'+html.escape(m['host'])+'</small></th>'+cells+'<td>'+html.escape(m['recommendation'])+'</td></tr>'
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>模型渠道三地线路实测</title><style>body{font:15px/1.6 system-ui;margin:32px;color:#172836;background:#f4f7fa}h1{margin-bottom:4px}p{max-width:1100px}input{padding:12px;width:380px;max-width:90%;border:1px solid #b9c8d5;border-radius:8px;margin:15px 0}table{border-collapse:collapse;background:white;width:100%;font-variant-numeric:tabular-nums}th,td{padding:12px;border-bottom:1px solid #dce5ed;text-align:left}thead th{background:#123c53;color:white;position:sticky;top:0}small{display:block;font-size:11px;color:#60717e;font-weight:normal}tbody tr:hover{background:#eef7fc}.wrap{overflow:auto}.note{background:#fff2ce;padding:15px;border-radius:8px}a{color:#136d9b}</style><h1>模型渠道三地线路实测</h1><p>2026-10-18 · 32 个内建渠道 + Bedrock · 42 个入口 · 845 次无密钥 GET · 0 次模型调用</p><p class="note">单位 ms，为 HTTP 首响应中位数，不是模型首 token。方括号为 HTTP 状态；401/403/404/405 不代表模型可用。fal 目录存在 429，不作速度排名。本轮没有修改生产线路。</p><p><a href="report.md">详细报告</a> · <a href="results.csv">下载 CSV</a> · <a href="channel-route-candidates.json">匹配建议 JSON</a></p><input id="q" placeholder="筛选渠道、主机或建议，例如 新加坡、deepseek"><div class="wrap"><table><thead><tr><th>渠道 / 入口</th>'''+''.join('<th>'+l+'</th>' for l in labels)+'''<th>建议与边界</th></tr></thead><tbody>'''+rowshtml+'''</tbody></table></div><script>document.querySelector('#q').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('tbody tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(q))})</script></html>'''
root.joinpath('index.html').write_text(page)
print('Saved report, CSV, interactive table and route candidates; samples',len(raw))

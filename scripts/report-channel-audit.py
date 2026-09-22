"""Render the reviewed, read-only source inventory. No provider or network calls."""
import json,csv,pathlib,collections
root=pathlib.Path(__file__).resolve().parents[1]
load=lambda p:json.loads((root/p).read_text())
rows=load('config/channel-audit/cn-directory.json')+load('config/channel-audit/runware-directory.json')
contracts={**load('config/channel-audit/cn-contracts.json'),**load('config/channel-audit/runware-contracts.json')}
controls={**load('config/channel-audit/cn-refine-controls.json'),**load('config/channel-audit/runware-refine-controls.json')}
cat=load('config/model-catalog-updates.json');sizes=load('config/image-size-contracts.json')
models={p+'/'+m['id']:m for p in ['tokenhub','xiaomi','runware'] for m in cat['providers'][p]}
out=root/'docs/channel-audit/2026-09-22';out.mkdir(parents=True,exist_ok=True)
fields=['channel','developer','officialModel','callId','officialStatus','retirement','roles','before','after','missing','decision','operationContract','imageLimit','mask','maskWithReferences','structured','sizes','publicPrice','region','authentication','recovery','verifiedAt','source','apiSource','schemaSha256']
result=[]
for row in rows:
 key=row['channel']+'/'+row['apiModelId'];m=models.get(key,{});c=contracts.get(key,{});ctl=controls.get(key,{})
 lifecycle=cat.get('lifecycle',{}).get(row['channel'],{}).get(row['apiModelId'],{})
 price=c.get('price',row.get('price',{'status':'待确认'}))
 after=row['after'];implemented=bool(m)
 r=dict(channel=row['channel'],developer=row.get('developer')or ('待确认' if m.get('metadata',{}).get('vendor') in [None,'unknown'] else m['metadata']['vendor']),officialModel=row['name'],callId=row['apiModelId'],officialStatus=row.get('officialStatus')or m.get('metadata',{}).get('lifecycle','详见处理决定'),retirement=lifecycle.get('expirationAt',row.get('deactivatesAt','')),roles=' / '.join(m.get('roles',row.get('roles',[])))or'范围外/待确认',before=row['before'],after=after,missing='真实账号权限、真实推理、账单与质量待确认；'+row.get('limitations','') if implemented else row['decision'],decision=row['decision'],operationContract=c.get('taskType','hy-image-v3 sync' if implemented else '未接入'),imageLimit={'model':c.get('maxImages',ctl.get('maxImages')),'productAuxiliary':8,'sourceCounts':True} if 'image'in m.get('roles',[]) else {'productVision':c.get('maxImages',0)},mask=ctl.get('mask',False),maskWithReferences=ctl.get('maskWithReferences',False),structured=ctl.get('structured'),sizes={op:sizes['profiles'][profile]for op,profile in sizes['routes'].get(key,{}).items()if op in ['generation','editing']and profile},publicPrice=price,region='广州入口；新加坡独立密钥及型号目录待确认' if row['channel']=='tokenhub'else '统一端点；账号地区准入待确认',authentication='Bearer API Key；账号权限未实测',recovery='提交前保存 UUID；仅 getResponse 查询' if row['channel']=='runware'else '异步任务号 GET 查询；丢失任务号停止，不重提' if c.get('taskType')in['vidu','vega']else '同步结果未知停止；已保存 URL 仅重试下载',verifiedAt=row['checkedAt'],source=row['source'],apiSource=row.get('apiSource',row.get('schemaSource',c.get('source',''))),schemaSha256=row.get('schemaSha256',''))
 result.append(r)
def plain(v):return json.dumps(v,ensure_ascii=False,separators=(',',':')) if isinstance(v,(dict,list,bool))else ''if v is None else str(v)
with (out/'official-directory.csv').open('w',newline='')as f:
 w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows({k:plain(v)for k,v in r.items()}for r in result)
lines=['# 官方完整目录逐项对照（2026-09-22）','','公开文档核对覆盖 491 项：腾讯 TokenHub 127 项（目录与更新后的型号详情并集）、小米 MiMo 9 项、Runware 官方精选目录 355 项。Runware 社区搜索中的开放权重、用户上传模型不是这 355 项的一部分；不能声称覆盖整个社区库。所有渠道真实调用均未验证。','','“适配链路已完成但真实调用未验证”指本地选择器、请求、响应与恢复测试通过。表中“不接入”不表示官方不可用；须看逐项理由。已下线或确认暂不可用不进入选择器。未来退役在正式截止时间前仍可用，到期自动隐藏、保留原配置并阻止提交。','','详细字段、价格条件、准确像素、原图占位、mask 组合限制及证据哈希见同目录 [CSV](official-directory.csv)。','','| 平台 | 官方型号 / 调用 ID | 图研角色 | 变更前 | 当前状态 | 缺失环节 / 处理决定 | 官方来源 |','|---|---|---|---|---|---|---|']
for r in result:
 e=lambda v:plain(v).replace('|','\\|').replace('\n',' ')
 lines.append('| '+' | '.join([e(r['channel']),e(r['officialModel'])+' / `'+e(r['callId'])+'`',e(r['roles']),e(r['before']),e(r['after']),e(r['decision'])+(' 截止：'+e(r['retirement'])if r['retirement']else ''),'[目录/详情]('+r['source']+')'])+' |')
(out/'official-directory.md').write_text('\n'.join(lines)+'\n')
counts={p:{'catalog':len(cat['providers'][p]),'added':sum(r['before']=='尚未登记'and (r['channel']+'/'+r['apiModelId'])in models for r in rows if r['channel']==p),**{role:sum(role in m['roles']for m in cat['providers'][p])for role in ['main','vision','image']}}for p in ['tokenhub','xiaomi','runware']}
(out/'summary.json').write_text(json.dumps({'checkedAt':'2026-09-22','officialRows':len(rows),'counts':counts,'realInferenceCalls':0,'deployment':False},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(counts,ensure_ascii=False))

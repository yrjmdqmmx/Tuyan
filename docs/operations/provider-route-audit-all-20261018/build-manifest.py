import json,pathlib,re,urllib.parse
root=pathlib.Path(__file__).parent
repo=pathlib.Path('/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）')
s=(repo/'packages/api/src/provider-catalog.ts').read_text()
rows=[]
for line in s.splitlines():
 m=re.match(r"  (\w+): \{ access:'([^']+)',(.*)",line)
 if not m:continue
 key,access,tail=m.groups();u=re.search(r"url:'([^']+)'",tail);src=re.search(r"source:'([^']+)'",tail)
 if u and key not in ['openrouter','runware']:
  rows.append(dict(id=key,provider=key,url=u.group(1),kind='metadata',source=src.group(1)))
extra=[
 ('openrouter','openrouter','https://openrouter.ai/api/v1/key','auth-metadata'),
 ('bailian','bailian','https://dashscope.aliyuncs.com/compatible-mode/v1/models','auth-metadata'),
 ('ark','ark','https://ark.cn-beijing.volces.com/api/v3/models','auth-metadata'),
 ('fireworks-inference','fireworks','https://api.fireworks.ai/inference/v1/chat/completions','inference-path-GET-only'),
 ('runware','runware','https://api.runware.ai/v1','inference-path-GET-only'),
 ('minimax-cn','minimax','https://api.minimax.cn/v1/models','metadata'),
 ('tokenhub-inference','tokenhub','https://tokenhub.tencentmaas.com/v1/chat/completions','inference-path-GET-only'),
 ('sensenova-inference','sensenova','https://token.sensenova.cn/v1/chat/completions','inference-path-GET-only'),
 ('iflytek','iflytek','https://maas-api.cn-huabei-1.xf-yun.com/v2/chat/completions','inference-path-GET-only'),
 ('antling','antling','https://api.ant-ling.com/v1/chat/completions','inference-path-GET-only'),
 ('zhipu','zhipu','https://open.bigmodel.cn/api/paas/v4/chat/completions','inference-path-GET-only'),
 ('recraft','recraft','https://external.api.recraft.ai/v1/images/generations','inference-path-GET-only'),
 ('bfl','bfl','https://api.bfl.ai/v1/flux-pro-1.1','inference-path-GET-only'),
 ('bfl-eu','bfl','https://api.eu.bfl.ai/v1/flux-pro-1.1','inference-path-GET-only'),
 ('bfl-us','bfl','https://api.us.bfl.ai/v1/flux-pro-1.1','inference-path-GET-only'),
 ('ideogram','ideogram','https://api.ideogram.ai/generate','inference-path-GET-only'),
 ('fal-queue','fal','https://queue.fal.run/fal-ai/flux/schnell','inference-path-GET-only'),
 ('bedrock-us-east-1','bedrock','https://bedrock-runtime.us-east-1.amazonaws.com/','transport-root'),
 ('bedrock-us-east-2','bedrock','https://bedrock-runtime.us-east-2.amazonaws.com/','transport-root'),
 ('bedrock-us-west-2','bedrock','https://bedrock-runtime.us-west-2.amazonaws.com/','transport-root'),
]
for k,p,u,t in extra:rows.append(dict(id=k,provider=p,url=u,kind=t,source='apps/paperbanana-api/runtime/handler.ts; apps/paperbanana-api/src/provider-egress.ts; packages/api/src/*channel*.ts'))
egress=(repo/'apps/paperbanana-api/src/provider-egress.ts').read_text().split('function unavailableError')[0]
proxy_hosts=set(re.findall(r"'([a-z0-9.-]+)'",egress)) - {'tokendance.space','ark.cn-beijing.volces.com'}
for r in rows:
 r['host']=urllib.parse.urlparse(r['url']).hostname
 r['current_route']='singapore' if r['host'] in proxy_hosts else 'hangzhou-direct'
 r['method']='GET';r['credentials']=False;r['inference']=False
rows.sort(key=lambda r:r['id'])
assert len(rows)==len(set(r['id'] for r in rows))
root.joinpath('manifest.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print('endpoints',len(rows),'providers',len(set(r['provider'] for r in rows)),'SG proxy endpoints',sum(r['current_route']=='singapore' for r in rows))
print(', '.join(r['id'] for r in rows))

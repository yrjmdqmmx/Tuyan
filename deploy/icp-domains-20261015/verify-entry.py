"""Read-only entry checks; run on Hangzhou to avoid local proxy DNS interception."""
import json,ssl,socket,urllib.request,urllib.error,datetime
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None
op=urllib.request.build_opener(NoRedirect)
def probe(url,method='GET',headers=None):
    try:r=op.open(urllib.request.Request(url,method=method,headers=headers or {}),timeout=20)
    except urllib.error.HTTPError as e:r=e
    info={'status':r.status}
    for key in ['Location','Access-Control-Allow-Origin','Access-Control-Allow-Methods']:
        if r.headers.get(key):info[key]=r.headers[key]
    data=r.read()
    if url.endswith(('/ready','/api/health','/api/auth/watcha/status')):
        info['body']=json.loads(data)
    return info
result={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'http':{},'tls':{},'cors':{},'dns':{}}
for host in ['tuyansci.cn','www.tuyansci.cn','openacad.xyz','www.openacad.xyz']:
    result['http']['https://'+host+'/']=probe('https://'+host+'/')
    result['http']['http://'+host+'/']=probe('http://'+host+'/')
    result['dns'][host]=socket.gethostbyname_ex(host)[2]
    with socket.create_connection((host,443),timeout=10) as sock:
        with ssl.create_default_context().wrap_socket(sock,server_hostname=host) as conn:
            cert=conn.getpeercert()
            result['tls'][host]={'valid':True,'expires':cert['notAfter'],'names':cert['subjectAltName']}
for url in ['https://paperbanana.asia/','https://www.paperbanana.asia/','https://api.paperbanana.asia/ready','https://tuyansci.cn/ready','https://tuyansci.cn/api/auth/watcha/status','https://api.paperbanana.asia/api/auth/watcha/status','https://openacad.xyz/api/health']:
    result['http'][url]=probe(url)
for origin in ['https://tuyansci.cn','https://www.paperbanana.asia','https://paperbanana.asia','https://example.invalid']:
    result['cors'][origin]=probe('https://paperbanana-prod-hk-20260814.oss-cn-hongkong.aliyuncs.com/cors-domain-check',method='OPTIONS',headers={'Origin':origin,'Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'content-type'})
print(json.dumps(result,indent=2,ensure_ascii=False))

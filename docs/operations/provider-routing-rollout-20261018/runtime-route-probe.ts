import {readFileSync} from 'node:fs';
import {ProxyAgent,Agent} from 'undici';
import {loadConfig} from '/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）/apps/paperbanana-api/src/config.ts';
import {createProviderEgress} from '/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）/apps/paperbanana-api/src/provider-egress.ts';
async function main(){
 const c=loadConfig(process.env,JSON.parse(readFileSync('/app/build-provenance.json','utf8')).codeSha);
 const manifest=JSON.parse(readFileSync('/tmp/provider-route-manifest.json','utf8'));
 const dispatched:Array<{host:string;route:string}>=[];
 const direct=new Agent();
 const wrap=(agent:any,route:string)=>{const original=agent.dispatch.bind(agent);agent.dispatch=(options:any,handler:any)=>{dispatched.push({host:new URL(String(options.origin)).hostname,route});return original(options,handler)};return agent;};
 const e=createProviderEgress(c.providerEgress,{directDispatcher:wrap(direct,'hangzhou-direct'),createProxyAgent:(url)=>wrap(new ProxyAgent(url),url.includes('10.78.')?'hongkong':'singapore')});
 const results=[];
 try {
  for(const m of manifest){
   const count=dispatched.length;const start=performance.now();
   try{
    const r=await e.fetch(m.url,{method:'GET',signal:AbortSignal.timeout(15000)});
    const ms=Math.round((performance.now()-start)*10)/10;
    const bytes=(await r.arrayBuffer()).byteLength;
    const row={id:m.id,host:m.host,status:r.status,ttfb_ms:ms,bytes,dispatches:dispatched.slice(count)};
    results.push(row);console.log(JSON.stringify(row));
   }catch{const row={id:m.id,host:m.host,failed:true,dispatches:dispatched.slice(count)};results.push(row);console.log(JSON.stringify(row));}
  }
  console.log(JSON.stringify({summary:true,code_sha:JSON.parse(readFileSync('/app/build-provenance.json','utf8')).codeSha,egress:c.providerEgress,requests:results.length,failures:results.filter((r:any)=>r.failed).length,inference_calls:0}));
 }finally{await e.close();await direct.close();}
}
main().catch(()=>{console.error('Runtime probe failed; payload and environment omitted');process.exitCode=1});

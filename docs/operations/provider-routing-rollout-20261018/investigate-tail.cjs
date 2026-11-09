const {fetch,Agent,ProxyAgent}=require('/app/node_modules/undici');
const dc=require('node:diagnostics_channel');
let connections=[];
dc.channel('undici:client:connected').subscribe(({connectParams,socket})=>connections.push({host:connectParams.hostname||connectParams.host,remote_ip:socket.remoteAddress}));
(async()=>{
for(const [id,url,routes] of [
 ['fireworks','https://api.fireworks.ai/inference/v1/chat/completions',['direct','sg']],
 ['replicate','https://api.replicate.com/v1/models',['hk','sg']],
 ['runware','https://api.runware.ai/v1',['hk','sg']],
]){
 for(let i=0;i<5;i++)for(const route of routes){
  const dispatcher=route==='direct'?new Agent():new ProxyAgent(route==='hk'?'http://10.78.0.1:3128':'http://10.77.0.2:3128');
  connections=[];const start=performance.now();
  try{const r=await fetch(url,{dispatcher,method:'GET',signal:AbortSignal.timeout(10000)});const ms=Math.round((performance.now()-start)*10)/10;await r.arrayBuffer();console.log(JSON.stringify({id,route,round:i+1,status:r.status,ttfb_ms:ms,connections}));}
  catch{console.log(JSON.stringify({id,route,round:i+1,failed:true,connections}));}
  finally{await dispatcher.close()}
 }
}
})().catch(()=>process.exitCode=1);

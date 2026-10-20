// Explicit loopback-only synthetic account fixture. Never used by app.js.
import express from 'express';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createEcosystemRouter} from '../src/ecosystem.js';
import {createServer as createViteServer} from '../../web/node_modules/vite/dist/node/index.js';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const token = randomBytes(32).toString('hex');
const worker = spawn(`${root}apps/ecosystem-worker/.venv/bin/python`, ['-m','uvicorn','app:app','--host','127.0.0.1','--port','5197','--no-access-log'], {
  cwd:`${root}apps/ecosystem-worker`, stdio:['ignore','inherit','inherit'],
  env:{PATH:process.env.PATH,HOME:process.env.HOME,ECOSYSTEM_WORKER_TOKEN:token,PYTHONDONTWRITEBYTECODE:'1'},
});
const app = express();
app.use('/api/ecosystem', createEcosystemRouter({
  frontendOrigins:['http://127.0.0.1:5178'],
  auth:{optionalSession:async()=>({user:{id:'ecosystem-qa'}})},
  worker:{url:'http://127.0.0.1:5197',token},
}));
const gateway = app.listen(5196,'127.0.0.1');
const vite = await createViteServer({root:`${root}apps/web`,server:{host:'127.0.0.1',port:5178,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:5196'}}}});
await vite.listen();
console.log('Local synthetic-account QA: http://127.0.0.1:5178/tests/fixtures/ecosystem.html');
let closing=false;
async function stop(){if(closing)return;closing=true;worker.kill('SIGTERM');gateway.close();await vite.close();}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
worker.on('error',async error=>{console.error(error.message);await stop();process.exitCode=1;});

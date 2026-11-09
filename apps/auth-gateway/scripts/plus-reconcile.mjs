// Local preparation only. No live payment/refund API and no model transport.
import {readFile} from 'node:fs/promises';
import {MongoClient} from 'mongodb';
import {accountWorkspaceStore} from '../src/workspace-lifecycle.js';
import {createPlusStore,PLUS_MUTATIONS} from '../src/plus-store.js';
import {planPlusReconciliation,applyPlusReconciliation} from '../src/plus-reconciliation.js';
const uri=process.env.PLUS_RECONCILE_MONGO_URI,dbName=process.env.PLUS_RECONCILE_DB,namespace=process.env.PLUS_RECONCILE_NAMESPACE;
if(!/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(uri||'')||!/^tuyan_plus_sandbox_[a-zA-Z0-9_]+$/.test(dbName||'')||!namespace?.startsWith('sandbox:'))throw Error('EXPLICIT_LOCAL_SANDBOX_REQUIRED');
const client=new MongoClient(uri);await client.connect();
try{
 const db=client.db(dbName),store=accountWorkspaceStore({db,mongoClient:client,factory:opts=>createPlusStore({...opts,namespace}),mutations:PLUS_MUTATIONS});
 const file=process.argv.find(a=>a.startsWith('--input='))?.slice(8);
 if(!file)console.log(JSON.stringify(await store.reviewQueue(),null,2));
 else {const plan=await planPlusReconciliation(store,JSON.parse(await readFile(file,'utf8')));if(process.argv.includes('--apply'))await applyPlusReconciliation(store,plan);console.log(JSON.stringify({mode:process.argv.includes('--apply')?'applied-to-local-sandbox':'plan-only',plan},null,2));}
}finally{await client.close();}

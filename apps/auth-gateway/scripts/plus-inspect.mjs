import {MongoClient} from 'mongodb';
import {inspectPlusLedger} from '../src/plus-inspection.js';
const uri=process.env.PLUS_RECONCILE_MONGO_URI,dbName=process.env.PLUS_RECONCILE_DB,namespace=process.env.PLUS_RECONCILE_NAMESPACE;
if(!/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(uri||'')||!/^tuyan_plus_sandbox_[a-zA-Z0-9_]+$/.test(dbName||'')||!namespace?.startsWith('sandbox:'))throw Error('EXPLICIT_LOCAL_SANDBOX_REQUIRED');
const client=new MongoClient(uri,{serverSelectionTimeoutMS:5000});
try{
  await client.connect();const session=client.startSession();
  try{console.log(JSON.stringify(await session.withTransaction(()=>inspectPlusLedger(client.db(dbName),namespace,{session}),{readConcern:{level:'snapshot'}}),null,2));}
  finally{await session.endSession();}
}catch{console.error('PLUS_INSPECTION_UNAVAILABLE');process.exitCode=1;}
finally{await client.close();}

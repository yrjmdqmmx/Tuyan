// Default is an offline index plan. --apply is restricted to isolated local QA.
import {MongoClient} from 'mongodb';
import {PLUS_INDEXES,ensurePlusIndexes} from '../src/plus-indexes.js';
if(!process.argv.includes('--apply')){
 console.log(JSON.stringify({mode:'plan-only',indexes:PLUS_INDEXES,financialDataTTL:false},null,2));
}else{
 const uri=process.env.PLUS_PREVIEW_MONGO_URI,dbName=process.env.PLUS_PREVIEW_DB;
 if(!/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(uri||'')||!/^tuyan_plus_sandbox_[a-zA-Z0-9_]+$/.test(dbName||''))throw Error('Only explicitly isolated local Plus databases are allowed');
 const client=new MongoClient(uri);try{await client.connect();await ensurePlusIndexes(client.db(dbName));console.log(JSON.stringify({mode:'local-qa-applied',dbName,indexCount:PLUS_INDEXES.length}));}finally{await client.close();}
}

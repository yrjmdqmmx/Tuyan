import {useEffect,useRef,useState} from 'react';
import {referenceLibraryRequest} from '@paperbanana/api';
import {API_BASE_DEFAULT} from '../config.js';
import ReferenceLibraryPanel from '../components/ReferenceLibraryPanel.jsx';
import {buildReferencePageRequest} from '../lib/referenceGallery.js';
export default function WorkspaceReferences({selectedIds=[],onChange}){
 const [data,setData]=useState({references:[],pageInfo:null}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef(null);
 async function load(options={}){request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError('');try{const result=await referenceLibraryRequest(API_BASE_DEFAULT,{runtime:'gateway'},{...buildReferencePageRequest(options),signal:controller.signal});if(!controller.signal.aborted)setData(result);}catch(e){if(!controller.signal.aborted)setError(e.message);}finally{if(!controller.signal.aborted)setBusy(false);}}
 useEffect(()=>{void load();return()=>request.current?.abort();},[]);
 return <ReferenceLibraryPanel backdropClassName="tw-nested-backdrop" {...data} selectedIds={selectedIds} isLoading={busy} error={error} onRequest={load} onClear={()=>onChange([])} onToggle={id=>onChange(selectedIds.includes(id)?selectedIds.filter(x=>x!==id):selectedIds.length<10?[...selectedIds,id]:selectedIds)}/>;
}

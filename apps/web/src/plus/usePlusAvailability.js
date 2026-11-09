import {useEffect,useState} from 'react';
import {createPlusClient} from './plusClient.js';
// Frontend visibility is supplementary; every server route checks the admin ID.
export function usePlusAvailability(userId,isAdmin,base){
  const [value,setValue]=useState(null);
  useEffect(()=>{let live=true;setValue(null);if(userId&&isAdmin)createPlusClient(base,userId)('/catalog').then(catalog=>{if(live)setValue({userId,base,canStart:catalog.newTasksEnabled===true});}).catch(()=>{});return()=>{live=false;};},[userId,isAdmin,base]);
  return Boolean(isAdmin&&value?.userId===userId&&value.base===base&&value.canStart);
}

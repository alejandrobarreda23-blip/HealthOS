import { useEffect, useState } from 'react';
import { getNightDetail } from '../repositories/night-detail';
import type { SleepRecord } from '../health/weekly-learning';
import type { NightDetail } from '../health/night-explorer';
export function useNightDetail(userId:string|undefined,session:SleepRecord|undefined){
  const key=JSON.stringify([userId,session]),[retry,setRetry]=useState(0);
  const [state,setState]=useState<{key:string;data:NightDetail|null;error:string;loading:boolean}>({key:'',data:null,error:'',loading:false});
  useEffect(()=>{let active=true;setState({key,data:null,error:'',loading:!!userId&&!!session});if(userId&&session)getNightDetail(userId,session).then(data=>{if(active)setState({key,data,error:'',loading:false});}).catch(e=>{if(active)setState({key,data:null,error:e.message??'No se pudo cargar esta noche.',loading:false});});return()=>{active=false;};},[key,retry]);
  return {...(state.key===key?state:{data:null,error:'',loading:!!userId&&!!session}),refresh:()=>setRetry(n=>n+1)};
}

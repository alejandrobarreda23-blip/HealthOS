import{useCallback,useEffect,useState}from'react';
import{useSubject}from'../subjects/SubjectProvider';
import type{AcquisitionSnapshot}from'../acquisition/types';
import{buildAcquisitionSnapshot}from'../services/acquisition-intelligence';

export function useAcquisition(){
 const{scope}=useSubject();
 const[data,setData]=useState<AcquisitionSnapshot|null>(null);
 const[loading,setLoading]=useState(false);
 const[error,setError]=useState<string|null>(null);
 const refresh=useCallback(async()=>{
  if(!scope?.dataUserId){setData(null);return}
  setLoading(true);setError(null);
  try{setData(await buildAcquisitionSnapshot(scope.dataUserId))}
  catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setLoading(false)}
 },[scope?.dataUserId]);
 useEffect(()=>{void refresh()},[refresh]);
 return{data,loading,error,refresh};
}

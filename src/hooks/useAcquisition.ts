import{useCallback,useEffect,useState}from'react';
import{useAuth}from'../auth/AuthProvider';
import type{AcquisitionSnapshot}from'../acquisition/types';
import{buildAcquisitionSnapshot}from'../services/acquisition-intelligence';

export function useAcquisition(){
 const{user}=useAuth();
 const[data,setData]=useState<AcquisitionSnapshot|null>(null);
 const[loading,setLoading]=useState(false);
 const[error,setError]=useState<string|null>(null);
 const refresh=useCallback(async()=>{
  if(!user){setData(null);return}
  setLoading(true);setError(null);
  try{setData(await buildAcquisitionSnapshot(user.id))}
  catch(e){setError(e instanceof Error?e.message:String(e))}
  finally{setLoading(false)}
 },[user]);
 useEffect(()=>{void refresh()},[refresh]);
 return{data,loading,error,refresh};
}

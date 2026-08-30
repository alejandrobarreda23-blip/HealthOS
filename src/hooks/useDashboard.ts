import{useEffect,useState}from'react';import{useAuth}from'../auth/AuthProvider';import{getDashboard,type DashboardData}from'../repositories/dashboard';import{demo}from'../demo/data';
export function useDashboard(){
 const{user}=useAuth();const[data,setData]=useState<DashboardData>(demo);const[loading,setLoading]=useState(false);const[error,setError]=useState('');
 async function refresh(){setLoading(true);try{setData(await getDashboard(user?.id??'',new Date().toISOString().slice(0,10)));setError('')}catch(e:any){setError(e.message||'Error')}finally{setLoading(false)}}
 useEffect(()=>{refresh()},[user?.id]);
 return{data,loading,error,refresh};
}
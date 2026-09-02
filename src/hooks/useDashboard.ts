import{useEffect,useState}from'react';import{useSubject}from'../subjects/SubjectProvider';import{getDashboard,type DashboardData}from'../repositories/dashboard';import{demo}from'../demo/data';
export function useDashboard(){
 const{scope}=useSubject();const[data,setData]=useState<DashboardData>(demo);const[loading,setLoading]=useState(false);const[error,setError]=useState('');
 async function refresh(){if(!scope?.dataUserId)return;setLoading(true);try{setData(await getDashboard(scope.dataUserId,new Date().toISOString().slice(0,10)));setError('')}catch(e:any){setError(e.message||'Error')}finally{setLoading(false)}}
 useEffect(()=>{void refresh()},[scope?.dataUserId]);
 return{data,loading,error,refresh};
}
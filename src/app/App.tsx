import{useEffect,useState}from'react';
import{HeartPulse,ChartNoAxesColumnIncreasing,Database,Activity,Users}from'lucide-react';
import Today from'../screens/Today';
import Trends from'../screens/Trends';
import Health from'../screens/Health';
import Data from'../screens/Data';
import Aging from'../screens/Aging';
import AdminUsers from'../screens/AdminUsers';
import AuthScreen from'../components/AuthScreen';
import SubjectBanner from'../components/SubjectBanner';
import{useAuth}from'../auth/AuthProvider';
import{useSubject}from'../subjects/SubjectProvider';
import{isLiveMode}from'../state/runtime';

type Tab='today'|'trends'|'health'|'aging'|'data'|'users';

export default function App(){
 const{user,loading:authLoading}=useAuth();
 const{isAdmin,loading:subjectLoading,error:subjectError}=useSubject();
 const[t,setT]=useState<Tab>('today');
 useEffect(()=>{if(!isAdmin&&t==='users')setT('today')},[isAdmin,t]);
 if(authLoading)return <main><p>Cargando…</p></main>;
 if(isLiveMode()&&!user)return <AuthScreen/>;
 if(user&&subjectLoading)return <main><p>Cargando perfil…</p></main>;
 if(user&&subjectError)return <main><div className="syncError">No se pudo iniciar el contexto multiusuario: {subjectError}</div></main>;
 if(t==='users'&&isAdmin)return <div className="shell"><main><AdminUsers onOpen={()=>setT('today')}/></main><AppNav tab={t} setTab={setT} isAdmin={isAdmin}/></div>;
 const C={today:Today,trends:Trends,health:Health,aging:Aging,data:Data}[t as Exclude<Tab,'users'>]??Today;
 return <div className="shell"><main><SubjectBanner onUsers={isAdmin?()=>setT('users'):undefined}/><C/></main><AppNav tab={t} setTab={setT} isAdmin={isAdmin}/></div>;
}

function AppNav({tab,setTab,isAdmin}:{tab:Tab;setTab:(tab:Tab)=>void;isAdmin:boolean}){
 const items:Array<readonly[Tab,typeof HeartPulse,string]>=[['today',HeartPulse,'Hoy'],['trends',ChartNoAxesColumnIncreasing,'Evolución'],['health',Activity,'Salud'],['aging',Activity,'Aging'],['data',Database,'Datos']];
 if(isAdmin)items.push(['users',Users,'Usuarios']);
 return <nav className={isAdmin?'adminNav':''}>{items.map(([id,I,label])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}><I size={21}/><span>{label}</span></button>)}</nav>;
}

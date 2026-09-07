import{useEffect,useState}from'react';
import{HeartPulse,ChartNoAxesColumnIncreasing,Database,Activity,Users,ScanLine}from'lucide-react';
import Today from'../screens/Today';
import Trends from'../screens/Trends';
import Health from'../screens/Health';
import Data from'../screens/Data';
import Aging from'../screens/Aging';
import Body from'../screens/Body';
import AdminUsers from'../screens/AdminUsers';
import AuthScreen from'../components/AuthScreen';
import SubjectBanner from'../components/SubjectBanner';
import{useAuth}from'../auth/AuthProvider';
import{useSubject}from'../subjects/SubjectProvider';
import{isLiveMode}from'../state/runtime';

type Tab='body'|'today'|'trends'|'health'|'aging'|'data'|'users';

export default function App(){
 const{user,loading:authLoading}=useAuth();
 const{isAdmin,loading:subjectLoading,error:subjectError}=useSubject();
 const[t,setT]=useState<Tab>('body');
 useEffect(()=>{if(!isAdmin&&t==='users')setT('body')},[isAdmin,t]);
 if(authLoading)return <main><p>Cargando…</p></main>;
 if(isLiveMode()&&!user)return <AuthScreen/>;
 if(user&&subjectLoading)return <main><p>Cargando perfil…</p></main>;
 if(user&&subjectError)return <main><div className="syncError">No se pudo iniciar el contexto multiusuario: {subjectError}</div></main>;

 const content=t==='users'&&isAdmin
  ? <AdminUsers onOpen={()=>setT('body')}/>
  : (()=>{const C={body:Body,today:Today,trends:Trends,health:Health,aging:Aging,data:Data}[t as Exclude<Tab,'users'>]??Body;return <><SubjectBanner onUsers={isAdmin?()=>setT('users'):undefined}/><C/></>})();

 return <div className="shell"><AppNav tab={t} setTab={setT} isAdmin={isAdmin}/><main><div className="contentFrame">{content}</div></main></div>;
}

function AppNav({tab,setTab,isAdmin}:{tab:Tab;setTab:(tab:Tab)=>void;isAdmin:boolean}){
 const items:Array<readonly[Tab,typeof HeartPulse,string]>=[
  ['body',ScanLine,'Mapa'],
  ['today',HeartPulse,'Hoy'],
  ['trends',ChartNoAxesColumnIncreasing,'Evolución'],
  ['health',Activity,'Salud'],
  ['aging',Activity,'Aging'],
  ['data',Database,'Datos'],
 ];
 if(isAdmin)items.push(['users',Users,'Usuarios']);
 return <nav className={isAdmin?'adminNav':''}><div className="navBrand"><span className="navBrandMark">H</span><div><strong>HealthOS</strong><small>Longitudinal health</small></div></div>{items.map(([id,I,label])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}><I size={21}/><span>{label}</span></button>)}</nav>;
}

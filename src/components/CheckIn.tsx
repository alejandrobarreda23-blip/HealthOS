import{useState}from'react';import{useAuth}from'../auth/AuthProvider';import{saveDailyCheckIn}from'../repositories/subjective';import{isLiveMode}from'../state/runtime';
const items=[['Energía','energy_score'],['Estrés','stress_score'],['Fatiga','fatigue_score'],['Ánimo','mood_score']] as const;
export default function CheckIn(){
 const[v,setV]=useState<Record<string,number>>({});const[msg,setMsg]=useState('');const{user}=useAuth();
 async function save(){
   try{
     if(!isLiveMode()||!user){localStorage.setItem(`healthos-checkin-${new Date().toISOString().slice(0,10)}`,JSON.stringify(v));setMsg('Guardado localmente');return}
     const date=new Date().toISOString().slice(0,10);
     await saveDailyCheckIn(user.id,date,v);setMsg('Guardado');
   }catch(e:any){setMsg(e.message||'Error al guardar')}
 }
 return <section className="card"><div className="sectionTitle">¿Cómo estás?</div>{items.map(([label,key])=><div className="scale" key={key}><span>{label}</span><div>{[1,2,3,4,5].map(n=><button key={n} className={v[key]===n?'selected':''} onClick={()=>setV({...v,[key]:n})}>{n}</button>)}</div></div>)}<button className="primary" onClick={save}>Guardar check-in</button>{msg&&<small className="saveMsg">{msg}</small>}</section>
}
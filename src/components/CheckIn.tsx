import { useEffect, useState } from 'react';
import { useSubject } from '../subjects/SubjectProvider';
import { getDailyCheckIn, saveDailyCheckIn } from '../repositories/subjective';
import { localToday } from '../health/metrics/daily-series';
const items = [['Energía','energy_score'],['Estrés','stress_score'],['Fatiga','fatigue_score'],['Ánimo','mood_score']] as const;
export default function CheckIn({date=localToday(),onSaved}:{date?:string;onSaved?:()=>void}) {
  const {scope}=useSubject(); const userId=scope?.dataUserId;
  const key=`${userId}|${date}`;
  const [state,setState]=useState<{key:string;values:Record<string,number>;loading:boolean;error:string}>({key:'',values:{},loading:true,error:''});
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{let active=true;setState({key,values:{},loading:true,error:''});setMessage('');if(scope?.isSelf&&userId)getDailyCheckIn(userId,date).then(row=>{if(active)setState({key,values:Object.fromEntries(Object.entries(row??{}).filter((entry):entry is [string,number]=>typeof entry[1]==='number')),loading:false,error:''});}).catch(error=>{if(active)setState({key,values:{},loading:false,error:error.message});});return()=>{active=false;};},[key,userId,date,scope?.isSelf]);
  if(!scope?.isSelf)return null;
  const current=state.key===key?state:{values:{} as Record<string,number>,loading:true,error:''};
  async function save(){if(!userId||busy||!Object.keys(current.values).length)return;setBusy(true);try{await saveDailyCheckIn(userId,date,current.values);setMessage('Guardado');onSaved?.();}catch(error:any){setMessage(error.message??'No se pudo guardar');}finally{setBusy(false);}}
  return <section className="card"><div className="sectionTitle">¿Cómo te sentías el {date}?</div><p className="muted">1 = muy bajo · 5 = muy alto. Completa solo lo que recuerdes.</p>{current.loading?<p role="status">Cargando el check-in…</p>:current.error?<p role="alert">{current.error}</p>:items.map(([label,metric])=><div className="scale" key={metric}><span>{label}</span><div>{[1,2,3,4,5].map(n=><button type="button" disabled={busy} aria-label={`${label}: ${n} de 5`} aria-pressed={current.values[metric]===n} key={n} className={current.values[metric]===n?'selected':''} onClick={()=>setState({...state,values:{...current.values,[metric]:n}})}>{n}</button>)}</div></div>)}<button className="primary" disabled={busy||current.loading||!!current.error||!Object.keys(current.values).length} onClick={save}>{busy?'Guardando…':'Guardar check-in'}</button>{message&&<p role="status">{message}</p>}</section>;
}

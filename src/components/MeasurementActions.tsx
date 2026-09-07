import{useEffect,useState}from'react';
import{useSubject}from'../subjects/SubjectProvider';
import{addBloodPressureReading,addWeightMeasurement,completeCampaign,getActiveCampaign,getCampaignProgress,startCampaign}from'../repositories/measurement-campaigns';
import type{BpOccasion,CampaignProgress,MeasurementCampaign}from'../measurement/types';

export default function MeasurementActions(){
 const{scope}=useSubject();
 const readOnly=Boolean(scope&&!scope.isSelf);
 const dataUserId=scope?.dataUserId??null;
 const[weight,setWeight]=useState('');const[msg,setMsg]=useState<string|null>(null);const[busy,setBusy]=useState(false);
 const[campaign,setCampaign]=useState<MeasurementCampaign|null>(null);const[progress,setProgress]=useState<CampaignProgress|null>(null);
 const[sys,setSys]=useState('');const[dia,setDia]=useState('');const[occasion,setOccasion]=useState<BpOccasion>('morning');const[reading,setReading]=useState(1);
 async function refresh(){if(!dataUserId||readOnly){setCampaign(null);setProgress(null);return}const c=await getActiveCampaign(dataUserId,'home_bp_campaign_v1');setCampaign(c);setProgress(c?await getCampaignProgress(c):null)}
 useEffect(()=>{refresh().catch(()=>{})},[dataUserId,readOnly]);
 async function act(fn:()=>Promise<void>,ok:string){if(readOnly){setMsg('Modo lectura: no puedes registrar mediciones de otro usuario.');return}try{setBusy(true);setMsg(null);await fn();setMsg(ok);await refresh()}catch(e){setMsg(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 if(!dataUserId||readOnly)return null;
 return <section className="measurementSection"><div className="sectionTitle">Mediciones</div><p className="muted">Añade datos medidos o inicia campañas temporales. HealthOS conserva el protocolo utilizado y no convierte la completitud en una interpretación clínica.</p>
  <div className="measurementGrid">
   <div className="card measurementCard"><div><strong>Peso corporal</strong><small>Medición puntual · kg</small></div><div className="measurementInline"><input inputMode="decimal" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="75,2"/><button disabled={busy||!weight} onClick={()=>act(async()=>{await addWeightMeasurement(dataUserId,Number(weight.replace(',','.')));setWeight('')},'Peso guardado.')}>Guardar</button></div></div>
   <div className="card measurementCard"><div className="measurementHead"><div><strong>Presión arterial domiciliaria</strong><small>{campaign?'Campaña activa':'Protocolo home_bp_campaign_v1'}</small></div>{progress&&<span className="measurementProgress">{progress.distinctDays}/{progress.preferredDays} días válidos</span>}</div>
    {!campaign?<button className="primaryButton" disabled={busy} onClick={()=>act(async()=>{setCampaign(await startCampaign(dataUserId,'home_bp_campaign_v1'))},'Campaña iniciada.')}>Iniciar campaña</button>:<>
     <div className="bpForm"><label>Sistólica<input inputMode="numeric" value={sys} onChange={e=>setSys(e.target.value)} placeholder="118"/></label><label>Diastólica<input inputMode="numeric" value={dia} onChange={e=>setDia(e.target.value)} placeholder="72"/></label><label>Momento<select value={occasion} onChange={e=>setOccasion(e.target.value as BpOccasion)}><option value="morning">Mañana</option><option value="evening">Tarde/noche</option></select></label><label>Lectura<select value={reading} onChange={e=>setReading(Number(e.target.value))}><option value={1}>1</option><option value={2}>2</option></select></label></div>
     <button disabled={busy||!sys||!dia} onClick={()=>act(async()=>{await addBloodPressureReading(dataUserId,campaign,{systolic:Number(sys),diastolic:Number(dia),occasion,readingIndex:reading});setSys('');setDia('')},'Lectura guardada.')}>Guardar lectura</button>
     {progress&&<div className="campaignStatus"><span>{progress.occasionsCompleted} ocasiones completas · {progress.recordedDays} días con algún registro</span><span>Mínimo: {progress.minimumDays} días · preferido: {progress.preferredDays}</span>{progress.eligibleToComplete&&<button className="secondaryButton" disabled={busy} onClick={()=>act(async()=>{await completeCampaign(campaign);setCampaign(null);setProgress(null)},progress.targetReached?'Campaña completada.':'Campaña cerrada con el mínimo protocolario.')}>Finalizar campaña</button>}</div>}
    </>}
   </div>
  </div>{msg&&<div className="measurementMessage">{msg}</div>}
 </section>
}

import { Activity, CircleDashed, Dna, Gauge, HeartPulse, Microscope, Moon, Scale, ShieldQuestion, TimerReset } from 'lucide-react';
import { useHealthBriefV1 } from '../hooks/useHealthBrief';

const SYSTEMS = [
  { key:'cardiovascular', label:'Cardiovascular', icon:HeartPulse, metrics:['FC reposo'], source:(d:any)=>Boolean(d?.recovery.restingHr?.baseline), note:'FC reposo longitudinal; faltan presión arterial y otros anclajes clínicos.' },
  { key:'metabolic', label:'Metabólico', icon:Gauge, metrics:['Peso','HbA1c'], source:(d:any)=>d?.body.weightKg!=null, note:'Peso puede estar observado; el sistema requiere laboratorio para caracterización robusta.' },
  { key:'fitness', label:'Fitness', icon:Activity, metrics:['Entrenamiento','VO₂max'], source:(d:any)=>Boolean(d?.training.sessions7d), note:'Carga observada disponible; VO₂max todavía no está integrado en el runtime Aging.' },
  { key:'sleep', label:'Sueño / recuperación', icon:Moon, metrics:['Sueño','HRV'], source:(d:any)=>Boolean(d?.sleep.duration?.baseline||d?.recovery.hrv?.baseline), note:'Es el dominio con más soporte wearable actual.' },
  { key:'body', label:'Composición corporal', icon:Scale, metrics:['Peso','Composición'], source:(d:any)=>d?.body.weightKg!=null, note:'Peso no equivale a composición corporal. Falta una medición específica.' },
  { key:'inflammation', label:'Inflamación', icon:Microscope, metrics:['PCR','Biomarcadores'], source:(_d:any)=>false, note:'Sin laboratorio compatible no se publica trayectoria.' },
  { key:'renal', label:'Renal', icon:Dna, metrics:['Creatinina','eGFR'], source:(_d:any)=>false, note:'Requiere biomarcadores clínicos versionados.' },
];

export default function Aging(){
  const {data,loading,error}=useHealthBriefV1();
  const observedSystems=SYSTEMS.filter(s=>s.source(data)).length;
  const coverage=SYSTEMS.map(s=>({ ...s, observed:s.source(data) }));
  const paceEligible=false;

  return <div className="agingScreenV2">
    <header className="pageHeader agingHeaderV2"><div><div className="eyebrow">AGING</div><h1>Trayectoria</h1><p className="muted pageLead">Cómo cambia el organismo a través de sistemas distintos, separando observación, cobertura y madurez del modelo.</p></div><div className="agingMaturityPill"><ShieldQuestion size={16}/>Runtime experimental</div></header>

    {error&&<p className="error">{error}</p>}
    <section className="agingHeroV2">
      <article className="agingPrimaryCard card"><div className="agingHeroKicker">HEALTHOS PACE</div><div className="agingPaceDisplay">{paceEligible?'—':'—'}</div><strong>No publicado todavía</strong><p>HealthOS no mostrará un número global hasta que el runtime Aging tenga suficientes sistemas, historia y evidencia independiente.</p><div className="agingEligibility"><span><b>{observedSystems}</b>/7 sistemas con alguna señal</span><span><b>{Math.round((data?.dataQuality.overallCoverage??0)*100)}%</b> cobertura reciente</span></div></article>
      <article className="agingMethodCard card"><div className="agingHeroKicker">CAPAS DE EDAD</div><div className="agingMethodRow"><span><TimerReset size={16}/>Cronológica</span><strong>—</strong><small>fecha de nacimiento no conectada al runtime</small></div><div className="agingMethodRow"><span><Dna size={16}/>PhenoAge</span><strong>—</strong><small>requiere analítica completa y unidades verificadas</small></div><div className="agingMethodRow"><span><CircleDashed size={16}/>Dynamic Aging</span><strong>Investigación</strong><small>respuesta y recuperación; no se fusiona con Pace</small></div></article>
    </section>

    <section className="agingSystemsSection"><div className="agingSectionHead"><div><div className="eyebrow">SISTEMAS</div><h2>Mapa de observabilidad</h2></div><span>{observedSystems} con señal · {7-observedSystems} ciegos/parciales</span></div><div className="agingSystemMap">
      <div className="agingSystemAxis"><span>más observación</span><i/><span>menos observación</span></div>
      {coverage.map((s,index)=><article className={`agingSystemRow card ${s.observed?'observed':'blind'}`} key={s.key}><div className="agingSystemIdentity"><div className="agingSystemIcon"><s.icon size={18}/></div><div><strong>{s.label}</strong><small>{s.metrics.join(' · ')}</small></div></div><div className="agingSystemTrajectory"><span className="agingTrajectoryLine"><i style={{width:s.observed?'54%':'12%'}}/></span><b>{s.observed?'señal parcial':'sin señal suficiente'}</b></div><p>{s.note}</p><span className="agingSystemIndex">0{index+1}</span></article>)}
    </div></section>

    <section className="agingBottomGrid">
      <article className="card agingEvidenceCard"><div className="eyebrow">MADUREZ</div><h3>Lo que sí podemos afirmar</h3><p>La capa Aging puede mostrar cobertura y trayectoria de sistemas que ya estén alimentados por datos reales. No convierte cobertura en edad biológica.</p><div className="agingRule"><span>Estado</span><b>observado</b></div><div className="agingRule"><span>Trayectoria</span><b>cuando haya historia suficiente</b></div><div className="agingRule"><span>Pace global</span><b>bloqueado hasta validación</b></div></article>
      <article className="card agingEvidenceCard"><div className="eyebrow">PRÓXIMO VALOR</div><h3>Qué desbloquea más información</h3><p>Las mediciones independientes añaden valor cuando abren sistemas actualmente ciegos, no por aumentar el número de métricas del mismo sensor.</p><div className="agingNext"><span>01</span><div><strong>Presión arterial domiciliaria</strong><small>refuerza cardiovascular</small></div></div><div className="agingNext"><span>02</span><div><strong>Analítica estructurada</strong><small>metabólico · inflamación · renal · PhenoAge</small></div></div></article>
    </section>
    {loading&&<div className="agingLoading">Actualizando observabilidad…</div>}
  </div>;
}

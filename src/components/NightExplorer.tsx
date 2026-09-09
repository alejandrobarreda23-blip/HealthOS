import { useEffect, useMemo, useRef, useState } from 'react';
import { useSubject } from '../subjects/SubjectProvider';
import { useNightDetail } from '../hooks/useNightDetail';
import { NIGHT_SIGNALS, STAGES, rhythmIndex, samplePaths, stageTimeline, type NightDetail } from '../health/night-explorer';
import { formatClock, type SleepRecord, type WeeklyInput } from '../health/weekly-learning';
import { formatMonitoring } from '../health/monitoring-metrics';
import { median } from '../health/metrics/daily-series';
import './night-explorer.css';
const dateLabel=(d:string)=>new Date(d+'T12:00:00Z').toLocaleDateString('es-ES',{day:'numeric',month:'long'});
const minutes=(n:number)=>formatMonitoring('sleep_duration',n);
const number=(n:number)=>n.toLocaleString('es-ES',{maximumFractionDigits:1});

export function NightCanvas({session,detail}: {session:SleepRecord;detail:NightDetail}) {
  const start=Date.parse(session.start),end=Date.parse(session.end);
  const [picked,setPicked]=useState(start),[zoom,setZoom]=useState(false),[width,setWidth]=useState(800);
  const container=useRef<HTMLDivElement>(null);
  useEffect(()=>{const el=container.current;if(!el)return;const resize=()=>setWidth(Math.max(250,Math.round(el.getBoundingClientRect().width)));resize();const observer=new ResizeObserver(resize);observer.observe(el);return()=>observer.disconnect();},[]);
  const span=Math.min(2*3600000,end-start),viewStart=zoom?Math.max(start,Math.min(picked-span/2,end-span)):start,viewEnd=zoom?viewStart+span:end;
  const left=width<500?67:90,right=width-14,x=(t:number)=>left+(t-viewStart)/(viewEnd-viewStart)*(right-left);
  const clock=(t:number)=>new Date(t).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',timeZone:session.timezone??'UTC'});
  const timeline=useMemo(()=>stageTimeline(session,detail.stages),[session,detail.stages]);
  const choose=(e:React.PointerEvent<SVGSVGElement>)=>{const b=e.currentTarget.getBoundingClientRect();setPicked(Math.round(Math.max(viewStart,Math.min(viewEnd,viewStart+((e.clientX-b.left)/b.width*width-left)/(right-left)*(viewEnd-viewStart)))));};
  const cursor=Math.max(start,Math.min(end,picked));
  const ticks=[viewStart,(viewStart+viewEnd)/2,viewEnd];
  return <div className="nightCanvas" ref={container}>
    <div className="nightChartTools"><div><h3>La noche, en el mismo reloj</h3><p>{clock(start)} — {clock(end)} · {session.timezone??'UTC'} · {session.provider}</p></div><button aria-pressed={zoom} onClick={()=>setZoom(!zoom)}>{zoom?'Ver noche completa':'Ampliar a 2 horas'}</button></div>
    <div className="nightCursor"><label>Explorar las {clock(cursor)}<input type="range" aria-label="Hora explorada de la noche" min={start} max={end} step={60000} value={cursor} onChange={e=>setPicked(Number(e.target.value))}/></label><p>El cursor conecta las fases y las mediciones de la misma hora.</p></div>
    <div className="nightHypnogram"><h4>Fases estimadas por el dispositivo</h4><svg viewBox={`0 0 ${width} 198`} role="img" aria-label="Fases de sueño por hora; los tramos grises no tienen fase" onPointerDown={choose} onPointerMove={e=>{if(!zoom&&e.pointerType==='mouse')choose(e);}}>
      {(['awake','rem','light','deep'] as const).map(stage=><g key={stage}><text x={left-10} y={35+STAGES[stage].level*38} textAnchor="end">{STAGES[stage].label}</text><line x1={left} x2={right} y1={30+STAGES[stage].level*38} y2={30+STAGES[stage].level*38} stroke="#ffffff12"/></g>)}
      {timeline.filter(s=>s.end>viewStart&&s.start<viewEnd).map((s,i)=><rect key={i} x={x(Math.max(viewStart,s.start))} width={Math.max(1,x(Math.min(viewEnd,s.end))-x(Math.max(viewStart,s.start)))} y={s.stage==='unknown'?18:18+STAGES[s.stage].level*38} height={s.stage==='unknown'?142:25} rx="2" fill={STAGES[s.stage].color} opacity={s.stage==='unknown'?.24:.95}><title>{clock(s.start)}–{clock(s.end)} · {STAGES[s.stage].label}</title></rect>)}
      <line x1={x(cursor)} x2={x(cursor)} y1="8" y2="162" stroke="#ebd7a8" strokeDasharray="3 4"/>{ticks.map(t=><text key={t} x={x(t)} y="190" textAnchor={t===viewStart?'start':t===viewEnd?'end':'middle'}>{clock(t)}</text>)}
    </svg></div>
    <div className="nightStageTotals">{Object.entries(STAGES).map(([key,s])=>{const ms=timeline.filter(t=>t.stage===key).reduce((a,t)=>a+t.end-t.start,0);return ms>0?<div key={key}><span><i style={{background:s.color}}/>{s.label}</span><strong>{minutes(ms/60000)}</strong><small>{Math.round(ms/(end-start)*100)} % del intervalo</small></div>:null;})}</div>
    {NIGHT_SIGNALS.map(signal=>{
      const all=detail.samples.filter(p=>p.key===signal.key),rows=all.filter(p=>p.time>=viewStart&&p.time<=viewEnd);
      if(!all.length)return null;
      const nearest=rows.reduce<typeof rows[number]|undefined>((best,p)=>!best||Math.abs(p.time-cursor)<Math.abs(best.time-cursor)?p:best,undefined);
      const selected=nearest&&Math.abs(nearest.time-cursor)<=5*60000?nearest:undefined;
      const vals=rows.map(p=>p.value),low=vals.length?Math.min(...vals):0,high=vals.length?Math.max(...vals):1,pad=Math.max((high-low)*.12,signal.key==='skin_temperature'?.1:1),y=(v:number)=>145-(v-low+pad)/(high-low+2*pad)*115;
      return <div className="nightSignal" key={signal.key}><div><h4><i style={{background:signal.color}}/>{signal.label}</h4><strong style={{color:signal.color}}>{selected?`${number(selected.value)} ${signal.unit}`:'Sin muestra cercana'}</strong><small>{all.length} mediciones · mediana nocturna {number(median(all.map(p=>p.value))!)} {signal.unit}</small></div>
        {rows.length?<svg viewBox={`0 0 ${width} 180`} role="img" aria-label={`${signal.label} durante la noche, en ${signal.unit}`} onPointerDown={choose} onPointerMove={e=>{if(!zoom&&e.pointerType==='mouse')choose(e);}}>
          {[...new Set([low,(low+high)/2,high])].map(v=><g key={v}><text x={left-10} y={y(v)+4} textAnchor="end">{number(v)}</text><line x1={left} x2={right} y1={y(v)} y2={y(v)} stroke="#ffffff12"/></g>)}
          {samplePaths(rows).map((p,i)=>p.length>1?<polyline key={i} points={p.map(p=>`${x(p.time)},${y(p.value)}`).join(' ')} fill="none" stroke={signal.color} strokeWidth="1.8"/>:<circle key={i} cx={x(p[0].time)} cy={y(p[0].value)} r="2.5" fill={signal.color}/>)}
          <line x1={x(cursor)} x2={x(cursor)} y1="15" y2="150" stroke="#ebd7a8" strokeDasharray="3 4"/>{selected&&<circle cx={x(selected.time)} cy={y(selected.value)} r="4" fill={signal.color}/>} {ticks.map(t=><text key={t} x={x(t)} y="174" textAnchor={t===viewStart?'start':t===viewEnd?'end':'middle'}>{clock(t)}</text>)}
        </svg>:<p>No hay muestras en estas dos horas.</p>}
      </div>;
    })}
    {!detail.samples.length&&<p>No hay series intranocturnas disponibles de esta fuente.</p>}
    <p className="nightFootnote">Fases estimadas, no medición clínica. Los porcentajes usan el intervalo completo, incluido el tiempo despierto y sin fase. Las curvas no unen huecos superiores a 10 minutos. La temperatura es de la piel; esta HRV conserva la definición de Ultrahuman.</p>
  </div>;
}

export default function NightExplorer({input,onOpenTrend}:{input:WeeklyInput;onOpenTrend?:(key:string)=>void}){
  const {scope}=useSubject(),userId=scope?.dataUserId;
  const sessions=[...input.sleeps].filter(s=>Date.parse(s.end)<=Date.now()&&Date.parse(s.end)>Date.parse(s.start)).sort((a,b)=>b.date.localeCompare(a.date)||(Date.parse(b.end)-Date.parse(b.start))-(Date.parse(a.end)-Date.parse(a.start))||a.id.localeCompare(b.id));
  const [selection,setSelection]=useState({owner:userId,id:''});
  const session=sessions.find(s=>selection.owner===userId&&s.id===selection.id)??sessions[0];
  const detail=useNightDetail(userId,session);
  const [open,setOpen]=useState(false);
  if(!session)return null;
  const current=sessions.findIndex(s=>s.id===session.id);
  const index=rhythmIndex({...input,
    sleeps:input.sleeps.filter(s=>s.provider===session.provider&&s.device===session.device&&s.version===session.version),
    points:input.points.filter(p=>p.provider===session.provider&&p.sourceDevice===session.device&&p.normalizerVersion===session.version),
  },session.date);
  const point=(key:string)=>input.points.find(p=>p.metricKey===key&&p.physiologicalDate===session.date&&p.provider===session.provider&&p.sourceDevice===session.device&&p.normalizerVersion===session.version);
  const sleep=point('sleep_duration'),timeline=detail.data?stageTimeline(session,detail.data.stages):[];
  let cumulative=0;const circumference=2*Math.PI*72,total=Date.parse(session.end)-Date.parse(session.start);
  return <section className="nightExperience" aria-label="Explorador visual de la noche">
    <div className="nightHeading"><div><div className="eyebrow">TU NOCHE · TUS HORARIOS · TUS SEÑALES</div><h2>Entiende cómo ha sido tu noche</h2></div><div className="nightNavigation" role="group" aria-label="Elegir noche"><button disabled={current>=sessions.length-1} onClick={()=>setSelection({owner:userId,id:sessions[current+1].id})}>←</button><select aria-label="Noche registrada" value={session.id} onChange={e=>setSelection({owner:userId,id:e.target.value})}>{sessions.map(s=><option key={s.id} value={s.id}>{dateLabel(s.date)} · {s.provider}</option>)}</select><button disabled={current===0} onClick={()=>setSelection({owner:userId,id:sessions[current-1].id})}>→</button></div></div>
    <div className="nightHeroGrid"><article className="nightSleepHero"><div className="nightDial"><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="72" fill="none" stroke="#ffffff13" strokeWidth="11"/>{Object.entries(STAGES).map(([key,s])=>{const ms=timeline.filter(t=>t.stage===key).reduce((a,t)=>a+t.end-t.start,0),length=ms/total*circumference,offset=cumulative;cumulative+=length;return length?<circle key={key} cx="90" cy="90" r="72" fill="none" stroke={s.color} strokeWidth="11" strokeDasharray={`${length} ${circumference-length}`} strokeDashoffset={-offset} transform="rotate(-90 90 90)"/>:null;})}</svg><div><small>Tiempo dormido</small><strong>{sleep?minutes(sleep.value):'Sin resumen'}</strong><span>{dateLabel(session.date)}</span></div></div><div className="nightQuickSignals">{['resting_heart_rate','ultrahuman_sleep_hrv','sleep_efficiency'].map(key=>{const p=point(key);return p?<div key={key}><small>{key==='resting_heart_rate'?'Pulso en reposo':key.includes('hrv')?'HRV nocturna':'Eficiencia'}</small><strong>{formatMonitoring(key,p.value)}</strong></div>:null;})}</div><button className="nightPrimary" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Plegar detalle de la noche':'Explorar fases y curvas ↓'}</button></article>
    <article className="nightRhythmHero"><div className="eyebrow">INDICADOR HEALTHOS · EXPERIMENTAL</div><h3>Continuidad de horarios</h3><div className="nightIndex"><strong>{index.score!==null?index.aligned:'—'}</strong>{index.score!==null&&<span>/ {index.recent} noches</span>}</div><p>{index.score!==null?`${index.aligned} de ${index.recent} noches cerca de tus horarios de referencia, tanto al empezar como al terminar.`:'Necesitamos cinco noches recientes y veinte anteriores de la misma fuente y zona horaria.'}</p><div className="nightAlignmentParts">{index.score!==null&&<><span>Inicio cerca de la referencia <b>{index.rows.filter(r=>r.bed).length}/{index.recent}</b></span><span>Final cerca de la referencia <b>{index.rows.filter(r=>r.wake).length}/{index.recent}</b></span></>}</div><div className="nightWeekDots" aria-label="Coincidencia de horarios en cada noche">{index.rows.map(r=><div key={r.date}><i className={index.score===null?'pending':r.bed&&r.wake?'aligned':'different'}/><small>{new Date(r.date+'T12:00:00Z').toLocaleDateString('es-ES',{weekday:'short'})}</small></div>)}</div><small>{index.recent}/7 noches recientes · {index.prior}/28 de referencia</small><details><summary>Qué mide este indicador</summary><p>Porcentaje de noches observadas cuyos horarios de inicio y final quedan, ambos, a un máximo de 30 minutos de sus medianas en los 28 días anteriores a la semana. Se redondea al entero; los días sin dato no cuentan como incumplimientos y la cobertura se muestra aparte.</p><p>Referencia: {index.priorStart}–{index.priorEnd}{index.bed!==undefined&&index.wake!==undefined?` · ${formatClock(index.bed)}–${formatClock(index.wake)}`:''}. El margen de 30 minutos es una regla del producto. La coincidencia describe continuidad con tus horarios anteriores, no calidad del sueño, recuperación ni salud. Un cambio de rutina también reduce la coincidencia aunque los nuevos horarios sean constantes. No es comparable entre personas.</p></details>{onOpenTrend&&<button onClick={()=>onOpenTrend('sleep_duration')}>Ver mi historia de sueño →</button>}</article></div>
    {detail.loading&&<p role="status">Cargando fases y mediciones de esta noche…</p>}{detail.error&&<p role="alert">{detail.error} <button onClick={detail.refresh}>Reintentar</button></p>}
    {open&&detail.data&&<NightCanvas key={`${userId}|${session.id}`} session={session} detail={detail.data}/>}
  </section>;
}

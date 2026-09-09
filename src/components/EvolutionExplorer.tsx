import { useEffect, useMemo, useState } from 'react';
import type { BodyHistorySnapshot } from '../body/view-state';
import type { BaselineBandPointV1, TrendPointV1, TrendEventV1 } from '../repositories/trends';
import { compareEvolution, evolutionSmoothing, quantile } from '../health/evolution';
import { median, minusDays } from '../health/metrics/daily-series';
import './evolution.css';

export type EvolutionMetric = { key: string; label: string; unit: string; format?: (v:number)=>string };
const dateLabel=(d:string)=>new Date(`${d}T12:00:00Z`).toLocaleDateString('es-ES',{day:'numeric',month:'short'});
const valueLabel=(m:EvolutionMetric,v:number|null)=>v===null?'—':m.format?m.format(v):`${v.toLocaleString('es-ES',{maximumFractionDigits:1})} ${m.unit}`;
const duration=(v:number)=>`${Math.floor(Math.round(v)/60)} h ${Math.round(v)%60} min`;
const dayOffset=(a:string,b:string)=>Math.round((Date.parse(a)-Date.parse(b))/86400000);

export default function EvolutionExplorer({metric,points,baselines,events,history,end,days,onOpenActivities}: {
  metric:EvolutionMetric;points:TrendPointV1[];baselines:BaselineBandPointV1[];events:TrendEventV1[];
  history:BodyHistorySnapshot|null;end:string;days:number;onOpenActivities?:(date:string)=>void;
}) {
  const start=minusDays(end,days-1);
  const [selected,setSelected]=useState(points.at(-1)?.date??end);
  const [detail,setDetail]=useState(days!==365);
  const [reference,setReference]=useState(true);
  const all=useMemo(()=>(history?.points??[]).filter(p=>p.metricKey===metric.key).map(p=>({date:p.physiologicalDate,value:p.value,sourceKey:p.sourceKey,coverage:1})),[history,metric.key]);
  const comparison=useMemo(()=>compareEvolution(all,end,metric.key==='weight'?4:14),[all,end,metric.key]);
  const smooth=useMemo(()=>evolutionSmoothing(all).map(s=>s.filter(p=>p.date>=start&&p.date<=end)).filter(s=>s.length),[all,start,end]);
  const weeks=useMemo(()=>Array.from({length:Math.ceil(days/7)},(_,i)=>{
    const from=minusDays(start,-i*7),to=minusDays(from,-Math.min(6,days-1-i*7));
    const rows=points.filter(p=>p.date>=from&&p.date<=to);
    return {from,to,rows,value:rows.length>=4&&new Set(rows.map(p=>p.sourceKey)).size===1?median(rows.map(p=>p.value)):null};
  }),[points,start,days]);
  const [narrow,setNarrow]=useState(typeof window!=='undefined'&&window.innerWidth<600);
  useEffect(()=>{const resize=()=>setNarrow(window.innerWidth<600);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  const W=narrow?440:1000,H=300,L=64,R=24,T=22,B=40;
  const vals=[...points.map(p=>p.value),...baselines.filter(b=>b.sufficient).flatMap(b=>[b.p25,b.p75].filter((v):v is number=>v!==null))];
  const low=vals.length?Math.min(...vals):0,high=vals.length?Math.max(...vals):1,pad=Math.max((high-low)*.15,1),lo=metric.unit==='%'?Math.max(0,low-pad):low-pad,hi=metric.unit==='%'?Math.min(100,high+pad):high+pad;
  const x=(d:string)=>days===1?(L+W-R)/2:L+dayOffset(d,start)/Math.max(1,days-1)*(W-L-R);
  const y=(v:number)=>T+(hi-v)/(hi-lo)*(H-T-B);
  const ticks=Array.from({length:5},(_,i)=>lo+(hi-lo)*i/4);
  const dates=[...new Set(Array.from({length:narrow?3:5},(_,i)=>minusDays(start,-Math.round((days-1)*i/(narrow?2:4)))))];
  const point=points.find(p=>p.date===selected),day=history?.days.find(d=>d.date===selected);
  const baseline=baselines.find(b=>b.date===selected&&b.sufficient&&b.sourceKey===point?.sourceKey);
  const selectedWeek=weeks.find(w=>selected>=w.from&&selected<=w.to);
  const choose=(e:React.PointerEvent<SVGSVGElement>)=>{const rect=e.currentTarget.getBoundingClientRect();const px=(e.clientX-rect.left)/rect.width*W;setSelected(minusDays(start,-Math.max(0,Math.min(days-1,Math.round((px-L)/(W-L-R)*(days-1))))));};
  const recent=comparison.recent,previous=comparison.previous;
  const title=comparison.delta===null?'Aún falta una comparación suficiente':comparison.delta===0?'La mediana reciente coincide con la anterior':`Mediana reciente ${valueLabel(metric,Math.abs(comparison.delta))} ${comparison.delta<0?'inferior':'superior'}`;
  const contextRows=[{key:'sleep_duration',label:'Sueño',unit:'h',convert:(v:number)=>v/60},{key:'hrv_rmssd',label:'HRV RMSSD',unit:'ms',convert:(v:number)=>v},{key:'ultrahuman_sleep_hrv',label:'HRV nocturna · Ultrahuman',unit:'ms',convert:(v:number)=>v},{key:'steps',label:'Pasos',unit:'pasos',convert:(v:number)=>v}].filter(r=>r.key!==metric.key&&(history?.points??[]).some(p=>p.metricKey===r.key&&p.physiologicalDate>=start&&p.physiologicalDate<=end));
  const trainingMax=Math.max(1,...events.map(e=>e.durationMinutes));
  return <div className="evWorkspace">
    <section className="evReading" aria-label="Lectura de evolución reciente">
      <div><div className="eyebrow">QUÉ HA CAMBIADO · DOS PERIODOS DE 28 DÍAS</div><h2>{title}</h2><p>{comparison.eligible?'Describe un cambio entre los valores registrados; por sí solo no identifica una mejora, un deterioro ni su causa.':comparison.reason}</p></div>
      <div className="evReadingNumbers"><div><small>{dateLabel(previous.start)} – {dateLabel(previous.end)}</small><strong>{valueLabel(metric,previous.median)}</strong><span>{previous.count}/28 días</span></div><span aria-hidden="true">→</span><div><small>{dateLabel(recent.start)} – {dateLabel(recent.end)}</small><strong>{valueLabel(metric,recent.median)}</strong><span>{recent.count}/28 días</span></div></div>
    </section>
    <section className="evPanel">
      <div className="evChartHeader"><div><h2>{metric.label} a lo largo del tiempo</h2><p>{points.length}/{days} días observados · Último dato: {points.at(-1)?`${dateLabel(points.at(-1)!.date)} · ${valueLabel(metric,points.at(-1)!.value)}`:'sin registro'}</p></div><div className="evToggles"><button aria-pressed={!detail} onClick={()=>setDetail(false)}>Semanas</button><button aria-pressed={detail} onClick={()=>setDetail(true)}>Días + tendencia</button></div></div>
      <div className="evLegend"><span><i className="evDot"/>Observación diaria</span><span><i className="evLine"/>{detail?'Mediana móvil · 7 días':'Mediana semanal · rango central'}</span><label><input type="checkbox" disabled={!baselines.some(b=>b.sufficient)} checked={reference&&baselines.some(b=>b.sufficient)} onChange={e=>setReference(e.target.checked)}/>Referencia personal{!baselines.some(b=>b.sufficient)&&" · insuficiente"}</label></div>
      <div className="evChartScroll">{!points.length?<div className="evMissing">Sin mediciones de esta señal en la ventana. Puedes explorar el contexto registrado debajo.</div>:<svg className="evSvg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Evolución de ${metric.label}. Selecciona una fecha con el control inferior.`} onPointerMove={choose} onClick={choose}>
        {ticks.map(v=><g key={v}><line x1={L} x2={W-R} y1={y(v)} y2={y(v)} stroke="#e7ebe6"/><text x={L-10} y={y(v)+4} textAnchor="end">{valueLabel(metric,v)}</text></g>)}
        {reference&&baselines.slice(1).map((b,i)=>{const a=baselines[i];return a.sufficient&&b.sufficient&&a.sourceKey===b.sourceKey&&dayOffset(b.date,a.date)===1&&a.p25!==null&&a.p75!==null&&b.p25!==null&&b.p75!==null?<polygon key={b.date} points={`${x(a.date)},${y(a.p25)} ${x(b.date)},${y(b.p25)} ${x(b.date)},${y(b.p75)} ${x(a.date)},${y(a.p75)}`} fill="#adc5b7" opacity=".3"/>:null;})}
        {points.map(p=><circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={detail?2.6:1.8} fill="#7c9487" opacity={detail?.5:.3}><title>{dateLabel(p.date)}: {valueLabel(metric,p.value)}</title></circle>)}
        {detail?smooth.map((s,i)=><g key={i}>{s.length>1?<polyline points={s.map(p=>`${x(p.date)},${y(p.value)}`).join(' ')} fill="none" stroke="#285f48" strokeWidth="2.5"/>:<circle cx={x(s[0].date)} cy={y(s[0].value)} r="3" fill="#285f48"/>}</g>):weeks.filter(w=>w.value!==null).map(w=><g key={w.from}><line x1={x(minusDays(w.from,-Math.floor(dayOffset(w.to,w.from)/2)))} x2={x(minusDays(w.from,-Math.floor(dayOffset(w.to,w.from)/2)))} y1={y(quantile(w.rows.map(p=>p.value),.25)!)} y2={y(quantile(w.rows.map(p=>p.value),.75)!)} stroke="#82a58e" strokeWidth="5"/><circle cx={x(minusDays(w.from,-Math.floor(dayOffset(w.to,w.from)/2)))} cy={y(w.value!)} r="4" fill="#285f48"/></g>)}
        <line x1={x(selected)} x2={x(selected)} y1={T} y2={H-B} stroke="#ad8750" strokeDasharray="4 4"/>
        {point&&<circle cx={x(selected)} cy={y(point.value)} r="5" fill="#fff" stroke="#285f48" strokeWidth="2"/>}
        {dates.map(d=><text key={d} x={x(d)} y={H-12} textAnchor="middle">{dateLabel(d)}</text>)}
      </svg>}</div>
      <div className="evChartNote">{detail?'La línea resume los 7 días anteriores, con al menos 4 observaciones. Se interrumpe en días sin medición y cambios de fuente.':'Cada punto destacado resume una semana con al menos 4 días de la misma fuente. La barra abarca el 50 % central de sus valores; los puntos pequeños conservan el detalle diario.'} La banda representa tu rango personal habitual.</div>
      {(contextRows.length>0||events.length>0)&&<div className="evContextHeading"><h3>Qué ocurría alrededor</h3><span>Mismas fechas · escalas independientes</span></div>}
      {events.length>0&&<div className="evTrack"><div><strong>Entrenamiento</strong><small>Duración registrada · máx. {duration(trainingMax===1&&!events.length?0:trainingMax)}</small></div><svg className="evSvg" viewBox={`0 0 ${W} 82`} role="img" aria-label="Duración diaria de entrenamiento" onPointerMove={choose} onClick={choose}><line x1={L} x2={W-R} y1="64" y2="64" stroke="#e7ebe6"/>{events.map(e=><rect key={e.date} x={x(e.date)-Math.max(1,(W-L-R)/days*.3)} y={64-e.durationMinutes/trainingMax*52} width={Math.max(2,(W-L-R)/days*.6)} height={Math.max(2,e.durationMinutes/trainingMax*52)} fill="#ad936e"><title>{dateLabel(e.date)}: {e.count} sesiones · {duration(e.durationMinutes)}</title></rect>)}<line x1={x(selected)} x2={x(selected)} y1="5" y2="70" stroke="#ad8750" strokeDasharray="4 4"/></svg></div>}
      {contextRows.map(r=>{const rows=(history?.points??[]).filter(p=>p.metricKey===r.key&&p.physiologicalDate>=start&&p.physiologicalDate<=end);const vv=rows.map(p=>r.convert(p.value)),min=vv.length?Math.min(...vv):0,max=vv.length?Math.max(...vv):1;return <div className="evTrack" key={r.key}><div><strong>{r.label}</strong><small>{rows.length}/{days} días{rows.length?` · ${min.toFixed(1)}–${max.toFixed(1)} ${r.unit}`:' · sin registros'}</small></div>{rows.length?<svg className="evSvg" viewBox={`0 0 ${W} 62`} role="img" aria-label={`${r.label}, observaciones diarias`} onPointerMove={choose} onClick={choose}>{rows.map(p=><circle key={p.physiologicalDate} cx={x(p.physiologicalDate)} cy={46-(r.convert(p.value)-min)/Math.max(1,max-min)*32} r="2.3" fill="#8a9ea2"/>)}<line x1={x(selected)} x2={x(selected)} y1="4" y2="56" stroke="#ad8750" strokeDasharray="4 4"/></svg>:<div className="evMissing">No hay datos para este contexto en la ventana.</div>}</div>;})}
      <div className="evDateControl"><label>Detalle de un día <input type="date" min={start} max={end} value={selected} onChange={e=>{if(e.target.value>=start&&e.target.value<=end)setSelected(e.target.value);}}/></label><input type="range" aria-label="Día explorado" min="0" max={days-1} value={dayOffset(selected,start)} onChange={e=>setSelected(minusDays(start,-Number(e.target.value)))}/></div>
      <div className="evSelected" aria-live="polite"><div><small>{dateLabel(selected)} · {selected.slice(0,4)}</small><strong>{valueLabel(metric,point?.value??null)}</strong><span>{point?metric.label:'Sin medición de esta señal'}</span>{baseline?.median!=null&&point&&<span>Referencia: {valueLabel(metric,baseline.median)} · diferencia: {valueLabel(metric,point.value-baseline.median)}</span>}</div>{events.length>0&&<div><small>Entrenamiento registrado</small><strong>{day?.exerciseCount?duration(day.exerciseMinutes):'Sin registro'}</strong><span>{day?.exerciseCount?`${day.exerciseCount} sesiones · ${Math.round(day.exerciseElevationM)} m D+`:'No acredita un día de descanso'}</span>{Boolean(day?.exerciseCount)&&onOpenActivities&&<button onClick={()=>onOpenActivities(selected)}>Ver actividades de este día →</button>}</div>}{Boolean(day?.metrics.sleep_duration||day?.metrics.hrv_rmssd||day?.metrics.ultrahuman_sleep_hrv)&&<div><small>Sueño / HRV del día</small><strong>{day?.metrics.sleep_duration?duration(day.metrics.sleep_duration.value):'—'} / {day?.metrics.hrv_rmssd?`${Math.round(day.metrics.hrv_rmssd.value)} ms (RMSSD)`:day?.metrics.ultrahuman_sleep_hrv?`${Math.round(day.metrics.ultrahuman_sleep_hrv.value)} ms (Ultrahuman)`:'—'}</strong><span>Registros diarios; no son medidas inmediatamente antes o después.</span></div>}</div>
      {!detail&&selectedWeek&&<p className="evChartNote">Semana {dateLabel(selectedWeek.from)}–{dateLabel(selectedWeek.to)}: {selectedWeek.rows.length} días observados · mediana {valueLabel(metric,selectedWeek.value)}.</p>}
    </section>
    <details className="evMethod"><summary>Periodos, variabilidad y cómo se calcula</summary><p>Comparación anclada al {dateLabel(end)} de {end.slice(0,4)}, incluso si el último registro es anterior. Se requieren {comparison.minimum} días en cada periodo y una fuente identificada sin cambios. Es una regla de cobertura del producto, no un umbral clínico.</p><div className="evTableScroll"><table><thead><tr><th>Periodo</th><th>Días</th><th>Mediana</th><th>50 % central de valores</th></tr></thead><tbody>{[previous,recent].map(p=><tr key={p.start}><td>{dateLabel(p.start)} – {dateLabel(p.end)}</td><td>{p.count}/28</td><td>{valueLabel(metric,p.median)}</td><td>{valueLabel(metric,p.q25)} – {valueLabel(metric,p.q75)}</td></tr>)}</tbody></table></div><p>El rango central describe dispersión, no incertidumbre ni límites saludables. No se interpolan huecos. El contexto muestra coincidencias temporales, no relaciones causales. La duración de entrenamiento procede de los intervalos registrados.</p></details>
  </div>;
}



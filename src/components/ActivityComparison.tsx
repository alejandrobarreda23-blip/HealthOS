import { useMemo, useState } from 'react';
import type { TrainingSession } from '../repositories/activities';
import { comparableActivities } from '../health/activity-context';
import { activityComparison, durationLabel, nonnegative, numberLabel, sessionSeconds, sportLabel } from '../health/activities';
import './activity-context.css';

export default function ActivityComparison({ session, sessions }: { session: TrainingSession; sessions: TrainingSession[] }) {
  const [nearby,setNearby]=useState(false);
  const [selectedId,setSelectedId]=useState('');
  const peers=useMemo(()=>comparableActivities(session,sessions,nearby),[session,sessions,nearby]);
  const plotted=peers.filter(s=>nonnegative(s.distance_m)!==null && nonnegative(s.elevation_gain_m)!==null);
  const selected=peers.find(s=>s.id===selectedId);
  const currentValid=nonnegative(session.distance_m)!==null && nonnegative(session.elevation_gain_m)!==null;
  const maxDistance=Math.max(1000,...plotted.map(s=>s.distance_m!),currentValid?session.distance_m!:0)*1.1;
  const maxElevation=Math.max(100,...plotted.map(s=>s.elevation_gain_m!),currentValid?session.elevation_gain_m!:0)*1.1;
  const maxDuration=Math.max(1,...[session,...plotted].map(s=>sessionSeconds(s)??0));
  const x=(s:TrainingSession)=>65+s.distance_m!/maxDistance*590;
  const y=(s:TrainingSession)=>250-s.elevation_gain_m!/maxElevation*215;
  const radius=(s:TrainingSession)=>sessionSeconds(s)===null?4:4+Math.sqrt(sessionSeconds(s)!/maxDuration)*9;
  const comparison=activityComparison(session,peers);
  return <section className="contextComparison"><h3>Esta sesión dentro de tu historial</h3><p>{sportLabel(session.activity_type)} · 90 días anteriores · misma fuente y dispositivo. Cada punto representa una sesión; su tamaño indica duración registrada. Los puntos con duración desconocida usan el tamaño mínimo.</p>
    <label className="contextNearby"><input type="checkbox" checked={nearby} onChange={e=>{setNearby(e.target.checked);setSelectedId('');}}/> Solo distancia y desnivel cercanos</label>
    {nearby && <p className="activityNote">Filtro descriptivo: ±30 % de distancia y desnivel, con márgenes mínimos de 1 km y 100 m. No garantiza rutas ni condiciones equivalentes.</p>}
    <svg viewBox="0 0 720 305" role="img" aria-label="Comparación de distancia y desnivel de sesiones anteriores. Los mismos entrenamientos pueden seleccionarse en la lista inferior.">
      {[0,.25,.5,.75,1].map(t=><g key={t}><line x1="65" x2="655" y1={250-t*215} y2={250-t*215} stroke="#e1e5dd"/><text x="58" y={254-t*215} textAnchor="end">{Math.round(t*maxElevation)}</text><text x={65+t*590} y="272" textAnchor="middle">{(t*maxDistance/1000).toFixed(1)}</text></g>)}
      <text x="65" y="16">Desnivel positivo · m</text><text x="655" y="298" textAnchor="end">Distancia · km</text>
      {plotted.map(s=><circle key={s.id} cx={x(s)} cy={y(s)} r={radius(s)} fill={s.id===selectedId?'#ba783f':'#6e978a'} opacity=".7" stroke="white" strokeWidth="1.5" onClick={()=>setSelectedId(s.id)} style={{cursor:'pointer'}}><title>{s.physiological_date} · {numberLabel(s.distance_m,'km',1000)} · {numberLabel(s.elevation_gain_m,'m D+')} · {durationLabel(sessionSeconds(s))}</title></circle>)}
      {currentValid && <g><circle cx={x(session)} cy={y(session)} r={radius(session)+3} fill="none" stroke="#244a38" strokeWidth="2"/><circle cx={x(session)} cy={y(session)} r="4" fill="#244a38"/><title>Sesión seleccionada</title></g>}
    </svg>
    <p className="activityNote">Anillo oscuro: sesión actual · puntos verdes: anteriores · naranja: sesión comparada. {plotted.length}/{peers.length} sesiones anteriores tienen distancia y desnivel.{!currentValid?' La sesión actual no puede situarse porque falta distancia o desnivel.':''}</p>
    <label className="contextPeerSelect">Seleccionar sesión anterior<select value={selected?.id??''} onChange={e=>setSelectedId(e.target.value)}><option value="">Elige un punto o una fecha</option>{peers.map(s=><option value={s.id} key={s.id}>{s.physiological_date} · {numberLabel(s.distance_m,'km',1000)} · {durationLabel(sessionSeconds(s))}</option>)}</select></label>
    {selected && <div className="contextOverview"><div><span>{selected.physiological_date}</span><strong>{durationLabel(sessionSeconds(selected))}</strong><small>Duración registrada</small></div><div><span>Distancia</span><strong>{numberLabel(selected.distance_m,'km',1000)}</strong></div><div><span>Desnivel positivo</span><strong>{numberLabel(selected.elevation_gain_m,'m')}</strong></div></div>}
    {!peers.length && <p>No hay sesiones anteriores que cumplan esta selección.</p>}
    <details><summary>Ver medianas de esta selección · {comparison.count} sesiones</summary><div className="activityTableWrap"><table><thead><tr><th>Métrica</th><th>Esta sesión</th><th>Mediana anterior</th></tr></thead><tbody>{comparison.rows.map(row=><tr key={row.label}><th>{row.label}</th><td>{numberLabel(row.current,row.unit,row.divisor)}</td><td>{row.median===null?`Insuficiente (${row.count}/3)`:numberLabel(row.median,row.unit,row.divisor)}</td></tr>)}</tbody></table></div></details>
    <p>Esta comparación describe volumen. Las rutas, el terreno y la intensidad pueden variar; no clasifica las sesiones como mejores o peores.</p>
  </section>;
}

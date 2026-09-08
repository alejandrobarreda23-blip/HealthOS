import type { CSSProperties } from 'react';
import type { TrainingSession } from '../repositories/activities';
import { activityColor, type ActivityColorMode } from '../health/activity-presentation';
import { durationLabel, nonnegative, numberLabel, sessionSeconds, sportLabel } from '../health/activities';
import { minusDays } from '../health/metrics/daily-series';
import { trainingTotals } from '../health/activity-context';
import SportIcon from './SportIcon';

export default function ActivityOverview({ sessions, colorMode, activeDay, onDay, onSport }: { sessions: TrainingSession[]; colorMode: ActivityColorMode; activeDay: string; onDay: (date: string) => void; onSport: (sport: string) => void }) {
  const end=[...sessions].sort((a,b)=>b.physiological_date.localeCompare(a.physiological_date))[0]?.physiological_date;
  if(!end)return null;
  const start=minusDays(end,27);
  const recent=sessions.filter(s=>s.physiological_date>=start && s.physiological_date<=end);
  const total=trainingTotals(recent);
  const distances=recent.map(s=>nonnegative(s.distance_m)).filter((v):v is number=>v!==null);
  const distance=distances.length?distances.reduce((a,b)=>a+b,0):null;
  const sports=[...new Set(recent.map(s=>s.activity_type))].map(sport=>({sport,rows:recent.filter(s=>s.activity_type===sport)})).sort((a,b)=>b.rows.length-a.rows.length);
  const dates=Array.from({length:28},(_,i)=>minusDays(end,27-i));
  const maxSeconds=Math.max(1,...recent.map(s=>sessionSeconds(s)??0));
  const withColor=recent.filter(s=>activityColor(s,colorMode).value!==null).length;
  return <section className="activityOverview" aria-label="Panorama de entrenamiento">
    <div className="activityOverviewHead"><div><span className="eyebrow">TU ENTRENAMIENTO RECIENTE</span><h2>28 días de un vistazo</h2><p>{start} — {end} · termina en el último registro de esta selección</p></div><span className="activityOverviewCount">{recent.length}<small>sesiones registradas</small></span></div>
    <div className="activityOverviewMetrics"><div><small>Tiempo registrado</small><strong>{durationLabel(total.seconds)}</strong><span>{total.durationCount}/{total.count} con duración</span></div><div><small>Distancia</small><strong>{numberLabel(distance,'km',1000)}</strong><span>{distances.length}/{total.count} con distancia</span></div><div><small>Desnivel positivo</small><strong>{numberLabel(total.elevation,'m')}</strong><span>{total.elevationCount}/{total.count} con desnivel</span></div><div><small>Días con entrenamiento</small><strong>{total.days}<em>/28</em></strong><span>Según sesiones importadas</span></div></div>
    <div className="activityOverviewBottom"><div className="activityCalendarPanel"><div className="activityCalendarHead"><strong>Explora un día</strong><small>Altura: duración · color: {colorMode==='intensity'?'intensidad de origen':'esfuerzo percibido'}</small></div><div className="activityCalendar">{dates.map(date=>{
      const rows=recent.filter(s=>s.physiological_date===date);
      return <button key={date} className={activeDay===date?'selected':''} aria-pressed={activeDay===date} aria-label={`${date}: ${rows.length} sesiones registradas`} onClick={()=>onDay(activeDay===date?'':date)} title={`${date} · ${rows.length} sesiones · ${durationLabel(trainingTotals(rows).seconds)}`}><span>{date.slice(8)}</span><div className="activityCalendarBars">{rows.slice(0,5).map(s=><i key={s.id} style={{height:`${Math.max(5,(sessionSeconds(s)??0)/maxSeconds*42)}px`,background:activityColor(s,colorMode).color}}/>)}{rows.length>5 && <b>+{rows.length-5}</b>}{!rows.length && <i className="activityCalendarEmpty"/>}</div></button>;
    })}</div><small className="activityCalendarNote">{withColor}/{recent.length} sesiones con {colorMode==='intensity'?'intensidad':'RPE'}. Gris: dato ausente. Un día vacío no acredita descanso.</small></div>
    <div className="activitySportsMix"><strong>Deportes del periodo</strong>{sports.map(({sport,rows})=><button key={sport} onClick={()=>onSport(sport)}><SportIcon sport={sport} size={19}/><span>{sportLabel(sport)}<i style={{'--sport-width':`${rows.length/recent.length*100}%`} as CSSProperties}/></span><b>{rows.length}</b></button>)}</div></div>
  </section>;
}

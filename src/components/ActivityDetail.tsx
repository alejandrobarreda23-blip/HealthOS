import { useEffect, useState } from 'react';
import { getActivitySource, type TrainingSession } from '../repositories/activities';
import { nonnegative, numberLabel, durationLabel, sportLabel } from '../health/activities';
import { activitySummary, type ActivityColorMode } from '../health/activity-presentation';
import ActivityContext from './ActivityContext';
import ActivityComparison from './ActivityComparison';
import ActivitySessionHero from './ActivitySessionHero';
export function ActivityDetail({ session: s, sessions, userId, onOpenBody, colorMode = 'intensity' }: { colorMode?: ActivityColorMode; session: TrainingSession; sessions: TrainingSession[]; userId: string; onOpenBody: (date: string) => void }) {
  const [source, setSource] = useState<Record<string, unknown> | null>(null);
  const [sourceState, setSourceState] = useState('Cargando detalle de origen…');
  const [tab, setTab] = useState('context');
  useEffect(() => {
    let active = true;
    getActivitySource(userId, s).then(data => { if (active) { setSource(data); setSourceState(data ? '' : 'No hay detalle adicional de origen vinculado.'); } })
      .catch(() => { if (active) setSourceState('No se pudo consultar el detalle adicional. El resumen de la sesión sigue disponible.'); });
    return () => { active = false; };
  }, [userId, s]);
  const moving = nonnegative(source?.moving_time);
  const elapsed = nonnegative(source?.elapsed_time);
  const distance = nonnegative(s.distance_m);
  const speed = moving !== null && moving > 0 && distance !== null ? distance / moving * 3.6 : null;
  const displaySession = {...s, summary:s.summary ?? activitySummary({id:s.source_record_id ?? '',provider:s.provider,external_id:s.external_session_id,name:source?.name,intensity:source?.icu_intensity,rpe:source?.icu_rpe,route_id:source?.route_id})};
  const name = typeof source?.name === 'string' && source.name.trim() ? source.name : s.summary?.name ?? sportLabel(s.activity_type);
  return <article className="card activityDetail">
    <ActivitySessionHero session={displaySession} name={name} colorMode={colorMode}/>
    <div className="activityTabs" aria-label="Detalle del entrenamiento">{[['summary','Sesión'],['compare','Comparar'],['context','Contexto']].map(([key,label]) => <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab === 'summary' && <>
      <div className="activityMetricGrid">{[
        ['Intensidad según Intervals',numberLabel(displaySession.summary.intensity,'%')], ['Esfuerzo percibido (RPE)',numberLabel(displaySession.summary.rpe,'/10')], ['FC media', numberLabel(s.avg_heart_rate_bpm,'bpm')],
        ['FC máxima', numberLabel(s.max_heart_rate_bpm,'bpm')], ['Energía según fuente', numberLabel(s.active_energy_kcal,'kcal')],
        ...(moving !== null ? [['En movimiento',durationLabel(moving)]] : []),
        ...(elapsed !== null ? [['Tiempo transcurrido',durationLabel(elapsed)]] : []),
        ...(speed !== null ? [['Velocidad en movimiento',numberLabel(speed,'km/h')]] : []),
        ...(nonnegative(source?.icu_average_watts) !== null ? [['Potencia media según fuente',numberLabel(source?.icu_average_watts,'W')]] : []),
      ].map(([label,value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
      <p className="activityNote">La duración registrada procede del intervalo guardado por la importación; puede corresponder a tiempo transcurrido, de grabación o en movimiento. La velocidad, cuando aparece, usa distancia ÷ tiempo en movimiento.</p>
      <section className="activityRouteNotice"><strong>{displaySession.summary.hasRouteReference ? 'Ruta identificada en origen' : 'Recorrido GPS no importado'}</strong><p>{displaySession.summary.hasRouteReference ? 'El registro contiene una referencia de ruta, pero no sus coordenadas. Todavía no podemos dibujar el recorrido.' : 'Esta sesión no tiene un trazado GPS guardado en HealthOS.'}</p></section><h3>Qué permite analizar esta sesión</h3><p>Volumen registrado, desnivel y resumen cardiaco. No hay curvas, vueltas ni ruta GPS disponibles en esta vista. La media y el máximo de FC no permiten reconstruir zonas, intervalos o recuperación.</p>
      {sourceState && <p role="status">{sourceState}</p>}
      <details><summary>Procedencia y trazabilidad</summary><p>Fuente: {s.provider} · dispositivo: {s.source_device ?? 'sin identificar'}.</p><p>Inicio guardado: {s.started_at}<br/>Fin guardado: {s.ended_at}</p><p>Sesión: {s.id}<br/>Registro de origen: {s.source_record_id ?? 'no vinculado'}</p><p>Potencia y energía son valores de la fuente; esta vista no verifica si fueron medidos o estimados.</p></details>
    </>}
    {tab === 'compare' && <ActivityComparison session={s} sessions={sessions}/>}
    {tab === 'context' && <ActivityContext session={displaySession} sessions={sessions} onOpenBody={onOpenBody}/>}
  </article>;
}

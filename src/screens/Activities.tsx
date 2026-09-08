import { useEffect, useMemo, useState } from 'react';
import { useSubject } from '../subjects/SubjectProvider';
import { getActivities, getActivitySource, type TrainingSession } from '../repositories/activities';
import { activityComparison, durationLabel, nonnegative, numberLabel, sessionSeconds, sportLabel } from '../health/activities';
import { useBodyHistory } from '../hooks/useBodyHistory';
import { localToday, minusDays } from '../health/metrics/daily-series';
import { formatBodyValue } from '../body/view-state';
import './activities.css';

export default function Activities({ initialDate = '', onOpenBody }: { initialDate?: string; onOpenBody: (date: string) => void }) {
  const { scope } = useSubject();
  // Remount all local state when the active subject changes.
  return <ActivityWorkspace key={scope?.dataUserId ?? ''} userId={scope?.dataUserId} initialDate={initialDate} onOpenBody={onOpenBody}/>;
}
function ActivityWorkspace({ userId, initialDate, onOpenBody }: { userId?: string; initialDate: string; onOpenBody: (date: string) => void }) {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [sport, setSport] = useState('');
  const [from, setFrom] = useState(initialDate);
  const [to, setTo] = useState(initialDate);
  const [selectedId, setSelectedId] = useState('');
  const [limit, setLimit] = useState(30);
  useEffect(() => {
    let active = true;
    setLoading(Boolean(userId)); setError('');
    if (userId) getActivities(userId).then(rows => { if (active) { setSessions(rows); setLoading(false); } })
      .catch(e => { if (active) { setError(e.message ?? 'No se pudieron cargar las actividades.'); setLoading(false); } });
    return () => { active = false; };
  }, [userId, revision]);
  const sports = useMemo(() => [...new Set(sessions.map(s => s.activity_type))].sort((a,b) => sportLabel(a).localeCompare(sportLabel(b))), [sessions]);
  const filtered = sessions.filter(s => (!sport || s.activity_type === sport) && (!from || s.physiological_date >= from) && (!to || s.physiological_date <= to));
  const selected = filtered.find(s => s.id === selectedId);
  useEffect(() => { setLimit(30); }, [sport, from, to]);
  return <div className="activitiesScreen">
    <header><div className="eyebrow">HEALTHOS · ENTRENAMIENTO</div><h1>Actividades</h1><p>Cada sesión, sus datos y su contexto. Explora bicicleta, trail y todos tus deportes.</p></header>
    <div className="activityFilters">
      <label>Deporte<select value={sport} onChange={e => setSport(e.target.value)}><option value="">Todos los deportes</option>{sports.map(s => <option key={s} value={s}>{sportLabel(s)}</option>)}</select></label>
      <label>Desde<input type="date" value={from} onChange={e => setFrom(e.target.value)}/></label>
      <label>Hasta<input type="date" value={to} onChange={e => setTo(e.target.value)}/></label>
      <button onClick={() => { setSport(''); setFrom(''); setTo(''); }}>Ver todo</button>
      <button onClick={() => setRevision(r => r+1)}>Actualizar</button>
    </div>
    {from && to && from > to && <p role="alert">La fecha inicial debe ser anterior a la final.</p>}
    {loading && <p role="status">Cargando entrenamientos…</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !error && !filtered.length && <div className="card"><h2>Sin actividades en esta selección</h2><p>Prueba otro deporte o amplía las fechas. Aquí aparecerán las sesiones importadas del perfil activo.</p></div>}
    {!loading && !error && filtered.length > 0 && <div className="activityWorkspace">
      <section aria-label="Lista de entrenamientos"><p>{filtered.length} sesiones · más recientes primero</p><div className="activityList">{filtered.slice(0,limit).map(s => <button key={s.id} aria-pressed={selected?.id === s.id} onClick={() => setSelectedId(s.id)}>
        <span>{s.physiological_date}</span><strong>{sportLabel(s.activity_type)}</strong><span>{durationLabel(sessionSeconds(s))} · {numberLabel(s.distance_m,'km',1000)}</span><small>{numberLabel(s.elevation_gain_m,'m D+')} · {s.provider}</small>
      </button>)}</div>{filtered.length > limit && <button className="secondary" onClick={() => setLimit(n => n+30)}>Mostrar 30 más</button>}</section>
      {selected && userId ? <ActivityDetail key={selected.id} session={selected} sessions={sessions} userId={userId} onOpenBody={onOpenBody}/> : <section className="card activityEmpty"><h2>Abre un entrenamiento</h2><p>Verás sus métricas, la comparación con tus sesiones anteriores y los datos del cuerpo alrededor de esa fecha.</p></section>}
    </div>}
  </div>;
}
export function ActivityDetail({ session: s, sessions, userId, onOpenBody }: { session: TrainingSession; sessions: TrainingSession[]; userId: string; onOpenBody: (date: string) => void }) {
  const [source, setSource] = useState<Record<string, unknown> | null>(null);
  const [sourceState, setSourceState] = useState('Cargando detalle de origen…');
  const [tab, setTab] = useState('summary');
  useEffect(() => {
    let active = true;
    getActivitySource(userId, s).then(data => { if (active) { setSource(data); setSourceState(data ? '' : 'No hay detalle adicional de origen vinculado.'); } })
      .catch(() => { if (active) setSourceState('No se pudo consultar el detalle adicional. El resumen de la sesión sigue disponible.'); });
    return () => { active = false; };
  }, [userId, s]);
  const comparison = activityComparison(s, sessions);
  const moving = nonnegative(source?.moving_time);
  const elapsed = nonnegative(source?.elapsed_time);
  const distance = nonnegative(s.distance_m);
  const speed = moving !== null && moving > 0 && distance !== null ? distance / moving * 3.6 : null;
  const name = typeof source?.name === 'string' && source.name.trim() ? source.name : sportLabel(s.activity_type);
  return <article className="card activityDetail">
    <div className="eyebrow">{sportLabel(s.activity_type)} · {s.physiological_date}</div><h2>{name}</h2>
    <div className="activityTabs" aria-label="Detalle del entrenamiento">{[['summary','Sesión'],['compare','Comparar'],['context','Contexto']].map(([key,label]) => <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab === 'summary' && <>
      <div className="activityMetricGrid">{[
        ['Duración registrada', durationLabel(sessionSeconds(s))], ['Distancia', numberLabel(s.distance_m,'km',1000)],
        ['Desnivel positivo', numberLabel(s.elevation_gain_m,'m')], ['FC media', numberLabel(s.avg_heart_rate_bpm,'bpm')],
        ['FC máxima', numberLabel(s.max_heart_rate_bpm,'bpm')], ['Energía según fuente', numberLabel(s.active_energy_kcal,'kcal')],
        ...(moving !== null ? [['En movimiento',durationLabel(moving)]] : []),
        ...(elapsed !== null ? [['Tiempo transcurrido',durationLabel(elapsed)]] : []),
        ...(speed !== null ? [['Velocidad en movimiento',numberLabel(speed,'km/h')]] : []),
        ...(nonnegative(source?.icu_average_watts) !== null ? [['Potencia media según fuente',numberLabel(source?.icu_average_watts,'W')]] : []),
      ].map(([label,value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
      <p className="activityNote">La duración registrada procede del intervalo guardado por la importación; puede corresponder a tiempo transcurrido, de grabación o en movimiento. La velocidad, cuando aparece, usa distancia ÷ tiempo en movimiento.</p>
      <h3>Qué permite analizar esta sesión</h3><p>Volumen registrado, desnivel y resumen cardiaco. No hay curvas, vueltas ni ruta GPS disponibles en esta vista. La media y el máximo de FC no permiten reconstruir zonas, intervalos o recuperación.</p>
      {sourceState && <p role="status">{sourceState}</p>}
      <details><summary>Procedencia y trazabilidad</summary><p>Fuente: {s.provider} · dispositivo: {s.source_device ?? 'sin identificar'}.</p><p>Inicio guardado: {s.started_at}<br/>Fin guardado: {s.ended_at}</p><p>Sesión: {s.id}<br/>Registro de origen: {s.source_record_id ?? 'no vinculado'}</p><p>Potencia y energía son valores de la fuente; esta vista no verifica si fueron medidos o estimados.</p></details>
    </>}
    {tab === 'compare' && <><h3>Tus sesiones anteriores del mismo deporte</h3><p>{comparison.count} sesiones entre {comparison.start} y el día anterior, de la misma fuente y dispositivo. No se mezclan carretera, MTB e indoor.</p><div className="activityTableWrap"><table><thead><tr><th>Métrica</th><th>Esta sesión</th><th>Mediana anterior</th></tr></thead><tbody>{comparison.rows.map(row => <tr key={row.label}><th>{row.label}</th><td>{numberLabel(row.current,row.unit,row.divisor)}</td><td>{row.median === null ? `Insuficiente (${row.count}/3)` : numberLabel(row.median,row.unit,row.divisor)}<small>{row.median !== null ? `${row.count} sesiones con dato` : ''}</small></td></tr>)}</tbody></table></div><p>Esta comparación describe volumen, no rendimiento: las rutas, el terreno, la intensidad y las condiciones pueden ser distintos. No califica el entrenamiento como mejor o peor.</p></>}
    {tab === 'context' && <ActivityContext session={s} onOpenBody={onOpenBody}/>}
  </article>;
}
function ActivityContext({ session, onOpenBody }: { session: TrainingSession; onOpenBody: (date: string) => void }) {
  const today = localToday();
  const after = minusDays(session.physiological_date,-1);
  const history = useBodyHistory(after > today ? today : after, 3);
  const dates = [minusDays(session.physiological_date,1),session.physiological_date,after];
  const metrics = [['resting_heart_rate','FC reposo'],['hrv_rmssd','HRV'],['sleep_duration','Sueño']];
  return <><h3>Antes, día de la sesión y después</h3><p>Observaciones diarias en sus fechas originales. No son medidas inmediatamente antes o después del entrenamiento y no demuestran que este causara un cambio.</p>
    {history.loading && <p role="status">Cargando contexto…</p>}{history.error && <p role="alert">{history.error}</p>}
    {!history.loading && !history.error && <div className="activityTableWrap"><table><thead><tr><th>Señal</th>{dates.map(date => <th key={date}>{date}<br/><button disabled={date > today || date < minusDays(today,364)} onClick={() => onOpenBody(date)}>{date < minusDays(today,364) ? 'Fuera del mapa anual' : 'Ver cuerpo'}</button></th>)}</tr></thead><tbody>{metrics.map(([key,label]) => <tr key={key}><th>{label}</th>{dates.map(date => { const point = history.data?.days.find(d => d.date === date)?.metrics[key]; return <td key={date}>{date > today ? 'Pendiente' : point ? formatBodyValue(point.value,point.unit ?? '') : 'Sin dato'}{point && <small>{point.provider ?? 'Fuente desconocida'}</small>}</td>; })}</tr>)}</tbody></table></div>}
  </>;
}

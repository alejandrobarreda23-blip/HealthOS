import { useState } from 'react';
import NightExplorer from '../components/NightExplorer';
import JointReading from '../components/JointReading';
import { useEpisodeReading } from '../hooks/useEpisodeReading';
import { episodeNavigation } from '../health/episode-navigation';
import CheckIn from '../components/CheckIn';
import EventSheet from '../components/EventSheet';
import MonitoringInsights from '../components/MonitoringInsights';
import { useHealthBriefV1 } from '../hooks/useHealthBrief';
import { useBodyHistory } from '../hooks/useBodyHistory';
import { localToday } from '../health/metrics/daily-series';
import { useSubject } from '../subjects/SubjectProvider';

export default function Today({onOpenTrend,onOpenWeekly}:{onOpenTrend?:(key:string)=>void;onOpenWeekly?:()=>void}) {
  const { data, error, refresh } = useHealthBriefV1();
  const history = useBodyHistory(localToday(), 365);
  const { scope } = useSubject();
  const reading = useEpisodeReading(history.data?.points ?? [], localToday());
  const [eventOpen, setEventOpen] = useState(false);
  return <>
    <header><div className="eyebrow">HEALTH OS</div><h1>Hoy, con perspectiva</h1><p className="muted">{localToday()} · Qué sabemos de tus últimos días y qué merece explorar.</p></header>
    {(history.loading || reading.loading) && <p role="status">Preparando tu lectura personal…</p>}
    {(history.error || error) && <div className="syncError">{history.error || error}<button onClick={()=>{history.refresh();refresh();}}>Reintentar</button></div>}
    {!history.loading && !history.error && !reading.loading && <NightExplorer key={scope?.dataUserId} input={reading.input} onOpenTrend={onOpenTrend}/>}
    {!history.loading && !history.error && !reading.loading && <><JointReading report={reading.report} onOpen={onOpenTrend && scope?.dataUserId ? episode => { const nav = episodeNavigation(scope.dataUserId!, episode); sessionStorage.setItem('healthos.trends.episode', JSON.stringify(nav)); onOpenTrend(nav.metric); } : undefined}/>{reading.loading && <p className="episodeLoad">Añadiendo horarios y contexto a la lectura…</p>}{reading.error && <p role="alert">La lectura de señales está disponible, pero falta el contexto: {reading.error} <button onClick={reading.refresh}>Reintentar</button></p>}</>}
    {onOpenWeekly && <section className="card weeklySummaryLink"><div><h2>Qué distingue tus días</h2><p>Conecta tus noches, recuperación y contexto en una revisión semanal que conserva lo aprendido.</p></div><button className="secondary" onClick={onOpenWeekly}>Abrir mi revisión semanal →</button></section>}
    {!!data?.activeFindings.length && <section><h2>Otras lecturas del seguimiento</h2><p className="muted">Estas lecturas guardadas usan sus propias ventanas y criterios; pueden destacar diferencias que no superan el filtro de la lectura conjunta.</p>{data.activeFindings.map(finding => <article className="card" key={`${finding.findingKey}-${finding.periodEnd}`}><h3>{finding.title}</h3><p>{finding.summary}</p><small>Lectura guardada: {data.date}. Comparación personal descriptiva.</small></article>)}</section>}
    {!history.loading && !history.error && <details className="todaySignals"><summary>Consultar todas las señales y sus registros</summary><MonitoringInsights points={history.data?.points ?? []} asOf={localToday()} onOpenTrend={onOpenTrend}/></details>}
    {Boolean(data?.training.sessions7d) && <section className="card"><h3>Tu actividad registrada esta semana</h3><p>{data!.training.sessions7d} sesiones · {Math.round(data!.training.durationMinutes7d)} min · {data!.training.distanceKm7d.toFixed(1)} km</p></section>}
    {scope?.isSelf ? <><CheckIn onSaved={reading.refresh}/><button className="event" onClick={()=>setEventOpen(true)}>＋ Registrar un evento para dar contexto</button>{eventOpen && <EventSheet onClose={()=>setEventOpen(false)} onSaved={reading.refresh}/>}</> : <p className="muted">Perfil en modo lectura.</p>}
  </>;
}

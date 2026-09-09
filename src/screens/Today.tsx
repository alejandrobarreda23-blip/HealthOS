import { useState } from 'react';
import CheckIn from '../components/CheckIn';
import EventSheet from '../components/EventSheet';
import MonitoringInsights from '../components/MonitoringInsights';
import { useHealthBriefV1 } from '../hooks/useHealthBrief';
import { useBodyHistory } from '../hooks/useBodyHistory';
import { localToday } from '../health/metrics/daily-series';
import { useSubject } from '../subjects/SubjectProvider';

export default function Today({onOpenTrend,onOpenWeekly}:{onOpenTrend?:(key:string)=>void;onOpenWeekly?:()=>void}) {
  const { data, error, refresh } = useHealthBriefV1();
  const history = useBodyHistory(localToday(), 90);
  const { scope } = useSubject();
  const [eventOpen, setEventOpen] = useState(false);
  return <>
    <header><div className="eyebrow">HEALTH OS</div><h1>Hoy, con perspectiva</h1><p className="muted">{localToday()} · Qué sabemos de tus últimos días y qué merece explorar.</p></header>
    {onOpenWeekly && <section className="card weeklySummaryLink"><div><h2>Qué distingue tus días</h2><p>Conecta tus noches, recuperación y contexto en una revisión semanal que conserva lo aprendido.</p></div><button className="secondary" onClick={onOpenWeekly}>Abrir mi revisión semanal →</button></section>}
    {history.loading && <p role="status">Preparando tu lectura personal…</p>}
    {(history.error || error) && <div className="syncError">{history.error || error}<button onClick={()=>{history.refresh();refresh();}}>Reintentar</button></div>}
    {!!data?.activeFindings.length && <section><h2>Cambios que merecen atención</h2>{data.activeFindings.map(finding => <article className="card" key={`${finding.findingKey}-${finding.periodEnd}`}><h3>{finding.title}</h3><p>{finding.summary}</p><small>Lectura guardada: {data.date}. Comparación personal descriptiva.</small></article>)}</section>}
    {!history.loading && !history.error && <MonitoringInsights points={history.data?.points ?? []} asOf={localToday()} onOpenTrend={onOpenTrend}/>}
    {Boolean(data?.training.sessions7d) && <section className="card"><h3>Tu actividad registrada esta semana</h3><p>{data!.training.sessions7d} sesiones · {Math.round(data!.training.durationMinutes7d)} min · {data!.training.distanceKm7d.toFixed(1)} km</p></section>}
    {scope?.isSelf ? <><CheckIn/><button className="event" onClick={()=>setEventOpen(true)}>＋ Registrar un evento para dar contexto</button>{eventOpen && <EventSheet onClose={()=>setEventOpen(false)}/>}</> : <p className="muted">Perfil en modo lectura.</p>}
  </>;
}

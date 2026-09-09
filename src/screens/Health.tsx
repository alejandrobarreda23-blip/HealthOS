import { useHealthBriefV1 } from '../hooks/useHealthBrief';
import { useBodyHistory } from '../hooks/useBodyHistory';
import { localToday } from '../health/metrics/daily-series';
import MonitoringInsights from '../components/MonitoringInsights';
export default function Health({onOpenTrend}:{onOpenTrend?:(key:string)=>void}) {
  const brief=useHealthBriefV1(), history=useBodyHistory(localToday(),90);
  return <><header><div className="eyebrow">SALUD PERSONAL</div><h1>Entender tus patrones</h1><p className="muted">Preguntas concretas, comparaciones personales y evidencia que puedes revisar.</p></header>
    {(brief.loading||history.loading)&&<p role="status">Revisando tu historia…</p>}
    {(brief.error||history.error)&&<p role="alert">{brief.error||history.error} <button onClick={()=>{brief.refresh();history.refresh();}}>Reintentar</button></p>}
    {!history.loading&&!history.error&&<MonitoringInsights mode="patterns" points={history.data?.points??[]} asOf={localToday()} onOpenTrend={onOpenTrend}/>}
    <section><h2>Cambios recientes detectados</h2>{brief.data?.activeFindings.length?brief.data.activeFindings.map(f=><article className="card" key={`${f.findingKey}-${f.periodEnd}`}><h3>{f.title}</h3><p>{f.summary}</p><small>Análisis del {brief.data!.date} · observación descriptiva</small></article>):!brief.loading&&!brief.error&&<p>No hay cambios señalados por el último análisis disponible. Esto no descarta problemas de salud; las preguntas anteriores exploran otras diferencias de tu historia.</p>}</section>
  </>;
}

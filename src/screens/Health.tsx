import { useHealthBriefV1 } from '../hooks/useHealthBrief';
import WeeklyReview from '../components/WeeklyReview';
export default function Health({onOpenTrend}:{onOpenTrend?:(key:string)=>void}) {
  const brief=useHealthBriefV1();
  return <><header><div className="eyebrow">SALUD PERSONAL</div><h1>Tu semana, conectada</h1><p className="muted">Qué cambió, qué vuelve a aparecer y qué seguimos intentando entender.</p></header>
    <WeeklyReview onOpenTrend={onOpenTrend}/>
    {brief.error&&<p role="alert">{brief.error}</p>}
    <details className="card"><summary>Cambios recientes del análisis diario</summary>{brief.data?.activeFindings.length?brief.data.activeFindings.map(f=><article key={`${f.findingKey}-${f.periodEnd}`}><h3>{f.title}</h3><p>{f.summary}</p><small>Análisis del {brief.data!.date} · observación descriptiva</small></article>):!brief.loading&&!brief.error&&<p>No hay cambios señalados por el último análisis diario disponible.</p>}</details>
  </>;
}

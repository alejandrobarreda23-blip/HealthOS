import { useMemo, useState } from 'react';
import { useSubject } from '../subjects/SubjectProvider';
import { selectTrend } from '../repositories/trends';
import { useBodyHistory } from '../hooks/useBodyHistory';
import { localToday, minusDays } from '../health/metrics/daily-series';
import EvolutionExplorer, { type EvolutionMetric } from '../components/EvolutionExplorer';
const METRICS: EvolutionMetric[] = [
  {key:'weight',label:'Peso',unit:'kg'},
  {key:'hrv_rmssd',label:'HRV',unit:'ms'},
  {key:'resting_heart_rate',label:'FC reposo',unit:'bpm'},
  {key:'sleep_duration',label:'Sueño',unit:'min',format:v=>`${(v/60).toFixed(1)} h`},
  {key:'steps',label:'Pasos',unit:'pasos'},
  {key:'oxygen_saturation',label:'SpO₂',unit:'%'},
];
export default function Trends({onOpenActivities}:{onOpenActivities?:(date:string)=>void}) {
  const { scope } = useSubject();
  const [metricKey, setMetricKey] = useState(() => {
    const requested = sessionStorage.getItem('healthos.trends.metric');
    sessionStorage.removeItem('healthos.trends.metric');
    return METRICS.some((metric) => metric.key === requested) ? requested! : 'hrv_rmssd';
  });
  const [initialNavigation] = useState(() => {
    const subject = sessionStorage.getItem('healthos.trends.subject');
    const date = sessionStorage.getItem('healthos.trends.date');
    const days = Number(sessionStorage.getItem('healthos.trends.window'));
    ['date', 'window', 'subject'].forEach(key => sessionStorage.removeItem(`healthos.trends.${key}`));
    return { subject, date, days };
  });
  const [requestedEnd, setRequestedEnd] = useState(initialNavigation.date);
  const endDate = initialNavigation.subject === scope?.dataUserId && requestedEnd && /^\d{4}-\d{2}-\d{2}$/.test(requestedEnd) && requestedEnd <= localToday() ? requestedEnd : localToday();
  const [windowDays, setWindowDays] = useState([30, 90, 365].includes(initialNavigation.days) ? initialNavigation.days : 365);

  const history = useBodyHistory(endDate, windowDays);
  const { loading, error } = history;
  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0];
  const { points, baselines, events } = useMemo(() => selectTrend(history.data, metricKey, minusDays(endDate, windowDays - 1), endDate), [history.data, metricKey, endDate, windowDays]);


  return <>
    <header className="pageHeader"><div className="eyebrow">EVOLUCIÓN</div><h1>Tu historia, con perspectiva</h1><p className="muted pageLead">Qué ha cambiado, desde cuándo y qué ocurría alrededor.</p></header>
    <div className="trendControls"><div className="trendMetricChips">{METRICS.map(m=><button key={m.key} aria-pressed={metricKey===m.key} className={metricKey===m.key?'selected':''} onClick={()=>setMetricKey(m.key)}>{m.label}</button>)}</div><div className="trendWindows">{[30,90,365].map(d=><button key={d} aria-pressed={windowDays===d} className={windowDays===d?'selected':''} onClick={()=>setWindowDays(d)}>{d===365?'1 año':`${d} d`}</button>)}</div></div>
    {endDate!==localToday()&&<p className="bodyAnalysisNote">Explorando hasta {endDate}. <button onClick={()=>setRequestedEnd(null)}>Volver a hoy</button></p>}
    {loading?<div className="chartSkeleton" aria-label="Cargando evolución"/>:error?<p role="alert" className="error">{error} <button onClick={history.refresh}>Reintentar</button></p>:<EvolutionExplorer key={`${scope?.dataUserId}|${metricKey}|${endDate}|${windowDays}`} metric={metric} points={points} baselines={baselines} events={events} history={history.data} end={endDate} days={windowDays} onOpenActivities={onOpenActivities}/>}
  </>;
}

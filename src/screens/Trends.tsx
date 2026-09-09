import { useEffect, useMemo, useState } from 'react';
import { useSubject } from '../subjects/SubjectProvider';
import { selectTrend } from '../repositories/trends';
import { useBodyHistory } from '../hooks/useBodyHistory';
import { localToday, minusDays } from '../health/metrics/daily-series';
import { MONITORING_METRICS, formatMonitoring } from '../health/monitoring-metrics';
import EpisodeExplorer from '../components/EpisodeExplorer';
import EventSheet from '../components/EventSheet';
import { useEpisodeReading } from '../hooks/useEpisodeReading';
import { parseEpisodeNavigation } from '../health/episode-navigation';
import type { Episode } from '../health/episodes';
import EvolutionExplorer from '../components/EvolutionExplorer';
import '../components/monitoring.css';
const span=(a:string,b:string)=>Math.max(1,Math.round((Date.parse(b)-Date.parse(a))/86400000)+1);
export default function Trends({onOpenActivities}:{onOpenActivities?:(date:string)=>void}) {
  const {scope}=useSubject();
  const [navigation]=useState(()=>{
    const episode = sessionStorage.getItem('healthos.trends.episode');
    const metric=sessionStorage.getItem('healthos.trends.metric'),date=sessionStorage.getItem('healthos.trends.date'),subject=sessionStorage.getItem('healthos.trends.subject'),days=Number(sessionStorage.getItem('healthos.trends.window'));
    return {metric,date,subject,days,episode};
  });
  useEffect(() => { ['metric','date','subject','window','episode'].forEach(k => sessionStorage.removeItem(`healthos.trends.${k}`)); }, []);
  const history=useBodyHistory(localToday(),365);
  const episodeNav = parseEpisodeNavigation(navigation.episode, scope?.dataUserId, localToday());
  const reading = useEpisodeReading(history.data?.points ?? [], localToday());
  const [event,setEvent] = useState<{subject:string;date:string}|null>(null);
  const [choice,setChoice]=useState<{subject?:string;key:string}|null>(null);
  const available=MONITORING_METRICS.filter(m=>history.data?.points?.some(p=>p.metricKey===m.key&&p.physiologicalDate>=minusDays(localToday(),364)));
  const requested=choice?.subject===scope?.dataUserId?choice?.key:episodeNav?.metric ?? (navigation.subject===scope?.dataUserId||!navigation.subject?navigation.metric:null);
  const metric=available.find(m=>m.key===requested)??available[0]??MONITORING_METRICS[0];
  const metricPoints=(history.data?.points??[]).filter(p=>p.metricKey===metric.key&&p.physiologicalDate>=minusDays(localToday(),364));
  const first=metricPoints[0]?.physiologicalDate??localToday(),last=metricPoints.at(-1)?.physiologicalDate??localToday();
  const scopeKey=`${scope?.dataUserId}|${metric.key}`;
  const [range,setRange]=useState<{key:string;start:string;end:string}|null>(null);
  const navValid=navigation.subject===scope?.dataUserId&&navigation.date&&/^\d{4}-\d{2}-\d{2}$/.test(navigation.date)&&navigation.date<=localToday()&&[30,90,365].includes(navigation.days);
  const fallbackEnd=episodeNav?.end ?? (navValid?navigation.date!:last);
  const start=range?.key===scopeKey?range.start:episodeNav?episodeNav.start:navValid?minusDays(fallbackEnd,navigation.days-1):first;
  const end=range?.key===scopeKey?range.end:fallbackEnd;
  const days=span(start,end);
  const change=(a:string,b:string)=>{if(a&&b&&a<=b&&a>=minusDays(localToday(),364)&&b<=localToday())setRange({key:scopeKey,start:a,end:b});};
  const exploreEpisode=(episode:Episode)=>{const key=episode.signals[0].key==='bedtime'?'sleep_duration':episode.signals[0].key;setChoice({subject:scope?.dataUserId,key});setRange({key:`${scope?.dataUserId}|${key}`,start:episode.start,end:episode.end});document.getElementById('individual-evolution')?.scrollIntoView({behavior:'smooth'});};
  const shift=(offset:number)=>{const a=minusDays(start,-offset),b=minusDays(end,-offset);change(a,b);};
  const trend=useMemo(()=>selectTrend(history.data,metric.key,start,end),[history.data,metric.key,start,end]);
  return <>
    <header className="pageHeader"><div className="eyebrow">EVOLUCIÓN</div><h1>Tu historia, con perspectiva</h1><p className="muted pageLead">Acércate a un periodo, desplázate por tu historia y compara las señales disponibles.</p></header>
    {!history.loading&&!history.error&&!reading.loading&&<><EpisodeExplorer key={scope?.dataUserId ?? 'none'} report={reading.report} input={reading.input} initialId={episodeNav?.id} onExplore={exploreEpisode} onContext={scope?.isSelf&&scope.dataUserId?date=>setEvent({subject:scope.dataUserId!,date}):undefined}/>{reading.loading&&<p role="status">Añadiendo horarios y contexto…</p>}{reading.error&&<p role="alert">Contexto no disponible: {reading.error} <button onClick={reading.refresh}>Reintentar</button></p>}</>}
    {reading.loading&&<p role="status">Conectando las señales y los episodios…</p>}
    <h2 id="individual-evolution">Explorar una señal por fecha</h2>
    <div className="trendControls"><div className="trendMetricChips">{available.map(m=><button key={m.key} aria-pressed={metric.key===m.key} className={metric.key===m.key?'selected':''} onClick={()=>{setChoice({subject:scope?.dataUserId,key:m.key});setRange(null);}}>{m.label}</button>)}</div></div>
    {!history.loading&&!history.error&&!!available.length&&<div className="periodControls" aria-label="Periodo visible del gráfico">
      <button onClick={()=>change(first,last)}>Ajustar a los datos</button>{[14,30,90].map(n=><button key={n} onClick={()=>change(minusDays(last,n-1)<first?first:minusDays(last,n-1),last)}>{n} días</button>)}
      <label>Desde <input type="date" min={minusDays(localToday(),364)} max={end} value={start} onChange={e=>change(e.target.value,end)}/></label><label>Hasta <input type="date" min={start} max={localToday()} value={end} onChange={e=>change(start,e.target.value)}/></label>
      <button aria-label="Periodo anterior" disabled={minusDays(start,Math.max(1,Math.round(days/2)))<minusDays(localToday(),364)} onClick={()=>shift(-Math.max(1,Math.round(days/2)))}>← Anterior</button><button aria-label="Periodo siguiente" disabled={minusDays(end,-Math.max(1,Math.round(days/2)))>localToday()} onClick={()=>shift(Math.max(1,Math.round(days/2)))}>Siguiente →</button>
      {span(first,last)>days&&start>=first&&end<=last&&<label className="periodSlider">Desplazar periodo <input type="range" aria-label="Desplazar el intervalo visible" min="0" max={span(first,last)-days} value={span(first,start)-1} onChange={e=>{const a=minusDays(first,-Number(e.target.value));change(a,minusDays(a,1-days));}}/></label>}
      <small>{days} días visibles · registros disponibles: {first} – {last}</small>
    </div>}
    {history.loading?<div className="chartSkeleton" aria-label="Cargando evolución"/>:history.error?<p role="alert">{history.error} <button onClick={history.refresh}>Reintentar</button></p>:!available.length?<p>No hay señales registradas en el último año para este perfil.</p>:<EvolutionExplorer key={`${scopeKey}|${start}|${end}`} metric={{...metric,format:v=>formatMonitoring(metric.key,v)}} {...trend} history={history.data} end={end} days={days} onOpenActivities={onOpenActivities}/>}
    {event&&event.subject===scope?.dataUserId&&scope?.isSelf&&<EventSheet initialDate={event.date} onClose={()=>setEvent(null)} onSaved={reading.refresh}/>}
  </>;
}

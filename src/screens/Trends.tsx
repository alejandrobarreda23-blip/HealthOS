import { useEffect, useMemo, useState } from 'react';
import { Activity, Crosshair, Layers3 } from 'lucide-react';
import { useSubject } from '../subjects/SubjectProvider';
import { getTrendV1, type BaselineBandPointV1, type TrendEventV1, type TrendPointV1 } from '../repositories/trends';

type Metric = { key: string; label: string; unit: string; format?: (value: number) => string };
const METRICS: Metric[] = [
  { key: 'hrv_rmssd', label: 'HRV', unit: 'ms' },
  { key: 'resting_heart_rate', label: 'FC reposo', unit: 'bpm' },
  { key: 'sleep_duration', label: 'Sueño', unit: 'min', format: (v) => `${(v / 60).toFixed(1)} h` },
  { key: 'steps', label: 'Pasos', unit: '', format: (v) => Math.round(v).toLocaleString('es-ES') },
  { key: 'oxygen_saturation', label: 'SpO₂', unit: '%' },
];

function minusDays(date: string, days: number) { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - days); return d.toISOString().slice(0, 10); }
function format(metric: Metric, value: number | null) { if (value === null) return '—'; return metric.format ? metric.format(value) : `${value.toFixed(metric.key === 'oxygen_saturation' ? 1 : 0)}${metric.unit ? ` ${metric.unit}` : ''}`; }
function dateLabel(date?: string) { if (!date) return 'Sin datos'; return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`)); }
function median(values:number[]){if(!values.length)return null;const s=[...values].sort((a,b)=>a-b);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;}

function segments(points: TrendPointV1[]) {
  const out: TrendPointV1[][] = []; let current: TrendPointV1[] = [];
  for (const point of points) { if (!current.length) { current = [point]; continue; } const prev = current[current.length - 1]; const diff = (new Date(`${point.date}T12:00:00Z`).getTime() - new Date(`${prev.date}T12:00:00Z`).getTime()) / 86400000; if (diff > 1) { out.push(current); current = [point]; } else current.push(point); }
  if (current.length) out.push(current); return out;
}

export default function Trends() {
  const { scope } = useSubject();
  const [metricKey, setMetricKey] = useState(() => {
    const requested = sessionStorage.getItem('healthos.trends.metric');
    sessionStorage.removeItem('healthos.trends.metric');
    return METRICS.some((metric) => metric.key === requested) ? requested! : 'hrv_rmssd';
  });
  const [windowDays, setWindowDays] = useState(365);
  const [points, setPoints] = useState<TrendPointV1[]>([]);
  const [baselines, setBaselines] = useState<BaselineBandPointV1[]>([]);
  const [events, setEvents] = useState<TrendEventV1[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0];

  useEffect(() => {
    if (!scope?.dataUserId) return;
    const end = new Date().toISOString().slice(0, 10); const start = minusDays(end, windowDays - 1);
    setLoading(true); setHoverIndex(null);
    getTrendV1(scope.dataUserId, metricKey, start, end)
      .then((result) => { setPoints(result.points); setBaselines(result.baselines); setEvents(result.events); setError(''); })
      .catch((e: any) => setError(e?.message ?? 'No se pudo cargar la evolución.'))
      .finally(() => setLoading(false));
  }, [scope?.dataUserId, metricKey, windowDays]);

  const chart = useMemo(() => {
    if (!points.length) return null;
    const width = 1120, height = 360, padX = 26, padY = 34;
    const baselineValues = baselines.flatMap((b)=>[b.p25,b.p75,b.median].filter((v):v is number=>v!==null));
    const values = [...points.map((p) => p.value), ...baselineValues];
    const rawMin = Math.min(...values), rawMax = Math.max(...values), rawRange = Math.max(rawMax - rawMin, 1); const min = rawMin - rawRange*.08, max = rawMax + rawRange*.08, range = max-min;
    const windowStart = new Date(`${minusDays(new Date().toISOString().slice(0,10),windowDays-1)}T12:00:00Z`).getTime();
    const windowEnd = new Date(`${new Date().toISOString().slice(0,10)}T12:00:00Z`).getTime();
    const dateRange = Math.max(windowEnd - windowStart, 86400000);
    const x = (date: string) => padX + ((new Date(`${date}T12:00:00Z`).getTime() - windowStart) / dateRange) * (width - 2 * padX);
    const y = (value: number) => height - padY - ((value - min) / range) * (height - 2 * padY);
    const lineSegments = segments(points).map((s) => ({ points: s.map((p) => `${x(p.date)},${y(p.value)}`).join(' '), count: s.length }));
    const baselinePoints = baselines.filter(b=>b.sufficient&&b.median!==null).map(b=>({date:b.date,x:x(b.date),median:y(b.median!),p25:b.p25===null?null:y(b.p25),p75:b.p75===null?null:y(b.p75)}));
    const bandUpper = baselinePoints.filter(p=>p.p75!==null).map(p=>`${p.x},${p.p75}`).join(' '); const bandLower = [...baselinePoints].reverse().filter(p=>p.p25!==null).map(p=>`${p.x},${p.p25}`).join(' ');
    const last = points[points.length - 1];
    return { width,height,min,max,x,y,gridY:[.2,.4,.6,.8].map(r=>padY+r*(height-2*padY)),segments:lineSegments,lastPoint:{x:x(last.date),y:y(last.value)},baselinePoints,baselineBand:[bandUpper,bandLower].filter(Boolean).join(' '),eventPoints:events.map(e=>({...e,x:x(e.date)})) };
  }, [points, baselines, events, windowDays]);

  const latest = points[points.length - 1]?.value ?? null; const latestDate = points[points.length - 1]?.date;
  const personalMedian = median(points.map(p=>p.value));
  const hovered = hoverIndex === null ? null : points[hoverIndex] ?? null;
  const nearestBaseline = hovered ? [...baselines].reverse().find(b=>b.date<=hovered.date&&b.sufficient&&b.median!==null) ?? null : null;
  const deviation = hovered && nearestBaseline?.median != null ? hovered.value-nearestBaseline.median : null;

  return <>
    <header className="pageHeader trendPageHeader"><div><div className="eyebrow">EVOLUCIÓN</div><h1>Historia fisiológica</h1><p className="muted pageLead">Explora señal, referencia y contexto sin rellenar los huecos.</p></div><div className="trendHeaderMeta"><Layers3 size={17}/><span>{points.length} días observados</span></div></header>

    <div className="trendControls" aria-label="Controles de evolución"><div className="trendMetricChips">{METRICS.map((m) => <button key={m.key} className={metricKey === m.key ? 'selected' : ''} onClick={() => setMetricKey(m.key)}>{m.label}</button>)}</div><div className="trendWindows">{[30, 90, 365].map((days) => <button key={days} className={windowDays === days ? 'selected' : ''} onClick={() => setWindowDays(days)}>{days === 365 ? '1 año' : `${days} d`}</button>)}</div></div>

    <div className="trendDesktopGrid trendDesktopGridV2">
      <section className="card trendCard trendCardV2">
        <div className="trendHead"><div><span className="trendMetricLabel">{metric.label}</span><small>{points.length ? `Último dato · ${dateLabel(latestDate)}` : 'Sin datos en esta ventana'}</small></div><div className="trendHeadlineNumbers"><span><small>último</small><strong className="trendLatest">{format(metric, latest)}</strong></span><span><small>mediana ventana</small><strong>{format(metric, personalMedian)}</strong></span></div></div>
        {loading && <div className="chartSkeleton" aria-label="Cargando gráfico" />}
        {error && <p className="error">{error}</p>}
        {!loading && !error && !chart && <div className="emptyState"><strong>Sin datos en esta ventana</strong><span>HealthOS no rellena los periodos sin medición.</span></div>}
        {!loading && chart && <>
          <div className="chartFrame chartFrameV2">
            <svg className="realChart realChartV2" viewBox={`0 0 ${chart.width} ${chart.height}`} aria-label={`Evolución de ${metric.label}`} onMouseLeave={()=>setHoverIndex(null)}>
              {chart.gridY.map((y, i) => <line key={`g-${i}`} className="chartGridLine" x1="0" x2={chart.width} y1={y} y2={y} />)}
              {chart.baselineBand && <polygon className="chartBaselineBand" points={chart.baselineBand}/>} 
              {chart.baselinePoints.length>1 && <polyline className="chartBaselineMedian" points={chart.baselinePoints.map(p=>`${p.x},${p.median}`).join(' ')} fill="none"/>}
              {chart.eventPoints.map((event)=><g className="trendEventMarker" key={event.date}><line x1={event.x} x2={event.x} y1={chart.height-26} y2={chart.height-14}/><circle cx={event.x} cy={chart.height-12} r={event.count>1?3.5:2.5}/></g>)}
              {chart.segments.map((segment, i) => segment.count > 1 ? <polyline className="chartSeries" key={i} points={segment.points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" /> : <circle className="chartSinglePoint" key={i} cx={Number(segment.points.split(',')[0])} cy={Number(segment.points.split(',')[1])} r="2.8" />)}
              {points.map((p,i)=><circle key={`hit-${p.date}`} className="chartHitPoint" cx={chart.x(p.date)} cy={chart.y(p.value)} r="9" onMouseEnter={()=>setHoverIndex(i)}/>)}
              <circle className="chartLastHalo" cx={chart.lastPoint.x} cy={chart.lastPoint.y} r="5.5" /><circle className="chartLastPoint" cx={chart.lastPoint.x} cy={chart.lastPoint.y} r="2.7" />
              {hovered && <g className="chartCursor"><line x1={chart.x(hovered.date)} x2={chart.x(hovered.date)} y1="20" y2={chart.height-30}/><circle cx={chart.x(hovered.date)} cy={chart.y(hovered.value)} r="5"/></g>}
            </svg>
            {hovered && <div className="trendTooltip"><small>{dateLabel(hovered.date)}</small><strong>{format(metric,hovered.value)}</strong>{nearestBaseline?.median!=null&&<span>Referencia {format(metric,nearestBaseline.median)}</span>}{deviation!==null&&<span>Desviación {deviation>0?'+':''}{format(metric,deviation)}</span>}</div>}
          </div>
          <div className="trendRange"><span>Mín.<b>{format(metric, Math.min(...points.map(p=>p.value)))}</b></span><span className="trendCoverage"><b>{points.length}</b>días medidos</span><span className="trendMax">Máx.<b>{format(metric, Math.max(...points.map(p=>p.value)))}</b></span></div>
          <div className="trendLegend"><span><i className="legendObserved"/>Observado</span><span><i className="legendBaseline"/>Referencia personal</span><span><i className="legendEvent"/>Entrenamiento</span></div>
        </>}
      </section>

      <aside className="trendInsightRail">
        <section className="card trendInsightCard"><div className="principleKicker">LECTURA</div><Crosshair size={18}/><strong>La referencia no es una norma.</strong><p>Es una descripción robusta de tu historia suficiente. Su banda aparece sólo cuando existe baseline válido.</p></section>
        <section className="card trendInsightCard"><div className="principleKicker">CONTEXTO</div><Activity size={18}/><strong>{events.length} días con entrenamiento</strong><p>Las marcas inferiores son eventos observados. No implican causalidad con la señal mostrada.</p></section>
        <section className="card principleCard"><div className="principleKicker">PRINCIPIO ESTADÍSTICO</div><strong>Los huecos también son información.</strong><p className="muted">HealthOS no interpola periodos sin medición ni transforma ausencia en cero.</p></section>
      </aside>
    </div>
  </>;
}

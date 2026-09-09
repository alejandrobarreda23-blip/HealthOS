import { useMemo, useState } from 'react';
import type { DailyPoint } from '../health/metrics/daily-series';
import { minusDays } from '../health/metrics/daily-series';
import { monitoringSummary, personalPatterns, sleepConsistency } from '../health/monitoring';
import { formatMonitoring, MONITORING_METRICS } from '../health/monitoring-metrics';
import './monitoring.css';

const dateLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
export default function MonitoringInsights({ points, asOf, mode = 'overview', onOpenTrend }: {
  points: DailyPoint[]; asOf: string; mode?: 'overview' | 'patterns' | 'compact'; onOpenTrend?: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const summaries = useMemo(() => monitoringSummary(points, asOf), [points, asOf]);
  const sleep = useMemo(() => sleepConsistency(points, asOf), [points, asOf]);
  const patterns = useMemo(() => personalPatterns(points, asOf), [points, asOf]);
  const dates = [...new Set(points.filter(p => p.physiologicalDate <= asOf).map(p => p.physiologicalDate))].sort();
  if (!points.length) return <section className="card"><h2>Tu historia empieza con tus primeros registros</h2><p>Las lecturas aparecerán con las señales que conectes. No necesitas registrar entrenamientos para explorar tu sueño o tu recuperación.</p></section>;
  return <div className="monitoring">
    {mode !== 'patterns' ? <>
      <section className="monitoringIntro"><div className="eyebrow">TU HISTORIA PERSONAL</div><h2>{summaries.length} señales para entender tus días</h2><p>{dates.length} días con registros · {dateLabel(dates[0])} – {dateLabel(dates.at(-1)!)}. Cada señal conserva sus fechas; los huecos no se rellenan.</p></section>
      {sleep && mode !== 'compact' && <article className="monitoringFocus"><div><div className="eyebrow">TU RITMO DE SUEÑO · ÚLTIMOS 28 DÍAS COMPLETOS</div><h2>La mitad de tus noches dura entre {formatMonitoring('sleep_duration', sleep.q25)} y {formatMonitoring('sleep_duration', sleep.q75)}</h2><p>Duración habitual: <b>{formatMonitoring('sleep_duration', sleep.center)}</b>. La diferencia típica respecto a esa duración es de <b>{Math.round(sleep.typicalDeviation)} min</b>.</p><p>{sleep.count}/28 noches · {dateLabel(sleep.start)} – {dateLabel(sleep.end)}. Describe la constancia de la duración, no la regularidad de los horarios.</p>{onOpenTrend && <button onClick={() => onOpenTrend('sleep_duration')}>Explorar las noches →</button>}</div></article>}
      <div className="sectionTitle">Qué está cambiando en tus señales</div>
      <p className="muted">Últimos 7 días completos frente a los 28 anteriores. Las diferencias describen cambios, no una puntuación de salud.</p>
      <div className="monitoringGrid">{(expanded ? summaries : summaries.slice(0, mode === 'compact' ? 3 : 6)).map(s => <article className="card monitoringSignal" key={s.key}>
        <div className="eyebrow">{s.label}</div><strong>{formatMonitoring(s.key, s.last.value)}</strong><small>{s.last.physiologicalDate === asOf ? `Último registro · ${dateLabel(asOf)}${s.key === 'steps' || s.key === 'ultrahuman_active_minutes' ? ' · día en curso' : ''}` : `Último registro · ${dateLabel(s.last.physiologicalDate)} · no es de hoy`}</small>
        {s.delta !== null ? <p>Mediana reciente <b>{formatMonitoring(s.key, s.recentMedian!)}</b>: {s.delta === 0 ? 'coincide con la anterior' : `${formatMonitoring(s.key, Math.abs(s.delta))} ${s.delta > 0 ? 'más' : 'menos'} que antes`}.</p> : <p>{s.recent.length}/7 días recientes y {s.prior.length}/28 anteriores; aún no hay cobertura suficiente para comparar.</p>}
        {onOpenTrend && <button onClick={() => onOpenTrend(s.key)}>Ver evolución →</button>}
        <details><summary>Ver evidencia</summary><p>{s.last.provider ?? 'Fuente sin identificar'} · resumen diario. {s.key === 'ultrahuman_sleep_hrv' && 'HRV calculada por Ultrahuman; el proveedor no especifica RMSSD o SDNN. Se compara únicamente consigo misma.'}</p><p>Reciente: {minusDays(asOf, 7)} – {minusDays(asOf, 1)} ({s.recent.length}/7). Referencia: {minusDays(asOf, 35)} – {minusDays(asOf, 8)} ({s.prior.length}/28). Se requieren 5 y 20 días, respectivamente, de la misma fuente y versión.</p></details>
      </article>)}</div>
      {summaries.length > (mode === 'compact' ? 3 : 6) && <p><button onClick={() => setExpanded(!expanded)}>{expanded ? 'Ver menos señales' : `Explorar las ${summaries.length} señales disponibles`}</button></p>}
    </> : <>
      <section className="monitoringIntro"><div className="eyebrow">PREGUNTAS SOBRE TU PROPIA HISTORIA</div><h2>Lo que tus días permiten explorar</h2><p>Comparamos situaciones personales y comprobamos si la diferencia reaparece en fechas posteriores. Mostramos también los resultados que no se repiten.</p></section>
      {!patterns.length && <article className="card"><h3>Primero, días comparables</h3><p>Estas preguntas necesitan al menos 40 días con ambas señales en los últimos 90 días, conservando la misma fuente. Mientras tanto, puedes explorar las tendencias de cada señal.</p></article>}
      {patterns.map(pattern => {
        const label = (key: string) => MONITORING_METRICS.find(m => m.key === key)?.label ?? key;
        return <article className="card monitoringPattern" key={pattern.id}>
          <div className="eyebrow">{pattern.repeated ? 'DIRECCIÓN Y MAGNITUD SIMILARES · EXPLORATORIO' : 'LA COMPROBACIÓN NO CONFIRMA UN PATRÓN ESTABLE'}</div><h2>{pattern.title}</h2>
          <p>Separamos {label(pattern.x).toLowerCase()} en ≤ {formatMonitoring(pattern.x, pattern.threshold)} y &gt; {formatMonitoring(pattern.x, pattern.threshold)}. {pattern.lag ? 'Cada día de pasos se empareja con el sueño atribuido al día siguiente.' : 'Comparamos registros atribuidos al mismo día; no establece qué ocurrió primero.'}</p>
          <div className="monitoringPair">{[{ label: 'Primera parte', data: pattern.discovery, rows: pattern.pairs.slice(0, Math.floor(pattern.pairs.length / 2)) }, { label: 'Comprobación posterior', data: pattern.validation, rows: pattern.pairs.slice(Math.floor(pattern.pairs.length / 2)) }].map(period => <div key={period.label}><small>{period.label} · {dateLabel(period.rows[0].date)} – {dateLabel(period.rows.at(-1)!.date)}</small><strong>{period.data.delta === null ? 'Pocos días en algún grupo' : period.data.delta === 0 ? 'Misma mediana' : `${formatMonitoring(pattern.y, Math.abs(period.data.delta))} ${period.data.delta > 0 ? 'más' : 'menos'}`}</strong><span>{label(pattern.y)} en el grupo superior</span><p>{period.data.low.length} días ≤ umbral: {period.data.lowMedian === null ? 'sin datos' : formatMonitoring(pattern.y, period.data.lowMedian)}<br/>{period.data.high.length} días &gt; umbral: {period.data.highMedian === null ? 'sin datos' : formatMonitoring(pattern.y, period.data.highMedian)}</p></div>)}</div>
          <p>{pattern.repeated ? 'La dirección y la magnitud son similares, pero la coincidencia puede depender de rutinas, enfermedad, viajes u otros factores no registrados. No demuestra un efecto ni permite predecir tu próxima noche.' : 'Esta historia todavía no sostiene una relación estable. No hay motivo para convertirla en una recomendación personal.'}</p>
          {onOpenTrend && <button onClick={() => onOpenTrend(pattern.y)}>Explorar la señal y su contexto →</button>}
          <details><summary>Revisar los {pattern.pairs.length} días y el método</summary><p>Dos preguntas definidas de antemano, sin buscar la combinación con mayor diferencia. Umbral: mediana de la primera mitad de fechas; se mantiene fijo en la segunda. Mínimo 6 días por grupo y periodo. Se omiten días sin pareja; no se rellenan ni se mezclan fuentes. Llamamos repetida a una diferencia con la misma dirección y una magnitud que no difiere en más del doble entre periodos. Es una regla exploratoria del producto, no un umbral clínico. No es una prueba estadística y las observaciones consecutivas pueden depender entre sí. No usamos puntuaciones de recuperación como resultado porque pueden incorporar las mismas señales.</p><div className="monitoringTable"><table><thead><tr><th>Día del resultado</th><th>Día del contexto</th><th>{label(pattern.x)}</th><th>{label(pattern.y)}</th></tr></thead><tbody>{pattern.pairs.map(p => <tr key={p.date}><td>{p.date}</td><td>{p.xDate}</td><td>{formatMonitoring(pattern.x, p.x)}</td><td>{formatMonitoring(pattern.y, p.y)}</td></tr>)}</tbody></table></div></details>
        </article>;
      })}
    </>}
  </div>;
}

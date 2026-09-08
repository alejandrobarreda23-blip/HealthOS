import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { bodySystemConfig } from '../../body/system-config';
import { compareBodyMetric, type selectBody } from '../../body/selectors';
import { formatBodyValue, type BodyHistorySnapshot, type BodySystemState } from '../../body/view-state';
import type { MetricEvaluation } from '../../health/metrics/evaluation';
import { DAILY_SERIES_VERSION } from '../../health/metrics/daily-series';

type Tab = 'summary' | 'signals' | 'evidence';
interface Props {
  system: BodySystemState;
  history: BodyHistorySnapshot | null;
  selectedDate: string;
  comparisonDate: string | null;
  model: ReturnType<typeof selectBody>;
  loading: boolean;
  error: string;
  onOpenTrend?: (metricKey: string) => void;
}
const STATUS: Record<MetricEvaluation['status'], string> = {
  detected: 'Cambio detectado', not_detected: 'Evaluado sin superar la regla', insufficient: 'Datos insuficientes',
  not_comparable: 'No comparable', no_rule: 'Lectura descriptiva',
};
const LEVEL: Record<string, string> = { measured: 'Medido', derived: 'Derivado', reported: 'Reportado', inferred: 'Inferido', mixed: 'Mixto' };
const RULE: Record<string, string> = {
  hrv_rmssd: 'Mediana reciente al menos un 10% inferior, o desviación robusta ≤ −1,25.',
  resting_heart_rate: 'Mediana reciente al menos un 5% superior, o desviación robusta ≥ 1,25.',
  sleep_duration: 'Mediana reciente al menos 30 minutos inferior, o desviación robusta ≤ −1,25.',
  oxygen_saturation: 'Mediana reciente al menos 1 punto porcentual inferior, o desviación robusta ≤ −1,25.',
  weight: 'Diferencia absoluta entre medianas de al menos un 2%, o desviación robusta absoluta ≥ 1,25.',
};
function value(e: MetricEvaluation, n: number | null) {
  return formatBodyValue(n, e.latest?.unit ?? bodySystemConfig('recovery').metrics.find(m => m.key === e.metricKey)?.unit ?? '');
}
function signed(e: MetricEvaluation, n: number | null) { return n === null ? '—' : `${n > 0 ? '+' : ''}${value(e, n)}`; }
function MiniSeries({ evaluation: e }: { evaluation: MetricEvaluation }) {
  const rows = e.points.filter(p => p.physiologicalDate >= e.recentStart);
  if (!rows.length) return null;
  const low = Math.min(...rows.map(p => p.value)), range = Math.max(1, Math.max(...rows.map(p => p.value)) - low);
  return <svg className="bodySignalSpark" viewBox="0 0 240 44" role="img" aria-label={`${rows.length} días observados; los huecos no se interpolan`}>
    {rows.map(p => <circle key={p.physiologicalDate} cx={8 + (Date.parse(p.physiologicalDate) - Date.parse(e.recentStart)) / 86400000 / Math.max(1, e.recentDays - 1) * 224} cy={36 - (p.value - low) / range * 28} r="3"><title>{p.physiologicalDate}: {value(e, p.value)}</title></circle>)}
  </svg>;
}
export default function BodyDossier({ system, history, selectedDate, comparisonDate, model, loading, error, onOpenTrend }: Props) {
  const [tab, setTab] = useState<Tab>('summary');
  const config = bodySystemConfig(system.key);
  const metrics = config.metrics.filter(m => m.key !== 'exercise');
  const rows = metrics.map(metric => ({ metric, evaluation: model.evaluations[metric.key] }));
  const findings = system.findings ?? [];
  const ready = Boolean(history) && !loading && !error;
  return <aside className="bodyV4Dossier">
    <div className="bodyV4DossierHead"><div><span className="bodyV4DossierKicker">Sistema enfocado</span><h2>{system.title}</h2><p>{config.description}</p></div></div>
    <div className="bodyV4DossierTabs" role="tablist" aria-label="Detalle del sistema">
      {([['summary', 'Resumen'], ['signals', 'Señales'], ['evidence', 'Evidencia']] as const).map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} aria-controls="body-dossier-panel" className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}
    </div>
    {!ready ? <div className="bodyV4DossierPanel"><p>{loading ? 'Cargando datos para esta persona…' : error ? 'No se pudo evaluar. Revisa el error de carga.' : 'Sin observaciones cargadas para evaluar.'}</p></div> :
    <div id="body-dossier-panel" role="tabpanel" className="bodyV4DossierPanel">
      {tab === 'summary' && <>
        <p className="bodyWindowLabel">Lectura hasta {selectedDate} · {system.detail}</p>
        {rows.map(({ metric, evaluation: e }) => <article key={metric.key} className={`bodyExplanation status-${e.status}`}>
          <span className="bodyEvaluationStatus">{STATUS[e.status]}</span><h3>{metric.label}</h3>
          <p>{e.recentMedian !== null ? <>Mediana {e.recentDays} d: <b>{value(e, e.recentMedian)}</b>{e.delta !== null && <> · <b>{signed(e, e.delta)}</b> respecto a tu referencia</>}.</> : 'Sin señal en la ventana reciente.'}</p>
          <p>{e.reason}</p>
          <small>{e.recentCount} días válidos de {e.recentDays}{!e.expectedDaily && ' · medición no necesariamente diaria'}</small>
          <button className="bodyTextAction" onClick={() => setTab('evidence')}>Cómo se ha calculado</button>
        </article>)}
        {system.key === 'recovery' && <p className="bodyWindowLabel">HRV, FC de reposo y sueño son señales compartidas con otros sistemas; no se cuentan como pruebas independientes ni forman un score.</p>}
        {(system.key === 'musculo' || system.key === 'recovery') && <div className="bodyExplanation"><h3>Actividad registrada · 7 días</h3><p>{model.trainingSessions ? `${model.trainingSessions} sesiones · ${Math.round(model.trainingMinutes)} minutos registrados.` : 'No hay sesiones registradas. Esto no acredita ausencia de ejercicio.'}</p><small>La coincidencia temporal con una señal no establece su causa.</small></div>}
      </>}
      {tab === 'signals' && <>
        {comparisonDate && <p className="bodyWindowLabel">Comparación puntual con {comparisonDate}</p>}
        {rows.map(({ metric, evaluation: e }) => {
          const comparison = compareBodyMetric(history, metric.key, selectedDate, comparisonDate);
          return <article key={metric.key} className="bodyExplanation"><h3>{metric.label}</h3>
            <dl className="bodySignalFacts"><div><dt>{selectedDate}</dt><dd>{e.current ? value(e, e.current.value) : 'Sin dato en fecha'}</dd></div>
              <div><dt>Mediana {e.recentDays} d</dt><dd>{value(e, e.recentMedian)}</dd></div>
              <div><dt>Referencia personal</dt><dd>{e.baseline.sufficient ? value(e, e.baseline.median) : 'Insuficiente'}</dd></div>
              <div><dt>Diferencia reciente</dt><dd>{signed(e, e.delta)}</dd></div></dl>
            <MiniSeries evaluation={e}/>
            <small>Último dato: {e.latest?.physiologicalDate ?? '—'}. Referencia descriptiva; no es una norma clínica.</small>
            {comparisonDate && <p>Diferencia entre fechas: <b>{signed(e, comparison.delta)}</b>. {comparison.reason}</p>}
            {onOpenTrend && <button className="bodyV4PrimaryAction" onClick={() => onOpenTrend(metric.key)}>Ver evolución completa <ArrowRight size={15}/></button>}
          </article>;
        })}
      </>}
      {tab === 'evidence' && <>
        <p className="bodyWindowLabel">Recalculado con los datos disponibles hasta la fecha explorada. No reproduce un análisis guardado entonces.</p>
        {rows.map(({ metric, evaluation: e }) => <details className="bodyEvidenceDetails" key={metric.key} open>
          <summary>{metric.label} · {STATUS[e.status]}</summary>
          <dl><dt>Periodo reciente</dt><dd>{e.recentStart} → {selectedDate} · {e.recentCount}/{e.recentDays} días</dd>
            <dt>Referencia</dt><dd>{e.referenceStart} → {e.referenceEnd} · {e.baseline.sampleCount}/{e.baseline.windowDays} días</dd>
            <dt>Banda central de la referencia (P25–P75)</dt><dd>{e.baseline.sufficient ? `${value(e, e.baseline.p25)} – ${value(e, e.baseline.p75)}` : 'No disponible con suficiencia'}</dd>
            <dt>Fuente del tramo comparable</dt><dd>{e.latest?.provider ?? 'No identificada'} · {e.latest?.sourceDevice ?? 'dispositivo no declarado'}</dd>
            <dt>Procedencia</dt><dd>{LEVEL[e.latest?.dataLevel ?? ''] ?? 'No declarada'} · {e.latest?.normalizerVersion ?? 'versión de origen no declarada'}</dd>
            <dt>Agregación</dt><dd>{e.latest?.aggregation === 'sum_nonoverlapping' ? 'Suma de intervalos no solapados de una fuente.' : 'Mediana de observaciones de una fuente, tras eliminar copias del mismo registro.'} Nunca se promedian proveedores.</dd>
            <dt>Regla</dt><dd>{RULE[metric.key] ?? 'Comparación descriptiva, sin detector.'} Son reglas de producto, no umbrales clínicos validados.</dd>
            <dt>Límites</dt><dd>{e.reason} {e.baseline.mad === 0 && 'La referencia no tiene dispersión MAD; no se calcula desviación robusta.'}</dd>
            <dt>Contexto y exclusiones</dt><dd>Sin exclusiones contextuales automáticas. No se atribuyen causas a partir de estas señales.</dd>
          </dl>
          {e.latest && e.latest.alternativeSources > 0 && <p>En el último día había {e.latest.alternativeSources} fuentes alternativas; se eligió una según la prioridad del diccionario.</p>}
          <details><summary>Registros de origen del periodo y referencia</summary><ul className="bodySourceIds">{e.points.filter(p => p.physiologicalDate >= e.referenceStart).map(p => <li key={p.physiologicalDate}>{p.physiologicalDate}: {p.observationIds.join(', ') || 'identificador no disponible'}</li>)}</ul></details>
        </details>)}
        {findings.map(f => <details className="bodyEvidenceDetails" key={f.findingKey}><summary>{f.title}</summary><p>{f.summary}</p><p>{f.interpretationBoundary}</p><small>Regla: {f.detectorVersion}</small></details>)}
        <small>Serie: {DAILY_SERIES_VERSION}. Los días ausentes no se convierten en cero.</small>
      </>}
    </div>}
  </aside>;
}

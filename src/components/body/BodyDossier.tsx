import { useMemo, useState } from 'react';
import { Activity, ArrowRight, FileSearch, Layers3 } from 'lucide-react';
import { bodySystemConfig } from '../../body/system-config';
import { formatBodyValue, formatSleepMinutes, type BodyHistoryDay, type BodySystemState } from '../../body/view-state';

type Tab = 'summary' | 'signals' | 'evidence';

interface Props {
  system: BodySystemState;
  selectedDay: BodyHistoryDay | null;
  comparisonDay: BodyHistoryDay | null;
  isPresent: boolean;
  globalCoverage: number;
  sourceProvider?: string | null;
  sourceLastObservedAt?: string | null;
  dataQualitySummary?: string | null;
  onOpenTrend?: (metricKey: string) => void;
}

function formatMetric(key: string, value: number, unit: string | null) {
  if (key === 'sleep_duration') return formatSleepMinutes(value);
  return formatBodyValue(value, unit ?? '');
}

export default function BodyDossier({
  system,
  selectedDay,
  comparisonDay,
  isPresent,
  globalCoverage,
  sourceProvider,
  sourceLastObservedAt,
  dataQualitySummary,
  onOpenTrend,
}: Props) {
  const [tab, setTab] = useState<Tab>('summary');
  const config = bodySystemConfig(system.key);

  const rows = useMemo(() => config.metrics.map((metric) => {
    if (metric.key === 'exercise') {
      const current = selectedDay?.exerciseCount ?? null;
      const compare = comparisonDay?.exerciseCount ?? null;
      return { metric, current, compare, unit: 'session', evidence: selectedDay?.evidenceKinds.join(' · ') ?? null, provider: null };
    }
    const currentMetric = selectedDay?.metrics[metric.key] ?? null;
    const compareMetric = comparisonDay?.metrics[metric.key] ?? null;
    return {
      metric,
      current: currentMetric?.value ?? null,
      compare: compareMetric?.value ?? null,
      unit: currentMetric?.unit ?? metric.unit,
      evidence: currentMetric?.evidence ?? null,
      provider: currentMetric?.provider ?? null,
    };
  }), [comparisonDay, config.metrics, selectedDay]);

  return (
    <aside className="bodyV4Dossier">
      <div className="bodyV4DossierHead">
        <div>
          <span className="bodyV4DossierKicker">Sistema enfocado</span>
          <h2>{system.title}</h2>
          <p>{config.description}</p>
        </div>
        <div className={`bodyV4DossierStatus status-${system.status}`}>
          <strong>{Math.round(system.coverage * 100)}%</strong>
          <span>observabilidad</span>
        </div>
      </div>

      <div className="bodyV4DossierTabs" role="tablist" aria-label="Detalle del sistema">
        <button className={tab === 'summary' ? 'active' : ''} onClick={() => setTab('summary')}>Resumen</button>
        <button className={tab === 'signals' ? 'active' : ''} onClick={() => setTab('signals')}>Señales</button>
        <button className={tab === 'evidence' ? 'active' : ''} onClick={() => setTab('evidence')}>Evidencia</button>
      </div>

      {tab === 'summary' && (
        <div className="bodyV4DossierPanel">
          <div className="bodyV4DossierHero">
            <span>{system.headline}</span>
            <strong>{system.detail}</strong>
          </div>

          {system.finding ? (
            <div className="bodyV4FindingBlock">
              <span className="bodyV4FindingBeacon" />
              <div>
                <small>Expediente activo</small>
                <strong>{system.finding.title}</strong>
                <p>{system.finding.summary}</p>
              </div>
            </div>
          ) : (
            <div className="bodyV4QuietBlock">
              <Activity size={16} />
              <div>
                <strong>{isPresent ? 'Sin hallazgo fisiológico activo aquí' : 'Historia sin reinterpretar'}</strong>
                <p>{isPresent ? 'La ausencia de expediente no equivale a normalidad; sólo indica que no hay un finding determinista activo para este sistema.' : 'Body muestra observaciones de la fecha, sin proyectar findings actuales hacia el pasado.'}</p>
              </div>
            </div>
          )}

          <div className="bodyV4ContinuityStrip">
            <div><span>Cobertura global</span><strong>{Math.round(globalCoverage * 100)}%</strong></div>
            <div><span>Fuente</span><strong>{sourceProvider ?? '—'}</strong></div>
            <div><span>Último dato</span><strong>{sourceLastObservedAt?.slice(0, 10) ?? '—'}</strong></div>
          </div>

          {dataQualitySummary && <p className="bodyV4DataQualityNote">{dataQualitySummary}</p>}
        </div>
      )}

      {tab === 'signals' && (
        <div className="bodyV4DossierPanel bodyV4SignalsPanel">
          <div className="bodyV4SignalHeader">
            <span>Señales que alimentan este sistema</span>
            {comparisonDay && <small>comparando con {comparisonDay.date}</small>}
          </div>
          {rows.map(({ metric, current, compare, unit }) => {
            const delta = current !== null && compare !== null ? current - compare : null;
            return (
              <div className="bodyV4SignalRow" key={metric.key}>
                <div><strong>{metric.label}</strong><small>{current === null ? 'Sin observación en esta fecha' : metric.key === 'exercise' ? `${Math.round(current)} sesión${current === 1 ? '' : 'es'}` : formatMetric(metric.key, current, unit)}</small></div>
                <div className="bodyV4SignalDelta">
                  {delta === null ? <span>—</span> : <span>{delta > 0 ? '+' : ''}{metric.key === 'sleep_duration' ? `${Math.round(delta)} min` : metric.key === 'exercise' ? `${Math.round(delta)}` : formatBodyValue(delta, unit ?? '')}</span>}
                </div>
              </div>
            );
          })}
          {config.primaryTrendMetric && onOpenTrend && (
            <button className="bodyV4PrimaryAction" type="button" onClick={() => onOpenTrend(config.primaryTrendMetric!)}>
              Ver evolución completa <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}

      {tab === 'evidence' && (
        <div className="bodyV4DossierPanel bodyV4EvidencePanel">
          <div className="bodyV4EvidenceLead"><FileSearch size={17}/><div><strong>Procedencia declarable</strong><p>Cada trazo debe poder explicar de qué tipo de evidencia procede.</p></div></div>
          {rows.map(({ metric, evidence, provider }) => (
            <div className="bodyV4EvidenceMetric" key={metric.key}>
              <span>{metric.label}</span>
              <strong>{evidence ?? 'sin dato en fecha'}</strong>
              <small>{provider ?? '—'}</small>
            </div>
          ))}
          <div className="bodyV4GrammarMini"><Layers3 size={16}/><p><b>Medido</b> puede habilitar movimiento. <b>Derivado</b> representa cálculo. <b>Reportado</b> contexto declarado. <b>Inferido</b> hipótesis/modelo.</p></div>
        </div>
      )}
    </aside>
  );
}

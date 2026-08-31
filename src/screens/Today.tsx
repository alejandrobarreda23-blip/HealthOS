import { useState } from 'react';
import CheckIn from '../components/CheckIn';
import EventSheet from '../components/EventSheet';
import MetricCard from '../components/MetricCard';
import { useHealthBriefV1 } from '../hooks/useHealthBrief';

function formatMinutes(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  const h = Math.floor(value / 60);
  const m = Math.round(value % 60);
  return `${h} h ${m} min`;
}

function baselineDetail(current: number | null | undefined, baseline: number | null | undefined, unit: string) {
  if (baseline === null || baseline === undefined) return 'Baseline insuficiente';
  if (current === null || current === undefined) return `Baseline ${baseline.toFixed(0)} ${unit}`;
  const delta = baseline === 0 ? null : ((current - baseline) / baseline) * 100;
  return delta === null ? `Baseline ${baseline.toFixed(0)} ${unit}` : `vs baseline ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
}

export default function Today() {
  const { data, loading, error, refresh } = useHealthBriefV1();
  const [eventOpen, setEventOpen] = useState(false);

  return <>
    <header>
      <div className="eyebrow">HEALTH OS</div>
      <h1>Hoy</h1>
      <div className="muted">{data?.date ?? new Date().toISOString().slice(0, 10)}</div>
    </header>

    {loading && <div className="syncLine">Actualizando análisis…</div>}
    {error && <div className="syncError">{error}<button onClick={refresh}>Reintentar</button></div>}
    {!loading && !error && !data && <div className="syncLine">SIN HEALTH BRIEF · sincroniza y recalcula el análisis</div>}

    <div className="hero card">
      <div>
        <span className="muted">Cobertura reciente</span>
        <strong>{data ? `${Math.round(data.dataQuality.overallCoverage * 100)}%` : '—'}</strong>
        <small className="briefLevel">{data?.dataQuality.level ?? 'SIN DATOS'}</small>
      </div>
      <div className="quality"><i style={{ width: `${data ? data.dataQuality.overallCoverage * 100 : 0}%` }} /></div>
    </div>

    <div className="grid">
      <MetricCard
        label="HRV"
        value={data?.recovery.hrv?.current !== null && data?.recovery.hrv?.current !== undefined ? `${data.recovery.hrv.current.toFixed(0)} ms` : '—'}
        detail={baselineDetail(data?.recovery.hrv?.current, data?.recovery.hrv?.baseline?.median, 'ms')}
      />
      <MetricCard
        label="FC reposo"
        value={data?.recovery.restingHr?.current !== null && data?.recovery.restingHr?.current !== undefined ? `${data.recovery.restingHr.current.toFixed(0)} bpm` : '—'}
        detail={baselineDetail(data?.recovery.restingHr?.current, data?.recovery.restingHr?.baseline?.median, 'bpm')}
      />
      <MetricCard
        label="Sueño"
        value={formatMinutes(data?.sleep.duration?.current)}
        detail={data?.sleep.duration?.baseline?.median !== null && data?.sleep.duration?.baseline?.median !== undefined ? `Baseline ${formatMinutes(data.sleep.duration.baseline.median)}` : 'Baseline insuficiente'}
      />
      <MetricCard
        label="Entrenamiento 7 d"
        value={data ? `${data.training.sessions7d} sesiones` : '—'}
        detail={data ? `${Math.round(data.training.durationMinutes7d)} min · ${data.training.distanceKm7d.toFixed(1)} km` : undefined}
      />
      <MetricCard
        label="Desnivel 7 d"
        value={data ? `${Math.round(data.training.elevationGainM7d).toLocaleString('es-ES')} m` : '—'}
        detail="Carga no sintetizada"
      />
      <MetricCard
        label="Peso"
        value={data?.body.weightKg !== null && data?.body.weightKg !== undefined ? `${data.body.weightKg.toFixed(1)} kg` : '—'}
        detail="Solo medición observada"
      />
    </div>

    <section>
      <div className="sectionTitle">Cambios relevantes</div>
      {data?.activeFindings.length ? data.activeFindings.map((finding) =>
        <div className="finding card" key={`${finding.findingKey}-${finding.periodEnd}`}>
          <span className={`dot ${finding.severity}`} />
          <div>
            <div className="findingMeta">{finding.evidenceStrength} · {finding.detectorVersion}</div>
            <strong>{finding.title}</strong>
            <p>{finding.summary}</p>
          </div>
        </div>) : <div className="card muted">Todavía no hay hallazgos deterministas activos.</div>}
    </section>

    {!!data?.uncertainty.length && <section className="card uncertaintyCard">
      <strong>Incertidumbre</strong>
      <p>{data.uncertainty.join(' · ')}</p>
    </section>}

    <CheckIn />
    <button className="event" onClick={() => setEventOpen(true)}>＋ Registrar evento</button>
    {eventOpen && <EventSheet onClose={() => setEventOpen(false)} />}
  </>;
}

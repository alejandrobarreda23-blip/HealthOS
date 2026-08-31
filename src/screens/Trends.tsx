import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getTrendV1, type TrendPointV1 } from '../repositories/trends';

type Metric = { key: string; label: string; unit: string; format?: (value: number) => string };
const METRICS: Metric[] = [
  { key: 'hrv_rmssd', label: 'HRV', unit: 'ms' },
  { key: 'resting_heart_rate', label: 'FC reposo', unit: 'bpm' },
  { key: 'sleep_duration', label: 'Sueño', unit: 'min', format: (v) => `${(v / 60).toFixed(1)} h` },
  { key: 'steps', label: 'Pasos', unit: '', format: (v) => Math.round(v).toLocaleString('es-ES') },
  { key: 'oxygen_saturation', label: 'SpO₂', unit: '%' },
];

function minusDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function format(metric: Metric, value: number | null) {
  if (value === null) return '—';
  return metric.format ? metric.format(value) : `${value.toFixed(metric.key === 'oxygen_saturation' ? 1 : 0)}${metric.unit ? ` ${metric.unit}` : ''}`;
}

function segments(points: TrendPointV1[]) {
  const out: TrendPointV1[][] = [];
  let current: TrendPointV1[] = [];
  for (const point of points) {
    if (!current.length) { current = [point]; continue; }
    const prev = current[current.length - 1];
    const diff = (new Date(`${point.date}T12:00:00Z`).getTime() - new Date(`${prev.date}T12:00:00Z`).getTime()) / 86400000;
    if (diff > 1) { out.push(current); current = [point]; } else current.push(point);
  }
  if (current.length) out.push(current);
  return out;
}

export default function Trends() {
  const { user } = useAuth();
  const [metricKey, setMetricKey] = useState('hrv_rmssd');
  const [windowDays, setWindowDays] = useState(90);
  const [points, setPoints] = useState<TrendPointV1[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0];

  useEffect(() => {
    if (!user?.id) return;
    const end = new Date().toISOString().slice(0, 10);
    const start = minusDays(end, windowDays - 1);
    setLoading(true);
    getTrendV1(user.id, metricKey, start, end)
      .then((result) => { setPoints(result.points); setError(''); })
      .catch((e: any) => setError(e?.message ?? 'No se pudo cargar la evolución.'))
      .finally(() => setLoading(false));
  }, [user?.id, metricKey, windowDays]);

  const chart = useMemo(() => {
    if (!points.length) return null;
    const width = 460, height = 150, pad = 10;
    const values = points.map((p) => p.value);
    const min = Math.min(...values), max = Math.max(...values), range = Math.max(max - min, 1);
    const start = new Date(`${points[0].date}T12:00:00Z`).getTime();
    const end = new Date(`${points[points.length - 1].date}T12:00:00Z`).getTime();
    const dateRange = Math.max(end - start, 86400000);
    const x = (date: string) => pad + ((new Date(`${date}T12:00:00Z`).getTime() - start) / dateRange) * (width - 2 * pad);
    const y = (value: number) => height - pad - ((value - min) / range) * (height - 2 * pad);
    return { width, height, min, max, segments: segments(points).map((s) => s.map((p) => `${x(p.date)},${y(p.value)}`).join(' ')) };
  }, [points]);

  const latest = points[points.length - 1]?.value ?? null;

  return <>
    <header>
      <div className="eyebrow">EVOLUCIÓN</div>
      <h1>Tu referencia</h1>
      <p className="muted">Datos reales. Los huecos se conservan como huecos.</p>
    </header>

    <div className="trendControls">
      <div className="trendMetricChips">{METRICS.map((m) => <button key={m.key} className={metricKey === m.key ? 'selected' : ''} onClick={() => setMetricKey(m.key)}>{m.label}</button>)}</div>
      <div className="trendWindows">{[30, 90, 365].map((days) => <button key={days} className={windowDays === days ? 'selected' : ''} onClick={() => setWindowDays(days)}>{days === 365 ? '1 año' : `${days} d`}</button>)}</div>
    </div>

    <section className="card">
      <div className="trendHead"><span>{metric.label}</span><strong>{format(metric, latest)}</strong></div>
      {loading && <p className="muted">Cargando…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && !chart && <p className="muted">Sin datos en esta ventana.</p>}
      {chart && <>
        <svg className="realChart" viewBox={`0 0 ${chart.width} ${chart.height}`} aria-label={`Evolución de ${metric.label}`}>
          {chart.segments.map((line, i) => line.includes(' ') ? <polyline key={i} points={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" /> : <circle key={i} cx={Number(line.split(',')[0])} cy={Number(line.split(',')[1])} r="2.5" />)}
        </svg>
        <div className="trendRange"><span>Mín. <b>{format(metric, chart.min)}</b></span><span>{points.length} días medidos</span><span>Máx. <b>{format(metric, chart.max)}</b></span></div>
      </>}
    </section>

    <section className="card">
      <div className="trendHead"><strong>Principio estadístico</strong></div>
      <p className="muted">HealthOS no interpola periodos sin reloj ni transforma ausencia en cero. Los baselines se calculan por separado y exigen cobertura suficiente.</p>
    </section>
  </>;
}

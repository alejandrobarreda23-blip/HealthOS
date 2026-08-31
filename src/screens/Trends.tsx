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

function dateLabel(date?: string) {
  if (!date) return 'Sin datos';
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`));
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
    const width = 460, height = 172, padX = 10, padY = 16;
    const values = points.map((p) => p.value);
    const min = Math.min(...values), max = Math.max(...values), range = Math.max(max - min, 1);
    const start = new Date(`${points[0].date}T12:00:00Z`).getTime();
    const end = new Date(`${points[points.length - 1].date}T12:00:00Z`).getTime();
    const dateRange = Math.max(end - start, 86400000);
    const x = (date: string) => padX + ((new Date(`${date}T12:00:00Z`).getTime() - start) / dateRange) * (width - 2 * padX);
    const y = (value: number) => height - padY - ((value - min) / range) * (height - 2 * padY);
    const lineSegments = segments(points).map((s) => ({
      points: s.map((p) => `${x(p.date)},${y(p.value)}`).join(' '),
      count: s.length,
    }));
    const last = points[points.length - 1];
    return {
      width,
      height,
      min,
      max,
      gridY: [0.25, 0.5, 0.75].map((r) => padY + r * (height - 2 * padY)),
      segments: lineSegments,
      lastPoint: { x: x(last.date), y: y(last.value) },
    };
  }, [points]);

  const latest = points[points.length - 1]?.value ?? null;
  const latestDate = points[points.length - 1]?.date;

  return <>
    <header className="pageHeader">
      <div className="eyebrow">EVOLUCIÓN</div>
      <h1>Tu referencia</h1>
      <p className="muted pageLead">Datos reales. Los huecos se conservan como huecos.</p>
    </header>

    <div className="trendControls" aria-label="Controles de evolución">
      <div className="trendMetricChips">{METRICS.map((m) => <button key={m.key} className={metricKey === m.key ? 'selected' : ''} onClick={() => setMetricKey(m.key)}>{m.label}</button>)}</div>
      <div className="trendWindows">{[30, 90, 365].map((days) => <button key={days} className={windowDays === days ? 'selected' : ''} onClick={() => setWindowDays(days)}>{days === 365 ? '1 año' : `${days} d`}</button>)}</div>
    </div>

    <section className="card trendCard">
      <div className="trendHead">
        <div>
          <span className="trendMetricLabel">{metric.label}</span>
          <small>{points.length ? `Último dato · ${dateLabel(latestDate)}` : 'Sin datos en esta ventana'}</small>
        </div>
        <strong className="trendLatest">{format(metric, latest)}</strong>
      </div>
      {loading && <div className="chartSkeleton" aria-label="Cargando gráfico" />}
      {error && <p className="error">{error}</p>}
      {!loading && !error && !chart && <div className="emptyState"><strong>Sin datos en esta ventana</strong><span>HealthOS no rellena los periodos sin medición.</span></div>}
      {!loading && chart && <>
        <div className="chartFrame">
          <svg className="realChart" viewBox={`0 0 ${chart.width} ${chart.height}`} aria-label={`Evolución de ${metric.label}`}>
            {chart.gridY.map((y, i) => <line key={`g-${i}`} className="chartGridLine" x1="0" x2={chart.width} y1={y} y2={y} />)}
            {chart.segments.map((segment, i) => segment.count > 1
              ? <polyline className="chartSeries" key={i} points={segment.points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              : <circle className="chartSinglePoint" key={i} cx={Number(segment.points.split(',')[0])} cy={Number(segment.points.split(',')[1])} r="2.8" />)}
            <circle className="chartLastHalo" cx={chart.lastPoint.x} cy={chart.lastPoint.y} r="5.5" />
            <circle className="chartLastPoint" cx={chart.lastPoint.x} cy={chart.lastPoint.y} r="2.7" />
          </svg>
        </div>
        <div className="trendRange">
          <span>Mín.<b>{format(metric, chart.min)}</b></span>
          <span className="trendCoverage"><b>{points.length}</b>días medidos</span>
          <span className="trendMax">Máx.<b>{format(metric, chart.max)}</b></span>
        </div>
      </>}
    </section>

    <section className="card principleCard">
      <div className="principleKicker">PRINCIPIO ESTADÍSTICO</div>
      <strong>Los huecos también son información.</strong>
      <p className="muted">HealthOS no interpola periodos sin reloj ni transforma ausencia en cero. Los baselines se calculan por separado y exigen cobertura suficiente.</p>
    </section>
  </>;
}

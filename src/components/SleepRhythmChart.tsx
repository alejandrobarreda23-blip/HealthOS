import { clockSummary, formatClock, type WeeklyLearning } from '../health/weekly-learning';
import { minusDays } from '../health/metrics/daily-series';
import { formatMonitoring } from '../health/monitoring-metrics';

type Night = WeeklyLearning['rhythm']['recent']['rows'][number];
// Align local clock times around the observed bedtime, including nights after midnight.
// Bar length is the clock interval, not the separately measured time asleep.
export function sleepTimeline(rows: Night[]) {
  const anchor = clockSummary(rows.map(n => n.bed))?.minute ?? 1380;
  const intervals = rows.map(n => {
    const start = anchor + ((n.bed - anchor + 2160) % 1440) - 720;
    const length = (n.wake - n.bed + 1440) % 1440;
    return { ...n, start, stop: start + length };
  });
  const min = Math.floor(Math.min(anchor, ...intervals.map(n => n.start)) / 120) * 120;
  const max = Math.max(min + 240, Math.ceil(Math.max(anchor + 480, ...intervals.map(n => n.stop)) / 120) * 120);
  return { intervals, min, max };
}

export default function SleepRhythmChart({ rows, end, onAddContext }: { rows: Night[]; end: string; onAddContext?: (date: string) => void }) {
  if (!rows.length) return <p>No hay horarios comparables en esta semana.</p>;
  const { intervals, min, max } = sleepTimeline(rows);
  const position = (minute: number) => (minute - min) / (max - min) * 100;
  const days = Array.from({ length: 7 }, (_, i) => minusDays(end, 6 - i));
  return <figure className="sleepRhythmChart" aria-label="Horarios de las siete noches">
    <figcaption>Cuándo empieza y termina cada noche <small>La barra muestra el intervalo registrado; el tiempo dormido aparece a la derecha. Fechas de despertar.</small></figcaption>
    <div className="sleepChartAxis" aria-hidden="true"><span/ ><div>{[min, (min + max) / 2, max].map((tick, i) => <span key={i} style={{ left: `${position(tick)}%` }}>{formatClock(tick)}</span>)}</div><span/></div>
    {days.map(date => {
      const night = intervals.find(n => n.date === date);
      const label = new Date(`${date}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      return <div className="sleepChartRow" key={date}>
        <time dateTime={date}>{label}</time>
        <div className="sleepChartTrack">{night ? <div className="sleepChartBar" role="img" aria-label={`${label}: ${formatClock(night.bed)} a ${formatClock(night.wake)}; ${formatMonitoring('sleep_duration', night.duration)} dormidos`} style={{ left: `${position(night.start)}%`, width: `${position(night.stop) - position(night.start)}%` }}><span>{formatClock(night.bed)}</span><span>{formatClock(night.wake)}</span></div> : <span className="sleepChartMissing">Sin horario comparable</span>}</div>
        <strong>{night ? formatMonitoring('sleep_duration', night.duration) : '—'}</strong>
        {onAddContext && <button className="sleepChartContext" aria-label={`Añadir contexto del ${date}`} onClick={() => onAddContext(date)}>＋ Contexto</button>}
      </div>;
    })}
    <small>Los huecos quedan visibles. Los horarios usan la zona registrada; la barra no mide el tiempo despierto ni ajusta su longitud por cambios de hora.</small>
  </figure>;
}

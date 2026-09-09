import { comparableSeries, median, minusDays, type DailyPoint } from './metrics/daily-series';
import { MONITORING_METRICS } from './monitoring-metrics';
import { quantile } from './evolution';
import { clockSummary, comparableSleepNights, type WeeklyInput } from './weekly-learning';

export const EPISODE_VERSION = 'episodes_v1';
// Display filters, not clinical limits or estimates of significance.
const FLOORS: Record<string, number> = { sleep_duration: 30, resting_heart_rate: 3, ultrahuman_sleep_hrv: 10, hrv_rmssd: 10, steps: 1000, sleep_efficiency: 3, oxygen_saturation: 1, temperature_deviation: .2, bedtime: 30 };
export const EPISODE_METRICS = [...MONITORING_METRICS.filter(m => m.key in FLOORS), { key: 'bedtime', label: 'Inicio del sueño', unit: 'min' }];
export interface SignalDay { date: string; value: number; ids: string[]; }
export interface SignalHistory { key: string; source: string; rows: SignalDay[]; circular: boolean; }
export interface Reference { center: number; threshold: number; mad: number; start: string; end: string; count: number; }
export interface SignalEpisode { id: string; key: string; source: string; start: string; end: string; direction: number; reference: Reference; delta: number; dates: string[]; status: 'returned' | 'ongoing' | 'interrupted'; returnedAt: string | null; }
export interface Episode { id: string; start: string; end: string; signals: SignalEpisode[]; }
export const distance = (value: number, center: number, circular = false) => circular ? ((value - center + 2160) % 1440) - 720 : value - center;
const middle = (values: number[], circular: boolean) => circular ? clockSummary(values)?.minute ?? null : median(values);
export const labelFor = (key: string) => EPISODE_METRICS.find(m => m.key === key)?.label ?? key;
export function episodeSignals(input: WeeklyInput, asOf: string): SignalHistory[] {
  const end = minusDays(asOf, 1);
  const sorted = [...input.points].filter(p => Number.isFinite(p.value)).sort((a, b) => a.physiologicalDate.localeCompare(b.physiologicalDate));
  const signals = EPISODE_METRICS.filter(m => m.key !== 'bedtime').flatMap(m => {
    const series = comparableSeries(sorted, m.key, end).points;
    if (!series.at(-1)?.provider) return [];
    const rows = [...new Map(series.map(p => [p.physiologicalDate, { date: p.physiologicalDate, value: p.value, ids: p.observationIds }])).values()];
    return [{ key: m.key, source: series.at(-1)!.sourceKey, rows, circular: false }];
  });
  const nights = comparableSleepNights({ ...input, points: sorted }, end);
  if (nights.length) signals.push({ key: 'bedtime', source: `${comparableSeries(sorted, 'sleep_duration', end).points.at(-1)?.sourceKey}|${nights.at(-1)!.timezone}`, circular: true,
    rows: nights.map(n => ({ date: n.date, value: n.bed, ids: [n.id] })) });
  return signals;
}
export function referenceBefore(signal: SignalHistory, start: string): Reference | null {
  const rows = signal.rows.filter(p => p.date >= minusDays(start, 28) && p.date < start);
  if (rows.length < 20) return null;
  const center = middle(rows.map(p => p.value), signal.circular)!;
  const mad = median(rows.map(p => Math.abs(distance(p.value, center, signal.circular))))!;
  const offsets = rows.map(p => distance(p.value, center, signal.circular));
  const iqr = quantile(offsets, .75)! - quantile(offsets, .25)!;
  return { center, mad, threshold: Math.max(FLOORS[signal.key] ?? Infinity, 2 * 1.4826 * mad, 2 * iqr / 1.349), start: minusDays(start, 28), end: minusDays(start, 1), count: rows.length };
}
export function detectSignalEpisodes(signal: SignalHistory, asOf: string): SignalEpisode[] {
  const rows = signal.rows.filter(p => p.date < asOf), result: SignalEpisode[] = [];
  for (let i = 0; i < rows.length - 2; i++) {
    const reference = referenceBefore({ ...signal, rows }, rows[i].date);
    if (!reference) continue;
    const deltaOf = (r: SignalDay) => distance(r.value, reference.center, signal.circular);
    const direction = Math.sign(deltaOf(rows[i]));
    const outside = (r: SignalDay) => direction * deltaOf(r) >= reference.threshold;
    if (!direction || ![0, 1, 2].every(k => outside(rows[i + k]) && rows[i + k].date === minusDays(rows[i].date, -k))) continue;
    const deviating = [rows[i], rows[i + 1], rows[i + 2]];
    let j = i + 3, inside = 0, returnedAt: string | null = null;
    for (; j < rows.length; j++) {
      if (rows[j].date !== minusDays(rows[j - 1].date, -1)) break;
      const d = deltaOf(rows[j]);
      if (direction * d <= -reference.threshold) break;
      if (outside(rows[j])) { deviating.push(rows[j]); inside = 0; }
      else if (++inside === 2) { returnedAt = rows[j].date; j++; break; }
    }
    const start = rows[i].date, end = deviating.at(-1)!.date;
    result.push({ id: `${signal.key}|${start}|${direction}|${signal.source}`, key: signal.key, source: signal.source, start, end, direction, reference,
      delta: median(deviating.map(deltaOf))!, dates: deviating.map(d => d.date), returnedAt,
      status: returnedAt ? 'returned' : j === rows.length && rows.at(-1)!.date === minusDays(asOf, 1) ? 'ongoing' : 'interrupted' });
    // An opposite shift or a gap can begin a new episode, but never reuse the old run.
    i = Math.max(i + 2, j - 1);
  }
  return result;
}
export function groupEpisodes(signals: SignalEpisode[]): Episode[] {
  const groups: Episode[] = [];
  for (const signal of [...signals].sort((a, b) => a.start.localeCompare(b.start) || a.key.localeCompare(b.key))) {
    const group = groups.find(g => !g.signals.some(s => s.key === signal.key) && signal.start <= minusDays(g.start, -7)
      && g.signals.some(s => s.dates.filter(d => signal.dates.includes(d)).length >= 2));
    if (group) { group.signals.push(signal); if (signal.end > group.end) group.end = signal.end; }
    else groups.push({ id: signal.id, start: signal.start, end: signal.end, signals: [signal] });
  }
  return groups.sort((a, b) => b.start.localeCompare(a.start));
}
export function buildEpisodeReading(input: WeeklyInput, asOf: string) {
  const signals = episodeSignals(input, asOf), start = minusDays(asOf, 7), end = minusDays(asOf, 1);
  const summary = signals.flatMap(signal => {
    const recent = signal.rows.filter(r => r.date >= start && r.date <= end);
    if (!recent.length) return [];
    const reference = referenceBefore(signal, start), value = middle(recent.map(r => r.value), signal.circular)!;
    const delta = reference ? distance(value, reference.center, signal.circular) : null;
    const persistent = reference && delta !== null ? recent.filter(r => Math.sign(delta) * distance(r.value, reference.center, signal.circular) >= reference.threshold).length : 0;
    const state = !reference || recent.length < 5 ? 'insufficient' : Math.abs(delta!) >= reference.threshold && persistent >= 4 ? 'shift' : Math.abs(delta!) < reference.threshold ? 'within' : 'mixed';
    return [{ key: signal.key, reference, value, delta, state, count: recent.length, persistent }];
  });
  const episodes = groupEpisodes(signals.flatMap(s => detectSignalEpisodes(s, asOf))).filter(e => e.start >= minusDays(asOf, 365));
  const changed = summary.filter(s => s.state === 'shift'), within = summary.filter(s => s.state === 'within');
  const title = changed.length ? `${changed.map(s => labelFor(s.key)).join(', ')}: diferencias que se mantienen esta semana`
    : within.length >= 2 ? 'Las señales comparables no muestran un desplazamiento semanal claro'
    : 'Estamos reuniendo días comparables para leerlos juntos';
  return { version: EPISODE_VERSION, asOf, start, end, signals, summary, episodes, title, changed, within };
}
export type EpisodeReading = ReturnType<typeof buildEpisodeReading>;
export function episodeContext(input: Pick<WeeklyInput, 'events' | 'checkIns'>, episode: Episode) {
  const start = minusDays(episode.start, 3), end = minusDays(episode.end, -3);
  return { events: input.events.filter(e => e.date <= end && (e.endDate ?? e.date) >= start), checkIns: input.checkIns.filter(c => c.date >= start && c.date <= end) };
}

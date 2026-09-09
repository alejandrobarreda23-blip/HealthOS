import { comparableSeries, median, minusDays, type DailyPoint } from './metrics/daily-series';
import { monitoringSummary } from './monitoring';

export const WEEKLY_VERSION = 'weekly_learning_v1';
export interface SleepRecord { id: string; date: string; start: string; end: string; timezone: string | null; provider: string | null; device: string | null; version: string | null; }
export interface ContextRecord { id: string; date: string; type: string; endDate?: string | null; note?: string | null; }
export interface CheckInRecord { id: string; date: string; stress: number | null; energy: number | null; fatigue: number | null; }
export interface WeeklyInput { points: DailyPoint[]; sleeps: SleepRecord[]; events: ContextRecord[]; checkIns: CheckInRecord[]; }
export type QuestionState = 'collecting' | 'insufficient' | 'first_signal' | 'repeated' | 'inconsistent' | 'no_difference';
export const QUESTION_STATES: Record<QuestionState, string> = {
  collecting: 'Construyendo la referencia', insufficient: 'Faltan días comparables', first_signal: 'Una primera comparación',
  repeated: 'La diferencia vuelve a aparecer', inconsistent: 'No mantiene la misma diferencia', no_difference: 'Sin una diferencia sostenida',
};
export interface FrozenReference { questionId: string; start: string; end: string; threshold: number; source: string; }
export interface MatchedDay { date: string; exposureDates: string[]; x: number; y: number; priorSleep: number | null; steps: number | null; stress: number | null; timezone: string | null; observationIds: string[]; }
export interface DayMatch { lower: MatchedDay; higher: MatchedDay; }
export interface QuestionBlock { start: string; end: string; complete: boolean; candidates: number; matches: DayMatch[]; lower: number | null; higher: number | null; delta: number | null; }
export interface WeeklyQuestion {
  id: string; title: string; x: string; y: string; state: QuestionState; reference: FrozenReference | null;
  calibrationCount: number; eligibleDays: number; excludedContext: number; blocks: QuestionBlock[]; source: string;
}
export interface QuestionMemory { id: string; weekEnd: string; recordedAt: string; questionId: string; state: QuestionState; reference: FrozenReference | null; delta: number | null; pairs: number; }
export const dayCount = (start: string, end: string) => Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
export function lastCompletedSunday(today: string) {
  const yesterday = minusDays(today, 1);
  return minusDays(yesterday, new Date(`${yesterday}T12:00:00Z`).getUTCDay());
}
const isWeekend = (date: string) => [0, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay());
const sourceOf = (s: SleepRecord) => JSON.stringify([s.provider ?? 'unknown', s.device ?? 'unknown', s.version ?? 'unknown']);
function series(input: WeeklyInput, key: string, end: string) {
  return [...new Map(comparableSeries(input.points, key, end).points.filter(p => p.provider && Number.isFinite(p.value)).map(p => [p.physiologicalDate, p])).values()];
}
function localMinutes(instant: string, zone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant));
    return Number(parts.find(p => p.type === 'hour')!.value) * 60 + Number(parts.find(p => p.type === 'minute')!.value);
  } catch { return null; }
}
const clockDistance = (a: number, b: number) => ((a - b + 2160) % 1440) - 720;
export function clockSummary(values: number[]) {
  if (!values.length) return null;
  const anchor = [...values].sort((a, b) => values.reduce((s, x) => s + Math.abs(clockDistance(x, a)), 0) - values.reduce((s, x) => s + Math.abs(clockDistance(x, b)), 0) || a - b)[0];
  const middle = median(values.map(v => anchor + clockDistance(v, anchor)))!;
  return { minute: ((middle % 1440) + 1440) % 1440, deviation: median(values.map(v => Math.abs(clockDistance(v, middle))))! };
}
export function formatClock(minute: number) {
  const value = (Math.round(minute) + 1440) % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
export function sleepRhythm(input: WeeklyInput, end: string) {
  const durations = series(input, 'sleep_duration', end);
  const nights = durations.flatMap(p => {
    const candidates = input.sleeps.filter(s => s.date === p.physiologicalDate && sourceOf(s) === p.sourceKey && s.timezone && Date.parse(s.end) > Date.parse(s.start) && Date.parse(s.end) - Date.parse(s.start) <= 20 * 3600000);
    // Keep the longest matching interval; naps and duplicate sources never count as another night.
    const record = candidates.sort((a, b) => (Date.parse(b.end) - Date.parse(b.start)) - (Date.parse(a.end) - Date.parse(a.start)) || a.id.localeCompare(b.id))[0];
    if (!record) return [];
    const bed = localMinutes(record.start, record.timezone!), wake = localMinutes(record.end, record.timezone!);
    return bed === null || wake === null ? [] : [{ date: record.date, bed, wake, duration: p.value, timezone: record.timezone!, id: record.id }];
  });
  let segmentStart = nights.length - 1;
  while (segmentStart > 0 && nights[segmentStart - 1].timezone === nights.at(-1)?.timezone) segmentStart--;
  const comparable = nights.slice(Math.max(0, segmentStart));
  const window = (start: string, stop: string) => {
    const rows = comparable.filter(n => n.date >= start && n.date <= stop);
    return { rows, count: rows.length, bedtime: rows.length >= 5 ? clockSummary(rows.map(n => n.bed)) : null, wake: rows.length >= 5 ? clockSummary(rows.map(n => n.wake)) : null };
  };
  const recent = window(minusDays(end, 6), end), previous = window(minusDays(end, 13), minusDays(end, 7));
  const month = comparable.filter(n => n.date >= minusDays(end, 27) && n.date <= end);
  const weekend = month.filter(n => isWeekend(n.date)), weekday = month.filter(n => !isWeekend(n.date));
  const weekendReady = weekend.length >= 4 && weekday.length >= 12;
  return { recent, previous, timezone: comparable.at(-1)?.timezone ?? null,
    bedtimeShift: recent.bedtime && previous.bedtime ? clockDistance(recent.bedtime.minute, previous.bedtime.minute) : null,
    weekend: { weekendCount: weekend.length, weekdayCount: weekday.length,
      sleepDifference: weekendReady ? median(weekend.map(n => n.duration))! - median(weekday.map(n => n.duration))! : null,
      wakeShift: weekendReady ? clockDistance(clockSummary(weekend.map(n => n.wake))!.minute, clockSummary(weekday.map(n => n.wake))!.minute) : null },
  };
}

function excludedDates(events: ContextRecord[], end: string) {
  const dates = new Set<string>();
  for (const event of events.filter(e => ['illness', 'travel'].includes(e.type) && e.date <= end)) {
    const stop = event.endDate && event.endDate > event.date ? event.endDate : event.date;
    for (let i = 0; i <= Math.min(366, dayCount(event.date, stop)); i++) dates.add(minusDays(event.date, -i));
  }
  return dates;
}

export function matchDays(lower: MatchedDay[], higher: MatchedDay[], matchPriorSleep: boolean): DayMatch[] {
  const remaining = [...lower], matches: DayMatch[] = [];
  const usedDates = new Set<string>();
  const datesOf = (day: MatchedDay) => [...new Set([day.date, ...day.exposureDates])];
  for (const hi of [...higher].sort((a, b) => a.date.localeCompare(b.date))) {
    if (datesOf(hi).some(d => usedDates.has(d))) continue;
    const eligible = remaining.filter(lo => datesOf(lo).every(d => !usedDates.has(d) && !datesOf(hi).includes(d))
      && isWeekend(lo.date) === isWeekend(hi.date) && lo.timezone === hi.timezone
      && Math.abs(dayCount(lo.date, hi.date) - 1) <= 14
      && (!matchPriorSleep || (lo.priorSleep !== null && hi.priorSleep !== null && Math.abs(lo.priorSleep - hi.priorSleep) <= 60))
      && (lo.steps === null || hi.steps === null || Math.abs(lo.steps - hi.steps) <= 3000)
      && (lo.stress === null || hi.stress === null || (lo.stress >= 4) === (hi.stress >= 4)));
    eligible.sort((a, b) => Math.abs(dayCount(a.date, hi.date) - 1) - Math.abs(dayCount(b.date, hi.date) - 1) || a.date.localeCompare(b.date));
    if (eligible[0]) { matches.push({ lower: eligible[0], higher: hi }); [...datesOf(eligible[0]), ...datesOf(hi)].forEach(d => usedDates.add(d)); remaining.splice(remaining.indexOf(eligible[0]), 1); }
  }
  return matches;
}

export function weeklyQuestions(input: WeeklyInput, end: string, memories: QuestionMemory[] = []): WeeklyQuestion[] {
  const hrv = series(input, 'ultrahuman_sleep_hrv', end).length ? 'ultrahuman_sleep_hrv' : 'hrv_rmssd';
  const definitions = [
    { id: 'sleep-pulse', title: '¿Tu pulso cambia entre noches más largas y más cortas?', x: 'sleep_duration', y: 'resting_heart_rate', lag: 0, streak: false },
    { id: 'steps-next-sleep', title: '¿Duermes distinto después de un día con más pasos?', x: 'steps', y: 'sleep_duration', lag: 1, streak: false },
    { id: 'short-nights-hrv', title: '¿Cómo cambia tu HRV después de dos noches más cortas?', x: 'sleep_duration', y: hrv, lag: 1, streak: true },
  ];
  const sleep = new Map(series(input, 'sleep_duration', end).map(p => [p.physiologicalDate, p]));
  const steps = new Map(series(input, 'steps', end).map(p => [p.physiologicalDate, p]));
  const checkIns = new Map(input.checkIns.map(c => [c.date, c]));
  const zones = new Map<string, string | null>();
  for (const record of input.sleeps) {
    if (sleep.get(record.date)?.sourceKey === sourceOf(record)) {
      const existing = zones.get(record.date);
      zones.set(record.date, existing !== undefined && existing !== record.timezone ? null : record.timezone);
    }
  }
  const excluded = excludedDates(input.events, end);
  return definitions.map(q => {
    const xRows = series(input, q.x, end), yRows = series(input, q.y, end);
    const xMap = new Map(xRows.map(p => [p.physiologicalDate, p]));
    const source = JSON.stringify([xRows.at(-1)?.sourceKey ?? '', yRows.at(-1)?.sourceKey ?? '']);
    const first = [xRows[0]?.physiologicalDate, yRows[0]?.physiologicalDate].filter((d): d is string => Boolean(d)).sort().at(-1) ?? end;
    const calibrationEnd = minusDays(first, -27);
    const calibration = xRows.filter(p => p.physiologicalDate >= first && p.physiologicalDate <= calibrationEnd && !excluded.has(p.physiologicalDate));
    const oldReference = memories.filter(m => m.weekEnd <= end && m.questionId === q.id && m.reference?.source === source && m.reference.end <= end && m.reference.start >= first).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))[0]?.reference;
    const reference: FrozenReference | null = oldReference ?? (xRows.length && yRows.length && end >= calibrationEnd && calibration.length >= 20 ? { questionId: q.id, start: first, end: calibrationEnd, threshold: median(calibration.map(p => p.value))!, source } : null);
    let excludedContext = 0;
    const candidates: MatchedDay[] = !reference ? [] : yRows.filter(y => y.physiologicalDate > reference.end).flatMap(y => {
      const date = y.physiologicalDate, xDate = minusDays(date, q.lag), x = xMap.get(xDate);
      const previousX = q.streak ? xMap.get(minusDays(xDate, 1)) : null;
      if (!x || (q.streak && !previousX)) return [];
      const exposureDates = q.streak ? [minusDays(xDate, 1), xDate] : [xDate];
      if (exposureDates.some(d => d <= reference.end)) return [];
      if ([date, ...exposureDates].some(d => excluded.has(d))) { excludedContext++; return []; }
      // Require both preceding nights on the same side of the frozen personal reference.
      if (q.streak && (x.value <= reference.threshold) !== (previousX!.value <= reference.threshold)) return [];
      return [{ date, exposureDates, x: q.streak ? (x.value + previousX!.value) / 2 : x.value, y: y.value,
        priorSleep: sleep.get(minusDays(date, 1))?.value ?? null,
        steps: q.x === 'steps' ? null : steps.get(minusDays(date, 1))?.value ?? null,
        stress: checkIns.get(minusDays(date, 1))?.stress ?? null,
        timezone: zones.get(date) ?? null,
        observationIds: [...x.observationIds, ...y.observationIds, ...(previousX?.observationIds ?? [])],
      }];
    });
    const blocks: QuestionBlock[] = [];
    if (reference) {
      for (let start = minusDays(reference.end, -1); start <= end; start = minusDays(start, -28)) {
        const stop = minusDays(start, -27) < end ? minusDays(start, -27) : end;
        const rows = candidates.filter(p => p.date >= start && p.date <= stop && p.exposureDates.every(d => d >= start));
        const matches = matchDays(rows.filter(p => p.x <= reference.threshold), rows.filter(p => p.x > reference.threshold), !q.streak);
        const lower = median(matches.map(p => p.lower.y)), higher = median(matches.map(p => p.higher.y));
        const delta = dayCount(start, stop) >= 14 && matches.length >= 4 ? median(matches.map(p => p.higher.y - p.lower.y)) : null;
        blocks.push({ start, end: stop, complete: dayCount(start, stop) === 28, candidates: rows.length, matches, lower, higher, delta });
      }
    }
    // Only disjoint time blocks provide repetitions; successive weekly snapshots do not.
    const eligible = blocks.filter(b => b.delta !== null).slice(-2);
    let state: QuestionState = !reference ? 'collecting' : !eligible.length ? 'insufficient' : eligible.length === 1 ? eligible[0].delta === 0 ? 'no_difference' : 'first_signal' : 'inconsistent';
    if (eligible.length === 2) {
      const [a, b] = eligible.map(b => b.delta!);
      state = a === 0 && b === 0 ? 'no_difference' : a !== 0 && b !== 0 && Math.sign(a) === Math.sign(b) && Math.min(Math.abs(a), Math.abs(b)) / Math.max(Math.abs(a), Math.abs(b)) >= .5 ? 'repeated' : 'inconsistent';
    }
    if (eligible.length && dayCount(eligible.at(-1)!.end, end) > 28) state = 'insufficient';
    return { id: q.id, title: q.title, x: q.x, y: q.y, state, reference, calibrationCount: calibration.length, eligibleDays: candidates.length, excludedContext, blocks, source };
  });
}

export function buildWeeklyLearning(input: WeeklyInput, end: string, memories: QuestionMemory[] = []) {
  const start = minusDays(end, 6);
  return { version: WEEKLY_VERSION, start, end,
    changes: monitoringSummary(input.points, minusDays(end, -1)).filter(s => ['sleep_duration', 'resting_heart_rate', 'ultrahuman_sleep_hrv', 'hrv_rmssd', 'steps'].includes(s.key)),
    rhythm: sleepRhythm(input, end), questions: weeklyQuestions(input, end, memories),
    events: input.events.filter(e => e.date <= end && (e.endDate ?? e.date) >= start),
    checkIns: input.checkIns.filter(c => c.date >= start && c.date <= end),
  };
}
export type WeeklyLearning = ReturnType<typeof buildWeeklyLearning>;

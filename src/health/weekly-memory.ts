import { QUESTION_STATES, WEEKLY_VERSION, type QuestionMemory, type WeeklyLearning } from './weekly-learning';
export function stableJSON(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJSON).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, v]) => `${JSON.stringify(key)}:${stableJSON(v)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export async function weeklyAssociationRows(userId: string, report: WeeklyLearning) {
  return Promise.all(report.questions.map(async q => {
    const last = q.blocks.filter(b => b.delta !== null).at(-1);
    const evidence = { kind: 'weekly_question', version: WEEKLY_VERSION, weekEnd: report.end, questionId: q.id, state: q.state,
      reference: q.reference, delta: last?.delta ?? null, pairs: last?.matches.length ?? 0,
      blocks: q.blocks, excludedContext: q.excludedContext, eligibleDays: q.eligibleDays, source: q.source,
      weeklyReading: { start: report.start, end: report.end, rhythm: report.rhythm,
        changes: report.changes.map(c => ({ key: c.key, recent: c.recentMedian, reference: c.reference, delta: c.delta, recentDays: c.recent.length, referenceDays: c.prior.length })),
        eventIds: report.events.map(e => e.id), checkIns: report.checkIns } };
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stableJSON({ userId, evidence })));
    const h = [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, '0')).join('');
    const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
    return { id, user_id: userId, exposure_key: `weekly:${q.id}`, outcome_key: q.y, analysis_window: 'weekly_review',
      period_start: q.reference?.start ?? report.start, period_end: report.end, n_exposed: last?.matches.length ?? 0, n_control: last?.matches.length ?? 0,
      effect_type: 'median_paired_difference', effect_value: last?.delta ?? null, effect_unit: q.y === 'sleep_duration' ? 'min' : q.y === 'resting_heart_rate' ? 'bpm' : 'ms',
      confidence: null, adjusted_for: ['weekday_weekend', 'nearby_dates'], method: 'descriptive_matching_disjoint_28d', analysis_version: WEEKLY_VERSION, evidence };
  }));
}
export function parseQuestionMemory(row: { id?: unknown; created_at?: unknown; evidence?: unknown }): QuestionMemory | null {
  const e = row.evidence as Record<string, unknown> | null;
  if (!e || e.kind !== 'weekly_question' || e.version !== WEEKLY_VERSION || typeof row.id !== 'string' || typeof row.created_at !== 'string'
    || typeof e.weekEnd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.weekEnd) || typeof e.questionId !== 'string'
    || !['sleep-pulse', 'steps-next-sleep', 'short-nights-hrv'].includes(e.questionId) || typeof e.state !== 'string' || !Object.hasOwn(QUESTION_STATES, e.state)
    || !(e.delta === null || typeof e.delta === 'number' && Number.isFinite(e.delta)) || typeof e.pairs !== 'number' || !Number.isInteger(e.pairs) || e.pairs < 0) return null;
  const reference = e.reference as QuestionMemory['reference'];
  if (reference !== null && (!reference || reference.questionId !== e.questionId || typeof reference.source !== 'string' || !Number.isFinite(reference.threshold)
    || typeof reference.start !== 'string' || typeof reference.end !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(reference.start) || !/^\d{4}-\d{2}-\d{2}$/.test(reference.end) || reference.start > reference.end || reference.end > e.weekEnd)) return null;
  return { id: row.id, recordedAt: row.created_at, weekEnd: e.weekEnd, questionId: e.questionId, state: e.state as QuestionMemory['state'], reference, delta: e.delta, pairs: e.pairs };
}

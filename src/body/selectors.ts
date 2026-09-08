import { BODY_SYSTEM_CONFIG } from './system-config';
import { coverageStatus, normalizeEvidenceKind, type BodyHistorySnapshot, type BodySystemKey, type BodySystemState } from './view-state';
import { evaluateMetric, type MetricEvaluation } from '../health/metrics/evaluation';
import { minusDays } from '../health/metrics/daily-series';
import type { FindingCandidateV1 } from '../health/findings-v1/types';

export function relatedFindings(findings: FindingCandidateV1[], key: BodySystemKey) {
  const metrics = BODY_SYSTEM_CONFIG[key].metrics.map(m => m.key);
  const relevant = findings.filter(f => f.domain !== 'data_quality' && f.inputMetrics.some(m => metrics.includes(m)));
  return [...new Map(relevant.map(f => [`${f.findingKey}|${f.periodEnd}`, f])).values()];
}
export function selectBody(history: BodyHistorySnapshot | null, date: string) {
  const points = history?.points ?? [];
  const keys = [...new Set(Object.values(BODY_SYSTEM_CONFIG).flatMap(c => c.metrics.map(m => m.key)))].filter(k => k !== 'exercise');
  const evaluations = Object.fromEntries(keys.map(k => [k, evaluateMetric(points, k, date)])) as Record<string, MetricEvaluation>;
  const findings = Object.values(evaluations).flatMap(e => e.finding ? [e.finding] : []);
  const selectedDay = history?.days.find(d => d.date === date) ?? null;
  const systems: BodySystemState[] = Object.values(BODY_SYSTEM_CONFIG).map(config => {
    const channels = config.metrics.filter(m => m.key !== 'exercise');
    const present = channels.filter(m => selectedDay?.metrics[m.key]);
    const coverage = channels.length ? present.length / channels.length : 0;
    const evidenceKinds = [...new Set(present.map(m => normalizeEvidenceKind(selectedDay?.metrics[m.key].evidence)))];
    const related = relatedFindings(findings, config.key);
    return { key: config.key, title: config.label, coverage, status: coverageStatus(coverage),
      headline: related.length ? `${related.length} cambio${related.length > 1 ? 's' : ''} con evidencia` : 'Señales y referencia personal',
      detail: `${present.length}/${channels.length} canales en la fecha`, evidenceKinds,
      finding: related[0] ?? null, findings: related, hasExactDaySignal: present.length > 0,
      // A daily summary does not measure anatomical motion.
      canAnimate: false };
  });
  const training = (history?.days ?? []).filter(d => d.date >= minusDays(date, 6) && d.date <= date);
  return { evaluations, systems, findings, selectedDay,
    trainingSessions: training.reduce((sum, d) => sum + d.exerciseCount, 0),
    trainingMinutes: training.reduce((sum, d) => sum + d.exerciseMinutes, 0) };
}
export function compareBodyMetric(history: BodyHistorySnapshot | null, key: string, date: string, comparisonDate: string | null) {
  if (!comparisonDate) return { delta: null, reason: '' };
  const points = history?.points ?? [];
  const a = points.find(p => p.metricKey === key && p.physiologicalDate === date);
  const b = points.find(p => p.metricKey === key && p.physiologicalDate === comparisonDate);
  if (!a || !b) return { delta: null, reason: 'Falta una observación en alguna de las fechas.' };
  const between = points.filter(p => p.metricKey === key && p.physiologicalDate >= (date < comparisonDate ? date : comparisonDate) && p.physiologicalDate <= (date > comparisonDate ? date : comparisonDate));
  if (!a.provider || a.unit !== b.unit || between.some(p => p.sourceKey !== a.sourceKey)) return { delta: null, reason: 'Fuentes o métodos no comparables.' };
  return { delta: a.value - b.value, reason: 'Diferencia descriptiva entre fechas; no indica mejoría o empeoramiento.' };
}
export function clampBodyDate(date: string, end: string, days: number) {
  const start = minusDays(end, days - 1);
  return date < start ? start : date > end ? end : date;
}

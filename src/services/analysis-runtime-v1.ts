import { buildDualBaselineV1, medianV1 } from '../health/baselines/engine';
import type { BaselineSnapshotV1, DatedValue } from '../health/baselines/types';
import {
  detectInsufficientRecentDataV1,
  detectRecoveryConcordanceV1,
  detectSleepDeficitV1,
  detectSpo2DeviationV1,
  detectSustainedHrvDropV2,
  detectSustainedRhrElevationV1,
  detectWeightTrendV1,
} from '../health/findings-v1/engine';
import type { FindingCandidateV1 } from '../health/findings-v1/types';
import { buildHealthBriefV1, type BriefMetricV1, type HealthBriefV1 } from './health-brief-v1';

export interface RuntimeObservationV1 {
  metricKey: string;
  physiologicalDate: string;
  value: number;
  provider?: string | null;
  sourceDevice?: string | null;
  normalizerVersion?: string | null;
}

export interface RuntimeExerciseV1 {
  physiologicalDate: string;
  durationMinutes: number;
  distanceKm: number;
  elevationGainM: number;
}

export interface RuntimeEventV1 {
  physiologicalDate: string;
  eventType: string;
}

export interface RuntimeAnalysisV1 {
  asOfDate: string;
  baselines: Record<string, BaselineSnapshotV1>;
  findings: FindingCandidateV1[];
  brief: HealthBriefV1;
}

const CORE = ['hrv_rmssd', 'resting_heart_rate', 'sleep_duration', 'oxygen_saturation', 'steps'] as const;

function minusDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function rowsFor(observations: RuntimeObservationV1[], metricKey: string): DatedValue[] {
  return observations
    .filter((o) => o.metricKey === metricKey && Number.isFinite(o.value))
    .map((o) => ({ date: o.physiologicalDate, value: o.value }));
}

function recent(rows: DatedValue[], asOfDate: string, days: number): DatedValue[] {
  const start = minusDays(asOfDate, days - 1);
  return rows.filter((r) => r.date >= start && r.date <= asOfDate);
}

function latestValue(rows: DatedValue[], asOfDate: string): number | null {
  const candidates = rows.filter((r) => r.date <= asOfDate).sort((a, b) => b.date.localeCompare(a.date));
  return candidates[0]?.value ?? null;
}

function briefMetric(
  rows: DatedValue[],
  asOfDate: string,
  unit: string,
  baseline: BaselineSnapshotV1 | null,
): BriefMetricV1 {
  const r = recent(rows, asOfDate, 7);
  return {
    current: rows.find((x) => x.date === asOfDate)?.value ?? null,
    unit,
    recentMedian: medianV1(r.map((x) => x.value)),
    baseline,
    status: r.length >= 4 ? 'ok' : r.length ? 'insufficient_recent_data' : 'no_data',
  };
}

export function buildRuntimeAnalysisV1(input: {
  asOfDate: string;
  observations: RuntimeObservationV1[];
  exercises: RuntimeExerciseV1[];
  events: RuntimeEventV1[];
  sources?: string[];
  normalizers?: string[];
}): RuntimeAnalysisV1 {
  const { asOfDate, observations } = input;
  const metricRows = Object.fromEntries(CORE.map((key) => [key, rowsFor(observations, key)])) as Record<string, DatedValue[]>;

  const baselines: Record<string, BaselineSnapshotV1> = {};
  for (const key of CORE) {
    baselines[key] = buildDualBaselineV1(key, minusDays(asOfDate, 7), metricRows[key]).reference;
  }

  const coverage: Record<string, { observed: number; expected: number }> = {};
  for (const key of CORE) coverage[key] = { observed: recent(metricRows[key], asOfDate, 7).length, expected: 7 };

  const recentEventTypes = new Set(
    input.events
      .filter((e) => e.physiologicalDate >= minusDays(asOfDate, 13) && e.physiologicalDate <= asOfDate)
      .map((e) => e.eventType),
  );
  const confounders = [...recentEventTypes];

  const findings: FindingCandidateV1[] = [];
  const coverageFinding = detectInsufficientRecentDataV1(asOfDate, coverage);
  if (coverageFinding) findings.push(coverageFinding);

  // Physiological detectors are allowed to run only when their own coverage and baseline rules are met.
  const hrv = detectSustainedHrvDropV2(asOfDate, metricRows.hrv_rmssd, confounders);
  const rhr = detectSustainedRhrElevationV1(asOfDate, metricRows.resting_heart_rate, confounders);
  const sleep = detectSleepDeficitV1(asOfDate, metricRows.sleep_duration, confounders);
  const recoveryConcordance = detectRecoveryConcordanceV1(asOfDate, hrv, rhr, confounders);
  const spo2 = detectSpo2DeviationV1(asOfDate, metricRows.oxygen_saturation, confounders);
  const weight = detectWeightTrendV1(asOfDate, rowsFor(observations, 'weight'), confounders);
  if (hrv) findings.push(hrv);
  if (rhr) findings.push(rhr);
  if (recoveryConcordance) findings.push(recoveryConcordance);
  if (sleep) findings.push(sleep);
  if (spo2) findings.push(spo2);
  if (weight) findings.push(weight);

  const exerciseStart = minusDays(asOfDate, 6);
  const recentExercises = input.exercises.filter((e) => e.physiologicalDate >= exerciseStart && e.physiologicalDate <= asOfDate);
  const eventCounts = new Map<string, number>();
  for (const event of input.events.filter((e) => e.physiologicalDate >= exerciseStart && e.physiologicalDate <= asOfDate)) {
    eventCounts.set(event.eventType, (eventCounts.get(event.eventType) ?? 0) + 1);
  }

  const brief = buildHealthBriefV1({
    date: asOfDate,
    coverage,
    recovery: {
      hrv: briefMetric(metricRows.hrv_rmssd, asOfDate, 'ms', baselines.hrv_rmssd),
      restingHr: briefMetric(metricRows.resting_heart_rate, asOfDate, 'bpm', baselines.resting_heart_rate),
    },
    sleep: {
      duration: briefMetric(metricRows.sleep_duration, asOfDate, 'min', baselines.sleep_duration),
    },
    training: {
      sessions7d: recentExercises.length,
      durationMinutes7d: recentExercises.reduce((s, e) => s + e.durationMinutes, 0),
      distanceKm7d: recentExercises.reduce((s, e) => s + e.distanceKm, 0),
      elevationGainM7d: recentExercises.reduce((s, e) => s + e.elevationGainM, 0),
      load7d: null,
      load28d: null,
    },
    body: { weightKg: latestValue(rowsFor(observations, 'weight'), asOfDate) },
    events: [...eventCounts.entries()].map(([type, count]) => ({ type, count })),
    activeFindings: findings,
    uncertainty: [],
    provenance: {
      sources: input.sources ?? [...new Set(observations.map((o) => o.provider).filter((x): x is string => Boolean(x)))],
      normalizers: input.normalizers ?? [...new Set(observations.map((o) => o.normalizerVersion).filter((x): x is string => Boolean(x)))],
      dailyFeaturesVersion: 'daily_features_v1',
      baselineVersion: 'baseline_v1',
      findingVersions: [...new Set(findings.map((f) => f.detectorVersion))],
    },
  });

  return { asOfDate, baselines, findings, brief };
}

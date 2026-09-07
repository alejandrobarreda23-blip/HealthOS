import type { FindingCandidateV1 } from '../health/findings-v1/types';

export type BodySystemKey =
  | 'autonomic'
  | 'cardio'
  | 'sleep'
  | 'musculo'
  | 'metabolic'
  | 'recovery';

export type BodyEvidenceKind =
  | 'measured'
  | 'derived'
  | 'reported'
  | 'inferred'
  | 'mixed'
  | 'unknown';

export type BodyCoverageStatus = 'observed' | 'partial' | 'insufficient' | 'absent';

export interface BodyMetricValue {
  metricKey: string;
  value: number;
  unit: string | null;
  evidence: BodyEvidenceKind;
  provider: string | null;
}

export interface BodyHistoryDay {
  date: string;
  metrics: Record<string, BodyMetricValue>;
  exerciseCount: number;
  exerciseMinutes: number;
  exerciseElevationM: number;
  coverage: number;
  evidenceKinds: BodyEvidenceKind[];
}

export interface BodyHistorySnapshot {
  startDate: string;
  endDate: string;
  latestObservedDate: string | null;
  days: BodyHistoryDay[];
}

export interface BodySystemState {
  key: BodySystemKey;
  title: string;
  headline: string;
  detail: string;
  coverage: number;
  status: BodyCoverageStatus;
  evidenceKinds: BodyEvidenceKind[];
  finding: FindingCandidateV1 | null;
  hasExactDaySignal: boolean;
  canAnimate: boolean;
}

export function normalizeEvidenceKind(value: unknown): BodyEvidenceKind {
  if (value === 'measured' || value === 'derived' || value === 'reported' || value === 'inferred') {
    return value;
  }
  return 'unknown';
}

export function mergeEvidenceKinds(values: BodyEvidenceKind[]): BodyEvidenceKind {
  const clean = [...new Set(values.filter((x) => x !== 'unknown'))];
  if (!clean.length) return 'unknown';
  if (clean.length === 1) return clean[0];
  return 'mixed';
}

export function findingSystem(finding: FindingCandidateV1): BodySystemKey | null {
  const domain = finding.domain.toLowerCase();
  const keys = finding.inputMetrics.map((x) => x.toLowerCase());

  if (domain === 'data_quality') return null;
  if (domain.includes('sleep') || keys.includes('sleep_duration')) return 'sleep';
  if (domain.includes('respiratory') || keys.includes('oxygen_saturation')) return 'cardio';
  if (domain.includes('body') || keys.includes('weight')) return 'metabolic';
  if (domain.includes('training') && !domain.includes('recovery')) return 'musculo';
  if (domain.includes('recovery') || keys.includes('hrv_rmssd')) return 'recovery';
  if (keys.includes('resting_heart_rate')) return 'cardio';
  return null;
}

export function formatBodyValue(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Sin dato exacto';
  if (unit === 'kg') return `${value.toFixed(1)} kg`;
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'count') return `${Math.round(value).toLocaleString('es-ES')}`;
  return `${Math.round(value)} ${unit}`;
}

export function formatSleepMinutes(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Sin dato exacto';
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return `${hours} h ${String(minutes).padStart(2, '0')} min`;
}

export function coverageStatus(coverage: number): BodyCoverageStatus {
  if (coverage >= 0.75) return 'observed';
  if (coverage >= 0.35) return 'partial';
  if (coverage > 0) return 'insufficient';
  return 'absent';
}

export const BODY_CORE_METRICS = [
  'hrv_rmssd',
  'resting_heart_rate',
  'sleep_duration',
  'oxygen_saturation',
  'steps',
] as const;

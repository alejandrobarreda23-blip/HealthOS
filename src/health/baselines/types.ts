export type EvidenceStrength = 'INSUFFICIENT' | 'LOW' | 'MODERATE' | 'HIGH';
export type ContextualBaselineStatus = 'insufficient' | 'exploratory' | 'usable' | 'established';

export interface DatedValue {
  date: string;
  value: number;
  excludedFromReference?: boolean;
  exclusionReasons?: string[];
  sourceFamily?: string;
}

export interface BaselineSnapshotV1 {
  metricKey: string;
  asOfDate: string;
  windowDays: number;
  sampleCount: number;
  expectedDays: number;
  coverage: number;
  median: number | null;
  mad: number | null;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  sufficient: boolean;
  evidenceStrength: EvidenceStrength;
  version: 'baseline_v1';
}

export interface DualBaselineV1 {
  allContexts: BaselineSnapshotV1;
  reference: BaselineSnapshotV1;
  excludedReferenceSamples: number;
  exclusionReasons: Record<string, number>;
}

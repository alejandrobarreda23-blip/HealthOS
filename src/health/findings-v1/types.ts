import type { EvidenceStrength } from '../baselines/types';
export type FindingSeverityV1='info'|'low'|'moderate'|'high';
export interface FindingRegistryEntryV1{
  findingKey:string; domain:string; title:string; description:string; inputMetrics:string[]; recentWindowDays:number; baselineWindowDays?:number; minimumRecentSamples:number; minimumBaselineSamples?:number; confounders:string[]; interpretationBoundary:string; detectorVersion:string;
}
export interface FindingCandidateV1{
  findingKey:string; domain:string; title:string; summary:string; periodStart:string; periodEnd:string; severity:FindingSeverityV1; evidenceStrength:EvidenceStrength; detectorVersion:string; inputMetrics:string[]; observedValue?:number|null; referenceValue?:number|null; effectSize?:number|null; robustZ?:number|null; sampleCount:number; coverage:number; evidence:Record<string,unknown>; confounders:string[]; interpretationBoundary:string;
}

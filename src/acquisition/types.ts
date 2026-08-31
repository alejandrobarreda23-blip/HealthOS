export type MeasurementMode=
 |'passive_continuous'|'passive_daily'|'home_periodic'|'episodic_protocol'
 |'laboratory_periodic'|'clinical_episodic'|'manual_contextual';
export type ManualBurden='none'|'very_low'|'low'|'moderate'|'high';
export type LongitudinalRole='state'|'trajectory'|'dynamics'|'adaptation'|'context';

export interface AcquisitionContract{
 measurementMode:MeasurementMode;
 continuousRequired:boolean;
 preferredCadence?:string;
 protocolId?:string;
 eventTriggeredReassessment:boolean;
 manualBurden:ManualBurden;
 longitudinalRoles:LongitudinalRole[];
 minimumUsefulDensity?:Record<string,unknown>;
 stalenessPolicy?:Record<string,unknown>;
}

export interface AcquisitionCandidate{
 key:string;
 informationValue:number;
 reliability:number;
 physiologicalRelevance:number;
 burden:number;
 reason:string;
}

export interface MetricAcquisitionContract extends AcquisitionContract{
 metricKey:string;
 displayName:string;
 domain:string;
 canonicalUnit?:string|null;
}

export interface MetricObservationSummary{
 metricKey:string;
 observationCount:number;
 distinctDays:number;
 firstObservedAt?:string|null;
 lastObservedAt?:string|null;
 meanQualityScore?:number|null;
 recentDistinctDays?:number;
 lastProvider?:string|null;
}

export type AcquisitionCoverageStatus=
 |'missing'
 |'stale'
 |'below_density'
 |'adequate'
 |'observed_no_cadence';

export interface AcquisitionCoverage{
 metricKey:string;
 status:AcquisitionCoverageStatus;
 observationCount:number;
 distinctDays:number;
 recentDistinctDays:number;
 daysSinceLastObservation:number|null;
 densityRatio:number|null;
 minimumDistinctDays:number|null;
 targetDistinctDays:number|null;
 windowDays:number|null;
}

export type AcquisitionAction='maintain_passive'|'consider_measurement'|'consider_campaign'|'review_gap';

export interface AcquisitionOpportunity{
 metricKey:string;
 displayName:string;
 domain:string;
 status:AcquisitionCoverageStatus;
 action:AcquisitionAction;
 priority:number;
 reason:string;
 measurementMode:MeasurementMode;
 preferredCadence?:string;
 protocolId?:string;
 longitudinalRoles:LongitudinalRole[];
 coverage:AcquisitionCoverage;
 boundary:string;
 lastProvider?:string|null;
 lastObservedAt?:string|null;
}

export interface SourceContinuitySignal{
 kind:'source_discontinuity';
 provider:string;
 affectedMetricKeys:string[];
 affectedDisplayNames:string[];
 lastObservedAt:string;
 daysSinceLastObservation:number;
 synchronizedEnd:boolean;
 reason:string;
 boundary:string;
}

export interface AcquisitionSnapshot{
 asOf:string;
 contracts:number;
 sourceSignals:SourceContinuitySignal[];
 opportunities:AcquisitionOpportunity[];
 adequateMetrics:number;
 unresolvedMetrics:number;
}

export type ReferenceKind=
  'clinical_threshold'|'population_percentile'|'age_sex_reference'|
  'personal_baseline'|'nonlinear_range'|'contextual';

export type PiecewiseCurve={type:'piecewise';points:[number,number][]};
export type RangeCurve={type:'range';optimal:[number,number];soft:[number,number];hard:[number,number]};
export type PersonalCurve={type:'personal_robust_z';direction:'higher_contextual'|'lower_contextual';max_abs_z:number};
export type PercentileCurve={type:'percentile_lookup';dataset:string};
export type ContextCurve={type:'context_required'};
export type ReferenceCurve=PiecewiseCurve|RangeCurve|PersonalCurve|PercentileCurve|ContextCurve;

export interface MetricReference{
 key:string;
 metricKey:string;
 kind:ReferenceKind;
 unit:string;
 curve:ReferenceCurve;
 quality:number;
 version:string;
}

export interface ReferenceContext{
 ageYears?:number;
 sex?:'female'|'male'|'other'|'unknown';
 baselineMedian?:number;
 baselineMad?:number;
 acuteIllness?:boolean;
 medicationChange?:boolean;
 altitudeChange?:boolean;
 deviceChange?:boolean;
 contextualPercentile?:number;
}

export interface ReferenceEvaluation{
 metricKey:string;
 value:number;
 unit:string;
 normalizedSignal:number|null; // -1..1, favorable positive
 desirabilityScore:number|null;
 contextualPercentile:number|null;
 confidence:number;
 status:'ok'|'insufficient_reference'|'context_required';
 explanation:string;
 referenceKey:string;
 engineVersion:string;
}

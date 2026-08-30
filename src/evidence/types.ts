export type EvidenceStrength='very_low'|'low'|'moderate'|'high';
export type MeasurementGrade='research_grade'|'clinical'|'validated_consumer'|'consumer_estimate'|'self_report'|'unknown';

export interface MetricEvidence {
 metricKey:string;
 systemKey:string;
 evidenceStrength:EvidenceStrength;
 evidenceScore:number;
 favorableDirection:'higher'|'lower'|'range'|'contextual';
 relationshipShape:string;
 outcomeScope:string[];
}

export interface MeasurementMethod {
 metricKey:string;
 methodKey:string;
 grade:MeasurementGrade;
 reliabilityScore:number;
 minimumSamples:number;
}

export interface EvidenceInput {
 metric:MetricEvidence;
 method:MeasurementMethod;
 longitudinalQuality:number;
 independenceFactor:number;
 normalizedSignal:number|null;
 sampleCount:number;
}

export interface EvidenceContribution {
 metricKey:string;
 effectiveWeight:number;
 contribution:number|null;
 eligible:boolean;
 reasons:string[];
 components:{
   evidence:number;
   measurement:number;
   longitudinal:number;
   independence:number;
 };
}

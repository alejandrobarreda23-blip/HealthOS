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

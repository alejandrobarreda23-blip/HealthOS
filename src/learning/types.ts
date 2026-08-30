export type PersonalEvidenceLevel='insufficient'|'exploratory'|'moderate'|'strong'|'experiment_supported';
export interface AssociationEvidence{
 id?:string;exposureKey:string;outcomeKey:string;effect:number|null;
 nExposed:number;nControl:number;confidence:number;confounderCoverage:number;
 replicationCount?:number;experimentSupported?:boolean;window:string;
}
export interface OutcomeMap{
 outcomeKey:string;systemKey:string;
 direction:'higher_favorable'|'lower_favorable'|'range'|'contextual';
 relevance:number;
}
export interface PersonalEffect{
 exposureKey:string;outcomeKey:string;systemKey:string;
 standardizedEffect:number|null;favorableEffect:number|null;
 confidence:number;evidenceLevel:PersonalEvidenceLevel;
 nExposed:number;nControl:number;window:string;relevance:number;
}
export interface BehaviorSystemImpact{
 exposureKey:string;systemKey:string;favorableImpact:number|null;
 confidence:number;evidenceLevel:PersonalEvidenceLevel;outcomeCount:number;
 effects:PersonalEffect[];
}

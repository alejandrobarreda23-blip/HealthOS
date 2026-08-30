export type EvidenceClass='validated_external'|'published_formula'|'healthos_longitudinal'|'descriptive'|'insufficient';
export interface AgingAssessment{
 key:string;label:string;value:number|null;unit:string;chronologicalAge?:number;
 ageGapYears?:number|null;confidence:number;coverage:number;evidenceClass:EvidenceClass;
 missingInputs:string[];version:string;interpretation?:string;
}
export interface AgingDriver{
 key:string;label:string;domain:string;direction:'favorable'|'neutral'|'unfavorable'|'unknown';
 magnitude?:number;confidence:number;reason:string;
}

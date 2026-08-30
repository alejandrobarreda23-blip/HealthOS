export type StudyDesign='guideline'|'systematic_review'|'meta_analysis'|'randomized_trial'|'prospective_cohort'|'cross_sectional'|'diagnostic_accuracy'|'other';
export interface ScientificStudy{key:string;title:string;design:StudyDesign;sampleSize?:number;populationMatch:number;hasHardOutcomes:boolean;replicated:boolean;conflicting:boolean;limitations:string[]}
export interface Appraisal{score:number;certainty:'very_low'|'low'|'moderate'|'high';internalValidity:number;directness:number;precision:number;consistency:number;applicability:number;outcomeImportance:number}
export interface MeasurementCandidate{key:string;informationGain:number;evidenceMaturity:number;clinicalUtilityEstablished:boolean;burden:number;invasiveness:number;radiation:boolean;reason:string}

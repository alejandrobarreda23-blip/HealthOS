export type DecisionKind='measure'|'maintain'|'behavior'|'experiment'|'medical_followup'|'data_quality';
export type DecisionUrgency='routine'|'soon'|'review';

export interface DecisionCandidate{
 key:string;
 kind:DecisionKind;
 title:string;
 action:string;
 systems:string[];
 expectedBenefit:number;
 informationGain:number;
 evidenceConfidence:number;
 actionability:number;
 burden:number;
 uncertainty:number;
 safetyPenalty:number;
 sourceRefs:string[];
 rationale:string[];
}

export interface DecisionItem extends DecisionCandidate{
 score:number;
 rank:number;
 urgency:DecisionUrgency;
}

export interface DecisionContext{
 maxItems:number;
 diversityPenalty:number;
 maxPerSystem:number;
}

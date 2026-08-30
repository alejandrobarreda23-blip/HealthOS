export type ExperimentDesignKind='abab'|'randomized_days'|'paired_blocks'|'before_after'|'dose_response';

export interface ExperimentCandidate{
 exposureKey:string;
 currentEvidence:'insufficient'|'exploratory'|'moderate'|'strong'|'experiment_supported';
 opportunityAction:'increase'|'reduce'|'maintain'|'test';
 candidateOutcomes:string[];
 confounders:string[];
 eventFrequencyPerWeek:number;
 burden:'low'|'medium'|'high';
 reversible:boolean;
 expectedDirection:'favorable'|'unfavorable'|'unknown';
 safetyClass:'low_risk'|'needs_review'|'do_not_autodesign';
}

export interface ExperimentProtocol{
 title:string;
 exposureKey:string;
 designKind:ExperimentDesignKind;
 primaryOutcome:string;
 secondaryOutcomes:string[];
 effectWindow:string;
 plannedExposureDays:number;
 plannedControlDays:number;
 minimumPairs:number;
 washoutHours:number;
 confoundersToTrack:string[];
 inclusionRules:Record<string,unknown>;
 exclusionRules:Record<string,unknown>;
 stoppingRules:Record<string,unknown>;
 expectedDirection:'favorable'|'unfavorable'|'unknown';
 protocolConfidence:number;
 schedule:{day:number;arm:'exposure'|'control'|'washout'}[];
 rationale:string[];
 protocolVersion:string;
}

export interface ExperimentAnalysisInput{
 exposure:number[];
 control:number[];
 adherence:number;
 confounderCoverage:number;
}

export interface ExperimentResult{
 effect:number|null;
 nPairs:number;
 confidence:number;
 status:'insufficient'|'no_clear_signal'|'favorable'|'unfavorable';
 interpretation:string;
 analysisVersion:string;
}

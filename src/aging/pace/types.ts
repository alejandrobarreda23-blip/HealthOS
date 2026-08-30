export interface PaceSystemInput{
 systemKey:string;
 domain:string;
 signal:number|null;       // favorable positive, bounded ideally -1..1
 confidence:number;        // 0..1
 coverage:number;          // 0..1
 daysObserved:number;
 evidenceWeight:number;    // 0..1
}

export interface PaceContribution{
 systemKey:string;
 domain:string;
 signal:number;
 effectiveWeight:number;
 normalizedWeight:number;
 contribution:number;
}

export interface PaceResult{
 status:'insufficient'|'warming_up'|'experimental'|'stable_experimental';
 indexValue:number|null;
 rawSignal:number|null;
 shrunkenSignal:number|null;
 confidence:number;
 coverage:number;
 daysObserved:number;
 systemsUsed:string[];
 systemsExcluded:Record<string,string>;
 independentDomains:number;
 uncertaintyLow:number|null;
 uncertaintyHigh:number|null;
 contributions:PaceContribution[];
 modelVersion:string;
 semantics:string;
}

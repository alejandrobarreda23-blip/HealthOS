export type SystemStatus='insufficient'|'stable'|'improving'|'worsening'|'mixed';

export interface MetricSeries {
 key:string;
 values:{date:string;value:number}[];
 higherIsBetter?:boolean;
 targetRange?:[number,number];
 weight?:number;
}

export interface SystemDefinition {
 key:string;
 label:string;
 minimumDays:number;
 minimumMetrics:number;
 required:string[];
 optional:string[];
}

export interface SystemAssessment {
 systemKey:string;
 label:string;
 status:SystemStatus;
 score:number|null;
 slope:number|null;
 confidence:number;
 coverage:number;
 daysObserved:number;
 metricsUsed:string[];
 missingMetrics:string[];
 evidence:Record<string,unknown>;
 version:string;
}

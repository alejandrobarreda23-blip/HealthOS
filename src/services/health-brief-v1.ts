import type { BaselineSnapshotV1, EvidenceStrength } from '../health/baselines/types';
import type { FindingCandidateV1 } from '../health/findings-v1/types';
export interface BriefMetricV1{current:number|null;unit:string;recentMedian:number|null;baseline:BaselineSnapshotV1|null;status:'ok'|'insufficient_recent_data'|'no_data';}
export interface HealthBriefV1{
 schema:'health_brief_v1'; date:string; dataQuality:{overallCoverage:number;level:'LOW'|'MODERATE'|'HIGH';byMetric:Record<string,{observed:number;expected:number;coverage:number}>};
 recovery:{hrv?:BriefMetricV1;restingHr?:BriefMetricV1}; sleep:{duration?:BriefMetricV1}; training:{sessions7d:number;durationMinutes7d:number;distanceKm7d:number;elevationGainM7d:number;load7d?:number|null;load28d?:number|null}; body:{weightKg?:number|null}; events:{type:string;count:number}[]; activeFindings:FindingCandidateV1[]; uncertainty:string[]; provenance:{sources:string[];normalizers:string[];dailyFeaturesVersion:string;baselineVersion:string;findingVersions:string[]};
}
function level(c:number){return c>=.75?'HIGH':c>=.5?'MODERATE':'LOW';}
export function buildHealthBriefV1(input:Omit<HealthBriefV1,'schema'|'dataQuality'> & {coverage:Record<string,{observed:number;expected:number}>}):HealthBriefV1{
 const byMetric:HealthBriefV1['dataQuality']['byMetric']={}; let sum=0,n=0;
 for(const[k,v]of Object.entries(input.coverage)){const c=v.expected<=0?0:Math.min(1,v.observed/v.expected);byMetric[k]={...v,coverage:c};sum+=c;n++;}
 const overallCoverage=n?sum/n:0; const uncertainty=[...input.uncertainty]; if(overallCoverage<.5&&!uncertainty.includes('low_recent_data_coverage'))uncertainty.push('low_recent_data_coverage');
 return {schema:'health_brief_v1',date:input.date,dataQuality:{overallCoverage,level:level(overallCoverage),byMetric},recovery:input.recovery,sleep:input.sleep,training:input.training,body:input.body,events:input.events,activeFindings:input.activeFindings,uncertainty,provenance:input.provenance};
}
export function summarizeEvidenceStrength(findings:FindingCandidateV1[]):EvidenceStrength{
 if(!findings.length)return'INSUFFICIENT'; const order:EvidenceStrength[]=['INSUFFICIENT','LOW','MODERATE','HIGH']; return findings.reduce((a,f)=>order.indexOf(f.evidenceStrength)<order.indexOf(a)?f.evidenceStrength:a,'HIGH' as EvidenceStrength);
}

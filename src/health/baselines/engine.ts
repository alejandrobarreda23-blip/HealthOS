import { getMetricDefinition } from '../metrics/dictionary';
import type { BaselineSnapshotV1, ContextualBaselineStatus, DatedValue, DualBaselineV1, EvidenceStrength } from './types';

function sorted(values: number[]): number[] { return [...values].sort((a,b)=>a-b); }
export function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const a=sorted(values); const pos=(a.length-1)*p; const lo=Math.floor(pos), hi=Math.ceil(pos);
  if(lo===hi)return a[lo]; const w=pos-lo; return a[lo]*(1-w)+a[hi]*w;
}
export function medianV1(values:number[]):number|null{return percentile(values,.5);}
export function madV1(values:number[]):number|null{const m=medianV1(values);return m===null?null:medianV1(values.map(v=>Math.abs(v-m)));}
export function robustZV1(value:number, median:number|null, mad:number|null):number|null{
  if(median===null||mad===null||mad===0)return null;
  return 0.67448975*(value-median)/mad;
}

function daysBetweenInclusive(start:string,end:string):number{
  const a=new Date(`${start}T12:00:00Z`).getTime(); const b=new Date(`${end}T12:00:00Z`).getTime();
  return Math.floor((b-a)/86400000)+1;
}
function minusDays(date:string,days:number):string{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-days);return d.toISOString().slice(0,10);}
function evidenceStrength(sampleCount:number,coverage:number,minSamples:number,minCoverage:number):EvidenceStrength{
  if(sampleCount<minSamples||coverage<minCoverage)return 'INSUFFICIENT';
  if(sampleCount<Math.max(minSamples+5,Math.ceil(minSamples*1.25))||coverage<Math.max(minCoverage,.6))return 'LOW';
  if(sampleCount<Math.max(minSamples*1.75,30)||coverage<.75)return 'MODERATE';
  return 'HIGH';
}

export function buildBaselineSnapshotV1(metricKey:string, asOfDate:string, input:DatedValue[], override?:Partial<{windowDays:number;minSamples:number;minCoverage:number}>):BaselineSnapshotV1{
  const def=getMetricDefinition(metricKey);
  const windowDays=override?.windowDays??def?.baseline.windowDays??42;
  const minSamples=override?.minSamples??def?.baseline.minSamples??20;
  const minCoverage=override?.minCoverage??def?.baseline.minCoverage??.5;
  const start=minusDays(asOfDate,windowDays-1);
  const rows=input.filter(r=>r.date>=start&&r.date<=asOfDate&&Number.isFinite(r.value));
  const values=rows.map(r=>r.value);
  const expectedDays=daysBetweenInclusive(start,asOfDate);
  const coverage=Math.min(1,values.length/expectedDays);
  const m=medianV1(values), md=madV1(values);
  return {metricKey,asOfDate,windowDays,sampleCount:values.length,expectedDays,coverage,median:m,mad:md,p10:percentile(values,.1),p25:percentile(values,.25),p50:m,p75:percentile(values,.75),p90:percentile(values,.9),sufficient:values.length>=minSamples&&coverage>=minCoverage,evidenceStrength:evidenceStrength(values.length,coverage,minSamples,minCoverage),version:'baseline_v1'};
}

export function buildDualBaselineV1(metricKey:string,asOfDate:string,input:DatedValue[]):DualBaselineV1{
  const allContexts=buildBaselineSnapshotV1(metricKey,asOfDate,input);
  const referenceRows=input.filter(r=>!r.excludedFromReference);
  const reference=buildBaselineSnapshotV1(metricKey,asOfDate,referenceRows);
  const excluded=input.filter(r=>r.excludedFromReference);
  const exclusionReasons:Record<string,number>={};
  for(const row of excluded)for(const reason of row.exclusionReasons??['unspecified'])exclusionReasons[reason]=(exclusionReasons[reason]??0)+1;
  return {allContexts,reference,excludedReferenceSamples:excluded.length,exclusionReasons};
}

export function contextualBaselineStatus(n:number):ContextualBaselineStatus{
  if(n<10)return'insufficient'; if(n<20)return'exploratory'; if(n<40)return'usable'; return'established';
}

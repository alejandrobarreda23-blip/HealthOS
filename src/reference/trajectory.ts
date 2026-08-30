import type{MetricReference,ReferenceContext}from'./types';
import{evaluateReference}from'./engine';

export interface DatedValue{date:string;value:number}
export interface TrajectoryReferenceResult{
 metricKey:string;
 currentSignal:number|null;
 priorSignal:number|null;
 signalChange:number|null;
 annualizedSignalChange:number|null;
 confidence:number;
 days:number;
 currentExplanation:string;
 version:string;
}

export function contextualizeTrajectory(ref:MetricReference,values:DatedValue[],ctxFor:(date:string)=>ReferenceContext):TrajectoryReferenceResult{
 const ordered=[...values].sort((a,b)=>a.date.localeCompare(b.date));
 if(ordered.length<2)return{metricKey:ref.metricKey,currentSignal:null,priorSignal:null,signalChange:null,annualizedSignalChange:null,confidence:0,days:0,currentExplanation:'Historia insuficiente.',version:'risk-reference-trajectory-v1'};
 const first=ordered[0],last=ordered[ordered.length-1];
 const a=evaluateReference(ref,first.value,ctxFor(first.date));
 const b=evaluateReference(ref,last.value,ctxFor(last.date));
 const days=Math.max(1,(new Date(last.date+'T12:00:00Z').getTime()-new Date(first.date+'T12:00:00Z').getTime())/86400000);
 const change=a.normalizedSignal==null||b.normalizedSignal==null?null:b.normalizedSignal-a.normalizedSignal;
 return{
  metricKey:ref.metricKey,
  currentSignal:b.normalizedSignal,
  priorSignal:a.normalizedSignal,
  signalChange:change,
  annualizedSignalChange:change==null?null:change*(365.2425/days),
  confidence:Math.min(a.confidence,b.confidence),
  days,
  currentExplanation:b.explanation,
  version:'risk-reference-trajectory-v1'
 };
}

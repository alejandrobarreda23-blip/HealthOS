import type{MetricSeries}from'../aging/systems/types';
import type{MetricEvidence,MeasurementMethod,EvidenceInput}from'../evidence/types';
import type{MetricReference,ReferenceContext}from'./types';
import{contextualizeTrajectory}from'./trajectory';

export function toEvidenceInput(args:{
 series:MetricSeries;
 evidence:MetricEvidence;
 method:MeasurementMethod;
 reference:MetricReference;
 contextFor:(date:string)=>ReferenceContext;
 longitudinalQuality:number;
 independenceFactor:number;
}):EvidenceInput{
 const t=contextualizeTrajectory(args.reference,args.series.values,args.contextFor);
 return{
  metric:args.evidence,
  method:args.method,
  longitudinalQuality:args.longitudinalQuality*t.confidence,
  independenceFactor:args.independenceFactor,
  normalizedSignal:t.annualizedSignalChange==null?null:Math.max(-1,Math.min(1,t.annualizedSignalChange)),
  sampleCount:args.series.values.length
 };
}

import{EVIDENCE,METHODS}from'./catalog';import{independenceFactors}from'./independence';import{aggregateSystemEvidence}from'./engine';
export function evidenceDemo(){
 const keys=['vo2max','resting_hr','systolic_bp'];
 const ind=independenceFactors(keys);
 return aggregateSystemEvidence([
  {metric:EVIDENCE.vo2max,method:METHODS['vo2max:wearable_estimate'],longitudinalQuality:.88,independenceFactor:ind.vo2max,normalizedSignal:.18,sampleCount:15},
  {metric:EVIDENCE.resting_hr,method:METHODS['resting_hr:wearable_night'],longitudinalQuality:.94,independenceFactor:ind.resting_hr,normalizedSignal:.10,sampleCount:70},
  {metric:EVIDENCE.systolic_bp,method:METHODS['systolic_bp:validated_cuff'],longitudinalQuality:.80,independenceFactor:ind.systolic_bp,normalizedSignal:.08,sampleCount:12}
 ]);
}
import{REFERENCES}from'./catalog';import{evaluateReference}from'./engine';
export function referenceDemo(){
 return[
  evaluateReference(REFERENCES.systolic_bp,116,{}),
  evaluateReference(REFERENCES.sleep_duration,445,{}),
  evaluateReference(REFERENCES.resting_hr,49,{baselineMedian:52,baselineMad:3}),
  evaluateReference(REFERENCES.hrv_rmssd,70,{baselineMedian:64,baselineMad:7}),
  evaluateReference(REFERENCES.vo2max,51,{contextualPercentile:82})
 ];
}
/**
 * Correlation-family penalties prevent obvious double counting.
 * This is not a causal graph; it is a conservative aggregation guardrail.
 */
export const CORRELATION_FAMILIES:Record<string,string>={
 resting_hr:'autonomic_fitness',
 hrv_rmssd:'autonomic_fitness',
 vo2max:'fitness_capacity',
 pace_at_submax_hr:'fitness_capacity',
 glucose_fasting:'glycaemia',
 hba1c:'glycaemia',
 weight:'body_size',
 bmi:'body_size',
 waist_cm:'adiposity',
 body_fat_percent:'adiposity',
 creatinine:'renal_filtration',
 egfr:'renal_filtration'
};

export function independenceFactors(metricKeys:string[]){
 const counts=new Map<string,number>();
 for(const k of metricKeys){const f=CORRELATION_FAMILIES[k]??k;counts.set(f,(counts.get(f)??0)+1)}
 return Object.fromEntries(metricKeys.map(k=>{
   const f=CORRELATION_FAMILIES[k]??k,n=counts.get(f)??1;
   return[k,1/Math.sqrt(n)];
 }));
}

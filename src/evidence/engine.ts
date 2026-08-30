import type{EvidenceInput,EvidenceContribution}from'./types';

const clamp=(x:number)=>Math.max(0,Math.min(1,x));

/**
 * Effective weight is deliberately multiplicative:
 * a weak link should reduce the contribution rather than be hidden by an average.
 */
export function evidenceContribution(i:EvidenceInput):EvidenceContribution{
 const reasons:string[]=[];
 const enoughSamples=i.sampleCount>=i.method.minimumSamples;
 if(!enoughSamples)reasons.push(`insufficient_samples:${i.sampleCount}/${i.method.minimumSamples}`);
 if(i.longitudinalQuality<.5)reasons.push('low_longitudinal_quality');
 if(i.method.reliabilityScore<.5)reasons.push('low_measurement_reliability');

 const effectiveWeight=
   clamp(i.metric.evidenceScore) *
   clamp(i.method.reliabilityScore) *
   clamp(i.longitudinalQuality) *
   clamp(i.independenceFactor);

 const eligible=enoughSamples&&i.normalizedSignal!==null&&effectiveWeight>=.15;
 return{
   metricKey:i.metric.metricKey,
   effectiveWeight,
   contribution:eligible?i.normalizedSignal!*effectiveWeight:null,
   eligible,
   reasons,
   components:{
     evidence:i.metric.evidenceScore,
     measurement:i.method.reliabilityScore,
     longitudinal:i.longitudinalQuality,
     independence:i.independenceFactor
   }
 };
}

export function aggregateSystemEvidence(inputs:EvidenceInput[]){
 const cs=inputs.map(evidenceContribution),eligible=cs.filter(c=>c.eligible&&c.contribution!==null);
 const totalWeight=eligible.reduce((s,c)=>s+c.effectiveWeight,0);
 const signal=totalWeight?eligible.reduce((s,c)=>s+c.contribution!,0)/totalWeight:null;
 const confidence=inputs.length?Math.min(.98,totalWeight/Math.max(2,inputs.length*.65)):0;
 return{
   signal,
   confidence,
   eligibleMetrics:eligible.length,
   totalMetrics:inputs.length,
   totalWeight,
   contributions:cs,
   engineVersion:'system-evidence-v1'
 };
}

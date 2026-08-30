import{describe,it,expect}from'vitest';import{evidenceContribution,aggregateSystemEvidence}from'../src/evidence/engine';import{EVIDENCE,METHODS}from'../src/evidence/catalog';
describe('System Evidence Engine',()=>{
 it('penalizes a wearable estimate versus CPET',()=>{
  const base={metric:EVIDENCE.vo2max,longitudinalQuality:.9,independenceFactor:1,normalizedSignal:.1,sampleCount:10};
  const wearable=evidenceContribution({...base,method:METHODS['vo2max:wearable_estimate']});
  const cpet=evidenceContribution({...base,method:{metricKey:'vo2max',methodKey:'cpet',grade:'research_grade',reliabilityScore:1,minimumSamples:1}});
  expect(cpet.effectiveWeight).toBeGreaterThan(wearable.effectiveWeight);
 });
 it('refuses contribution with too few samples',()=>{
  const x=evidenceContribution({metric:EVIDENCE.vo2max,method:METHODS['vo2max:wearable_estimate'],longitudinalQuality:.9,independenceFactor:1,normalizedSignal:.1,sampleCount:2});
  expect(x.eligible).toBe(false);expect(x.contribution).toBeNull();
 });
});
import{describe,it,expect}from'vitest';import{analyzePairedExperiment}from'../src/experiments/analyzer';
describe('N-of-1 analysis',()=>{
 it('refuses too few pairs',()=>{expect(analyzePairedExperiment({exposure:[1,2],control:[0,0],adherence:1,confounderCoverage:1}).status).toBe('insufficient')});
 it('detects a favorable prospective signal',()=>{const exposure=Array(12).fill(.2),control=Array(12).fill(0);const r=analyzePairedExperiment({exposure,control,adherence:.95,confounderCoverage:.9});expect(r.status).toBe('favorable');expect(r.confidence).toBeGreaterThan(.55)});
});

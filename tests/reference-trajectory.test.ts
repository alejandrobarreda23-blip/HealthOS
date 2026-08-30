import{describe,it,expect}from'vitest';import{contextualizeTrajectory}from'../src/reference/trajectory';import{REFERENCES}from'../src/reference/catalog';
describe('contextualized trajectories',()=>{
 it('detects movement toward a favorable BP reference state',()=>{const x=contextualizeTrajectory(REFERENCES.systolic_bp,[{date:'2026-01-01',value:138},{date:'2026-07-01',value:118}],()=>({}));expect(x.signalChange!).toBeGreaterThan(0);expect(x.annualizedSignalChange!).toBeGreaterThan(0)});
});
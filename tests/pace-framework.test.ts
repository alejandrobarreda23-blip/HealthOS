import{describe,it,expect}from'vitest';import{calculateExperimentalPace}from'../src/aging/pace/engine';import type{PaceSystemInput}from'../src/aging/pace/types';
const good:PaceSystemInput[]=[
 {systemKey:'cardio',domain:'cardio',signal:.2,confidence:.9,coverage:.9,daysObserved:400,evidenceWeight:.9},
 {systemKey:'fitness',domain:'fitness',signal:.2,confidence:.9,coverage:.9,daysObserved:400,evidenceWeight:.9},
 {systemKey:'sleep',domain:'sleep',signal:.2,confidence:.9,coverage:.9,daysObserved:400,evidenceWeight:.9},
 {systemKey:'metabolic',domain:'metabolic',signal:.2,confidence:.9,coverage:.9,daysObserved:400,evidenceWeight:.9},
];
describe('Health OS Pace framework',()=>{
 it('refuses sparse systems',()=>{const r=calculateExperimentalPace(good.slice(0,3));expect(r.indexValue).toBeNull();expect(r.status).toBe('insufficient')});
 it('maps favorable multi-system trajectory below neutral anchor',()=>{const r=calculateExperimentalPace(good);expect(r.indexValue!).toBeLessThan(1);expect(r.status).toBe('stable_experimental')});
 it('maps unfavorable trajectory above neutral anchor',()=>{const r=calculateExperimentalPace(good.map(x=>({...x,signal:-.2})));expect(r.indexValue!).toBeGreaterThan(1)});
 it('does not allow one domain to substitute for independent domains',()=>{const x=good.map((v,i)=>({...v,domain:i<3?'same':'other'}));expect(calculateExperimentalPace(x).indexValue).toBeNull()});
});

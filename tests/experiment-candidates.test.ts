import{describe,it,expect}from'vitest';import{experimentCandidates}from'../src/experiments/candidate-engine';
describe('experiment candidate engine',()=>{
 it('does not propose experiments for already experiment-supported effects',()=>{const xs=experimentCandidates([{key:'x',exposureKey:'sauna',action:'increase',systems:['sleep_recovery'],score:.5,confidence:.9,evidenceLevel:'experiment_supported',reason:'x'}]);expect(xs).toHaveLength(0)});
});

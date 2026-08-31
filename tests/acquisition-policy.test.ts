import{describe,it,expect}from'vitest';import{acquisitionPriority,rankAcquisitionCandidates}from'../src/acquisition/policy';
describe('acquisition policy',()=>{
 it('rewards information, reliability and relevance while penalizing burden',()=>{
  const low=acquisitionPriority({key:'manual_daily',informationValue:.7,reliability:.6,physiologicalRelevance:.7,burden:.9,reason:''});
  const high=acquisitionPriority({key:'periodic_high_value',informationValue:.9,reliability:.9,physiologicalRelevance:.9,burden:.2,reason:''});
  expect(high).toBeGreaterThan(low);
 });
 it('is deterministic',()=>{const xs=[{key:'b',informationValue:.5,reliability:.8,physiologicalRelevance:.8,burden:.2,reason:''},{key:'a',informationValue:.9,reliability:.9,physiologicalRelevance:.9,burden:.2,reason:''}];expect(rankAcquisitionCandidates(xs)[0].key).toBe('a')});
});

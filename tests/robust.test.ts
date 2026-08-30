import{describe,it,expect}from'vitest';import{median,mad,robustZ}from'../src/health/features/robust';
describe('robust stats',()=>{
 it('median resists an extreme outlier',()=>expect(median([70,72,74,76,1000])).toBe(74));
 it('MAD is robust',()=>expect(mad([70,72,74,76,1000])).toBe(2));
 it('robust z is computable',()=>expect(robustZ(60,[70,72,74,76,78])).not.toBeNull());
});
import{describe,it,expect}from'vitest';import{interpolatePiecewise,rangeDesirability,robustZ}from'../src/reference/math';
describe('reference math',()=>{
 it('interpolates bounded piecewise curves',()=>{expect(interpolatePiecewise(5,[[0,-1],[10,1]])).toBeCloseTo(0)});
 it('models optimum ranges non-linearly',()=>{expect(rangeDesirability(480,[420,540],[360,600],[300,660])).toBe(1);expect(rangeDesirability(300,[420,540],[360,600],[300,660])).toBe(-1)});
 it('computes robust z',()=>{expect(robustZ(12,10,2)).toBeCloseTo(.67448975)});
});
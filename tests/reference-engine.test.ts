import{describe,it,expect}from'vitest';import{evaluateReference}from'../src/reference/engine';import{REFERENCES}from'../src/reference/catalog';
describe('Risk & Reference Engine',()=>{
 it('does not assume more sleep is always better',()=>{expect(evaluateReference(REFERENCES.sleep_duration,480,{}).normalizedSignal).toBe(1);expect(evaluateReference(REFERENCES.sleep_duration,650,{}).normalizedSignal!).toBeLessThan(0)});
 it('uses personal baseline for HRV',()=>{const x=evaluateReference(REFERENCES.hrv_rmssd,72,{baselineMedian:60,baselineMad:6});expect(x.normalizedSignal!).toBeGreaterThan(0)});
 it('refuses VO2max population interpretation without a compatible percentile',()=>{const x=evaluateReference(REFERENCES.vo2max,50,{ageYears:40,sex:'male'});expect(x.status).toBe('insufficient_reference');expect(x.normalizedSignal).toBeNull()});
 it('penalizes acute illness context',()=>{const a=evaluateReference(REFERENCES.crp,1,{}),b=evaluateReference(REFERENCES.crp,1,{acuteIllness:true});expect(b.confidence).toBeLessThan(a.confidence)});
});
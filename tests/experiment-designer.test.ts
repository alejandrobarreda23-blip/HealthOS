import{describe,it,expect}from'vitest';import{designExperiment}from'../src/experiments/designer';
const base={exposureKey:'late_dinner',currentEvidence:'exploratory' as const,opportunityAction:'reduce' as const,candidateOutcomes:['hrv_rmssd'],confounders:['alcohol'],eventFrequencyPerWeek:3,burden:'low' as const,reversible:true,expectedDirection:'unfavorable' as const,safetyClass:'low_risk' as const};
describe('N-of-1 designer',()=>{
 it('creates a prospective protocol with fixed primary outcome',()=>{const p=designExperiment(base,'abc')!;expect(p.primaryOutcome).toBe('hrv_rmssd');expect(p.minimumPairs).toBeGreaterThanOrEqual(8);expect(p.schedule.length).toBeGreaterThan(20)});
 it('is deterministic for a seed',()=>{expect(designExperiment(base,'abc')!.schedule).toEqual(designExperiment(base,'abc')!.schedule)});
 it('refuses do-not-autodesign exposures',()=>{expect(designExperiment({...base,exposureKey:'alcohol',safetyClass:'do_not_autodesign'},'abc')).toBeNull()});
});

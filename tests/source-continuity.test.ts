import{describe,it,expect}from'vitest';
import{detectSourceContinuitySignals,suppressSourceDuplicatedStaleOpportunities}from'../src/acquisition/source-continuity';
import type{AcquisitionOpportunity}from'../src/acquisition/types';

function stale(metricKey:string,displayName:string,days:number,provider='intervals_icu'):AcquisitionOpportunity{
 return{metricKey,displayName,domain:'test',status:'stale',action:'consider_measurement',priority:.8,priorityTier:3,reason:'stale',measurementMode:'passive_daily',longitudinalRoles:['dynamics'],boundary:'test',lastProvider:provider,lastObservedAt:`2026-08-${String(31-days).padStart(2,'0')}T12:00:00Z`,groupKey:metricKey,groupLabel:displayName,actionability:'review_only',acquisitionRationale:'test fixture',coverage:{metricKey,status:'stale',observationCount:100,distinctDays:100,recentDistinctDays:0,daysSinceLastObservation:days,densityRatio:0,minimumDistinctDays:20,targetDistinctDays:30,windowDays:42}};
}

describe('source continuity',()=>{
 it('collapses synchronized passive stale metrics from one provider',()=>{
  const xs=[stale('hrv_rmssd','HRV',14),stale('resting_heart_rate','RHR',14),stale('sleep_duration','Sleep',14),stale('steps','Steps',14)];
  const signals=detectSourceContinuitySignals(xs);
  expect(signals).toHaveLength(1);
  expect(signals[0].provider).toBe('intervals_icu');
  expect(signals[0].affectedMetricKeys).toHaveLength(4);
  expect(suppressSourceDuplicatedStaleOpportunities(xs,signals)).toHaveLength(0);
 });
 it('does not infer a source interruption from a single stale metric',()=>expect(detectSourceContinuitySignals([stale('hrv_rmssd','HRV',14)])).toHaveLength(0));
 it('does not collapse metrics whose end dates materially differ',()=>expect(detectSourceContinuitySignals([stale('a','A',14),stale('b','B',14),stale('c','C',8)])).toHaveLength(0));
 it('does not collapse different providers',()=>expect(detectSourceContinuitySignals([stale('a','A',14,'p1'),stale('b','B',14,'p1'),stale('c','C',14,'p2')])).toHaveLength(0));
});

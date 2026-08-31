import{describe,it,expect}from'vitest';
import{buildAcquisitionOpportunity,evaluateAcquisitionCoverage,rankAcquisitionOpportunities}from'../src/acquisition/coverage';
import type{MetricAcquisitionContract}from'../src/acquisition/types';

const base:MetricAcquisitionContract={metricKey:'hrv_rmssd',displayName:'HRV RMSSD',domain:'recovery',measurementMode:'passive_daily',continuousRequired:false,eventTriggeredReassessment:false,manualBurden:'none',longitudinalRoles:['dynamics'],minimumUsefulDensity:{window_days:42,minimum_distinct_days:20,target_distinct_days:30},stalenessPolicy:{max_age_days:3}};

describe('acquisition coverage',()=>{
 it('keeps missing distinct from zero/normal',()=>{const x=evaluateAcquisitionCoverage(base,undefined,'2026-08-31');expect(x.status).toBe('missing');expect(x.observationCount).toBe(0)});
 it('detects low density deterministically',()=>{const x=evaluateAcquisitionCoverage(base,{metricKey:'hrv_rmssd',observationCount:40,distinctDays:40,recentDistinctDays:12,lastObservedAt:'2026-08-31T06:00:00Z'},'2026-08-31');expect(x.status).toBe('below_density');expect(x.densityRatio).toBe(.6)});
 it('detects stale passive data',()=>{const x=evaluateAcquisitionCoverage(base,{metricKey:'hrv_rmssd',observationCount:40,distinctDays:40,recentDistinctDays:25,lastObservedAt:'2026-08-20T06:00:00Z'},'2026-08-31');expect(x.status).toBe('stale')});
 it('does not invent cadence for sparse clinical metrics',()=>{const h:MetricAcquisitionContract={...base,metricKey:'hba1c',displayName:'HbA1c',measurementMode:'laboratory_periodic',manualBurden:'low',longitudinalRoles:['trajectory'],minimumUsefulDensity:{},stalenessPolicy:{}};const x=evaluateAcquisitionCoverage(h,{metricKey:'hba1c',observationCount:1,distinctDays:1,recentDistinctDays:0,lastObservedAt:'2025-10-01T00:00:00Z'},'2026-08-31');expect(x.status).toBe('observed_no_cadence')});
 it('ranks unresolved gaps deterministically',()=>{const a=buildAcquisitionOpportunity(base,undefined,'2026-08-31');const b=buildAcquisitionOpportunity({...base,metricKey:'steps',displayName:'Steps',longitudinalRoles:['context']},{metricKey:'steps',observationCount:100,distinctDays:100,recentDistinctDays:30,lastObservedAt:'2026-08-31T00:00:00Z'},'2026-08-31');expect(rankAcquisitionOpportunities([b,a])[0].metricKey).toBe('hrv_rmssd')});
});

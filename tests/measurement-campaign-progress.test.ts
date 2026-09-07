import{describe,expect,it}from'vitest';
import{computeCampaignProgress}from'../src/measurement/progress';
import type{MeasurementCampaign}from'../src/measurement/types';
const campaign:MeasurementCampaign={id:'c',protocolId:'home_bp_campaign_v1',protocolVersion:'1',status:'active',startedAt:'2026-08-31T08:00:00Z',protocolSnapshot:{occasions:['morning','evening'],readings_per_occasion:2,minimum_days:3,preferred_days:7}};
const day=(d:number)=>['morning','evening'].flatMap(o=>[1,2].map(i=>({protocol_day:d,protocol_occasion:o,reading_index:i})));
describe('campaign progress',()=>{
 it('requires complete occasions and days',()=>{const p=computeCampaignProgress(campaign,[...day(1),...day(2),...day(3)]);expect(p.distinctDays).toBe(3);expect(p.eligibleToComplete).toBe(true);expect(p.targetReached).toBe(false)});
 it('does not count a partial day as valid',()=>{const p=computeCampaignProgress(campaign,[...day(1),...day(2),{protocol_day:3,protocol_occasion:'morning',reading_index:1}]);expect(p.recordedDays).toBe(3);expect(p.distinctDays).toBe(2);expect(p.eligibleToComplete).toBe(false)});
});

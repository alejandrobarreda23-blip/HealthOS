import { describe, expect, it } from 'vitest';
import { activityColor, activitySummary, attachActivitySummaries, type SummaryRecord } from '../src/health/activity-presentation';
import type { TrainingSession } from '../src/repositories/activities';
const row=(overrides:Partial<SummaryRecord>={}):SummaryRecord=>({id:'source',provider:'intervals_icu',external_id:'activity',name:'Bicicleta por la mañana',intensity:76.5,rpe:4,route_id:12,...overrides});
const session=(overrides:Partial<TrainingSession>={}):TrainingSession=>({id:'session',physiological_date:'2026-09-08',activity_type:'Ride',started_at:'2026-09-08T08:00:00Z',ended_at:'2026-09-08T10:00:00Z',provider:'intervals_icu',source_device:null,source_record_id:'source',external_session_id:'activity',distance_m:40000,elevation_gain_m:500,active_energy_kcal:null,avg_heart_rate_bpm:130,max_heart_rate_bpm:180,...overrides});
describe('activity names and evidence-based color presentation',()=>{
  it('preserves source names and distinguishes a route reference from geometry',()=>{
    expect(activitySummary(row()).name).toBe('Bicicleta por la mañana');
    expect(activitySummary(row()).hasRouteReference).toBe(true);
    expect(activitySummary(row({route_id:null,name:'   '}))).toMatchObject({hasRouteReference:false,name:null});
  });
  it('does not convert missing numbers to zero',()=>{
    for(const value of [null,undefined,'',NaN,Infinity,-1,'65']) expect(activitySummary(row({intensity:value})).intensity).toBeNull();
    expect(activitySummary(row({intensity:0})).intensity).toBe(0);
  });
  it('retains intensity over 100 while saturating only its visual scale',()=>{
    const s=session({summary:activitySummary(row({intensity:114.7}))});
    expect(activityColor(s,'intensity').label).toBe('115 % · origen');
    expect(activityColor(s,'intensity').color).toBe('rgb(180,66,62)');
  });
  it('validates the reported RPE scale separately',()=>{
    for(const value of [0,11,null,Infinity,'4'])expect(activitySummary(row({rpe:value})).rpe).toBeNull();
    expect(activitySummary(row({rpe:10})).rpe).toBe(10);
  });
  it('binds projected fields only to a matching source, provider and external ID',()=>{
    expect(attachActivitySummaries([session()],[row()])[0].summary?.intensity).toBe(76.5);
    for(const overrides of [{id:'other'},{provider:'other'},{external_id:'other'}])expect(attachActivitySummaries([session()],[row(overrides)])[0].summary).toBeUndefined();
  });
  it('does not infer colors from heart rate, duration or sport',()=>{
    expect(activityColor(session(),'intensity').value).toBeNull();
    expect(activityColor(session(),'rpe').color).toBe('#8b9692');
  });
  it('never substitutes RPE for missing calculated intensity or vice versa',()=>{
    const s=session({summary:activitySummary(row({intensity:null,rpe:8}))});
    expect(activityColor(s,'intensity').label).toBe('Sin intensidad');
    expect(activityColor(s,'rpe').label).toBe('RPE 8/10');
  });
  it('uses the documented visual anchors',()=>{
    expect(activityColor(session({summary:activitySummary(row({intensity:50}))}),'intensity').color).toBe('rgb(49,125,91)');
    expect(activityColor(session({summary:activitySummary(row({intensity:75}))}),'intensity').color).toBe('rgb(174,128,41)');
  });
});

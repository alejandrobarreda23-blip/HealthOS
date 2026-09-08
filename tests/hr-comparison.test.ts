import {describe,it,expect} from 'vitest';
import {cardiacComparison,externalWork,type HrPeer} from '../src/health/hr-comparison';
import type {TrainingSession} from '../src/repositories/activities';
const session:TrainingSession={id:'a',physiological_date:'2026-09-01',activity_type:'Ride',provider:'intervals_icu',source_device:null,source_record_id:null,external_session_id:null,started_at:'2026-09-01T08:00:00Z',ended_at:'2026-09-01T09:00:00Z',avg_heart_rate_bpm:136,max_heart_rate_bpm:162,distance_m:37000,elevation_gain_m:100,active_energy_kcal:null};
const peer:HrPeer={session:{...session,id:'b',physiological_date:'2026-04-15',avg_heart_rate_bpm:98},value:34.1/3.6,hr:98,score:0,source:{average_speed:34.1/3.6,elapsed_time:3600,moving_time:3500}};
describe('Explanatory cardiac comparison',()=>{
 it('explains higher HR and different speed without calling it decline',()=>{const r=cardiacComparison(session,{average_speed:37.3/3.6},peer,'speed');expect(r.delta).toBe(38);expect(r.direction).toContain('38 bpm mayor');expect(r.work).toContain('9,4 % más');expect(r.interpretation).toContain('No indica por sí sola pérdida de forma');});
 it('describes lower HR without claiming improved performance',()=>{const r=cardiacComparison({...session,avg_heart_rate_bpm:90},{average_speed:34.1/3.6},peer,'speed');expect(r.direction).toContain('8 bpm menor');expect(r.interpretation).toContain('no confirma una mejora');});
 it('retains missing conditions and does not infer device or route continuity',()=>{const r=cardiacComparison(session,null,peer,'speed');expect(r.current).toBeNull();expect(r.sameDevice).toBe(false);expect(r.sameRoute).toBe(false);expect(r.aPause).toBeNull();expect(r.rows.at(-1)?.a).toBeNull();});
 it('rejects estimated power and ignored velocity',()=>{expect(externalWork({device_watts:false,icu_average_watts:200},'power')).toBeNull();expect(externalWork({average_speed:10,ignore_velocity:true},'speed')).toBeNull();});
 it('does not convert contradictory moving times into a valid pause percentage',()=>{expect(cardiacComparison(session,{elapsed_time:100,moving_time:120},peer,'speed').aPause).toBeNull();});
});

import { describe, expect, it } from 'vitest';
import { comparableActivities, contextDates, contextSignal, contextTraining, trainingTotals } from '../src/health/activity-context';
import { canonicalDailySeries, minusDays } from '../src/health/metrics/daily-series';
import type { TrainingSession } from '../src/repositories/activities';
const date='2026-08-16';
const session=(day=date, overrides:Partial<TrainingSession>={}):TrainingSession=>({id:day,physiological_date:day,activity_type:'TrailRun',started_at:`${day}T08:00:00Z`,ended_at:`${day}T10:00:00Z`,provider:'intervals_icu',source_device:'watch',source_record_id:null,external_session_id:null,distance_m:10000,elevation_gain_m:500,active_energy_kcal:null,avg_heart_rate_bpm:null,max_heart_rate_bpm:null,...overrides});
const series=()=>canonicalDailySeries(Array.from({length:78},(_,i)=>({id:`point-${i}`,metricKey:'resting_heart_rate',physiologicalDate:minusDays(date,70-i),value:i<70?50:80,unit:'bpm',provider:'intervals_icu',sourceDevice:'watch',normalizerVersion:'1'})));
describe('activity context with frozen historical evidence',()=>{
  it('shows exactly 28 days before, the session and seven after',()=>{
    const dates=contextDates(date);expect(dates).toHaveLength(36);expect(dates[28]).toBe(date);expect(dates[0]).toBe(minusDays(date,28));expect(dates[35]).toBe(minusDays(date,-7));
  });
  it('excludes the session and all future training from preceding windows',()=>{
    const rows=[session(),session(minusDays(date,1)),session(minusDays(date,7)),session(minusDays(date,28)),session(minusDays(date,-1))];
    const result=contextTraining(session(),rows,minusDays(date,-7));
    expect(result.previous7.count).toBe(2);expect(result.previous28.count).toBe(3);expect(result.after).toHaveLength(1);
  });
  it('recognizes consecutive sport days without counting multiple sessions twice',()=>{
    const rows=[session(),session(minusDays(date,1)),session(minusDays(date,1),{id:'second'}),session(minusDays(date,2)),session(minusDays(date,3),{activity_type:'Ride'})];
    expect(contextTraining(session(),rows,date).consecutive).toBe(3);
  });
  it('does not count duplicate IDs or later sessions in the share denominator',()=>{
    const rows=[session(),session(),session(minusDays(date,1)),session(date,{id:'later',started_at:`${date}T12:00:00Z`,ended_at:`${date}T14:00:00Z`})];
    expect(contextTraining(session(),rows,date).share).toBe(50);
  });
  it('keeps missing totals unavailable and distinguishes partial coverage',()=>{
    expect(trainingTotals([]).seconds).toBeNull();
    expect(trainingTotals([session(date,{elevation_gain_m:null})]).elevation).toBeNull();
    expect(trainingTotals([session(),session(minusDays(date,1),{elevation_gain_m:null})]).elevationCount).toBe(1);
    expect(contextTraining(session(),[session(),session(minusDays(date,1),{ended_at:'invalid'})],date).share).toBeNull();
  });
  it('freezes the reference before recent days and ignores post-session values',()=>{
    const points=series();const result=contextSignal(points,'resting_heart_rate',date,minusDays(date,-7));
    expect(result.evaluation.referenceEnd).toBe(minusDays(date,8));expect(result.reference.median).toBe(50);
    expect(result.before.delta).toBe(0);expect(result.after.delta).toBe(30);
    const changed=contextSignal(points.map(p=>p.physiologicalDate>=date?{...p,value:200}:p),'resting_heart_rate',date,minusDays(date,-7));
    expect(changed.reference).toEqual(result.reference);expect(changed.before).toEqual(result.before);
  });
  it('does not include future observations or claim a full follow-up prematurely',()=>{
    const result=contextSignal(series(),'resting_heart_rate',date,minusDays(date,-2));
    expect(result.after.count).toBe(2);expect(result.after.delta).toBeNull();expect(result.points.every(p=>p.physiologicalDate<=minusDays(date,-2))).toBe(true);
  });
  it('requires sufficient reference even with complete recent windows',()=>{
    const result=contextSignal(series().filter(p=>p.physiologicalDate>=minusDays(date,7)),'resting_heart_rate',date,minusDays(date,-7));
    expect(result.before.count).toBe(7);expect(result.before.delta).toBeNull();expect(result.after.delta).toBeNull();
  });
  it('rejects comparisons across a source switch, including A to B to A',()=>{
    const points=series().map(p=>p.physiologicalDate===minusDays(date,-1)?{...p,sourceKey:'other',provider:'other'}:p);
    const result=contextSignal(points,'resting_heart_rate',date,minusDays(date,-7));
    expect(result.sourceChanged).toBe(true);expect(result.after.comparableCount).toBe(0);expect(result.after.delta).toBeNull();expect(result.before.delta).toBe(0);
  });
  it('filters similar sessions by distance and elevation without accepting missing values',()=>{
    const rows=[session(minusDays(date,1)),session(minusDays(date,2),{distance_m:20000}),session(minusDays(date,3),{elevation_gain_m:null}),session(minusDays(date,4),{provider:'other'}),session(minusDays(date,-1))];
    expect(comparableActivities(session(),rows)).toHaveLength(3);expect(comparableActivities(session(),rows,true)).toHaveLength(1);
  });
});

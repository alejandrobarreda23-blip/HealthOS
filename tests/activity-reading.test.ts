import { describe, expect, it } from 'vitest';
import { periodReading, sessionReading } from '../src/health/activity-reading';
import { canonicalDailySeries, minusDays } from '../src/health/metrics/daily-series';
import type { TrainingSession } from '../src/repositories/activities';
const date='2026-08-16';
const session=(day=date,overrides:Partial<TrainingSession>={}):TrainingSession=>({id:day,physiological_date:day,activity_type:'TrailRun',started_at:`${day}T08:00:00Z`,ended_at:`${day}T10:00:00Z`,provider:'intervals_icu',source_device:'watch',source_record_id:null,external_session_id:null,distance_m:10000,elevation_gain_m:500,active_energy_kcal:null,avg_heart_rate_bpm:140,max_heart_rate_bpm:170,...overrides});
const summary={name:'Final explosivo! entrenamiento perfecto',intensity:95,rpe:4,hasRouteReference:false};
const series=()=>canonicalDailySeries(Array.from({length:78},(_,i)=>({id:`point-${i}`,metricKey:'resting_heart_rate',physiologicalDate:minusDays(date,70-i),value:i<70?50:54,unit:'bpm',provider:'intervals_icu',sourceDevice:'watch',normalizerVersion:'1'})));
describe('explanatory activity readings',()=>{
  it('does not turn missing observations into intensity or praise from the activity name',()=>{
    const result=sessionReading(session(date,{summary:{...summary,rpe:null}}),[session()],[],date);
    expect(result[0].paragraphs.join(' ')).toContain('No consta esfuerzo percibido');
    expect(result[0].paragraphs.join(' ')).not.toMatch(/explosivo|perfecto|progresivo/);
    expect(result[1].status).toBe('limited');expect(result[2].status).toBe('pending');
  });
  it('requires five comparable sessions and excludes current and future sessions',()=>{
    const peers=Array.from({length:5},(_,i)=>session(minusDays(date,i+1)));
    expect(sessionReading(session(),peers,[],date)[0].status).toBe('comparison');
    expect(sessionReading(session(),[session(),...peers.slice(0,4),session(minusDays(date,-1))],[],date)[0].status).toBe('limited');
  });
  it('keeps pre-session reading and evidence unchanged when future observations change',()=>{
    const points=series();const rows=[session(),session(minusDays(date,1))];
    const before=sessionReading(session(),rows,points,date);
    const after=sessionReading(session(),[...rows,session(minusDays(date,-1))],points.map(p=>p.physiologicalDate>date?{...p,value:99,sourceKey:'new',provider:'new'}:p),minusDays(date,-7));
    expect(after[0]).toEqual(before[0]);expect(after[1]).toEqual(before[1]);
  });
  it('keeps partial follow-up pending comparisons until four comparable days exist',()=>{
    const result=sessionReading(session(),[session()],series(),minusDays(date,-2));
    expect(result[2].status).toBe('limited');expect(result[2].paragraphs[0]).toContain('2 de los siete días');
    expect(result[2].paragraphs.join(' ')).not.toContain('mediana 54');
  });
  it('describes numeric changes without attributing recovery or causation',()=>{
    const result=sessionReading(session(),[session(),session(minusDays(date,-2))],series(),minusDays(date,-7));
    expect(result[2].status).toBe('comparison');expect(result[2].paragraphs[0]).toContain('4 bpm por encima');
    expect(result[2].paragraphs[1]).toContain('otra sesión');
    expect(result[2].paragraphs[1]).toContain('no se puede atribuirles una causa');
  });
  it('makes no recovery comparison after an A–B–A source switch',()=>{
    const points=series().map(p=>p.physiologicalDate===minusDays(date,-1)?{...p,sourceKey:'B',provider:'B'}:p);
    expect(sessionReading(session(),[],points,minusDays(date,-7))[2].status).toBe('limited');
  });
  it('handles empty and future periods explicitly',()=>{
    expect(periodReading([],date).status).toBe('limited');
    expect(sessionReading(session(),[],[],minusDays(date,1))[0].status).toBe('pending');
  });
  it('does not count duplicate IDs or records outside the period',()=>{
    const result=periodReading([session(),session(),session(minusDays(date,28)),session(minusDays(date,-1))],date);
    expect(result.paragraphs[0]).toContain('1 sesión en 1 día');
  });
  it('does not generalize a partially reported RPE sample to the whole period',()=>{
    const result=periodReading([session(date,{summary}),session(minusDays(date,1))],date);
    expect(result.paragraphs[2]).toContain('1/2 sesiones');expect(result.paragraphs[2]).toContain('únicamente las sesiones valoradas');
  });
  it('does not express sport shares or weekly concentration when duration is incomplete',()=>{
    const result=periodReading([session(),session(minusDays(date,1),{ended_at:'invalid'})],date);
    expect(result.status).toBe('limited');expect(result.paragraphs[0]).toContain('total es parcial');
    expect(result.paragraphs[0]).not.toContain('% del tiempo');expect(result.paragraphs[1]).toContain('duración incompleta');
  });
});

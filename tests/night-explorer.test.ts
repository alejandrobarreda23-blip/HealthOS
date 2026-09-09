import { describe,it,expect } from 'vitest';
import { rhythmIndex,samplePaths,stageTimeline } from '../src/health/night-explorer';
import { canonicalDailySeries,minusDays } from '../src/health/metrics/daily-series';
import type { SleepRecord,WeeklyInput } from '../src/health/weekly-learning';
const session:SleepRecord={id:'night',date:'2026-09-09',start:'2026-09-08T22:00:00Z',end:'2026-09-09T06:00:00Z',timezone:'UTC',provider:'test',device:'ring',version:'1'};
describe('detalle nocturno e indicador explicable',()=>{
  it('conserva las fases desconocidas y recorta al intervalo',()=>{const a=Date.parse(session.start),b=Date.parse(session.end);const rows=stageTimeline(session,[{stage:'deep',start:a-60000,end:a+60000},{stage:'rem',start:b-60000,end:b+60000}]);expect(rows.map(r=>r.stage)).toEqual(['deep','unknown','rem']);expect(rows.reduce((s,r)=>s+r.end-r.start,0)).toBe(b-a);});
  it('no cuenta doble una superposición inválida',()=>{const a=Date.parse(session.start);expect(stageTimeline(session,[{stage:'light',start:a,end:a+120000},{stage:'deep',start:a+60000,end:a+180000}])[0].stage).toBe('unknown');});
  it('las curvas interrumpen los huecos y no mezclan señales',()=>{expect(samplePaths([{key:'heart_rate',time:0,value:50},{key:'heart_rate',time:300000,value:52},{key:'heart_rate',time:1200000,value:53},{key:'skin_temperature',time:1500000,value:34}]).map(p=>p.length)).toEqual([2,1,1]);});
  const input=():WeeklyInput=>{const dates=Array.from({length:35},(_,i)=>minusDays('2026-09-09',34-i));return {points:canonicalDailySeries(dates.map(date=>({metricKey:'sleep_duration',value:480,unit:'min',physiologicalDate:date,provider:'test',sourceDevice:'ring',normalizerVersion:'1'}))),sleeps:dates.map(date=>({...session,id:date,date,start:minusDays(date,1)+'T22:00:00Z',end:date+'T06:00:00Z'})),events:[],checkIns:[]};};
  it('expone numerador, denominador y referencia previa sin solaparla',()=>{const r=rhythmIndex(input(),'2026-09-09');expect(r.score).toBe(100);expect(r.aligned).toBe(7);expect(r.prior).toBe(28);expect(r.priorEnd<r.start).toBe(true);});
  it('no publica un índice con cobertura insuficiente',()=>{const data=input();data.sleeps=data.sleeps.slice(-4);expect(rhythmIndex(data,'2026-09-09').score).toBeNull();});
  it('requiere coincidencia de inicio y final, con el margen explícito',()=>{const data=input();data.sleeps[data.sleeps.length-1].end='2026-09-09T07:00:00Z';const r=rhythmIndex(data,'2026-09-09');expect(r.score).toBe(86);expect(r.rows.at(-1)).toMatchObject({bed:true,wake:false});});
});

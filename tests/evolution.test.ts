import { describe, it, expect } from 'vitest';
import { compareEvolution, evolutionSmoothing, quantile } from '../src/health/evolution';
import { minusDays } from '../src/health/metrics/daily-series';
const source=JSON.stringify(['intervals_icu','unknown','unknown']);
const points=Array.from({length:56},(_,i)=>({date:minusDays('2026-09-08',55-i),value:i<28?52:48,coverage:1,sourceKey:source}));
describe('Evolution descriptive summaries',()=>{
  it('compares distinct calendar periods including missing days, not the last 28 samples',()=>{const r=compareEvolution(points.filter((_,i)=>i%3!==0),'2026-09-08');expect(r.delta).toBe(-4);expect(r.recent.count).toBeLessThan(28);expect(r.previous.end).toBe('2026-08-11');});
  it('does not shift stale records to today or compare sparse periods',()=>{expect(compareEvolution(points,'2026-11-08').delta).toBeNull();expect(compareEvolution(points.slice(-28),'2026-09-08').delta).toBeNull();});
  it('rejects A-B-A source switches and unknown providers',()=>{expect(compareEvolution(points.map((p,i)=>({...p,sourceKey:i===20?'["other"]':source})),'2026-09-08').eligible).toBe(false);expect(compareEvolution(points.map(p=>({...p,sourceKey:'["unknown"]'})),'2026-09-08').eligible).toBe(false);});
  it('keeps missing days out of smoothing and breaks the line across them',()=>{const missing=points[40].date;const s=evolutionSmoothing(points.filter(p=>p.date!==missing));expect(s).toHaveLength(2);expect(s.flat().some(p=>p.date===missing)).toBe(false);});
  it('rebuilds smoothing after a source transition without reusing the old source',()=>{const rows=points.slice(0,10).map((p,i)=>({...p,value:i<6?50:100,sourceKey:i<6?source:'["other"]'}));const s=evolutionSmoothing(rows);expect(s.at(-1)?.[0].value).toBe(100);expect(s.at(-1)?.[0].count).toBe(4);});
  it('describes the central range without treating it as a healthy range',()=>{expect(quantile([1,2,3,4,100],.25)).toBe(2);expect(quantile([1,2,3,4,100],.75)).toBe(4);expect(quantile([],.25)).toBeNull();});
});

import { clockSummary, comparableSleepNights, type SleepRecord, type WeeklyInput } from './weekly-learning';
import { minusDays } from './metrics/daily-series';
export type StageName = 'awake' | 'rem' | 'light' | 'deep' | 'unknown';
export interface NightStage { stage: StageName; start: number; end: number; }
export interface NightSample { key: string; time: number; value: number; }
export interface NightDetail { stages: NightStage[]; samples: NightSample[]; }
export const NIGHT_SIGNALS = [
  { key: 'heart_rate', label: 'Pulso', unit: 'bpm', color: '#eb8f9d' },
  { key: 'ultrahuman_hrv', label: 'HRV · Ultrahuman', unit: 'ms', color: '#aaacf4' },
  { key: 'skin_temperature', label: 'Temperatura de la piel', unit: '°C', color: '#edbd76' },
] as const;
export const STAGES: Record<StageName, { label: string; color: string; level: number }> = {
  awake: { label: 'Despierto', color: '#e9ede6', level: 0 }, rem: { label: 'REM', color: '#d59ce9', level: 1 },
  light: { label: 'Ligero', color: '#9291d2', level: 2 }, deep: { label: 'Profundo', color: '#5b65ac', level: 3 }, unknown: { label: 'Sin fase', color: '#66716d', level: 2 },
};
export function stageTimeline(session: SleepRecord, stages: NightStage[]) {
  const start=Date.parse(session.start), end=Date.parse(session.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end<=start) return [];
  const sorted=stages.filter(s=>s.stage in STAGES && Number.isFinite(s.start) && Number.isFinite(s.end) && s.end>s.start && s.end>start && s.start<end).map(s=>({...s,start:Math.max(start,s.start),end:Math.min(end,s.end)})).sort((a,b)=>a.start-b.start);
  if (sorted.some((s,i)=>i>0&&s.start<sorted[i-1].end)) return [{stage:'unknown' as const,start,end}];
  const result:NightStage[]=[];let cursor=start;
  for(const s of sorted){if(s.start>cursor)result.push({stage:'unknown',start:cursor,end:s.start});result.push(s);cursor=s.end;}
  if(cursor<end)result.push({stage:'unknown',start:cursor,end});return result;
}
export function samplePaths(samples: NightSample[]) {
  const sorted=[...samples].filter(s=>Number.isFinite(s.time)&&Number.isFinite(s.value)).sort((a,b)=>a.time-b.time), paths:NightSample[][]=[];
  for(const row of sorted){const prev=paths.at(-1)?.at(-1);if(!prev || row.time-prev.time>10*60000 || row.key!==prev.key)paths.push([]);if(!prev||row.time!==prev.time)paths.at(-1)!.push(row);}return paths;
}
export function rhythmIndex(input: WeeklyInput, end: string) {
  const nights=comparableSleepNights(input,end), start=minusDays(end,6), priorStart=minusDays(start,28);
  const recent=nights.filter(n=>n.date>=start&&n.date<=end), prior=nights.filter(n=>n.date>=priorStart&&n.date<start);
  const bed=clockSummary(prior.map(n=>n.bed)),wake=clockSummary(prior.map(n=>n.wake));
  const distance=(a:number,b:number)=>Math.abs(((a-b+2160)%1440)-720);
  const ready=recent.length>=5&&prior.length>=20;
  const rows=recent.map(n=>({date:n.date,bed:bed?distance(n.bed,bed.minute)<=30:false,wake:wake?distance(n.wake,wake.minute)<=30:false}));
  const aligned=rows.filter(n=>n.bed&&n.wake).length;
  return {score:ready?Math.round(aligned/recent.length*100):null,aligned,rows,recent:recent.length,prior:prior.length,bed:bed?.minute,wake:wake?.minute,start,end,priorStart,priorEnd:minusDays(start,1),version:'rhythm_alignment_v1'};
}

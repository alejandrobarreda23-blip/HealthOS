import { median } from './metrics/daily-series';
export interface ClimbSegment {start:number;end:number;grade:number;bin:number;speed:number;hr:number|null;hrCoverage:number;gradeMin:number;gradeMax:number}
export interface ClimbAnalysis {version:string;status:string;method?:string;sourceFlagged?:boolean;segments:ClimbSegment[]}
export interface ClimbRow extends ClimbSegment {sessionId:string;date:string;sport:string;provider:string;device:string|null;method:string;flagged:boolean}
export const cyclingSports=['Ride','MountainBikeRide','GravelRide'];
export function climbGroups(rows:ClimbRow[]) {
  return [...new Set(rows.map(r=>r.bin))].sort((a,b)=>a-b).map(bin=>{
    const segments=rows.filter(r=>r.bin===bin);
    // Each activity contributes one average, so a long ride does not dominate the overview.
    const rides=[...new Set(segments.map(r=>r.sessionId))].map(id=>{
      const s=segments.filter(r=>r.sessionId===id),h=s.filter(r=>r.hr!==null);
      return {speed:s.reduce((a,r)=>a+r.speed,0)/s.length,hr:h.length?h.reduce((a,r)=>a+r.hr!,0)/h.length:null};
    });
    return {bin,segments:segments.length,rides:rides.length,speed:median(rides.map(r=>r.speed)),hr:median(rides.flatMap(r=>r.hr===null?[]:[r.hr]))};
  });
}
export function matchClimbs(rows:ClimbRow[],mode:'hr'|'speed') {
  const sorted=rows.filter(r=>!r.flagged&&r.hr!==null&&r.hrCoverage>=.9&&r.device&&r.gradeMax-r.gradeMin<=3).sort((a,b)=>a.date.localeCompare(b.date)||a.sessionId.localeCompare(b.sessionId)||a.start-b.start);
  const dates=[...new Set(sorted.map(r=>r.date))],cut=dates[Math.floor(dates.length/2)];
  const earlier=sorted.filter(r=>r.date<cut),later=sorted.filter(r=>r.date>=cut);
  const usedEarlier=new Set<string>(),usedLater=new Set<string>();
  const pairs:Array<{before:ClimbRow;after:ClimbRow;delta:number}>=[];
  for(const after of later){
    if(usedLater.has(after.sessionId))continue;
    const candidates=earlier.filter(before=>!usedEarlier.has(before.sessionId)&&before.bin===after.bin&&before.sport===after.sport&&before.provider===after.provider&&before.device===after.device&&before.method===after.method&&Math.abs(before.grade-after.grade)<=.25&&(Date.parse(after.date)-Date.parse(before.date))/86400000>=28
      && (mode==='hr'?Math.abs(after.speed/before.speed-1)<=.05:Math.abs(after.hr!-before.hr!)<=3));
    candidates.sort((a,b)=>Math.abs(a.grade-after.grade)-Math.abs(b.grade-after.grade)||(mode==='hr'?Math.abs(a.speed-after.speed)-Math.abs(b.speed-after.speed):Math.abs(a.hr!-after.hr!)-Math.abs(b.hr!-after.hr!))||a.date.localeCompare(b.date));
    const before=candidates[0];if(!before)continue;
    usedEarlier.add(before.sessionId);usedLater.add(after.sessionId);
    pairs.push({before,after,delta:mode==='hr'?after.hr!-before.hr!:after.speed-before.speed});
  }
  const eligible=pairs.length>=3&&new Set(pairs.map(p=>p.before.date)).size>=3&&new Set(pairs.map(p=>p.after.date)).size>=3;
  return {pairs,cut,eligible,delta:eligible?median(pairs.map(p=>p.delta)):null};
}

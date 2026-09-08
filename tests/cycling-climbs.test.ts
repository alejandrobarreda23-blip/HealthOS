import {describe,it,expect} from 'vitest';
import {climbGroups,matchClimbs,type ClimbRow} from '../src/health/cycling-climbs';
const row:ClimbRow={sessionId:'a',date:'2025-01-01',sport:'Ride',provider:'intervals_icu',device:'test',method:'altitude_100m',flagged:false,start:0,end:300,grade:5,bin:5,speed:18,hr:140,hrCoverage:1,gradeMin:4.5,gradeMax:5.5};
const rows=[0,1,2,3,4,5].map(i=>({...row,sessionId:String(i),date:`2025-${i<3?'01':'06'}-0${i%3+1}`,hr:i<3?145:140}));
describe('Cycling uphill comparisons',()=>{
  it('compares heart rate with matched speed and grade, with independent rides',()=>{const result=matchClimbs(rows,'hr');expect(result.eligible).toBe(true);expect(result.delta).toBe(-5);expect(result.pairs).toHaveLength(3);});
  it('does not turn many blocks from one ride into repeated evidence',()=>{const many=rows.flatMap(r=>Array.from({length:10},(_,i)=>({...r,start:i*300})));expect(matchClimbs(many,'hr').pairs).toHaveLength(3);expect(matchClimbs(rows.map(r=>({...r,sessionId:r.date<'2025-06'?'one':'two'})),'hr').eligible).toBe(false);});
  it('rejects flags, devices, incompatible grades and variable slopes',()=>{for(const change of [{flagged:true},{device:null},{grade:7},{gradeMax:12}]){const altered=rows.map((r,i)=>i>=3?{...r,...change}:r);expect(matchClimbs(altered,'hr').eligible).toBe(false);}});
  it('speed comparison requires similar HR and keeps the sign',()=>{const equalHR=rows.map((r,i)=>({...r,hr:140,speed:i<3?18:19}));expect(matchClimbs(equalHR,'speed').delta).toBe(1);expect(matchClimbs(rows,'speed').eligible).toBe(false);});
  it('requires three different dates on both sides and at least 28 days',()=>{expect(matchClimbs(rows.map(r=>({...r,date:r.date.slice(0,8)+'01'})),'hr').eligible).toBe(false);expect(matchClimbs(rows.map((r,i)=>({...r,date:`2025-01-${10+i}`})),'hr').pairs).toHaveLength(0);});
  it('gives each ride equal weight in gradient summaries',()=>{const many=Array.from({length:20},()=>({...row,speed:10}));const g=climbGroups([...many,{...row,sessionId:'b',speed:30}])[0];expect(g.speed).toBe(20);expect(g.rides).toBe(2);expect(g.segments).toBe(21);});
});

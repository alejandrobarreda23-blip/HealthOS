import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SleepRhythmChart, { sleepTimeline } from '../src/components/SleepRhythmChart';
const night=(date:string,bed:number,wake:number)=>({date,bed,wake,duration:420,timezone:'Europe/Madrid',id:date});
describe('noches en una escala horaria compartida',()=>{
  it('sitúa 23:50 y 00:10 a veinte minutos, no a un día',()=>{const t=sleepTimeline([night('2026-09-01',1430,440),night('2026-09-02',10,440)]);expect(Math.abs(t.intervals[0].start-t.intervals[1].start)).toBe(20);expect(t.intervals.every(n=>n.stop>n.start&&n.start>=t.min&&n.stop<=t.max)).toBe(true);});
  it('conserva días sin registro y distingue intervalo de tiempo dormido',()=>{const h=renderToStaticMarkup(createElement(SleepRhythmChart,{rows:[night('2026-09-06',1380,420)],end:'2026-09-06'}));expect(h.match(/Sin horario comparable/g)).toHaveLength(6);expect(h).toContain('7 h 0 min dormidos');expect(h).toContain('23:00');expect(h).toContain('no mide el tiempo despierto');expect(h).not.toContain('Añadir contexto');});
});

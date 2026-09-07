import{describe,expect,it}from'vitest';import{localMeasurementContext}from'../src/measurement/context';
describe('measurement context',()=>{it('preserves a local physiological date',()=>{const x=localMeasurementContext(new Date(2026,7,31,8,15));expect(x.physiologicalDate).toBe('2026-08-31');expect(Number.isFinite(x.utcOffsetMinutes)).toBe(true)})});

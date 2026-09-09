import { describe, expect, it } from 'vitest';
import { chartDomain } from '../src/health/chart-scale';
describe('escalas para explorar sin alterar datos', () => {
  it('no añade pasos negativos para crear margen', () => { const d=chartDomain([300,3000,20000],{key:'steps',reference:[-1000,9000]}); expect(d.low).toBe(0);expect(d.high).toBeGreaterThan(20000); });
  it('amplía cambios de sueño dejando los extremos fuera de escala', () => { const v=[180,420,430,440,450,460,470,580]; const full=chartDomain(v,{key:'sleep_duration'}),focus=chartDomain(v,{key:'sleep_duration',focused:true});expect(focus.high-focus.low).toBeLessThan(full.high-full.low);expect(focus.low).toBeGreaterThan(180);expect(focus.high).toBeLessThan(580);expect(v).toHaveLength(8); });
  it('aplica el límite físico también a curvas relativas a una referencia', () => { expect(chartDomain([-4900,3000],{key:'steps',offset:5000}).low).toBe(-5000); });
  it('permite desviaciones negativas y ejes constantes finitos', () => { expect(chartDomain([-.2,.1],{key:'temperature_deviation'}).low).toBeLessThan(0);const d=chartDomain([100,100],{key:'sleep_efficiency'});expect(d.high).toBe(100);expect(d.high).toBeGreaterThan(d.low); });
  it('el enfoque nunca amplía el dominio de una serie constante', () => { const full=chartDomain([450,450],{key:'sleep_duration'}),focus=chartDomain([450,450],{key:'sleep_duration',focused:true});expect(focus.low).toBeGreaterThanOrEqual(full.low);expect(focus.high).toBeLessThanOrEqual(full.high); });
});

import { describe, expect, it } from 'vitest';
import { buildEpisodeReading, detectSignalEpisodes, distance, episodeContext, episodeSignals, groupEpisodes, type SignalHistory } from '../src/health/episodes';
import { canonicalDailySeries, minusDays } from '../src/health/metrics/daily-series';
import { parseEpisodeNavigation } from '../src/health/episode-navigation';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EpisodeExplorer from '../src/components/EpisodeExplorer';
const first = '2026-06-01', date = (n: number) => minusDays(first, -n);
const signal = (changes: Record<number, number> = {}, count = 45): SignalHistory => ({ key: 'resting_heart_rate', source: 'a', circular: false, rows: Array.from({ length: count }, (_, i) => ({ date: date(i), value: changes[i] ?? 50, ids: [String(i)] })) });
const shift = { 28: 57, 29: 57, 30: 57, 31: 57 };
const input = (s: SignalHistory) => ({ points: canonicalDailySeries(s.rows.map(r => ({ id: r.ids[0], metricKey: s.key, physiologicalDate: r.date, value: r.value, provider: 'ultrahuman', unit: 'bpm', sourceDevice: 'ring', normalizerVersion: 'v1' }))), sleeps: [], events: [], checkIns: [] });
describe('episodios descriptivos', () => {
  it('renderiza un perfil sin episodios sin acceder a un intervalo inexistente', () => {
    const i = { points: [], sleeps: [], events: [], checkIns: [] };
    const html = renderToStaticMarkup(createElement(EpisodeExplorer, { report: buildEpisodeReading(i, date(45)), input: i }));
    expect(html).toContain('No hay episodios que cumplan'); expect(html).not.toContain('Añadir contexto del');
  });
  it('renderiza un episodio inicial con sus fechas y datos comparables', () => {
    const i = input(signal(shift)), report = buildEpisodeReading(i, date(45));
    const html = renderToStaticMarkup(createElement(EpisodeExplorer, { report, input: i, initialId: report.episodes[0].id }));
    expect(html).toContain('Antes, durante y después'); expect(html).toContain('2026-06-29');
  });
  it('requiere persistencia y confirma el regreso solo tras dos días', () => {
    const s = signal(shift), e = detectSignalEpisodes(s, date(45));
    expect(e).toHaveLength(1); expect(e[0]).toMatchObject({ start: date(28), end: date(31), status: 'returned', returnedAt: date(33), delta: 7 });
    expect(e[0].reference).toMatchObject({ center: 50, count: 28, end: date(27) });
  });
  it('ignora picos aislados, diferencias pequeñas y el día en curso', () => {
    expect(detectSignalEpisodes(signal({ 28: 80 }), date(45))).toHaveLength(0);
    expect(detectSignalEpisodes(signal({ 28: 51, 29: 51, 30: 51 }), date(45))).toHaveLength(0);
    expect(detectSignalEpisodes(signal(shift), date(30))).toHaveLength(0);
  });
  it('un hueco interrumpe; nunca prueba un regreso', () => {
    const s = signal(shift); s.rows = s.rows.filter(r => r.date !== date(32));
    expect(detectSignalEpisodes(s, date(45))[0].status).toBe('interrupted');
    const initialGap = signal(shift); initialGap.rows = initialGap.rows.filter(r => r.date !== date(29));
    expect(detectSignalEpisodes(initialGap, date(45))).toHaveLength(0);
  });
  it('no declara continuidad con datos antiguos ni usa el futuro', () => {
    expect(detectSignalEpisodes(signal(shift, 32), date(32))[0].status).toBe('ongoing');
    expect(detectSignalEpisodes(signal(shift, 32), date(40))[0].status).toBe('interrupted');
    expect(detectSignalEpisodes(signal(shift), date(32))[0].returnedAt).toBeNull();
  });
  it('no cruza un cambio de fuente A-B-A ni compara sin referencia suficiente', () => {
    const i = input(signal(shift)); i.points[27].sourceKey = 'b';
    expect(buildEpisodeReading(i, date(45)).episodes).toHaveLength(0);
    const s = signal(shift); s.rows = s.rows.filter((_, i) => i > 10);
    expect(detectSignalEpisodes(s, date(45))).toHaveLength(0);
  });
  it('respeta la variación personal cuando es amplia', () => {
    const s = signal(shift); s.rows.forEach((r, i) => { if (i < 28) r.value = i % 2 ? 40 : 60; });
    expect(detectSignalEpisodes(s, date(45))).toHaveLength(0);
  });
  it('agrupa solo fechas desviadas coincidentes y conserva el orden', () => {
    const a = detectSignalEpisodes(signal(shift), date(45))[0];
    const b = { ...a, id: 'b', key: 'steps', start: date(29), dates: [date(29), date(30), date(31)] };
    expect(groupEpisodes([b, a])[0].signals.map(s => s.key)).toEqual(['resting_heart_rate', 'steps']);
    expect(groupEpisodes([a, { ...b, dates: [date(31), date(32), date(33)] }])).toHaveLength(2);
  });
  it('la medianoche no crea un salto artificial', () => {
    expect(distance(10, 1430, true)).toBe(20);
    const s = signal({}, 40); s.key = 'bedtime'; s.circular = true;
    s.rows.forEach((r, i) => { r.value = i < 28 ? i % 2 ? 1430 : 10 : 5; });
    expect(detectSignalEpisodes(s, date(40))).toHaveLength(0);
    s.rows.slice(28, 32).forEach(r => r.value = 60);
    expect(detectSignalEpisodes(s, date(40))[0].delta).toBe(60);
  });
  it('sin datos no equivale a estabilidad y una única señal no representa el conjunto', () => {
    expect(buildEpisodeReading({ points: [], sleeps: [], events: [], checkIns: [] }, date(45)).title).toContain('reuniendo');
    expect(buildEpisodeReading(input(signal()), date(45)).title).toContain('reuniendo');
  });
  it('la lectura semanal exige cuatro días y mantiene el detalle de cobertura', () => {
    const s = signal({ 38: 57, 39: 57, 40: 57, 41: 57 });
    const r = buildEpisodeReading(input(s), date(45)); expect(r.changed).toHaveLength(1); expect(r.changed[0].persistent).toBe(4);
    expect(buildEpisodeReading(input(signal({ 38: 57, 39: 57, 40: 57 })), date(45)).changed).toHaveLength(0);
  });
  it('mantiene el contexto explícito cercano, incluido un evento que cruza el episodio', () => {
    const e = groupEpisodes(detectSignalEpisodes(signal(shift), date(45)))[0];
    const context = episodeContext({ events: [{ id: 'trip', date: date(20), endDate: date(29), type: 'travel' }, { id: 'far', date: date(0), type: 'illness' }], checkIns: [] }, e);
    expect(context.events.map(e => e.id)).toEqual(['trip']); expect(context.checkIns).toEqual([]);
  });
  it('descarta datos no finitos y conserva HRV del proveedor separada de RMSSD', () => {
    const i = input(signal()); i.points[3].value = NaN;
    i.points.push(...canonicalDailySeries([{ metricKey: 'ultrahuman_sleep_hrv', value: 80, unit: 'ms', physiologicalDate: date(43), provider: 'ultrahuman' }, { metricKey: 'hrv_rmssd', value: 50, unit: 'ms', physiologicalDate: date(43), provider: 'other' }]));
    const s = episodeSignals(i, date(45)); expect(s.find(s => s.key === 'resting_heart_rate')!.rows).toHaveLength(44); expect(s.filter(s => s.key.includes('hrv'))).toHaveLength(2);
  });
  it('la navegación pertenece a un perfil y valida las fechas', () => {
    const v = { subject: 'a', id: 'episode', metric: 'steps', start: '2026-07-01', end: '2026-07-04' };
    expect(parseEpisodeNavigation(JSON.stringify(v), 'a', '2026-09-09')).toEqual(v);
    expect(parseEpisodeNavigation(JSON.stringify(v), 'b', '2026-09-09')).toBeNull();
    expect(parseEpisodeNavigation(JSON.stringify({ ...v, start: '2026-02-30' }), 'a', '2026-09-09')).toBeNull();
    expect(parseEpisodeNavigation(JSON.stringify(v), 'a', '2026-07-03')).toBeNull();
  });
});

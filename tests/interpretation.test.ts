import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { differenceText, endingText, episodeHeadline, episodeNarrative, jointNarrative, metricMeaning, questionNarrative } from '../src/health/interpretation';
import { buildEpisodeReading, detectSignalEpisodes, type Episode, type SignalHistory } from '../src/health/episodes';
import { minusDays, canonicalDailySeries } from '../src/health/metrics/daily-series';
import type { WeeklyQuestion } from '../src/health/weekly-learning';
import Interpretation from '../src/components/Interpretation';
const date = (i: number) => minusDays('2026-06-01', -i);
function signal(): SignalHistory { return { key: 'resting_heart_rate', source: 'a', circular: false, rows: Array.from({ length: 40 }, (_, i) => ({ date: date(i), value: i >= 28 && i <= 31 ? 57 : 50, ids: [String(i)] })) }; }
function episode(): Episode { const a = detectSignalEpisodes(signal(), date(40))[0]; return { id: a.id, start: a.start, end: a.end, signals: [a] }; }
function question(state: WeeklyQuestion['state'], delta = -3): WeeklyQuestion { return { id: 'sleep-pulse', title: 'Pregunta', x: 'sleep_duration', y: 'resting_heart_rate', state, reference: null, calibrationCount: 20, eligibleDays: 30, excludedContext: 0, source: 'a', blocks: [{ start: date(28), end: date(55), complete: true, candidates: 20, matches: Array.from({ length: 5 }, () => ({} as any)), lower: 53, higher: 50, delta }] }; }
describe('interpretación sistemática', () => {
  it('distingue puntos porcentuales de cambio relativo', () => { expect(differenceText('oxygen_saturation', -1.5)).toBe('1,5 puntos porcentuales menos'); expect(differenceText('sleep_efficiency', -.5)).toContain('puntos porcentuales'); });
  it('dice qué registro falta y no confunde un hueco con un regreso', () => {
    const s = signal(); s.rows = s.rows.filter(r => r.date !== date(32)); const e = detectSignalEpisodes(s, date(40))[0];
    expect(e.stopReason).toBe('missing_day'); expect(e.stoppedAt).toBe(date(32)); expect(endingText(e)).toContain('Falta un registro'); expect(endingText(e)).not.toContain('o un cambio');
  });
  it('diferencia el giro en sentido contrario de la falta de datos', () => {
    const s = signal(); s.rows[32].value = 43; const e = detectSignalEpisodes(s, date(40))[0];
    expect(e.stopReason).toBe('opposite_shift'); expect(e.stoppedAt).toBe(date(32)); expect(endingText(e)).toContain('sentido contrario');
  });
  it('mantiene pendiente el desenlace en el último día completo', () => {
    const s = signal(); const e = detectSignalEpisodes(s, date(32))[0]; expect(e.stopReason).toBe('awaiting_data'); expect(endingText(e)).toContain('Aún no hay dos días');
  });
  it('narra el orden real y explica que la magnitud usa solo los días destacados', () => {
    const e = episode(), a = { ...e.signals[0], key: 'ultrahuman_sleep_hrv' }, b = { ...a, id: 'b', key: 'sleep_duration', start: date(30), direction: -1, delta: -117, dates: [date(30), date(31)] };
    e.signals = [b, a]; const n = episodeNarrative(e);
    expect(episodeHeadline(e)).toBe('La HRV nocturna subió; después el sueño se acortó'); expect(n.observation).toContain('mediana de los 2 días destacados'); expect(n.connection).toContain('comparten 2 días'); expect(n.meaning).toContain('no demuestra un mejor descanso');
  });
  it('una relación inconsistente no se convierte en un patrón causal', () => {
    const n = questionNarrative(question('inconsistent')); expect(n.title).toContain('aún no es un patrón estable'); expect(n.connection).toContain('No usamos la última comparación'); expect(n.level).toBe('inconsistent');
  });
  it('una primera asociación no se presenta como repetida', () => {
    const n = questionNarrative(question('first_signal')); expect(n.level).toBe('first'); expect(n.connection).toContain('fechas nuevas');
  });
  it('la repetición no prueba ni causa ni beneficio', () => {
    const n = questionNarrative(question('repeated')); expect(n.level).toBe('repeated'); expect(n.connection).toContain('factores no registrados'); expect(n.meaning).toContain('no demuestra por sí solo');
    expect(n.observation).toContain('noches por encima de tu referencia'); expect(n.observation).not.toContain('grupo superior');
  });
  it('la ausencia de comparación no produce una interpretación positiva', () => {
    const q = question('insufficient'); q.blocks = []; const n = questionNarrative(q); expect(n.observation).toContain('Todavía no hay suficientes'); expect(n.level).toBe('insufficient');
    const input = { points: [], sleeps: [], events: [], checkIns: [] }; expect(jointNarrative(buildEpisodeReading(input, date(40))).level).toBe('insufficient');
  });
  it('distingue beneficios generales de resultados individuales', () => {
    expect(metricMeaning('steps').meaning).toContain('beneficios conocidos'); expect(metricMeaning('steps').meaning).toContain('no mide por sí solo un beneficio personal'); expect(metricMeaning('oxygen_saturation').meaning).toContain('no confirma una oxigenación adecuada');
  });
  it('prioriza un cambio de movimiento sin llamar saludables a las cifras', () => {
    const points = canonicalDailySeries(Array.from({ length: 45 }, (_, i) => ({ metricKey: 'steps', physiologicalDate: date(i), value: i >= 38 ? 8000 : 6000 + i % 2 * 1000, unit: 'count', provider: 'test' })));
    const n = jointNarrative(buildEpisodeReading({ points, sleeps: [], events: [], checkIns: [] }, date(45))); expect(n.title).toContain('más pasos'); expect(n.meaning).toContain('no mide por sí solo un beneficio personal');
  });
  it('presenta A/B/C y atribuye las fuentes al conocimiento general', () => {
    const html = renderToStaticMarkup(createElement(Interpretation, { narrative: questionNarrative(question('repeated')) }));
    expect(html).toContain('Qué vemos'); expect(html).toContain('Cómo se relaciona'); expect(html).toContain('Qué significa para ti'); expect(html).toContain('conocimiento general'); expect(html).toContain('heart.org');
  });
});

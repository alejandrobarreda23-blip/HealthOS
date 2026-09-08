import { buildBaselineSnapshotV1, medianV1 } from '../baselines/engine';
import { detectSleepDeficitV1, detectSpo2DeviationV1, detectSustainedHrvDropV2, detectSustainedRhrElevationV1, detectWeightTrendV1 } from '../findings-v1/engine';
import { comparableSeries, DAILY_SERIES_VERSION, minusDays, type DailyPoint } from './daily-series';
import { getMetricDefinition } from './dictionary';

const DETECTORS = {
  hrv_rmssd: detectSustainedHrvDropV2,
  resting_heart_rate: detectSustainedRhrElevationV1,
  sleep_duration: detectSleepDeficitV1,
  oxygen_saturation: detectSpo2DeviationV1,
  weight: detectWeightTrendV1,
};
export function evaluateMetric(points: DailyPoint[], metricKey: string, asOfDate: string, confounders: string[] = []) {
  const segment = comparableSeries(points, metricKey, asOfDate);
  const recentDays = metricKey === 'weight' ? 28 : 7;
  const recentStart = minusDays(asOfDate, recentDays - 1);
  const referenceEnd = minusDays(asOfDate, recentDays);
  const rows = segment.points.map(p => ({ date: p.physiologicalDate, value: p.value, sourceFamily: p.sourceKey }));
  const recent = rows.filter(r => r.date >= recentStart);
  const baseline = buildBaselineSnapshotV1(metricKey, referenceEnd, rows,
    metricKey === 'weight' ? { windowDays: 90, minSamples: 8, minCoverage: .08 } : undefined);
  const detector = (DETECTORS as Partial<Record<string, typeof detectSleepDeficitV1>>)[metricKey];
  const minRecent = detector ? 4 : 1;
  const unknownSource = segment.points.length > 0 && !segment.points.at(-1)?.provider;
  const comparable = !unknownSource && (!segment.transition || baseline.sufficient);
  const eligible = comparable && recent.length >= minRecent && baseline.sufficient;
  const finding = eligible && detector ? detector(asOfDate, rows, confounders) : null;
  if (finding) {
    finding.detectorVersion += `+${DAILY_SERIES_VERSION}`;
    finding.evidence = { ...finding.evidence, dailySeriesVersion: DAILY_SERIES_VERSION,
      sourceKey: segment.points.at(-1)?.sourceKey, referenceStart: minusDays(referenceEnd, baseline.windowDays - 1),
      referenceEnd, observationIds: segment.points.filter(p => p.physiologicalDate >= minusDays(referenceEnd, baseline.windowDays - 1)).flatMap(p => p.observationIds) };
  }
  const status = !comparable ? 'not_comparable' : !eligible ? 'insufficient' : !detector ? 'no_rule' : finding ? 'detected' : 'not_detected';
  const reason = unknownSource ? 'Fuente no identificada: no se evalúa comparabilidad.'
    : !comparable ? 'Cambio de fuente o método: aún falta una referencia suficiente en el nuevo tramo.'
    : recent.length < minRecent ? `Hay ${recent.length} días válidos de ${recentDays}; se requieren al menos ${minRecent}.`
    : !baseline.sufficient ? `Referencia insuficiente: ${baseline.sampleCount} días válidos de ${baseline.windowDays}.`
    : !detector ? 'Comparación descriptiva disponible; no hay una regla de hallazgo implementada para esta señal.'
    : finding ? 'La comparación supera la regla descriptiva. No establece causa ni diagnóstico.'
    : 'Evaluado: no supera la regla de cambio. Esto no acredita normalidad clínica.';
  return { metricKey, asOfDate, status, reason, finding, baseline, recentDays, recentStart,
    referenceStart: minusDays(referenceEnd, baseline.windowDays - 1), referenceEnd,
    recentMedian: medianV1(recent.map(r => r.value)), recentCount: recent.length,
    current: segment.points.find(p => p.physiologicalDate === asOfDate) ?? null,
    latest: segment.points.at(-1) ?? null, points: segment.points,
    delta: eligible && baseline.median !== null && recent.length ? medianV1(recent.map(r => r.value))! - baseline.median : null,
    expectedDaily: getMetricDefinition(metricKey)?.missingnessPolicy !== 'not_expected_daily',
    transition: segment.transition };
}
export type MetricEvaluation = ReturnType<typeof evaluateMetric>;

import { supabase } from '../lib/supabase';
import { summarizeEvidenceStrength } from '../services/health-brief-v1';
import { detectSourceTransitionsV1, inferUnknownGapsV1 } from '../health/missingness-v1';
import { buildRuntimeAnalysisV1, type RuntimeExerciseV1, type RuntimeObservationV1 } from '../services/analysis-runtime-v1';

const RUNTIME_METRICS = ['hrv_rmssd', 'resting_heart_rate', 'sleep_duration', 'oxygen_saturation', 'steps', 'weight'];

function minusDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function refreshAnalysisRuntimeV1(userId: string, asOfDate: string) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  if (!userId) throw new Error('Usuario autenticado requerido.');

  const historyStart = minusDays(asOfDate, 120);
  const [obsResult, exerciseResult, eventResult] = await Promise.all([
    supabase
      .from('observations')
      .select('metric_key,physiological_date,value_numeric,provider,source_device,normalizer_version')
      .eq('user_id', userId)
      .in('metric_key', RUNTIME_METRICS)
      .gte('physiological_date', historyStart)
      .lte('physiological_date', asOfDate)
      .not('value_numeric', 'is', null)
      .order('physiological_date', { ascending: true }),
    supabase
      .from('exercise_sessions')
      .select('physiological_date,started_at,ended_at,distance_m,elevation_gain_m')
      .eq('user_id', userId)
      .gte('physiological_date', historyStart)
      .lte('physiological_date', asOfDate),
    supabase
      .from('events')
      .select('physiological_date,event_type')
      .eq('user_id', userId)
      .gte('physiological_date', minusDays(asOfDate, 28))
      .lte('physiological_date', asOfDate),
  ]);

  if (obsResult.error) throw obsResult.error;
  if (exerciseResult.error) throw exerciseResult.error;
  if (eventResult.error) throw eventResult.error;

  const observations: RuntimeObservationV1[] = (obsResult.data ?? []).map((row: any) => ({
    metricKey: row.metric_key,
    physiologicalDate: row.physiological_date,
    value: Number(row.value_numeric),
    provider: row.provider,
    sourceDevice: row.source_device,
    normalizerVersion: row.normalizer_version,
  }));

  const exercises: RuntimeExerciseV1[] = (exerciseResult.data ?? []).map((row: any) => ({
    physiologicalDate: row.physiological_date,
    durationMinutes: Math.max(0, (new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / 60000),
    distanceKm: Number(row.distance_m ?? 0) / 1000,
    elevationGainM: Number(row.elevation_gain_m ?? 0),
  }));

  const analysis = buildRuntimeAnalysisV1({
    asOfDate,
    observations,
    exercises,
    events: (eventResult.data ?? []).map((row: any) => ({ physiologicalDate: row.physiological_date, eventType: row.event_type })),
  });

  // Data-quality layer: preserve missingness as UNKNOWN unless explicit evidence identifies the cause.
  const recentStart = minusDays(asOfDate, 6);
  const corePresence = observations
    .filter((o) => ['hrv_rmssd','resting_heart_rate','sleep_duration','oxygen_saturation','steps'].includes(o.metricKey) && o.physiologicalDate >= recentStart)
    .map((o) => ({ date: o.physiologicalDate, metricKey: o.metricKey, provider: o.provider }));
  const gaps = inferUnknownGapsV1(recentStart, asOfDate, ['hrv_rmssd','resting_heart_rate','sleep_duration','oxygen_saturation','steps'], corePresence);
  if (gaps.length) {
    const missingWrite = await supabase.from('missingness_annotations').upsert(gaps.map((g) => ({
      user_id: userId, physiological_date: g.date, metric_key: g.metricKey, reason: g.reason,
      source_provider: '__unknown__', evidence: g.evidence, annotation_level: 'inferred', algorithm_version: g.algorithmVersion,
    })), { onConflict: 'user_id,physiological_date,metric_key,source_provider,algorithm_version' });
    if (missingWrite.error) throw missingWrite.error;
  }

  const transitions = detectSourceTransitionsV1(observations.map((o) => ({
    date: o.physiologicalDate, metricKey: o.metricKey, provider: o.provider ?? 'unknown', sourceDevice: o.sourceDevice, normalizerVersion: o.normalizerVersion,
  })));
  if (transitions.length) {
    const transitionWrite = await supabase.from('source_continuity_events').upsert(transitions.map((t) => ({
      user_id: userId, metric_key: t.metricKey, effective_date: t.effectiveDate, previous_source: t.previousSource, new_source: t.newSource,
      event_type: t.eventType, comparability: t.comparability, evidence: t.evidence,
    })), { onConflict: 'user_id,metric_key,effective_date,previous_source,new_source,event_type' });
    if (transitionWrite.error) throw transitionWrite.error;
  }

  const baselineRows = Object.entries(analysis.baselines).map(([metricKey, b]) => ({
    user_id: userId,
    metric_key: metricKey,
    as_of_date: asOfDate,
    baseline_kind: 'reference',
    context_key: 'reference',
    window_days: b.windowDays,
    sample_count: b.sampleCount,
    expected_days: b.expectedDays,
    coverage_ratio: b.coverage,
    median_value: b.median,
    mad_value: b.mad,
    p10: b.p10,
    p25: b.p25,
    p50: b.p50,
    p75: b.p75,
    p90: b.p90,
    evidence_strength: b.evidenceStrength,
    sufficient: b.sufficient,
    excluded_sample_count: 0,
    exclusion_reasons: {},
    algorithm_version: 'baseline_v1',
  }));

  const baselineWrite = await supabase
    .from('metric_baselines')
    .upsert(baselineRows, { onConflict: 'user_id,metric_key,as_of_date,baseline_kind,context_key,algorithm_version' });
  if (baselineWrite.error) throw baselineWrite.error;

  // Generated findings are snapshots: older active windows become resolved when a new analysis is produced.
  const generatedVersions = ['sustained_hrv_drop_v2','sustained_rhr_elevation_v1','recovery_concordance_v1','sleep_deficit_v1','spo2_deviation_v1','weight_trend_v1','insufficient_recent_data_v1'];
  const resolveOld = await supabase.from('findings').update({ status: 'resolved' })
    .eq('user_id', userId).eq('status', 'active').in('detector_version', generatedVersions).lt('period_end', asOfDate);
  if (resolveOld.error) throw resolveOld.error;

  for (const finding of analysis.findings) {
    const row = {
      user_id: userId,
      finding_key: finding.findingKey,
      domain: finding.domain,
      title: finding.title,
      summary: finding.summary,
      physiological_date: asOfDate,
      period_start: finding.periodStart,
      period_end: finding.periodEnd,
      severity: finding.severity,
      status: 'active',
      detector_version: finding.detectorVersion,
      evidence: finding.evidence,
      metadata: { input_metrics: finding.inputMetrics, confounders: finding.confounders },
      evidence_strength: finding.evidenceStrength,
      observed_value: finding.observedValue ?? null,
      reference_value: finding.referenceValue ?? null,
      effect_size: finding.effectSize ?? null,
      robust_z: finding.robustZ ?? null,
      sample_count: finding.sampleCount,
      coverage_ratio: finding.coverage,
      interpretation_boundary: finding.interpretationBoundary,
    };
    const write = await supabase.from('findings').upsert(row, {
      onConflict: 'user_id,finding_key,period_end,detector_version',
    });
    if (write.error) throw write.error;
  }

  const briefWrite = await supabase.from('health_briefs').upsert(
    {
      user_id: userId,
      physiological_date: asOfDate,
      brief_version: 'health_brief_v1',
      payload: analysis.brief,
      overall_coverage: analysis.brief.dataQuality.overallCoverage,
      evidence_strength: summarizeEvidenceStrength(analysis.findings),
    },
    { onConflict: 'user_id,physiological_date,brief_version' },
  );
  if (briefWrite.error) throw briefWrite.error;

  return analysis;
}

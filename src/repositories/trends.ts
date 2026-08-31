import { supabase } from '../lib/supabase';

export interface TrendPointV1 {
  date: string;
  value: number;
  coverage: number | null;
}

export interface BaselineBandPointV1 {
  date: string;
  median: number | null;
  p25: number | null;
  p75: number | null;
  sufficient: boolean;
}

const FEATURE_FOR_METRIC: Record<string, string> = {
  hrv_rmssd: 'hrv_daily',
  resting_heart_rate: 'resting_hr_daily',
  sleep_duration: 'sleep_duration_minutes',
  oxygen_saturation: 'spo2_daily',
  steps: 'steps',
};

export async function getTrendV1(userId: string, metricKey: string, startDate: string, endDate: string) {
  if (!supabase) return { points: [], baselines: [] };
  const featureKey = FEATURE_FOR_METRIC[metricKey] ?? metricKey;

  const [features, baselines] = await Promise.all([
    supabase
      .from('daily_features')
      .select('physiological_date,value_numeric,coverage_ratio')
      .eq('user_id', userId)
      .eq('feature_key', featureKey)
      .eq('computation_version', 'daily_features_v1')
      .gte('physiological_date', startDate)
      .lte('physiological_date', endDate)
      .order('physiological_date', { ascending: true }),
    supabase
      .from('metric_baselines')
      .select('as_of_date,median_value,p25,p75,sufficient')
      .eq('user_id', userId)
      .eq('metric_key', metricKey)
      .eq('baseline_kind', 'reference')
      .eq('algorithm_version', 'baseline_v1')
      .gte('as_of_date', startDate)
      .lte('as_of_date', endDate)
      .order('as_of_date', { ascending: true }),
  ]);

  if (features.error) throw features.error;
  if (baselines.error) throw baselines.error;

  return {
    points: (features.data ?? []).filter((r: any) => r.value_numeric !== null).map((r: any) => ({
      date: r.physiological_date,
      value: Number(r.value_numeric),
      coverage: r.coverage_ratio === null ? null : Number(r.coverage_ratio),
    })) as TrendPointV1[],
    baselines: (baselines.data ?? []).map((r: any) => ({
      date: r.as_of_date,
      median: r.median_value === null ? null : Number(r.median_value),
      p25: r.p25 === null ? null : Number(r.p25),
      p75: r.p75 === null ? null : Number(r.p75),
      sufficient: Boolean(r.sufficient),
    })) as BaselineBandPointV1[],
  };
}

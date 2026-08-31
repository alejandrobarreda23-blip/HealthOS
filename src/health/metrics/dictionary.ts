export type DataLevel = 'measured' | 'derived' | 'reported' | 'inferred';
export type ComparisonDirection = 'higher_favorable' | 'lower_favorable' | 'target_range' | 'context_dependent' | 'neutral';
export type SourceEquivalencePolicy = 'directly_comparable' | 'device_transition_sensitive' | 'provider_algorithm_sensitive' | 'not_comparable_without_calibration';
export type PhysiologicalDayRule = 'measurement_local_date' | 'start_date' | 'end_date' | 'wake_date' | 'provider_date';

export interface MetricDefinitionV1 {
  metricKey: string;
  displayName: string;
  semanticDefinition: string;
  canonicalUnit: string;
  dataLevel: DataLevel;
  measurementFamily: string;
  preferredSources: string[];
  sourceEquivalencePolicy: SourceEquivalencePolicy;
  physiologicalDayRule: PhysiologicalDayRule;
  plausibleRange?: { min: number; max: number };
  baseline: {
    windowDays: number;
    minSamples: number;
    minCoverage: number;
    aggregation: 'median' | 'sum' | 'mean' | 'last';
  };
  comparisonDirection: ComparisonDirection;
  missingnessPolicy: 'preserve_gap' | 'not_expected_daily';
  version: 'metric_dictionary_v1';
}

export const METRIC_DICTIONARY_V1: Record<string, MetricDefinitionV1> = {
  hrv_rmssd: {
    metricKey: 'hrv_rmssd', displayName: 'HRV RMSSD', semanticDefinition: 'Resumen diario/nocturno de variabilidad de frecuencia cardiaca expresada como RMSSD.', canonicalUnit: 'ms', dataLevel: 'derived', measurementFamily: 'autonomic_recovery', preferredSources: ['intervals_icu', 'oura', 'ultrahuman', 'suunto', 'health_connect'], sourceEquivalencePolicy: 'device_transition_sensitive', physiologicalDayRule: 'wake_date', plausibleRange: { min: 5, max: 300 }, baseline: { windowDays: 42, minSamples: 20, minCoverage: 0.5, aggregation: 'median' }, comparisonDirection: 'higher_favorable', missingnessPolicy: 'preserve_gap', version: 'metric_dictionary_v1'
  },
  resting_heart_rate: {
    metricKey: 'resting_heart_rate', displayName: 'FC reposo', semanticDefinition: 'Frecuencia cardiaca de reposo resumida por el proveedor o algoritmo.', canonicalUnit: 'bpm', dataLevel: 'derived', measurementFamily: 'cardiovascular_recovery', preferredSources: ['intervals_icu', 'oura', 'ultrahuman', 'suunto', 'health_connect'], sourceEquivalencePolicy: 'provider_algorithm_sensitive', physiologicalDayRule: 'wake_date', plausibleRange: { min: 25, max: 140 }, baseline: { windowDays: 42, minSamples: 20, minCoverage: 0.5, aggregation: 'median' }, comparisonDirection: 'lower_favorable', missingnessPolicy: 'preserve_gap', version: 'metric_dictionary_v1'
  },
  sleep_duration: {
    metricKey: 'sleep_duration', displayName: 'Duración del sueño', semanticDefinition: 'Duración total de sueño atribuida al día fisiológico de despertar.', canonicalUnit: 'min', dataLevel: 'derived', measurementFamily: 'sleep', preferredSources: ['intervals_icu', 'oura', 'ultrahuman', 'suunto', 'health_connect'], sourceEquivalencePolicy: 'provider_algorithm_sensitive', physiologicalDayRule: 'wake_date', plausibleRange: { min: 30, max: 900 }, baseline: { windowDays: 42, minSamples: 20, minCoverage: 0.5, aggregation: 'median' }, comparisonDirection: 'context_dependent', missingnessPolicy: 'preserve_gap', version: 'metric_dictionary_v1'
  },
  oxygen_saturation: {
    metricKey: 'oxygen_saturation', displayName: 'SpO₂', semanticDefinition: 'Saturación periférica de oxígeno resumida para el periodo de medición.', canonicalUnit: '%', dataLevel: 'derived', measurementFamily: 'respiratory', preferredSources: ['intervals_icu', 'oura', 'ultrahuman', 'suunto', 'health_connect'], sourceEquivalencePolicy: 'provider_algorithm_sensitive', physiologicalDayRule: 'wake_date', plausibleRange: { min: 70, max: 100 }, baseline: { windowDays: 42, minSamples: 20, minCoverage: 0.5, aggregation: 'median' }, comparisonDirection: 'target_range', missingnessPolicy: 'preserve_gap', version: 'metric_dictionary_v1'
  },
  steps: {
    metricKey: 'steps', displayName: 'Pasos', semanticDefinition: 'Número de pasos atribuidos al día fisiológico.', canonicalUnit: 'count', dataLevel: 'derived', measurementFamily: 'activity', preferredSources: ['intervals_icu', 'health_connect', 'suunto', 'oura', 'ultrahuman'], sourceEquivalencePolicy: 'provider_algorithm_sensitive', physiologicalDayRule: 'provider_date', plausibleRange: { min: 0, max: 100000 }, baseline: { windowDays: 28, minSamples: 14, minCoverage: 0.5, aggregation: 'median' }, comparisonDirection: 'context_dependent', missingnessPolicy: 'preserve_gap', version: 'metric_dictionary_v1'
  },
  weight: {
    metricKey: 'weight', displayName: 'Peso', semanticDefinition: 'Peso corporal medido por báscula o dispositivo validado.', canonicalUnit: 'kg', dataLevel: 'measured', measurementFamily: 'body_composition', preferredSources: ['withings', 'health_connect', 'manual'], sourceEquivalencePolicy: 'directly_comparable', physiologicalDayRule: 'measurement_local_date', plausibleRange: { min: 25, max: 300 }, baseline: { windowDays: 42, minSamples: 8, minCoverage: 0.15, aggregation: 'median' }, comparisonDirection: 'context_dependent', missingnessPolicy: 'not_expected_daily', version: 'metric_dictionary_v1'
  },
  systolic_blood_pressure: {
    metricKey: 'systolic_blood_pressure', displayName: 'TA sistólica', semanticDefinition: 'Presión arterial sistólica medida.', canonicalUnit: 'mmHg', dataLevel: 'measured', measurementFamily: 'blood_pressure', preferredSources: ['withings', 'health_connect', 'manual'], sourceEquivalencePolicy: 'directly_comparable', physiologicalDayRule: 'measurement_local_date', plausibleRange: { min: 60, max: 260 }, baseline: { windowDays: 42, minSamples: 8, minCoverage: 0.15, aggregation: 'median' }, comparisonDirection: 'target_range', missingnessPolicy: 'not_expected_daily', version: 'metric_dictionary_v1'
  },
  diastolic_blood_pressure: {
    metricKey: 'diastolic_blood_pressure', displayName: 'TA diastólica', semanticDefinition: 'Presión arterial diastólica medida.', canonicalUnit: 'mmHg', dataLevel: 'measured', measurementFamily: 'blood_pressure', preferredSources: ['withings', 'health_connect', 'manual'], sourceEquivalencePolicy: 'directly_comparable', physiologicalDayRule: 'measurement_local_date', plausibleRange: { min: 30, max: 180 }, baseline: { windowDays: 42, minSamples: 8, minCoverage: 0.15, aggregation: 'median' }, comparisonDirection: 'target_range', missingnessPolicy: 'not_expected_daily', version: 'metric_dictionary_v1'
  },
  training_duration: {
    metricKey: 'training_duration', displayName: 'Duración de entrenamiento', semanticDefinition: 'Minutos totales de ejercicio en el día.', canonicalUnit: 'min', dataLevel: 'derived', measurementFamily: 'training', preferredSources: ['suunto', 'intervals_icu', 'health_connect'], sourceEquivalencePolicy: 'directly_comparable', physiologicalDayRule: 'start_date', plausibleRange: { min: 0, max: 1440 }, baseline: { windowDays: 28, minSamples: 8, minCoverage: 0.25, aggregation: 'sum' }, comparisonDirection: 'context_dependent', missingnessPolicy: 'not_expected_daily', version: 'metric_dictionary_v1'
  },
  training_distance: {
    metricKey: 'training_distance', displayName: 'Distancia de entrenamiento', semanticDefinition: 'Distancia total registrada en sesiones de entrenamiento.', canonicalUnit: 'km', dataLevel: 'derived', measurementFamily: 'training', preferredSources: ['suunto', 'intervals_icu', 'health_connect'], sourceEquivalencePolicy: 'directly_comparable', physiologicalDayRule: 'start_date', plausibleRange: { min: 0, max: 500 }, baseline: { windowDays: 28, minSamples: 8, minCoverage: 0.25, aggregation: 'sum' }, comparisonDirection: 'neutral', missingnessPolicy: 'not_expected_daily', version: 'metric_dictionary_v1'
  },
  elevation_gain: {
    metricKey: 'elevation_gain', displayName: 'Desnivel positivo', semanticDefinition: 'Desnivel positivo acumulado en entrenamiento.', canonicalUnit: 'm', dataLevel: 'derived', measurementFamily: 'training', preferredSources: ['suunto', 'intervals_icu'], sourceEquivalencePolicy: 'provider_algorithm_sensitive', physiologicalDayRule: 'start_date', plausibleRange: { min: 0, max: 15000 }, baseline: { windowDays: 28, minSamples: 8, minCoverage: 0.25, aggregation: 'sum' }, comparisonDirection: 'neutral', missingnessPolicy: 'not_expected_daily', version: 'metric_dictionary_v1'
  },
  training_load: {
    metricKey: 'training_load', displayName: 'Carga de entrenamiento', semanticDefinition: 'Carga interna o externa derivada por un algoritmo explícitamente identificado.', canonicalUnit: 'AU', dataLevel: 'derived', measurementFamily: 'training_load', preferredSources: ['healthos', 'intervals_icu', 'suunto'], sourceEquivalencePolicy: 'not_comparable_without_calibration', physiologicalDayRule: 'start_date', plausibleRange: { min: 0, max: 2000 }, baseline: { windowDays: 28, minSamples: 8, minCoverage: 0.25, aggregation: 'sum' }, comparisonDirection: 'context_dependent', missingnessPolicy: 'not_expected_daily', version: 'metric_dictionary_v1'
  },
  active_energy: {
    metricKey: 'active_energy', displayName: 'Energía activa', semanticDefinition: 'Energía atribuida a actividad física por el proveedor.', canonicalUnit: 'kcal', dataLevel: 'derived', measurementFamily: 'energy', preferredSources: ['health_connect', 'suunto', 'intervals_icu'], sourceEquivalencePolicy: 'provider_algorithm_sensitive', physiologicalDayRule: 'provider_date', plausibleRange: { min: 0, max: 10000 }, baseline: { windowDays: 28, minSamples: 14, minCoverage: 0.5, aggregation: 'median' }, comparisonDirection: 'neutral', missingnessPolicy: 'preserve_gap', version: 'metric_dictionary_v1'
  },
  energy_score: {
    metricKey: 'energy_score', displayName: 'Energía percibida', semanticDefinition: 'Auto-reporte ordinal de energía percibida.', canonicalUnit: 'score_1_5', dataLevel: 'reported', measurementFamily: 'subjective', preferredSources: ['manual'], sourceEquivalencePolicy: 'directly_comparable', physiologicalDayRule: 'provider_date', plausibleRange: { min: 1, max: 5 }, baseline: { windowDays: 28, minSamples: 10, minCoverage: 0.35, aggregation: 'median' }, comparisonDirection: 'higher_favorable', missingnessPolicy: 'preserve_gap', version: 'metric_dictionary_v1'
  },
  stress_score: {
    metricKey: 'stress_score', displayName: 'Estrés percibido', semanticDefinition: 'Auto-reporte ordinal de estrés mental percibido.', canonicalUnit: 'score_1_5', dataLevel: 'reported', measurementFamily: 'subjective', preferredSources: ['manual'], sourceEquivalencePolicy: 'directly_comparable', physiologicalDayRule: 'provider_date', plausibleRange: { min: 1, max: 5 }, baseline: { windowDays: 28, minSamples: 10, minCoverage: 0.35, aggregation: 'median' }, comparisonDirection: 'lower_favorable', missingnessPolicy: 'preserve_gap', version: 'metric_dictionary_v1'
  }
};

export function getMetricDefinition(metricKey: string): MetricDefinitionV1 | null {
  return METRIC_DICTIONARY_V1[metricKey] ?? null;
}

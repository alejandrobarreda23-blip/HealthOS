import type { BodySystemKey } from './view-state';

export type BodySystemMetricConfig = {
  key: string;
  label: string;
  unit: string;
  trendKey?: string;
  direction?: 'higher' | 'lower' | 'range' | 'context';
};

export type BodySystemConfig = {
  key: BodySystemKey;
  label: string;
  shortLabel: string;
  description: string;
  metrics: BodySystemMetricConfig[];
  primaryTrendMetric?: string;
};

export const BODY_SYSTEM_CONFIG: Record<BodySystemKey, BodySystemConfig> = {
  autonomic: {
    key: 'autonomic',
    label: 'Autonómico',
    shortLabel: 'Autonómico',
    description: 'Regulación autonómica y balance de recuperación observables en HRV y frecuencia cardiaca en reposo.',
    primaryTrendMetric: 'hrv_rmssd',
    metrics: [
      { key: 'hrv_rmssd', label: 'HRV', unit: 'ms', trendKey: 'hrv_rmssd', direction: 'context' },
      { key: 'resting_heart_rate', label: 'FC reposo', unit: 'bpm', trendKey: 'resting_heart_rate', direction: 'context' },
    ],
  },
  cardio: {
    key: 'cardio',
    label: 'Cardiorrespiratorio',
    shortLabel: 'Cardiorresp.',
    description: 'Señales cardiovasculares y respiratorias longitudinales observadas por las fuentes conectadas.',
    primaryTrendMetric: 'resting_heart_rate',
    metrics: [
      { key: 'resting_heart_rate', label: 'FC reposo', unit: 'bpm', trendKey: 'resting_heart_rate', direction: 'context' },
      { key: 'oxygen_saturation', label: 'SpO₂', unit: '%', trendKey: 'oxygen_saturation', direction: 'range' },
    ],
  },
  sleep: {
    key: 'sleep',
    label: 'Sueño',
    shortLabel: 'Sueño',
    description: 'Duración y continuidad del sueño observadas como parte de la historia fisiológica.',
    primaryTrendMetric: 'sleep_duration',
    metrics: [
      { key: 'sleep_duration', label: 'Sueño', unit: 'min', trendKey: 'sleep_duration', direction: 'context' },
    ],
  },
  musculo: {
    key: 'musculo',
    label: 'Musculoesquelético',
    shortLabel: 'Musculoesq.',
    description: 'Carga mecánica y actividad observada. No equivale a lesión ni estado musculoesquelético clínico.',
    primaryTrendMetric: 'steps',
    metrics: [
      { key: 'steps', label: 'Pasos', unit: 'count', trendKey: 'steps', direction: 'context' },
      { key: 'exercise', label: 'Entrenamiento', unit: 'session', direction: 'context' },
    ],
  },
  metabolic: {
    key: 'metabolic',
    label: 'Metabólico',
    shortLabel: 'Metabólico',
    description: 'Composición y metabolismo requieren medidas específicas; peso aislado no caracteriza el sistema.',
    metrics: [
      { key: 'weight', label: 'Peso', unit: 'kg', direction: 'context' },
    ],
  },
  recovery: {
    key: 'recovery',
    label: 'Recuperación',
    shortLabel: 'Recuperación',
    description: 'Lectura transversal de señales de recuperación. La integración no implica un score clínico.',
    primaryTrendMetric: 'hrv_rmssd',
    metrics: [
      { key: 'hrv_rmssd', label: 'HRV', unit: 'ms', trendKey: 'hrv_rmssd', direction: 'context' },
      { key: 'resting_heart_rate', label: 'FC reposo', unit: 'bpm', trendKey: 'resting_heart_rate', direction: 'context' },
      { key: 'sleep_duration', label: 'Sueño', unit: 'min', trendKey: 'sleep_duration', direction: 'context' },
    ],
  },
};

export function bodySystemConfig(key: BodySystemKey) {
  return BODY_SYSTEM_CONFIG[key];
}

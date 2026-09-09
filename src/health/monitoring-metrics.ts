export const MONITORING_METRICS = [
  { key: 'sleep_duration', label: 'Sueño', unit: 'min' },
  { key: 'resting_heart_rate', label: 'FC en reposo', unit: 'bpm' },
  { key: 'ultrahuman_sleep_hrv', label: 'HRV nocturna · Ultrahuman', unit: 'ms' },
  { key: 'hrv_rmssd', label: 'HRV RMSSD', unit: 'ms' },
  { key: 'steps', label: 'Pasos', unit: 'count' },
  { key: 'sleep_efficiency', label: 'Eficiencia del sueño', unit: '%' },
  { key: 'oxygen_saturation', label: 'SpO₂', unit: '%' },
  { key: 'temperature_deviation', label: 'Desviación de temperatura', unit: 'degC' },
  { key: 'deep_sleep_duration', label: 'Sueño profundo', unit: 'min' },
  { key: 'rem_duration', label: 'Sueño REM', unit: 'min' },
  { key: 'ultrahuman_active_minutes', label: 'Minutos activos · Ultrahuman', unit: 'min' },
  { key: 'weight', label: 'Peso', unit: 'kg' },
] as const;
export function formatMonitoring(key: string, value: number): string {
  const unit = MONITORING_METRICS.find(m => m.key === key)?.unit ?? '';
  if (unit === 'min') return `${value < 0 ? '−' : ''}${Math.floor(Math.round(Math.abs(value)) / 60)} h ${Math.round(Math.abs(value)) % 60} min`;
  return `${value.toLocaleString('es-ES', { maximumFractionDigits: key === 'steps' ? 0 : key === 'temperature_deviation' ? 2 : 1 })} ${unit === 'count' ? 'pasos' : unit === 'degC' ? '°C' : unit}`;
}

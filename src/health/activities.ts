import type { TrainingSession } from '../repositories/activities';
import { minusDays } from './metrics/daily-series';

const SPORTS: Record<string, string> = { Ride: 'Bicicleta', MountainBikeRide: 'MTB', VirtualRide: 'Bicicleta indoor', TrailRun: 'Trail', Run: 'Carrera', Hike: 'Senderismo', Walk: 'Caminar', Swim: 'Natación', OpenWaterSwim: 'Aguas abiertas', WeightTraining: 'Fuerza', Yoga: 'Yoga', BackcountrySki: 'Esquí de montaña', AlpineSki: 'Esquí alpino', NordicSki: 'Esquí de fondo', RockClimbing: 'Escalada', Workout: 'Entrenamiento' };
export const sportLabel = (type: string) => SPORTS[type] ?? type;
export function nonnegative(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
export function sessionSeconds(session: TrainingSession): number | null {
  const seconds = (Date.parse(session.ended_at) - Date.parse(session.started_at)) / 1000;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}
export function durationLabel(seconds: number | null): string {
  if (seconds === null) return 'Sin dato';
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}
export function numberLabel(value: unknown, unit = '', divisor = 1): string {
  const n = nonnegative(value);
  return n === null ? 'Sin dato' : `${(n / divisor).toLocaleString('es-ES', { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ''}`;
}
export function activityComparison(session: TrainingSession, sessions: TrainingSession[]) {
  const start = minusDays(session.physiological_date, 90);
  const peers = sessions.filter(s => s.id !== session.id && s.activity_type === session.activity_type && s.provider === session.provider
    && s.source_device === session.source_device && s.physiological_date >= start && s.physiological_date < session.physiological_date);
  const metrics = [
    { label: 'Duración registrada', read: sessionSeconds, unit: 'min', divisor: 60 },
    { label: 'Distancia', read: (s: TrainingSession) => nonnegative(s.distance_m), unit: 'km', divisor: 1000 },
    { label: 'Desnivel positivo', read: (s: TrainingSession) => nonnegative(s.elevation_gain_m), unit: 'm', divisor: 1 },
  ];
  return { count: peers.length, start, rows: metrics.map(metric => {
    const values = peers.map(metric.read).filter((v): v is number => v !== null).sort((a,b) => a-b);
    const mid = Math.floor(values.length / 2);
    const median = values.length >= 3 ? values.length % 2 ? values[mid] : (values[mid-1]+values[mid])/2 : null;
    return { ...metric, current: metric.read(session), median, count: values.length };
  }) };
}

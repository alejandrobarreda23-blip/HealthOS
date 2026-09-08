import type { HealthBriefV1 } from '../services/health-brief-v1';

export const VISIBLE_AGING_PHOTO_PROTOCOL_V1 = {
  id: 'visible_aging_photo_v1',
  version: '1.0.0',
  cadenceDays: 56,
  estimatedSeconds: 90,
  poses: ['front', 'oblique_45', 'profile'] as const,
  instructions: [
    'Misma cámara y distancia cuando sea posible.',
    'Luz frontal difusa y sin filtros.',
    'Expresión neutra y encuadre de cabeza y hombros.',
  ],
} as const;

export type VisibleAgingPose =
  (typeof VISIBLE_AGING_PHOTO_PROTOCOL_V1.poses)[number];

export type VisibleAgingDomainKey =
  | 'skin'
  | 'face'
  | 'hair'
  | 'body_posture';

export type VisibleAgingAcquisitionState =
  | 'none'
  | 'baseline'
  | 'trajectory';

export type VisibleAgingPhotoSession = {
  id: string;
  userId: string;
  capturedAt: string;
  protocolVersion: string;
  protocolSnapshot: Record<string, unknown>;
  status: 'complete' | 'cancelled';
  frontPath: string;
  obliquePath: string;
  profilePath: string;
  quality: Record<string, unknown>;
  createdAt: string;
};

export type VisibleAgingIntervention = {
  id: string;
  userId: string;
  interventionType: string;
  label: string;
  startedOn: string;
  endedOn: string | null;
  note: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type VisibleAgingObservation = {
  id: string;
  userId: string;
  sessionId: string | null;
  metricKey: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  dataLevel: 'measured' | 'derived' | 'reported' | 'inferred';
  methodVersion: string;
  confidence: number | null;
  observedAt: string;
  metadata: Record<string, unknown>;
};

export type VisibleAgingDomainState = {
  key: VisibleAgingDomainKey;
  label: string;
  acquisition: VisibleAgingAcquisitionState;
  evidenceLabel: string;
  note: string;
};

export type PassiveVisibleAgingContext = {
  overallCoverage: number;
  hrv: { current: number | null; reference: number | null; unit: string } | null;
  restingHr: { current: number | null; reference: number | null; unit: string } | null;
  sleep: { current: number | null; reference: number | null; unit: string } | null;
  weightKg: number | null;
  trainingSessions7d: number;
};

function baselineMedian(metric: { baseline?: { median?: number | null } | null } | undefined) {
  const value = metric?.baseline?.median;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function buildPassiveVisibleAgingContext(
  brief: HealthBriefV1 | null,
): PassiveVisibleAgingContext {
  return {
    overallCoverage: brief?.dataQuality.overallCoverage ?? 0,
    hrv: brief?.recovery.hrv
      ? {
          current: brief.recovery.hrv.current,
          reference: baselineMedian(brief.recovery.hrv),
          unit: brief.recovery.hrv.unit,
        }
      : null,
    restingHr: brief?.recovery.restingHr
      ? {
          current: brief.recovery.restingHr.current,
          reference: baselineMedian(brief.recovery.restingHr),
          unit: brief.recovery.restingHr.unit,
        }
      : null,
    sleep: brief?.sleep.duration
      ? {
          current: brief.sleep.duration.current,
          reference: baselineMedian(brief.sleep.duration),
          unit: brief.sleep.duration.unit,
        }
      : null,
    weightKg: brief?.body.weightKg ?? null,
    trainingSessions7d: brief?.training.sessions7d ?? 0,
  };
}

export function nextVisibleAgingCampaignDate(
  latest: VisibleAgingPhotoSession | null,
): Date {
  if (!latest) return new Date();
  const next = new Date(latest.capturedAt);
  next.setDate(next.getDate() + VISIBLE_AGING_PHOTO_PROTOCOL_V1.cadenceDays);
  return next;
}

export function daysUntilVisibleAgingCampaign(
  latest: VisibleAgingPhotoSession | null,
  now = new Date(),
): number {
  const due = nextVisibleAgingCampaignDate(latest);
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  return Math.ceil((startDue - startNow) / 86_400_000);
}

export function visibleAgingDomains(
  sessions: VisibleAgingPhotoSession[],
  observations: VisibleAgingObservation[],
  passive: PassiveVisibleAgingContext,
): VisibleAgingDomainState[] {
  const completeSessions = sessions.filter((x) => x.status === 'complete').length;
  const photoState: VisibleAgingAcquisitionState =
    completeSessions >= 2 ? 'trajectory' : completeSessions === 1 ? 'baseline' : 'none';

  const byPrefix = (prefix: string) =>
    observations.some((x) => x.metricKey.startsWith(prefix));

  return [
    {
      key: 'skin',
      label: 'Piel',
      acquisition: photoState,
      evidenceLabel: byPrefix('visible_skin_')
        ? 'señales derivadas disponibles'
        : completeSessions
          ? 'historia fotográfica disponible'
          : 'sin línea base visual',
      note:
        'Textura, pigmentación y uniformidad sólo se publicarán cuando exista un método de imagen versionado.',
    },
    {
      key: 'face',
      label: 'Fenotipo facial',
      acquisition: photoState,
      evidenceLabel: byPrefix('visible_face_')
        ? 'señales derivadas disponibles'
        : completeSessions
          ? 'historia fotográfica disponible'
          : 'sin línea base visual',
      note:
        'El módulo compara trayectoria personal; no publica “edad facial” ni atractivo.',
    },
    {
      key: 'hair',
      label: 'Cabello',
      acquisition: photoState,
      evidenceLabel: byPrefix('visible_hair_')
        ? 'señales derivadas disponibles'
        : completeSessions
          ? 'historia fotográfica disponible'
          : 'sin línea base visual',
      note:
        'Densidad aparente y línea capilar requieren imágenes comparables antes de inferir tendencia.',
    },
    {
      key: 'body_posture',
      label: 'Composición y postura',
      acquisition: passive.weightKg != null ? 'baseline' : 'none',
      evidenceLabel:
        passive.weightKg != null
          ? 'peso longitudinal como contexto'
          : 'falta medición corporal independiente',
      note:
        'Peso no equivale a composición corporal. La apariencia corporal se mantiene separada del Aging fisiológico.',
    },
  ];
}

export const VISIBLE_AGING_INTERVENTION_OPTIONS = [
  { value: 'photoprotection', label: 'Fotoprotección' },
  { value: 'retinoid', label: 'Retinoide / retinol' },
  { value: 'skin_treatment', label: 'Tratamiento cutáneo' },
  { value: 'hair_treatment', label: 'Tratamiento capilar' },
  { value: 'strength_training', label: 'Entrenamiento de fuerza' },
  { value: 'body_composition', label: 'Cambio de composición corporal' },
  { value: 'other', label: 'Otro' },
] as const;

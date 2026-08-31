export type MissingnessReasonV1 =
  | 'device_not_worn'
  | 'source_not_synced'
  | 'metric_not_supported'
  | 'permission_missing'
  | 'bad_data'
  | 'unknown';

export interface MetricPresenceV1 {
  date: string;
  metricKey: string;
  provider?: string | null;
}

export interface MissingnessCandidateV1 {
  date: string;
  metricKey: string;
  reason: MissingnessReasonV1;
  provider?: string | null;
  evidence: Record<string, unknown>;
  algorithmVersion: 'missingness_v1';
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  const stop = new Date(`${end}T12:00:00Z`);
  while (cursor <= stop) {
    out.push(isoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/**
 * Creates only UNKNOWN gaps from absence of measurements.
 * Absence alone is never enough to claim DEVICE_NOT_WORN or SOURCE_NOT_SYNCED.
 */
export function inferUnknownGapsV1(
  startDate: string,
  endDate: string,
  expectedMetricKeys: string[],
  presence: MetricPresenceV1[],
): MissingnessCandidateV1[] {
  const present = new Set(presence.map((p) => `${p.date}|${p.metricKey}`));
  const candidates: MissingnessCandidateV1[] = [];

  for (const date of eachDate(startDate, endDate)) {
    for (const metricKey of expectedMetricKeys) {
      if (present.has(`${date}|${metricKey}`)) continue;
      candidates.push({
        date,
        metricKey,
        reason: 'unknown',
        evidence: {
          rule: 'expected_daily_metric_absent',
          inference_limit: 'absence_does_not_identify_cause',
        },
        algorithmVersion: 'missingness_v1',
      });
    }
  }

  return candidates;
}

export interface SourcePointV1 {
  date: string;
  metricKey: string;
  provider: string;
  sourceDevice?: string | null;
  normalizerVersion?: string | null;
}

export interface SourceContinuityCandidateV1 {
  metricKey: string;
  effectiveDate: string;
  previousSource: string;
  newSource: string;
  eventType: 'device_change' | 'provider_change' | 'algorithm_change' | 'unknown_transition';
  comparability: 'likely_comparable' | 'transition_sensitive' | 'requires_calibration' | 'unknown';
  evidence: Record<string, unknown>;
}

/**
 * Detects explicit source/device/normalizer transitions in observed data.
 * It does not infer physiological change from them.
 */
export function detectSourceTransitionsV1(points: SourcePointV1[]): SourceContinuityCandidateV1[] {
  const grouped = new Map<string, SourcePointV1[]>();
  for (const point of points) {
    const list = grouped.get(point.metricKey) ?? [];
    list.push(point);
    grouped.set(point.metricKey, list);
  }

  const out: SourceContinuityCandidateV1[] = [];
  for (const [metricKey, list] of grouped) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    let previous: SourcePointV1 | undefined;
    for (const current of sorted) {
      if (!previous) {
        previous = current;
        continue;
      }

      const providerChanged = current.provider !== previous.provider;
      const deviceChanged = (current.sourceDevice ?? null) !== (previous.sourceDevice ?? null);
      const algorithmChanged = (current.normalizerVersion ?? null) !== (previous.normalizerVersion ?? null);

      if (providerChanged || deviceChanged || algorithmChanged) {
        const eventType = providerChanged
          ? 'provider_change'
          : deviceChanged
            ? 'device_change'
            : 'algorithm_change';
        out.push({
          metricKey,
          effectiveDate: current.date,
          previousSource: [previous.provider, previous.sourceDevice].filter(Boolean).join(' / '),
          newSource: [current.provider, current.sourceDevice].filter(Boolean).join(' / '),
          eventType,
          comparability: providerChanged || deviceChanged ? 'transition_sensitive' : 'unknown',
          evidence: {
            previous_provider: previous.provider,
            new_provider: current.provider,
            previous_device: previous.sourceDevice ?? null,
            new_device: current.sourceDevice ?? null,
            previous_normalizer: previous.normalizerVersion ?? null,
            new_normalizer: current.normalizerVersion ?? null,
          },
        });
      }
      previous = current;
    }
  }
  return out;
}

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";
import { createClient } from "npm:@supabase/supabase-js@2";

const LEGACY_INTERVALS_API_KEY = Deno.env.get("INTERVALS_API_KEY");
const LEGACY_INTERVALS_ATHLETE_ID = Deno.env.get("INTERVALS_ATHLETE_ID");

const DEFAULT_OLDEST = "2025-09-01";

const RAW_NORMALIZER_VERSION = "intervals-v1";
const WELLNESS_NORMALIZER_VERSION = "intervals-wellness-v1";
const EXERCISE_NORMALIZER_VERSION = "intervals-exercise-v1";

type SyncIdentity = {
  dataUserId: string;
  subjectId: string | null;
  apiKey: string;
  athleteId: string;
  oldest: string;
  configuredIntegration: boolean;
};

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function intervalsHeaders(apiKey: string) {
  return {
    Authorization: `Basic ${btoa(`API_KEY:${apiKey}`)}`,
    Accept: "application/json",
  };
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function providerDateTimestamp(date: string): string {
  return `${date}T12:00:00.000Z`;
}

function addSeconds(iso: string, seconds: number): string {
  return new Date(new Date(iso).getTime() + seconds * 1000).toISOString();
}

function localDateFromActivity(
  activity: Record<string, unknown>,
): string | null {
  if (
    typeof activity.start_date_local === "string" &&
    activity.start_date_local.length >= 10
  ) {
    return activity.start_date_local.slice(0, 10);
  }

  if (
    typeof activity.start_date === "string" &&
    activity.start_date.length >= 10
  ) {
    return activity.start_date.slice(0, 10);
  }

  return null;
}

function buildObservation(
  userId: string,
  sourceRecordId: string,
  date: string,
  metricKey: string,
  value: number,
  unit: string,
) {
  return {
    user_id: userId,
    metric_key: metricKey,
    value_numeric: value,
    unit,
    started_at: providerDateTimestamp(date),
    ended_at: null,
    timezone: null,
    utc_offset_minutes: null,
    physiological_date: date,
    assignment_rule: "provider_date",
    provider: "intervals_icu",
    source_type: "wearable",
    source_device: "Intervals.icu upstream device",
    measurement_method: "daily_summary_via_intervals_no_exact_timestamp",
    data_level: "derived",
    quality_score: null,
    source_record_id: sourceRecordId,
    external_observation_id: `wellness:${date}:${metricKey}`,
    normalizer_version: WELLNESS_NORMALIZER_VERSION,
    algorithm_version: null,
  };
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error("Missing Supabase service role environment");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function resolveSyncIdentity(
  req: Request,
  ctx: any,
): Promise<SyncIdentity> {
  const authenticatedUserId = ctx.userClaims?.id;
  if (!authenticatedUserId) throw new Error("AUTHENTICATED_USER_REQUIRED");

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const targetSubjectId =
    typeof body.target_subject_id === "string"
      ? body.target_subject_id
      : null;

  // Backwards compatibility: existing personal sync keeps working
  // with the current Edge Function environment secrets.
  if (!targetSubjectId) {
    if (!LEGACY_INTERVALS_API_KEY || !LEGACY_INTERVALS_ATHLETE_ID) {
      throw new Error("Missing legacy Intervals.icu secrets");
    }

    return {
      dataUserId: authenticatedUserId,
      subjectId: null,
      apiKey: LEGACY_INTERVALS_API_KEY,
      athleteId: LEGACY_INTERVALS_ATHLETE_ID,
      oldest: DEFAULT_OLDEST,
      configuredIntegration: false,
    };
  }

  // User-scoped RPC proves that the caller is an admin who may access
  // this subject. Only after that check do we use service-role access.
  const { data: scopeRows, error: scopeError } = await ctx.supabase.rpc(
    "get_subject_scope",
    { target_subject_id: targetSubjectId },
  );

  if (scopeError) throw scopeError;

  const scope = Array.isArray(scopeRows) ? scopeRows[0] : null;
  if (!scope || scope.access !== "admin") {
    throw new Error("ADMIN_SUBJECT_ACCESS_REQUIRED");
  }

  const service = getServiceClient();

  const { data: subject, error: subjectError } = await service
    .from("subjects")
    .select("id,created_by_user_id,status")
    .eq("id", targetSubjectId)
    .single();

  if (subjectError) throw subjectError;
  if (!subject || subject.status !== "active" || !subject.created_by_user_id) {
    throw new Error("SUBJECT_DATA_OWNER_NOT_FOUND");
  }

  const { data: integration, error: integrationError } = await service
    .from("subject_integrations")
    .select(
      "credential_secret_id,external_account_id,history_oldest,status",
    )
    .eq("subject_id", targetSubjectId)
    .eq("provider", "intervals_icu")
    .single();

  if (integrationError) throw integrationError;
  if (!integration || integration.status !== "active") {
    throw new Error("INTERVALS_INTEGRATION_NOT_ACTIVE");
  }

  if (!integration.credential_secret_id || !integration.external_account_id) {
    throw new Error("INTERVALS_INTEGRATION_INCOMPLETE");
  }

  const { data: secretRows, error: secretError } = await service
    .schema("vault")
    .from("decrypted_secrets")
    .select("decrypted_secret")
    .eq("id", integration.credential_secret_id)
    .limit(1);

  if (secretError) throw secretError;

  const apiKey = secretRows?.[0]?.decrypted_secret;
  if (!apiKey) throw new Error("INTERVALS_SECRET_NOT_FOUND");

  return {
    dataUserId: subject.created_by_user_id,
    subjectId: targetSubjectId,
    apiKey,
    athleteId: integration.external_account_id,
    oldest: integration.history_oldest ?? DEFAULT_OLDEST,
    configuredIntegration: true,
  };
}

async function markAdminSync(
  ctx: any,
  subjectId: string | null,
  ok: boolean,
  error?: string | null,
) {
  if (!subjectId) return;

  const result = await ctx.supabase.rpc(
    "admin_mark_subject_integration_sync",
    {
      target_subject_id: subjectId,
      target_provider: "intervals_icu",
      sync_ok: ok,
      sync_error: error ?? null,
    },
  );

  if (result.error) {
    console.warn("HealthOS integration audit:", result.error.message);
  }
}

export default {
  fetch: withSupabase(
    { auth: "user" },

    async (req, ctx) => {
      let identity: SyncIdentity | null = null;

      try {
        identity = await resolveSyncIdentity(req, ctx);

        const userId = identity.dataUserId;
        const supabase = identity.configuredIntegration
          ? getServiceClient()
          : ctx.supabase;

        const oldest = identity.oldest;
        const newest = todayUtcDate();

        const wellnessUrl =
          `https://intervals.icu/api/v1/athlete/${identity.athleteId}` +
          `/wellness?oldest=${oldest}&newest=${newest}`;

        const activitiesUrl =
          `https://intervals.icu/api/v1/athlete/${identity.athleteId}` +
          `/activities?oldest=${oldest}&newest=${newest}`;

        const [wellnessRes, activitiesRes] = await Promise.all([
          fetch(wellnessUrl, {
            headers: intervalsHeaders(identity.apiKey),
          }),
          fetch(activitiesUrl, {
            headers: intervalsHeaders(identity.apiKey),
          }),
        ]);

        if (!wellnessRes.ok) {
          const body = await wellnessRes.text();
          await markAdminSync(
            ctx,
            identity.subjectId,
            false,
            `wellness ${wellnessRes.status}: ${body.slice(0, 500)}`,
          );
          return Response.json(
            {
              ok: false,
              stage: "fetch_wellness",
              status: wellnessRes.status,
              body,
            },
            { status: 502 },
          );
        }

        if (!activitiesRes.ok) {
          const body = await activitiesRes.text();
          await markAdminSync(
            ctx,
            identity.subjectId,
            false,
            `activities ${activitiesRes.status}: ${body.slice(0, 500)}`,
          );
          return Response.json(
            {
              ok: false,
              stage: "fetch_activities",
              status: activitiesRes.status,
              body,
            },
            { status: 502 },
          );
        }

        const wellness =
          (await wellnessRes.json()) as Record<string, unknown>[];

        const activities =
          (await activitiesRes.json()) as Record<string, unknown>[];

        // 1. RAW FIRST
        const rawRecords: Record<string, unknown>[] = [];

        for (const row of wellness) {
          rawRecords.push({
            user_id: userId,
            provider: "intervals_icu",
            source_type: "wearable",
            record_type: "wellness_daily",
            external_id: String(row.id),
            source_schema_version: "intervals_api_v1",
            source_updated_at:
              typeof row.updated === "string" ? row.updated : null,
            payload: row,
            payload_hash: await sha256(row),
          });
        }

        for (const activity of activities) {
          rawRecords.push({
            user_id: userId,
            provider: "intervals_icu",
            source_type: "wearable",
            record_type: "activity",
            external_id: String(activity.id),
            source_schema_version: "intervals_api_v1",
            source_updated_at:
              typeof activity.icu_sync_date === "string"
                ? activity.icu_sync_date
                : null,
            payload: activity,
            payload_hash: await sha256(activity),
          });
        }

        for (let i = 0; i < rawRecords.length; i += 100) {
          const { error } = await supabase
            .from("source_records")
            .upsert(rawRecords.slice(i, i + 100), {
              onConflict: "user_id,provider,record_type,external_id",
            });

          if (error) throw new Error(`raw_upsert: ${error.message}`);
        }

        // 2. NORMALIZATION ALWAYS READS BACK FROM RAW
        const {
          data: storedRaw,
          error: storedRawError,
        } = await supabase
          .from("source_records")
          .select("id,record_type,external_id,payload")
          .eq("user_id", userId)
          .eq("provider", "intervals_icu")
          .in("record_type", ["wellness_daily", "activity"]);

        if (storedRawError) {
          throw new Error(
            `read_raw_for_normalization: ${storedRawError.message}`,
          );
        }

        const observations: Record<string, unknown>[] = [];

        for (const raw of storedRaw ?? []) {
          if (raw.record_type !== "wellness_daily") continue;

          const row = raw.payload as Record<string, unknown>;
          const date = String(row.id ?? "");
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

          const hrv = finiteNumber(row.hrv);
          const restingHR = finiteNumber(row.restingHR);
          const sleepSecs = finiteNumber(row.sleepSecs);
          const spO2 = finiteNumber(row.spO2);
          const steps = finiteNumber(row.steps);

          if (hrv !== null) {
            observations.push(
              buildObservation(
                userId, raw.id, date, "hrv_rmssd", hrv, "ms",
              ),
            );
          }

          if (restingHR !== null) {
            observations.push(
              buildObservation(
                userId,
                raw.id,
                date,
                "resting_heart_rate",
                restingHR,
                "bpm",
              ),
            );
          }

          if (sleepSecs !== null) {
            observations.push(
              buildObservation(
                userId,
                raw.id,
                date,
                "sleep_duration",
                sleepSecs / 60,
                "min",
              ),
            );
          }

          if (spO2 !== null) {
            observations.push(
              buildObservation(
                userId,
                raw.id,
                date,
                "oxygen_saturation",
                spO2,
                "%",
              ),
            );
          }

          if (steps !== null) {
            observations.push(
              buildObservation(
                userId,
                raw.id,
                date,
                "steps",
                steps,
                "count",
              ),
            );
          }
        }

        for (let i = 0; i < observations.length; i += 200) {
          const { error } = await supabase
            .from("observations")
            .upsert(observations.slice(i, i + 200), {
              onConflict: "user_id,provider,external_observation_id",
            });

          if (error) {
            throw new Error(`observations_upsert: ${error.message}`);
          }
        }

        const exerciseSessions: Record<string, unknown>[] = [];
        let skippedActivities = 0;

        for (const raw of storedRaw ?? []) {
          if (raw.record_type !== "activity") continue;

          const activity = raw.payload as Record<string, unknown>;
          const start =
            typeof activity.start_date === "string"
              ? activity.start_date
              : null;

          const elapsed = finiteNumber(
            activity.elapsed_time ??
              activity.icu_recording_time ??
              activity.moving_time,
          );

          const physiologicalDate = localDateFromActivity(activity);

          if (!start || !elapsed || elapsed <= 0 || !physiologicalDate) {
            skippedActivities += 1;
            continue;
          }

          exerciseSessions.push({
            user_id: userId,
            activity_type:
              typeof activity.type === "string"
                ? activity.type
                : "Unknown",
            started_at: start,
            ended_at: addSeconds(start, elapsed),
            timezone:
              typeof activity.timezone === "string"
                ? activity.timezone
                : null,
            utc_offset_minutes: null,
            physiological_date: physiologicalDate,
            assignment_rule: "start_date",
            provider: "intervals_icu",
            source_device:
              typeof activity.device_name === "string"
                ? activity.device_name
                : null,
            source_record_id: raw.id,
            external_session_id: String(activity.id),
            distance_m: finiteNumber(activity.distance),
            elevation_gain_m: finiteNumber(
              activity.total_elevation_gain,
            ),
            active_energy_kcal: finiteNumber(activity.calories),
            avg_heart_rate_bpm: finiteNumber(
              activity.average_heartrate,
            ),
            max_heart_rate_bpm: finiteNumber(
              activity.max_heartrate,
            ),
            data_level: "measured",
            quality_score: null,
            normalizer_version: EXERCISE_NORMALIZER_VERSION,
          });
        }

        for (let i = 0; i < exerciseSessions.length; i += 100) {
          const { error } = await supabase
            .from("exercise_sessions")
            .upsert(exerciseSessions.slice(i, i + 100), {
              onConflict: "user_id,provider,external_session_id",
            });

          if (error) {
            throw new Error(
              `exercise_sessions_upsert: ${error.message}`,
            );
          }
        }

        const [
          observationCountResult,
          exerciseCountResult,
          rawCountResult,
        ] = await Promise.all([
          supabase
            .from("observations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("provider", "intervals_icu"),
          supabase
            .from("exercise_sessions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("provider", "intervals_icu"),
          supabase
            .from("source_records")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("provider", "intervals_icu"),
        ]);

        if (observationCountResult.error) {
          throw observationCountResult.error;
        }
        if (exerciseCountResult.error) {
          throw exerciseCountResult.error;
        }
        if (rawCountResult.error) throw rawCountResult.error;

        await markAdminSync(ctx, identity.subjectId, true, null);

        return Response.json({
          ok: true,
          stage: "INTERVALS_NORMALIZATION_V1_MULTIUSER",
          subject_id: identity.subjectId,
          data_user_id: userId,
          range: { oldest, newest },
          raw: {
            fetched: wellness.length + activities.length,
            stored: rawCountResult.count ?? 0,
          },
          normalized: {
            observations_generated: observations.length,
            observations_stored: observationCountResult.count ?? 0,
            exercise_sessions_generated: exerciseSessions.length,
            exercise_sessions_stored: exerciseCountResult.count ?? 0,
            activities_skipped: skippedActivities,
          },
          metrics: {
            hrv_rmssd: observations.filter(
              (x) => x.metric_key === "hrv_rmssd",
            ).length,
            resting_heart_rate: observations.filter(
              (x) => x.metric_key === "resting_heart_rate",
            ).length,
            sleep_duration: observations.filter(
              (x) => x.metric_key === "sleep_duration",
            ).length,
            oxygen_saturation: observations.filter(
              (x) => x.metric_key === "oxygen_saturation",
            ).length,
            steps: observations.filter(
              (x) => x.metric_key === "steps",
            ).length,
          },
          versions: {
            raw: RAW_NORMALIZER_VERSION,
            wellness: WELLNESS_NORMALIZER_VERSION,
            exercise: EXERCISE_NORMALIZER_VERSION,
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);

        if (identity?.subjectId) {
          await markAdminSync(ctx, identity.subjectId, false, message);
        }

        return Response.json(
          {
            ok: false,
            stage: "unexpected",
            error: message,
          },
          { status: 500 },
        );
      }
    },
  ),
};

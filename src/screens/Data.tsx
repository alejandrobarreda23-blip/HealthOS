import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabase';
import { isLiveMode } from '../state/runtime';

type SyncResult = {
  ok: boolean;

  run_id?: string;
  stage?: string;

  range?: {
    oldest: string;
    newest: string;
  };

  raw?: {
    fetched: number;
    stored: number;
  };

  normalized?: {
    observations_generated: number;
    observations_inserted?: number;
    observations_updated?: number;
    observations_stored: number;

    exercise_sessions_generated: number;
    exercise_sessions_inserted?: number;
    exercise_sessions_updated?: number;
    exercise_sessions_stored: number;

    activities_skipped: number;
  };

  metrics?: {
    hrv_rmssd: number;
    resting_heart_rate: number;
    sleep_duration: number;
    oxygen_saturation: number;
    steps: number;
  };

  error?: string;
  details?: string;
  hint?: string;
};

function formatPayloadError(
  payload: Record<string, unknown>,
) {
  const parts: string[] = [];

  if (payload.stage) {
    parts.push(
      `Etapa: ${String(payload.stage)}`,
    );
  }

  if (payload.error) {
    parts.push(
      `Error: ${String(payload.error)}`,
    );
  }

  if (payload.details) {
    parts.push(
      `Detalles: ${String(payload.details)}`,
    );
  }

  if (payload.hint) {
    parts.push(
      `Hint: ${String(payload.hint)}`,
    );
  }

  if (payload.run_id) {
    parts.push(
      `Run: ${String(payload.run_id)}`,
    );
  }

  return parts.length > 0
    ? parts.join('\n')
    : JSON.stringify(
        payload,
        null,
        2,
      );
}

async function getFunctionErrorMessage(
  error: unknown,
): Promise<string> {
  if (
    error &&
    typeof error === 'object'
  ) {
    const candidate =
      error as {
        message?: string;
        context?: unknown;
      };

    /*
     * Supabase FunctionsHttpError expone
     * normalmente la Response original en context.
     */
    if (
      candidate.context instanceof Response
    ) {
      try {
        const text =
          await candidate.context
            .clone()
            .text();

        if (text) {
          try {
            const payload =
              JSON.parse(text);

            if (
              payload &&
              typeof payload === 'object'
            ) {
              return formatPayloadError(
                payload as Record<
                  string,
                  unknown
                >,
              );
            }
          } catch {
            return text;
          }
        }
      } catch {
        // usamos message como fallback
      }
    }

    if (candidate.message) {
      return candidate.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(
    error ??
      'Error desconocido durante la sincronización.',
  );
}

export default function Data() {
  const { user, signOut } = useAuth();

  const [syncing, setSyncing] =
    useState(false);

  const [
    syncResult,
    setSyncResult,
  ] =
    useState<SyncResult | null>(
      null,
    );

  const [
    syncError,
    setSyncError,
  ] =
    useState<string | null>(
      null,
    );

  const sources = [
    [
      'Health Connect',
      'Preparado',
      'Actividad, sueño y signos vitales',
    ],
    [
      'Oura',
      'Próximamente',
      'API directa',
    ],
    [
      'Ultrahuman',
      'Próximamente',
      'UltraSignal API',
    ],
    [
      'Analíticas',
      'Preparado',
      'PDF / entrada estructurada',
    ],
  ];

  async function syncIntervals() {
    if (!supabase) {
      setSyncError(
        'Supabase no está configurado.',
      );
      return;
    }

    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          'rapid-service',
          {
            body: {},
          },
        );

      if (error) {
        const message =
          await getFunctionErrorMessage(
            error,
          );

        throw new Error(message);
      }

      if (!data?.ok) {
        throw new Error(
          formatPayloadError(
            data ?? {
              error:
                'La sincronización no se completó.',
            },
          ),
        );
      }

      setSyncResult(
        data as SyncResult,
      );
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : String(error),
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <header>
        <div className="eyebrow">
          DATOS
        </div>

        <h1>Fuentes</h1>

        <p className="muted">
          {isLiveMode()
            ? 'Modo live'
            : 'Modo demo/local'}
        </p>
      </header>

      <section className="card">
        <div className="intervalsHead">
          <div>
            <strong>
              Intervals.icu
            </strong>

            <small>
              Suunto · histórico y
              entrenamiento
            </small>
          </div>

          <span className="connectedBadge">
            Conectado
          </span>
        </div>

        <p className="muted intervalsDescription">
          Importación raw-first.
          Los datos originales se
          conservan antes de cualquier
          normalización o análisis.
        </p>

        <button
          className="primary"
          onClick={syncIntervals}
          disabled={
            syncing || !user
          }
        >
          {syncing
            ? 'Sincronizando…'
            : 'Sincronizar Intervals.icu'}
        </button>

        {syncResult && (
          <div className="syncResult">
            <strong>
              Sincronización completada
            </strong>

            {syncResult.raw && (
              <>
                <div>
                  <span>
                    Raw recibidos
                  </span>

                  <b>
                    {
                      syncResult.raw
                        .fetched
                    }
                  </b>
                </div>

                <div>
                  <span>
                    Raw almacenados
                  </span>

                  <b>
                    {
                      syncResult.raw
                        .stored
                    }
                  </b>
                </div>
              </>
            )}

            {syncResult.normalized && (
              <>
                <div
                  className="syncTotal"
                >
                  <span>
                    Observaciones
                  </span>

                  <b>
                    {
                      syncResult
                        .normalized
                        .observations_stored
                    }
                  </b>
                </div>

                <div>
                  <span>
                    Actividades
                  </span>

                  <b>
                    {
                      syncResult
                        .normalized
                        .exercise_sessions_stored
                    }
                  </b>
                </div>

                <div>
                  <span>
                    Actividades omitidas
                  </span>

                  <b>
                    {
                      syncResult
                        .normalized
                        .activities_skipped
                    }
                  </b>
                </div>
              </>
            )}

            {syncResult.metrics && (
              <>
                <div
                  className="syncTotal"
                >
                  <span>HRV</span>

                  <b>
                    {
                      syncResult
                        .metrics
                        .hrv_rmssd
                    }
                  </b>
                </div>

                <div>
                  <span>
                    FC reposo
                  </span>

                  <b>
                    {
                      syncResult
                        .metrics
                        .resting_heart_rate
                    }
                  </b>
                </div>

                <div>
                  <span>Sueño</span>

                  <b>
                    {
                      syncResult
                        .metrics
                        .sleep_duration
                    }
                  </b>
                </div>

                <div>
                  <span>SpO₂</span>

                  <b>
                    {
                      syncResult
                        .metrics
                        .oxygen_saturation
                    }
                  </b>
                </div>

                <div>
                  <span>Pasos</span>

                  <b>
                    {
                      syncResult
                        .metrics
                        .steps
                    }
                  </b>
                </div>
              </>
            )}

            <small>
              Normalización V1
              completada.
            </small>
          </div>
        )}

        {syncError && (
          <p
            className="error"
            style={{
              whiteSpace:
                'pre-wrap',
            }}
          >
            {syncError}
          </p>
        )}
      </section>

      <section className="card sourceList">
        {sources.map(
          ([
            name,
            status,
            description,
          ]) => (
            <div
              className="source"
              key={name}
            >
              <div>
                <strong>
                  {name}
                </strong>

                <small>
                  {description}
                </small>
              </div>

              <span>
                {status}
              </span>
            </div>
          ),
        )}
      </section>

      {user && (
        <section className="card">
          <strong>
            Sesión
          </strong>

          <p className="muted">
            {user.email}
          </p>

          <button
            className="secondary"
            onClick={() =>
              signOut()
            }
          >
            Cerrar sesión
          </button>
        </section>
      )}
    </>
  );
}

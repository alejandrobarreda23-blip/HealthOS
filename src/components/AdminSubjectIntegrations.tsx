import { useEffect, useMemo, useState } from 'react';
import {
  Cable,
  CheckCircle2,
  CircleAlert,
  EyeOff,
  RefreshCw,
  Save,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  configureIntervalsForSubject,
  disableSubjectIntegration,
  listSubjectIntegrations,
  type SubjectIntegration,
} from '../repositories/admin-integrations';
import { refreshAnalysisRuntimeV1 } from '../repositories/analysis-runtime';
import type { SubjectScope } from '../subjects/SubjectProvider';

type Props = {
  scope: SubjectScope;
};

function formatWhen(value: string | null) {
  if (!value) return 'Nunca';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
}

function todayLocal() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function AdminSubjectIntegrations({ scope }: Props) {
  const [rows, setRows] = useState<SubjectIntegration[]>([]);
  const [athleteId, setAthleteId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [oldest, setOldest] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervals = useMemo(
    () => rows.find((x) => x.provider === 'intervals_icu') ?? null,
    [rows],
  );

  async function reload() {
    const data = await listSubjectIntegrations(scope.subjectId);
    setRows(data);
  }

  useEffect(() => {
    setMessage(null);
    setError(null);
    setApiKey('');
    void reload().catch((e) =>
      setError(e instanceof Error ? e.message : String(e)),
    );
  }, [scope.subjectId]);

  useEffect(() => {
    if (!intervals) return;
    setAthleteId(intervals.externalAccountId ?? '');
    setOldest(intervals.historyOldest ?? '');
  }, [intervals?.integrationId]);

  async function save() {
    if (!athleteId.trim() || !apiKey.trim()) {
      setError('Introduce Athlete ID y API key.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await configureIntervalsForSubject({
        subjectId: scope.subjectId,
        athleteId: athleteId.trim(),
        apiKey: apiKey.trim(),
        oldest: oldest || null,
      });

      setApiKey('');
      await reload();
      setMessage('Intervals.icu configurado. La API key ha quedado guardada en Vault y ya no se muestra.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function sync() {
    if (!supabase) {
      setError('Supabase no está configurado.');
      return;
    }

    setSyncing(true);
    setError(null);
    setMessage(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'rapid-service',
        {
          body: {
            target_subject_id: scope.subjectId,
          },
        },
      );

      if (fnError) throw fnError;
      if (!data?.ok) {
        throw new Error(
          data?.error ??
            data?.details ??
            'La sincronización no se completó.',
        );
      }

      // For the selected subject the raw/normalized sync is complete.
      // Runtime analysis is refreshed using the subject data owner.
      const asOfDate = todayLocal();

      const daily = await supabase.rpc(
        'refresh_daily_features_for_subject_v1',
        { target_subject_id: scope.subjectId },
      );
      if (daily.error) throw daily.error;

      await refreshAnalysisRuntimeV1(scope.dataUserId, asOfDate);

      await reload();
      setMessage(
        `Sincronización completada: ${data?.raw?.stored ?? 0} raw · ` +
        `${data?.normalized?.observations_stored ?? 0} observaciones · ` +
        `${data?.normalized?.exercise_sessions_stored ?? 0} actividades.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      await reload().catch(() => undefined);
    } finally {
      setSyncing(false);
    }
  }

  async function disable() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await disableSubjectIntegration(scope.subjectId, 'intervals_icu');
      await reload();
      setMessage('Integración desactivada.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  if (scope.role !== 'admin') return null;

  return (
    <section className="card adminIntegrationCard">
      <div className="adminIntegrationHead">
        <div>
          <div className="eyebrow">GESTIÓN ADMINISTRATIVA</div>
          <h2>Fuentes de {scope.displayName || 'este usuario'}</h2>
          <p className="muted">
            Las fuentes pasivas pertenecen al usuario, pero las configura el administrador.
          </p>
        </div>
        <Cable size={24} />
      </div>

      <div className="adminIntegrationProvider">
        <div className="adminIntegrationProviderHead">
          <div>
            <strong>Intervals.icu</strong>
            <small>Wearable · entrenamiento · wellness</small>
          </div>

          {intervals?.status === 'active' && (
            <span className="connectedBadge">
              <CheckCircle2 size={14} /> Conectado
            </span>
          )}

          {intervals?.status === 'error' && (
            <span className="integrationErrorBadge">
              <CircleAlert size={14} /> Revisar
            </span>
          )}

          {intervals?.status === 'disabled' && (
            <span className="integrationNeutralBadge">
              Desactivado
            </span>
          )}
        </div>

        <div className="integrationFormGrid">
          <label>
            Athlete ID
            <input
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
              placeholder="p. ej. i140706"
              autoComplete="off"
            />
          </label>

          <label>
            Importar histórico desde
            <input
              type="date"
              value={oldest}
              onChange={(e) => setOldest(e.target.value)}
            />
          </label>

          <label className="integrationSecretField">
            API key
            <div className="secretInputWrap">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  intervals
                    ? '••••••••••••••••  (introduce sólo para reemplazar)'
                    : 'API key de Intervals.icu'
                }
                autoComplete="new-password"
              />
              <EyeOff size={16} />
            </div>
          </label>
        </div>

        <p className="integrationSecurityNote">
          HealthOS no vuelve a mostrar la clave después de guardarla. Se cifra en Supabase Vault.
        </p>

        {intervals && (
          <div className="integrationMeta">
            <span>Cuenta: <strong>{intervals.externalAccountId}</strong></span>
            <span>Último sync: <strong>{formatWhen(intervals.lastSyncAt)}</strong></span>
            <span>
              Estado:
              <strong>
                {intervals.lastSyncStatus === 'ok'
                  ? ' correcto'
                  : intervals.lastSyncStatus === 'failed'
                    ? ' error'
                    : ' sin ejecutar'}
              </strong>
            </span>
          </div>
        )}

        <div className="integrationActions">
          <button
            className="secondary"
            onClick={save}
            disabled={loading || syncing}
          >
            <Save size={16} />
            {intervals ? 'Reconfigurar' : 'Guardar conexión'}
          </button>

          <button
            className="primary"
            onClick={sync}
            disabled={
              syncing ||
              loading ||
              !intervals ||
              intervals.status === 'disabled'
            }
          >
            <RefreshCw
              size={16}
              className={syncing ? 'spinIcon' : undefined}
            />
            {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
          </button>

          {intervals && intervals.status !== 'disabled' && (
            <button
              className="textButton dangerText"
              onClick={disable}
              disabled={loading || syncing}
            >
              Desactivar
            </button>
          )}
        </div>

        {intervals?.lastSyncError && (
          <div className="syncError">{intervals.lastSyncError}</div>
        )}
        {message && <div className="syncResult">{message}</div>}
        {error && <div className="syncError">{error}</div>}
      </div>
    </section>
  );
}

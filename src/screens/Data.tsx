import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabase';
import { isLiveMode } from '../state/runtime';

type SyncResult = {
  ok: boolean;
  stage?: string;
  fetched?: {
    wellness: number;
    activities: number;
    total: number;
  };
  processed?: number;
  stored?: {
    wellness: number;
    activities: number;
    total: number;
  };
  error?: string;
};

export default function Data() {
  const { user, signOut } = useAuth();

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const sources = [
    ['Health Connect', 'Preparado', 'Actividad, sueño y signos vitales'],
    ['Oura', 'Próximamente', 'API directa'],
    ['Ultrahuman', 'Próximamente', 'UltraSignal API'],
    ['Analíticas', 'Preparado', 'PDF / entrada estructurada'],
  ];

  async function syncIntervals() {
    if (!supabase) {
      setSyncError('Supabase no está configurado.');
      return;
    }

    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'intervals-sync',
        { body: {} },
      );

      if (error) {
        throw error;
      }

      if (!data?.ok) {
        throw new Error(data?.error ?? 'La sincronización no se completó.');
      }

      setSyncResult(data as SyncResult);
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : 'Error desconocido durante la sincronización.',
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <header>
        <div className="eyebrow">DATOS</div>
        <h1>Fuentes</h1>
        <p className="muted">
          {isLiveMode() ? 'Modo live' : 'Modo demo/local'}
        </p>
      </header>

      <section className="card">
        <div className="intervalsHead">
          <div>
            <strong>Intervals.icu</strong>
            <small>Suunto · histórico y entrenamiento</small>
          </div>
          <span className="connectedBadge">Conectado</span>
        </div>

        <p className="muted intervalsDescription">
          Importación raw-first. Los datos originales se conservan antes
          de cualquier normalización o análisis.
        </p>

        <button
          className="primary"
          onClick={syncIntervals}
          disabled={syncing || !user}
        >
          {syncing ? 'Sincronizando…' : 'Sincronizar Intervals.icu'}
        </button>

        {syncResult?.stored && (
          <div className="syncResult">
            <strong>Sincronización completada</strong>

            <div>
              <span>Wellness</span>
              <b>{syncResult.stored.wellness}</b>
            </div>

            <div>
              <span>Actividades</span>
              <b>{syncResult.stored.activities}</b>
            </div>

            <div className="syncTotal">
              <span>Raw records</span>
              <b>{syncResult.stored.total}</b>
            </div>

            <small>
              Normalización todavía desactivada.
            </small>
          </div>
        )}

        {syncError && (
          <p className="error">
            {syncError}
          </p>
        )}
      </section>

      <section className="card sourceList">
        {sources.map(([name, status, description]) => (
          <div className="source" key={name}>
            <div>
              <strong>{name}</strong>
              <small>{description}</small>
            </div>
            <span>{status}</span>
          </div>
        ))}
      </section>

      {user && (
        <section className="card">
          <strong>Sesión</strong>
          <p className="muted">{user.email}</p>

          <button
            className="secondary"
            onClick={() => signOut()}
          >
            Cerrar sesión
          </button>
        </section>
      )}
    </>
  );
}

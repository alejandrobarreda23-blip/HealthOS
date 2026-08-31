import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { getLatestHealthBriefV1 } from '../repositories/health-brief';
import type { HealthBriefV1 } from '../services/health-brief-v1';

export function useHealthBriefV1() {
  const { user } = useAuth();
  const [data, setData] = useState<HealthBriefV1 | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      setData(await getLatestHealthBriefV1(user.id));
      setError('');
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar Health Brief.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

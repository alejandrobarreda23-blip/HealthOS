import { useCallback, useEffect, useState } from 'react';
import { useSubject } from '../subjects/SubjectProvider';
import { getLatestHealthBriefV1 } from '../repositories/health-brief';
import type { HealthBriefV1 } from '../services/health-brief-v1';

export function useHealthBriefV1() {
  const { scope } = useSubject();
  const [data, setData] = useState<HealthBriefV1 | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!scope?.dataUserId) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      setData(await getLatestHealthBriefV1(scope.dataUserId));
      setError('');
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar Health Brief.');
    } finally {
      setLoading(false);
    }
  }, [scope?.dataUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

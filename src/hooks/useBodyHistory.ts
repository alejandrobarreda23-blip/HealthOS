import { useCallback, useEffect, useState } from 'react';
import { useSubject } from '../subjects/SubjectProvider';
import { getBodyHistory } from '../repositories/body-history';
import type { BodyHistorySnapshot } from '../body/view-state';

function minusDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function useBodyHistory(asOfDate: string, windowDays = 365) {
  const { scope } = useSubject();
  const [data, setData] = useState<BodyHistorySnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!scope?.dataUserId) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const startDate = minusDays(asOfDate, windowDays - 1);
      setData(await getBodyHistory(scope.dataUserId, startDate, asOfDate));
      setError('');
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar la historia fisiológica del cuerpo.');
    } finally {
      setLoading(false);
    }
  }, [asOfDate, scope?.dataUserId, windowDays]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

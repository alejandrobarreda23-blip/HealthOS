import { useEffect, useState } from 'react';
import { useSubject } from '../subjects/SubjectProvider';
import { getBodyHistory } from '../repositories/body-history';
import type { BodyHistorySnapshot } from '../body/view-state';
import { minusDays } from '../health/metrics/daily-series';

export function useBodyHistory(asOfDate: string, windowDays = 365) {
  const { scope } = useSubject();
  const userId = scope?.dataUserId;
  const key = `${userId ?? ''}|${asOfDate}|${windowDays}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; data: BodyHistorySnapshot | null; loading: boolean; error: string }>({ key: '', data: null, loading: false, error: '' });
  useEffect(() => {
    let active = true;
    setState({ key, data: null, loading: Boolean(userId), error: '' });
    if (userId) getBodyHistory(userId, minusDays(asOfDate, windowDays - 1 + 120), asOfDate)
      .then(data => { if (active) setState({ key, data, loading: false, error: '' }); })
      .catch(error => { if (active) setState({ key, data: null, loading: false, error: error.message ?? 'No se pudo cargar la historia.' }); });
    return () => { active = false; };
  }, [key, userId, asOfDate, windowDays, revision]);
  // Hide the old subject synchronously, before effects or delayed requests settle.
  return { data: state.key === key ? state.data : null, error: state.key === key ? state.error : '',
    loading: state.key !== key ? Boolean(userId) : state.loading, refresh: () => setRevision(r => r + 1) };
}

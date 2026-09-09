import { useEffect, useMemo, useState } from 'react';
import { useSubject } from '../subjects/SubjectProvider';
import { getWeeklyContext } from '../repositories/weekly-learning';
import { buildEpisodeReading } from '../health/episodes';
import type { DailyPoint } from '../health/metrics/daily-series';
const EMPTY = { sleeps: [], events: [], checkIns: [] };
export function useEpisodeReading(points: DailyPoint[], asOf: string) {
  const { scope } = useSubject(), userId = scope?.dataUserId, key = `${userId}|${asOf}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; data: Awaited<ReturnType<typeof getWeeklyContext>> | null; error: string }>({ key: '', data: null, error: '' });
  useEffect(() => {
    let active = true;
    setState(previous => previous.key === key ? { ...previous, error: '' } : { key, data: null, error: '' });
    if (userId) getWeeklyContext(userId, asOf).then(data => { if (active) setState({ key, data, error: '' }); })
      .catch(error => { if (active) setState(previous => ({ key, data: previous.key === key ? previous.data : null, error: error.message ?? 'No se pudo leer el contexto.' })); });
    return () => { active = false; };
  }, [key, userId, asOf, revision]);
  const data = state.key === key ? state.data : null;
  const input = useMemo(() => ({ points, ...(data ?? EMPTY) }), [points, data]);
  const report = useMemo(() => buildEpisodeReading(input, asOf), [input, asOf]);
  return { report, input, loading: Boolean(userId) && (!data && !(state.key === key && state.error)), error: state.key === key ? state.error : '', refresh: () => setRevision(r => r + 1) };
}

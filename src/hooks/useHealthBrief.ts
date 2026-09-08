import { useEffect, useState } from 'react';
import { useSubject } from '../subjects/SubjectProvider';
import { getLatestHealthBriefV1 } from '../repositories/health-brief';
import type { HealthBriefV1 } from '../services/health-brief-v1';

export function useHealthBriefV1() {
  const { scope } = useSubject();
  const userId = scope?.dataUserId;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ userId: string | undefined; data: HealthBriefV1 | null; error: string; loading: boolean }>({ userId: undefined, data: null, error: '', loading: false });
  useEffect(() => {
    let active = true;
    setState({ userId, data: null, error: '', loading: Boolean(userId) });
    if (userId) getLatestHealthBriefV1(userId)
      .then(data => { if (active) setState({ userId, data, error: '', loading: false }); })
      .catch(error => { if (active) setState({ userId, data: null, error: error.message ?? 'No se pudo cargar el análisis guardado.', loading: false }); });
    return () => { active = false; };
  }, [userId, revision]);
  return { data: state.userId === userId ? state.data : null, error: state.userId === userId ? state.error : '',
    loading: state.userId === userId ? state.loading : Boolean(userId), refresh: () => setRevision(r => r + 1) };
}

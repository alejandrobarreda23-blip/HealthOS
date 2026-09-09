import { useEffect, useState } from 'react';
import { useSubject } from '../subjects/SubjectProvider';
import { getWeeklyContext, getWeeklyMemory } from '../repositories/weekly-learning';
type State = { key: string; context: Awaited<ReturnType<typeof getWeeklyContext>> | null; memory: Awaited<ReturnType<typeof getWeeklyMemory>> | null; error: string; memoryError: string; loading: boolean };
export function useWeeklyLearning(end: string) {
  const { scope } = useSubject(), userId = scope?.dataUserId, key = `${userId}|${end}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<State>({ key: '', context: null, memory: null, error: '', memoryError: '', loading: false });
  useEffect(() => {
    let active = true;
    setState({ key, context: null, memory: null, error: '', memoryError: '', loading: Boolean(userId) });
    if (userId) Promise.allSettled([getWeeklyContext(userId, end), getWeeklyMemory(userId)]).then(([context, memory]) => {
      if (active) setState({ key, loading: false, context: context.status === 'fulfilled' ? context.value : null,
        memory: memory.status === 'fulfilled' ? memory.value : null,
        error: context.status === 'rejected' ? context.reason?.message ?? 'No se pudo cargar el contexto.' : '',
        memoryError: memory.status === 'rejected' ? memory.reason?.message ?? 'No se pudo cargar la memoria.' : '' });
    });
    return () => { active = false; };
  }, [key, userId, end, revision]);
  const visible = state.key === key ? state : { context: null, memory: null, error: '', memoryError: '', loading: Boolean(userId) };
  return { ...visible, refresh: () => setRevision(r => r + 1) };
}

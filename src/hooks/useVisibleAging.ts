import { useEffect, useMemo, useState } from 'react';
import { useSubject } from '../subjects/SubjectProvider';
import { useHealthBriefV1 } from './useHealthBrief';
import {
  buildPassiveVisibleAgingContext,
  daysUntilVisibleAgingCampaign,
  nextVisibleAgingCampaignDate,
  visibleAgingDomains,
  type VisibleAgingIntervention,
  type VisibleAgingObservation,
  type VisibleAgingPhotoSession,
  type VisibleAgingPose,
} from '../aging/visible-aging';
import {
  addVisibleAgingIntervention,
  completeVisibleAgingPhotoCampaign,
  listVisibleAgingInterventions,
  listVisibleAgingObservations,
  listVisibleAgingPhotoSessions,
} from '../repositories/visible-aging';

type LoadState = {
  sessions: VisibleAgingPhotoSession[];
  interventions: VisibleAgingIntervention[];
  observations: VisibleAgingObservation[];
  loading: boolean;
  error: string;
};

export function useVisibleAging() {
  const { scope } = useSubject();
  const { data: brief } = useHealthBriefV1();
  const userId = scope?.dataUserId;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<LoadState>({
    sessions: [],
    interventions: [],
    observations: [],
    loading: false,
    error: '',
  });

  useEffect(() => {
    let active = true;
    if (!userId) {
      setState({ sessions: [], interventions: [], observations: [], loading: false, error: '' });
      return () => { active = false; };
    }

    setState((current) => ({ ...current, loading: true, error: '' }));

    Promise.all([
      listVisibleAgingPhotoSessions(userId),
      listVisibleAgingInterventions(userId),
      listVisibleAgingObservations(userId),
    ])
      .then(([sessions, interventions, observations]) => {
        if (!active) return;
        setState({ sessions, interventions, observations, loading: false, error: '' });
      })
      .catch((error: any) => {
        if (!active) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: error?.message ?? 'No se pudo cargar Visible Aging.',
        }));
      });

    return () => { active = false; };
  }, [revision, userId]);

  const passive = useMemo(() => buildPassiveVisibleAgingContext(brief), [brief]);
  const latestSession = state.sessions[0] ?? null;
  const daysUntilCampaign = daysUntilVisibleAgingCampaign(latestSession);
  const nextCampaignDate = nextVisibleAgingCampaignDate(latestSession);
  const campaignDue = daysUntilCampaign <= 0;

  const domains = useMemo(
    () => visibleAgingDomains(state.sessions, state.observations, passive),
    [passive, state.observations, state.sessions],
  );

  const refresh = () => setRevision((x) => x + 1);

  async function savePhotoCampaign(files: Record<VisibleAgingPose, File>) {
    if (!scope?.isSelf || !userId) {
      throw new Error('Las campañas visuales sólo las realiza el propio usuario.');
    }
    await completeVisibleAgingPhotoCampaign({ userId, files });
    refresh();
  }

  async function saveIntervention(params: {
    interventionType: string;
    label: string;
    startedOn: string;
    note?: string;
  }) {
    if (!scope?.isSelf || !userId) {
      throw new Error('Las intervenciones sólo las registra el propio usuario.');
    }
    await addVisibleAgingIntervention({ userId, ...params });
    refresh();
  }

  return {
    scope,
    passive,
    domains,
    sessions: state.sessions,
    interventions: state.interventions,
    observations: state.observations,
    latestSession,
    campaignDue,
    daysUntilCampaign,
    nextCampaignDate,
    loading: state.loading,
    error: state.error,
    refresh,
    savePhotoCampaign,
    saveIntervention,
  };
}

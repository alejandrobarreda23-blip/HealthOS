import { supabase } from '../lib/supabase';
import type { HealthBriefV1 } from '../services/health-brief-v1';

export async function getLatestHealthBriefV1(userId: string): Promise<HealthBriefV1 | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('health_briefs')
    .select('payload')
    .eq('user_id', userId)
    .eq('brief_version', 'health_brief_v1')
    .order('physiological_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.payload ?? null) as HealthBriefV1 | null;
}

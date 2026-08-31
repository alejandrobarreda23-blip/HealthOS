import type { MaturityState, MaturityTransition } from './types';

export function deriveCurrentState(transitions: MaturityTransition[]): MaturityState | null {
  if (transitions.length === 0) return null;
  const ordered = [...transitions].sort((a, b) =>
    a.decidedAt.localeCompare(b.decidedAt),
  );
  return ordered[ordered.length - 1].toState;
}

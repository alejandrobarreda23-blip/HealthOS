import type { Episode } from './episodes';
export function episodeNavigation(subject: string, episode: Episode) {
  return { subject, id: episode.id, start: episode.start, end: episode.end, metric: episode.signals[0].key === 'bedtime' ? 'sleep_duration' : episode.signals[0].key };
}
export function parseEpisodeNavigation(raw: string | null, subject: string | undefined, today: string) {
  try {
    const value = JSON.parse(raw ?? 'null');
    const date = (d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d;
    return value && subject && value.subject === subject && typeof value.id === 'string' && typeof value.metric === 'string' && date(value.start) && date(value.end) && value.start <= value.end && value.end < today ? value as ReturnType<typeof episodeNavigation> : null;
  } catch { return null; }
}

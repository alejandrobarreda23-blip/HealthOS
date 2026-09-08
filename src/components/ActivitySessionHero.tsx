import type { CSSProperties } from 'react';
import type { TrainingSession } from '../repositories/activities';
import { activityColor, type ActivityColorMode } from '../health/activity-presentation';
import { durationLabel, numberLabel, sessionSeconds, sportLabel } from '../health/activities';
import SportIcon from './SportIcon';

export default function ActivitySessionHero({ session:s, name, colorMode }: { session: TrainingSession; name: string; colorMode: ActivityColorMode }) {
  const color=activityColor(s,colorMode);
  return <header className="activitySessionHero" style={{'--session-color':color.color,'--session-tint':color.background} as CSSProperties}>
    <div className="activitySessionHeroTitle"><span className="activitySportIcon"><SportIcon sport={s.activity_type} size={38}/></span><div><div className="eyebrow">{sportLabel(s.activity_type)} · {s.physiological_date}</div><h2>{name}</h2></div></div>
    <div className="activitySessionHeroMetrics"><strong>{durationLabel(sessionSeconds(s))}</strong><span>{numberLabel(s.distance_m,'km',1000)}</span><span>{numberLabel(s.elevation_gain_m,'m D+')}</span><span className="activityEffortChip">{color.label}</span></div>
  </header>;
}

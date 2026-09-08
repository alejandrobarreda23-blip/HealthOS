import type { CSSProperties } from 'react';
import type { TrainingSession } from '../repositories/activities';
import { activityColor, type ActivityColorMode } from '../health/activity-presentation';
import { durationLabel, numberLabel, sessionSeconds, sportLabel } from '../health/activities';
import SportIcon from './SportIcon';

export default function ActivitySessionCard({ session:s, colorMode, selected, onSelect }: { session: TrainingSession; colorMode: ActivityColorMode; selected: boolean; onSelect: () => void }) {
  const color=activityColor(s,colorMode);
  return <button className="activitySessionCard" aria-pressed={selected} onClick={onSelect} style={{'--session-color':color.color,'--session-tint':color.background} as CSSProperties}>
    <div className="activitySessionTop"><span className="activitySportIcon"><SportIcon sport={s.activity_type} size={25}/></span><span><small>{sportLabel(s.activity_type)}</small><time>{s.physiological_date}</time></span><span className="activityEffortChip">{color.label}</span></div>
    <strong className="activitySessionName">{s.summary?.name ?? sportLabel(s.activity_type)}</strong>
    <div className="activitySessionStats"><span><b>{durationLabel(sessionSeconds(s))}</b><small>duración</small></span><span><b>{numberLabel(s.distance_m,'km',1000)}</b><small>distancia</small></span><span><b>{numberLabel(s.elevation_gain_m,'m')}</b><small>desnivel +</small></span></div>
    <div className="activitySessionFoot"><span>{s.summary?.hasRouteReference?'Ruta referenciada · GPS sin importar':'Sin recorrido GPS importado'}</span><span>Abrir →</span></div>
  </button>;
}

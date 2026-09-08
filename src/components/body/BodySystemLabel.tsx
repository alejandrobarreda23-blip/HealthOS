import type { ComponentType, CSSProperties } from 'react';
import type { BodySystemState } from '../../body/view-state';

type IconLike = ComponentType<{ size?: number; strokeWidth?: number }>;

interface Props {
  state: BodySystemState;
  icon: IconLike;
  selected: boolean;
  side: 'left' | 'right';
  onSelect: () => void;
}

const STATUS: Record<BodySystemState['status'], string> = {
  observed: 'observado',
  partial: 'parcial',
  insufficient: 'limitado',
  absent: 'sin señal',
};

export default function BodySystemLabel({ state, icon: Icon, selected, side, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`bodyV4SystemLabel ${selected ? 'selected' : ''} status-${state.status} side-${side}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="bodyV4SystemConnector" aria-hidden="true"><i /></span>
      <span className="bodyV4SystemIcon"><Icon size={16} strokeWidth={1.65} /></span>
      <span className="bodyV4SystemText">
        <span className="bodyV4SystemName">{state.title}</span>
        <span className="bodyV4SystemSummary">{state.detail}</span>
      </span>
      <span className="bodyV4SystemMeta">
        <b>{STATUS[state.status]}</b>
        <i style={{ '--coverage': `${Math.max(2, state.coverage * 100)}%` } as CSSProperties} />
      </span>
      {state.finding && <span className="bodyV4SystemFinding" title="Hallazgo activo trazable" />}
    </button>
  );
}

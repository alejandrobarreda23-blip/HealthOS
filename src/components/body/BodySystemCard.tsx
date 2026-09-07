import type { ComponentType } from 'react';
import type { BodySystemState } from '../../body/view-state';

type IconLike = ComponentType<{ size?: number; strokeWidth?: number }>;

interface Props {
  state: BodySystemState;
  icon: IconLike;
  selected: boolean;
  onSelect: () => void;
}

const STATUS_LABEL: Record<BodySystemState['status'], string> = {
  observed: 'observado',
  partial: 'parcial',
  insufficient: 'limitado',
  absent: 'sin señal',
};

export default function BodySystemCard({ state, icon: Icon, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`bodyV3SystemCard ${selected ? 'selected' : ''} status-${state.status}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="bodyV3SystemIcon"><Icon size={17} strokeWidth={1.7} /></div>
      <div className="bodyV3SystemCopy">
        <div className="bodyV3SystemTopline">
          <strong>{state.title}</strong>
          <span>{STATUS_LABEL[state.status]}</span>
        </div>
        <p>{state.headline}</p>
        <small>{state.detail}</small>
        <div className="bodyV3SystemCoverage" aria-label={`${Math.round(state.coverage * 100)}% cobertura del sistema`}>
          <i style={{ width: `${Math.max(3, state.coverage * 100)}%` }} />
        </div>
      </div>
      {state.finding && <span className="bodyV3FindingDot" title="Hallazgo activo trazable" />}
    </button>
  );
}

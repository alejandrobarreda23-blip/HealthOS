type P = {
  label: string;
  value: string;
  detail?: string;
  delta?: number;
};

export default function MetricCard({ label, value, detail, delta }: P) {
  const missing = value === '—';
  return (
    <div className={`card metric${missing ? ' metricMissing' : ''}`}>
      <div className="metricLabel">{label}</div>
      <div className="metricRow">
        <strong>{value}</strong>
        {delta !== undefined && (
          <span className={delta > 0 ? 'up' : 'down'}>
            {delta > 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      {detail && <small>{detail}</small>}
    </div>
  );
}

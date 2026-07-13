/**
 * ProgressRing — animated ring chart showing percentage
 * Used for: approval rate, collection margin, omzet attainment, solvency
 */
export default function ProgressRing({ value = 0, label, color = '#10b981', icon }) {
  const pctValue = Math.max(0, Math.min(1, value));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (pctValue * circumference);

  const colorClass =
    pctValue >= 0.8 ? 'green' :
    pctValue >= 0.5 ? 'teal' :
    pctValue >= 0.3 ? 'amber' : 'rose';

  return (
    <div className={`metric-card ${colorClass}`} style={{ alignItems: 'center', textAlign: 'center' }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ marginBottom: 4 }}>
        <circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke="var(--bg-hover)"
          strokeWidth="6"
        />
        <circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text
          x="40" y="36"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="13"
          fontWeight="800"
          fill="currentColor"
          fontFamily="'JetBrains Mono', monospace"
        >
          {Math.round(pctValue * 100)}%
        </text>
        <text
          x="40" y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="7"
          fill="var(--text-tertiary)"
          fontFamily="'Inter', sans-serif"
        >
          {(icon ? '' : '')}
        </text>
      </svg>
      <div className="label" style={{ marginTop: 2 }}>{label}</div>
    </div>
  );
}

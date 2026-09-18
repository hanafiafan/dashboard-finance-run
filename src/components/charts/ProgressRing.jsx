/**
 * ProgressRing — animated ring chart showing percentage
 * Used for: approval rate, collection margin, omzet attainment, solvency
 */
export default function ProgressRing({ value = 0, label, color = '#E85002', size = 80, glow = false, bare = false }) {
  const pctValue = Math.max(0, Math.min(1, value));
  const radius = size * 0.45;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (pctValue * circumference);
  const stroke = Math.max(4, size * 0.075);
  const center = size / 2;

  const colorClass =
    pctValue >= 0.8 ? 'green' :
    pctValue >= 0.5 ? 'teal' :
    pctValue >= 0.3 ? 'amber' : 'rose';

  const ring = (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter: glow ? `drop-shadow(0 0 18px ${color}90)` : 'none' }}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--bg-hover)" strokeWidth={stroke} />
      <circle
        cx={center} cy={center} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text
        x={center} y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.16}
        fontWeight="800"
        fill="currentColor"
        fontFamily="'JetBrains Mono', monospace"
      >
        {Math.round(pctValue * 100)}%
      </text>
    </svg>
  );

  if (bare) return ring;

  return (
    <div className={`metric-card ${colorClass}`} style={{ alignItems: 'center', textAlign: 'center' }}>
      {ring}
      <div className="label" style={{ marginTop: 2 }}>{label}</div>
    </div>
  );
}

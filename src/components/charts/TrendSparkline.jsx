export default function TrendSparkline({ data, color = '#0d9488', height = 40 }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = data.length * 12;

  const points = data.map((v, i) => `${i * (w / (data.length - 1))},${height - ((v - min) / range) * (height - 8) - 4}`).join(' ');
  const areaPoints = `${w},${height} 0,${height} ${points}`;

  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} className="sparkline-svg">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points.split(' ').pop().split(',')[0]} cy={points.split(' ').pop().split(',')[1]} r="3" fill={color} />
    </svg>
  );
}

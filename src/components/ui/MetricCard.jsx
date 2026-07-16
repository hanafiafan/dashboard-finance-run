import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { money } from '../../utils/formatters';

const STATUS_CLASS = { green: 'ok', amber: 'warn', rose: 'bad' };

export default function MetricCard({ label, value, color = 'teal', note, trend, sparklineData, statusLabel, arti }) {
  const trendIcon = trend > 0 ? <TrendingUp size={14} /> : trend < 0 ? <TrendingDown size={14} /> : <Minus size={14} />;
  const trendColor = trend > 0 ? 'var(--green)' : trend < 0 ? 'var(--rose)' : 'var(--text-tertiary)';

  return (
    <div className={`metric-card ${color}`}>
      <div className="label">
        {label}
        {trend !== undefined && <span className={`trend ${trend > 0 ? 'up' : trend < 0 ? 'down' : ''}`} style={{ color: trendColor, display: 'inline-flex', alignItems: 'center', gap: 2, marginLeft: 6 }}>{trendIcon}{Math.abs(trend)}%</span>}
      </div>
      <div className="value">{value}</div>
      {note && <div className="note">{note}</div>}
      {statusLabel && (
        <div className="ews-status-row">
          <span className={`status ${STATUS_CLASS[color] || 'info'}`}>{statusLabel}</span>
        </div>
      )}
      {arti && <div className="ews-arti">{arti}</div>}
      {sparklineData && (
        <div className="sparkline-container">
          <svg viewBox={`0 0 ${sparklineData.length * 10} 30`} className="sparkline-svg">
            <path
              d={sparklineData.map((v, i) => `${i === 0 ? 'M' : 'L'}${i * 10} ${30 - (v / Math.max(...sparklineData) * 25)}`).join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              opacity="0.3"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

export function Panel({ title, note, children }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {note && <p>{note}</p>}
        </div>
      </div>
      <div className="chart-box">{children}</div>
    </div>
  );
}

export function BrandCard({ item, active, onClick }) {
  const ach = Math.max(0, Math.min(1, Number(item.omzetAchievement || 0)));
  return (
    <div className={`brand-card ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="brand-name">{item.label}</div>
      <div className="brand-bar">
        <div className="brand-bar-fill" style={{ width: `${Math.round(ach * 100)}%` }} />
      </div>
      <div className="brand-stat">{item.company}</div>
    </div>
  );
}

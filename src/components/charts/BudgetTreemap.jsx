import { useMemo } from 'react';
import * as d3 from 'd3';
import { getChartTheme } from '../../utils/chartTheme';
import { money } from '../../utils/formatters';

const COLORS = [
  '#0d9488', '#0891b2', '#2563eb', '#7c3aed', '#9333ea',
  '#db2777', '#e11d48', '#ea580c', '#f59e0b', '#10b981',
  '#06b6d4', '#6366f1',
];

export default function BudgetTreemap({ data, title = 'Budget Allocation', note = 'Treemap by category' }) {
  const sorted = useMemo(() => {
    if (!data || !data.length) return [];
    return [...data].sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [data]);

  const hierarchy = useMemo(() => {
    if (!sorted.length) return null;
    const root = { name: 'Budget', children: sorted.map(d => ({ name: d.label, value: Math.max(d.value, 1) })) };
    return d3.hierarchy(root).sum(d => d.value);
  }, [sorted]);

  const treemapData = useMemo(() => {
    if (!hierarchy) return null;
    return d3.treemap().size([100, 100]).padding(2.5)(hierarchy).leaves();
  }, [hierarchy]);

  const total = sorted.reduce((s, d) => s + d.value, 0) || 0;
  const ct = getChartTheme();

  if (!treemapData || !sorted.length) {
    return (
      <div className="panel">
        <div className="panel-head"><div><h3>{title}</h3><p>{note}</p></div></div>
        <div className="empty" style={{ minHeight: 200 }}>No data</div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          <p>{note} · {sorted.length} categories · {money.format(total)}</p>
        </div>
      </div>

      <div style={{ padding: '0.5rem' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: 280, display: 'block', borderRadius: 6 }}>
          {treemapData.map((leaf, i) => {
            const [x, y, w, h] = [leaf.x0, leaf.y0, leaf.x1 - leaf.x0, leaf.y1 - leaf.y0];
            const pct = ((leaf.value / total) * 100).toFixed(1);
            const color = COLORS[i % COLORS.length];
            const name = leaf.data.name;

            // Only render text if cell is big enough
            const canFit = w > 16 && h > 12;

            // Font size: proportional to cell width, conservative cap
            const fs = Math.max(4.5, Math.min(w / 6, 8));

            // Truncate name — each char ≈ fs × 0.6 px wide
            const maxChars = Math.floor(w / (fs * 0.6));
            const display = name.length > maxChars ? name.slice(0, Math.max(2, maxChars - 1)) + '…' : name;

            // Center Y for single/double line
            const cy = y + h / 2;

            return (
              <g key={i}>
                <rect
                  x={x} y={y} width={w} height={h}
                  fill={color} rx={1}
                  className="treemap-cell"
                  stroke={ct.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.18)'}
                  strokeWidth={0.4}
                >
                  <title>{name}: {money.format(leaf.value || 0)} ({pct}%)</title>
                </rect>

                {canFit && (
                  <>
                    <text
                      x={x + w / 2}
                      y={cy - 3}
                      textAnchor="middle"
                      dominantBaseline="auto"
                      fill="rgba(255,255,255,0.92)"
                      fontFamily="Inter, sans-serif"
                      fontWeight={700}
                      fontSize={fs}
                    >
                      {display}
                    </text>
                    <text
                      x={x + w / 2}
                      y={cy + fs + 1}
                      textAnchor="middle"
                      dominantBaseline="auto"
                      fill="rgba(255,255,255,0.72)"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight={500}
                      fontSize={Math.max(4, fs - 1.5)}
                    >
                      {pct}%
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '4px 10px',
          padding: '0.35rem 0 0', borderTop: `1px solid var(--border-light)`, marginTop: 2,
        }}>
          {sorted.slice(0, 10).map((item, i) => (
            <span key={item.label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: '0.66rem', fontWeight: 600, color: ct.labelColor,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 1, backgroundColor: COLORS[i % COLORS.length], flexShrink: 0 }} />
              <span style={{ maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
              <span style={{ color: ct.tickColor, fontWeight: 400, fontSize: '0.6rem' }}>{((item.value / total) * 100).toFixed(1)}%</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

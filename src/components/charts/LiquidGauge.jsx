import { money } from '../../utils/formatters';

export default function LiquidityGauge({ summary }) {
  if (!summary) return null;

  const { cashIn, cashOut, bankBalance, payableOutstanding, receivableOutstanding } = summary;
  const liquidityRatio = cashOut > 0 ? cashIn / cashOut : 0;
  const solvencyRatio = payableOutstanding > 0 ? bankBalance / payableOutstanding : 0;

  const gauges = [
    { label: 'Liquidity Ratio', value: liquidityRatio, max: 3, fmt: v => v.toFixed(1) + 'x', good: v => v >= 1.5 },
    { label: 'Solvency Ratio', value: solvencyRatio, max: 5, fmt: v => v.toFixed(1) + 'x', good: v => v >= 2 },
    { label: 'Cash Reserve', value: bankBalance, max: bankBalance * 1.5, fmt: v => money.format(v), good: v => v > 0 },
    { label: 'AR Turnover', value: receivableOutstanding > 0 ? cashIn / receivableOutstanding : 0, max: 12, fmt: v => v.toFixed(1) + 'x', good: v => v >= 3 },
  ];

  return (
    <div className="panel tight">
      <div className="panel-head">
        <div>
          <h3>Financial Health Gauges</h3>
          <p>Key ratios at a glance</p>
        </div>
      </div>
      <div className="gauge-grid">
        {gauges.map(g => {
          const pct = Math.min(g.value / g.max, 1);
          const isGood = g.good(g.value);
          return (
            <div key={g.label} className="gauge-item">
              <div className="gauge-bar-bg">
                <div
                  className="gauge-bar-fill"
                  style={{ width: `${pct * 100}%`, background: isGood ? 'var(--green)' : 'var(--amber)' }}
                />
              </div>
              <div className="gauge-info">
                <span>{g.label}</span>
                <strong style={{ color: isGood ? 'var(--green)' : 'var(--rose)' }}>{g.fmt(g.value)}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

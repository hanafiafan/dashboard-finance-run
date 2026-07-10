import { money, pct } from '../../utils/formatters';
import { TrendingUp, TrendingDown } from 'lucide-react';
import TrendSparkline from './TrendSparkline';

export default function BrandHeatmap({ brands, brandPerformance }) {
  if (!brands || !brands.length) return null;

  const perfMap = {};
  (brandPerformance || []).forEach(p => { perfMap[p.label] = p; });

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>Brand Health Dashboard</h3>
          <p>Multi-dimensional brand scorecard</p>
        </div>
      </div>
      <div className="brand-health-grid">
        {brands.slice(0, 12).map(b => {
          const perf = perfMap[b['Brand Key']] || {};
          const netCash = perf.netCash || 0;
          const ach = perf.omzetAchievement || 0;
          const score = Math.round(((netCash > 0 ? 0.4 : 0) + (ach * 0.3) + ((perf.budgetRatio || 0) < 0.5 ? 0.3 : 0)) * 100);
          return (
            <div key={b['Brand Key']} className="health-card" style={{ borderLeftColor: score > 70 ? 'var(--green)' : score > 40 ? 'var(--amber)' : 'var(--rose)' }}>
              <div className="health-card-header">
                <strong>{b.Brand}</strong>
                <span className="health-score" style={{ color: score > 70 ? 'var(--green)' : score > 40 ? 'var(--amber)' : 'var(--rose)' }}>{score}</span>
              </div>
              <div className="health-card-body">
                <div className="health-row">
                  <span>Net Cash</span>
                  <strong>{money.format(netCash)}</strong>
                </div>
                <div className="health-row">
                  <span>Omzet</span>
                  <strong>{money.format(perf.cashIn || 0)}</strong>
                </div>
                <div className="health-row">
                  <span>Capaian</span>
                  <strong>{pct.format(ach)}</strong>
                </div>
              </div>
              <div className="bar-meter">
                <i style={{ width: `${Math.round(ach * 100)}%`, background: score > 70 ? 'var(--green)' : score > 40 ? 'var(--amber)' : 'var(--rose)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

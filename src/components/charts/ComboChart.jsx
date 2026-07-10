import { Bar } from 'react-chartjs-2';
import { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { shortMoney } from '../../utils/formatters';
import { getChartTheme } from '../../utils/chartTheme';

export default function ComboChart({ data, title, note, expandable }) {
  const [expanded, setExpanded] = useState(false);
  if (!data) return null;

  const t = getChartTheme();

  const chartData = {
    labels: data.labels || [],
    datasets: (data.datasets || []).map(ds => ({
      ...ds,
      type: ds.type || 'bar',
      borderRadius: ds.type === 'bar' ? 4 : 0,
      borderWidth: ds.type === 'line' ? 2 : 0,
      pointRadius: ds.type === 'line' ? 3 : 0,
      fill: ds.type === 'line' ? false : undefined,
      tension: ds.type === 'line' ? 0.35 : undefined,
      order: ds.type === 'line' ? 0 : 1,
    })),
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true, position: 'left',
        ticks: { callback: v => shortMoney(v), font: { size: 10 }, color: t.tickColor },
        grid: { color: t.gridColor },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, color: t.tickColor },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, padding: 18, font: { size: 11 }, color: t.labelColor },
      },
      tooltip: {
        backgroundColor: t.tooltipBg,
        titleColor: t.tooltipTitleColor,
        bodyColor: t.tooltipBodyColor,
      },
    },
  };

  const chartEl = <Bar data={chartData} options={options} />;
  const headEl = (
    <div>
      <h3>{title || 'Multi-axis Combo'}</h3>
      {note && <p>{note}</p>}
    </div>
  );

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          {headEl}
          {expandable && <button className="icon-btn" onClick={() => setExpanded(true)} title="Expand"><Maximize2 size={15} /></button>}
        </div>
        <div className="chart-box tall">{chartEl}</div>
      </div>
      {expanded && (
        <div className="fullscreen-overlay" onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}>
          <div className="fullscreen-panel">
            <div className="fullscreen-head">
              {headEl}
              <button className="icon-btn" onClick={() => setExpanded(false)} title="Close"><Minimize2 size={18} /></button>
            </div>
            <div className="fullscreen-body"><div style={{ width: '100%', height: '70vh' }}>{chartEl}</div></div>
          </div>
        </div>
      )}
    </>
  );
}

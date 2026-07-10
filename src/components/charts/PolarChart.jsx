import { useState } from 'react';
import { PolarArea } from 'react-chartjs-2';
import { Maximize2, Minimize2 } from 'lucide-react';
import { CHART_COLORS } from '../../utils/constants';
import { getChartTheme } from '../../utils/chartTheme';

export default function PolarChartCard({ data, title, note, expandable }) {
  const [expanded, setExpanded] = useState(false);
  if (!data || !data.length) return null;

  const t = getChartTheme();

  const chartData = {
    labels: data.map(x => x.label),
    datasets: [{
      data: data.map(x => x.value),
      backgroundColor: CHART_COLORS.map(c => c + 'CC'),
      borderColor: CHART_COLORS,
      borderWidth: 1,
    }],
  };

  const options = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      r: {
        grid: { color: t.gridColor },
        ticks: { display: false },
        pointLabels: { color: t.labelColor, font: { size: 11 } },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, padding: 14, font: { size: 11 }, color: t.labelColor },
      },
      tooltip: {
        backgroundColor: t.tooltipBg,
        titleColor: t.tooltipTitleColor,
        bodyColor: t.tooltipBodyColor,
      },
    },
  };

  const chartEl = <PolarArea data={chartData} options={options} />;
  const headEl = (
    <div>
      <h3>{title || 'Kategori Distribution'}</h3>
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

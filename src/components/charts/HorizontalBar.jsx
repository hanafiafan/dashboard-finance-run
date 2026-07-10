import { Bar } from 'react-chartjs-2';
import { shortMoney } from '../../utils/formatters';
import { getChartTheme } from '../../utils/chartTheme';

export default function HorizontalBar({ data, title, note, color }) {
  if (!data || !data.length) return null;

  const t = getChartTheme();

  const chartData = {
    labels: data.map(x => x.label),
    datasets: [{
      label: 'Nilai',
      data: data.map(x => x.value),
      backgroundColor: (color || '#0d9488') + 'CC',
      borderColor: color || '#0d9488',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>{title || 'Horizontal View'}</h3>
          {note && <p>{note}</p>}
        </div>
      </div>
      <div className="chart-box tall">
        <Bar
          data={chartData}
          options={{
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                beginAtZero: true,
                ticks: { callback: v => shortMoney(v), font: { size: 10 }, color: t.tickColor },
                grid: { color: t.gridColor },
              },
              y: {
                grid: { display: false },
                ticks: { font: { size: 11, weight: '500' }, color: t.labelColor },
              },
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: t.tooltipBg,
                titleColor: t.tooltipTitleColor,
                bodyColor: t.tooltipBodyColor,
              },
            },
          }}
        />
      </div>
    </div>
  );
}

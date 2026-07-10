import { Bar } from 'react-chartjs-2';
import { shortMoney } from '../../utils/formatters';

export default function StackedBar({ datasets, labels, title, note, horizontal }) {
  if (!datasets || !labels) return null;

  const chartData = { labels, datasets };
  const isStacked = datasets.length > 1;

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>{title || 'Stacked Comparison'}</h3>
          {note && <p>{note}</p>}
        </div>
      </div>
      <div className="chart-box tall">
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: horizontal ? 'y' : 'x',
            scales: {
              x: {
                stacked: isStacked,
                grid: { display: false },
                ticks: { font: { size: 10 } },
              },
              y: {
                stacked: isStacked,
                beginAtZero: true,
                ticks: { callback: v => shortMoney(v), font: { size: 10 } },
              },
            },
            plugins: {
              legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12, font: { size: 11 } } },
            },
          }}
        />
      </div>
    </div>
  );
}

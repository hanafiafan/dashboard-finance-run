import { Radar as RadarChartJS } from 'react-chartjs-2';
import { getChartTheme } from '../../utils/chartTheme';

// Brand palette only, cycled per series.
const COLORS = [
  'rgba(232,80,2,0.95)', 'rgba(51,51,51,0.95)', 'rgba(193,8,1,0.95)',
  'rgba(167,167,167,0.95)', 'rgba(241,96,1,0.95)', 'rgba(100,100,100,0.95)',
  'rgba(217,195,171,0.95)', 'rgba(0,0,0,0.95)',
];

const FILLS = [
  'rgba(232,80,2,0.08)', 'rgba(51,51,51,0.07)', 'rgba(193,8,1,0.07)',
  'rgba(167,167,167,0.07)', 'rgba(241,96,1,0.07)', 'rgba(100,100,100,0.07)',
  'rgba(217,195,171,0.07)', 'rgba(0,0,0,0.07)',
];

const METRICS = ['cashIn', 'cashOut', 'budget', 'netCash', 'omzetAchievement'];
const LABELS = ['Cash In', 'Cash Out', 'Budget', 'Net Cash', 'Omzet'];

export default function RadarChartCore({ data }) {
  if (!data || !data.length) return null;

  const t = getChartTheme();

  const chartData = {
    labels: LABELS,
    datasets: data.slice(0, 10).map((item, i) => ({
      label: item.label,
      data: METRICS.map(m => item[m] || 0),
      backgroundColor: FILLS[i % FILLS.length],
      borderColor: COLORS[i % COLORS.length],
      borderWidth: 2,
      pointBackgroundColor: COLORS[i % COLORS.length],
      pointBorderColor: '#F9F9F9',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    })),
  };

  return (
    <RadarChartJS
      data={chartData}
      options={{
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          r: {
            beginAtZero: true,
            ticks: { display: false },
            grid: { color: t.gridColor },
            angleLines: { color: t.gridColor },
            pointLabels: {
              font: { size: 12, weight: 'bold' },
              color: t.labelColor,
            },
          },
        },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              padding: 12,
              font: { size: 10 },
              color: t.labelColor,
            },
          },
          tooltip: {
            backgroundColor: t.tooltipBg,
            titleColor: t.tooltipTitleColor,
            bodyColor: t.tooltipBodyColor,
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            padding: 10,
            cornerRadius: 6,
          },
        },
      }}
    />
  );
}

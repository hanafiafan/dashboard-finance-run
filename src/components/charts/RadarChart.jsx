import { Radar as RadarChartJS } from 'react-chartjs-2';
import { getChartTheme } from '../../utils/chartTheme';

const COLORS = [
  'rgba(13,148,136,0.95)', 'rgba(37,99,235,0.95)', 'rgba(249,115,91,0.95)',
  'rgba(124,58,237,0.95)', 'rgba(245,158,11,0.95)', 'rgba(6,182,212,0.95)',
  'rgba(16,185,129,0.95)', 'rgba(239,68,68,0.95)', 'rgba(168,85,247,0.95)',
  'rgba(251,146,60,0.95)',
];

const FILLS = [
  'rgba(13,148,136,0.08)', 'rgba(37,99,235,0.07)', 'rgba(249,115,91,0.07)',
  'rgba(124,58,237,0.07)', 'rgba(245,158,11,0.07)', 'rgba(6,182,212,0.07)',
  'rgba(16,185,129,0.07)', 'rgba(239,68,68,0.07)', 'rgba(168,85,247,0.07)',
  'rgba(251,146,60,0.07)',
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
      backgroundColor: FILLS[i % 10],
      borderColor: COLORS[i % 10],
      borderWidth: 2,
      pointBackgroundColor: COLORS[i % 10],
      pointBorderColor: '#fff',
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

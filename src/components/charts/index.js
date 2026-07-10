import {
  Chart as ChartJS,
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend, ArcElement, CategoryScale, LinearScale,
  BarElement, Title,
} from 'chart.js';

// Register ALL chart components
ChartJS.register(
  RadialLinearScale,
  PointElement, LineElement, Filler,
  Tooltip, Legend, ArcElement,
  CategoryScale, LinearScale,
  BarElement, Title
);

export { default as Radar } from './RadarChart';
export { default as Polar } from './PolarChart';
export { default as StackedBar } from './StackedBar';
export { default as HorizontalBar } from './HorizontalBar';
export { default as ComboChart } from './ComboChart';
export { default as ProgressRing } from './ProgressRing';
export { default as LiquidGauge } from './LiquidGauge';
export { default as BrandHeatmap } from './BrandHeatmap';
export { default as TrendSparkline } from './TrendSparkline';

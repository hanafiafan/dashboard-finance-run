/**
 * Chart-specific theme tokens — dark mode is the only theme.
 * Used by all chart components for grid/tick/label colors.
 */
export function getChartTheme() {
  return {
    isDark: true,
    gridColor: 'rgba(249,249,249,0.1)',
    tickColor: '#A7A7A7',
    labelColor: '#F9F9F9',
    tooltipBg: 'rgba(0,0,0,0.92)',
    tooltipTitleColor: '#F9F9F9',
    tooltipBodyColor: '#A7A7A7',
  };
}

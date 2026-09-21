/**
 * Chart-specific theme tokens — dark mode is the only theme.
 * Used by all chart components for grid/tick/label colors.
 */
export function getChartTheme() {
  return {
    isDark: true,
    gridColor: 'rgba(249,249,249,0.1)',
    tickColor: '#AEB2BC',
    labelColor: '#F4F5F8',
    tooltipBg: 'rgba(0,0,0,0.92)',
    tooltipTitleColor: '#F4F5F8',
    tooltipBodyColor: '#AEB2BC',
  };
}

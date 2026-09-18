/**
 * Returns chart-specific theme tokens based on current [data-theme]
 * Used by all chart components for grid/tick/label colors
 */
export function getChartTheme() {
  let isDark = false;
  try {
    isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  } catch {}
  return {
    isDark,
    gridColor: isDark ? 'rgba(249,249,249,0.1)' : 'rgba(0,0,0,0.06)',
    tickColor: isDark ? '#A7A7A7' : '#646464',
    labelColor: isDark ? '#F9F9F9' : '#000000',
    tooltipBg: 'rgba(0,0,0,0.92)',
    tooltipTitleColor: '#F9F9F9',
    tooltipBodyColor: '#A7A7A7',
  };
}

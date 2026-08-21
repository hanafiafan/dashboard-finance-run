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
    gridColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(20,40,30,0.06)',
    tickColor: isDark ? '#94a3b8' : '#56685d',
    labelColor: isDark ? '#cbd5e1' : '#16241c',
    tooltipBg: 'rgba(15,23,42,0.92)',
    tooltipTitleColor: '#f1f5f9',
    tooltipBodyColor: '#cbd5e1',
  };
}

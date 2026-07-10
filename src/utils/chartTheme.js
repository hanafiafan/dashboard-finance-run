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
    gridColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    tickColor: isDark ? '#94a3b8' : '#64748b',
    labelColor: isDark ? '#cbd5e1' : '#334155',
    tooltipBg: 'rgba(15,23,42,0.92)',
    tooltipTitleColor: '#f1f5f9',
    tooltipBodyColor: '#cbd5e1',
  };
}

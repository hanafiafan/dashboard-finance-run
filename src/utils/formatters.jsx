export const money = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export const pct = new Intl.NumberFormat('id-ID', {
  style: 'percent',
  maximumFractionDigits: 1,
});

function shortUnit(value, divisor, suffix) {
  const rounded = Math.round((value / divisor) * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}${suffix}`;
}

export function shortMoney(value) {
  const v = Number(value || 0);
  const abs = Math.abs(v);
  // Round to 1 decimal (not a flat integer) so nearby tick values like 1.5B
  // and 2B don't both collapse to the same "2M" label on chart axes.
  if (abs >= 1_000_000_000) return shortUnit(v, 1_000_000_000, 'M');
  if (abs >= 1_000_000) return shortUnit(v, 1_000_000, 'Jt');
  if (abs >= 1_000) return shortUnit(v, 1_000, 'Rb');
  return String(v || 0);
}

export function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]
  );
}

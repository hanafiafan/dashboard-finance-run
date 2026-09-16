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

export function shortMoney(value) {
  const abs = Math.abs(Number(value || 0));
  if (abs >= 1_000_000_000) return `${Math.round(value / 1_000_000_000)}M`;
  if (abs >= 1_000_000) return `${Math.round(value / 1_000_000)}Jt`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)}Rb`;
  return String(value ?? '-');
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

// Early Warning System — indicator thresholds from RAW DATA DASHBOARD FINANCE/Early Warning System.docx
export const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export function isToday(dateStr, today = new Date()) {
  return dateStr === today.toISOString().slice(0, 10);
}

export function isCurrentMonth(dateStr, today = new Date()) {
  return dateStr?.slice(0, 7) === today.toISOString().slice(0, 7);
}

export function isCurrentOmzetMonth(row, today = new Date()) {
  return row.bulan === MONTHS_ID[today.getMonth()] && Number(row.tahun) === today.getFullYear();
}

// Maps a ratio to a MetricCard color name per green/amber/rose thresholds.
// higherIsBetter=false for "risk" ratios where lower is safer (Cash Out Ratio, Receivable/Payable Risk).
export function ewsStatus(value, greenBound, amberBound, higherIsBetter = true) {
  const passes = (v, bound) => (higherIsBetter ? v >= bound : v <= bound);
  if (passes(value, greenBound)) return 'green';
  if (passes(value, amberBound)) return 'amber';
  return 'rose';
}

// Cash Position has a 3-way split centered on exactly 0, doesn't fit the bound-pair shape above.
export function cashPositionStatus(value) {
  if (value > 0) return 'green';
  if (value === 0) return 'amber';
  return 'rose';
}

export function addDays(days, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function sumBetween(rows, fromStr, toStr) {
  return (rows || [])
    .filter(r => r.date && r.date >= fromStr && r.date <= toStr)
    .reduce((s, r) => s + Number(r.nominal || 0), 0);
}

// Indicator #7 — Forecast Cash Position(tanggal X) = saldo + forecast in − forecast out, hari ini s/d tgl X
export function forecastCashPosition(bankBalance, forecastIn, forecastOut, targetDateStr, todayStr = addDays(0)) {
  return bankBalance + sumBetween(forecastIn, todayStr, targetDateStr) - sumBetween(forecastOut, todayStr, targetDateStr);
}

// ponytail: doc leaves "sangat tipis" undefined — treated as under 10% of current bank balance
export function forecastCashPositionStatus(value, bankBalance) {
  if (value < 0) return 'rose';
  if (bankBalance > 0 && value < bankBalance * 0.1) return 'amber';
  return 'green';
}

// Indicator #8 — Projected Cash Position = Forecast Cash Position(tgl dibutuhkan) − Budget Request,
// used as an affordability check before approving a budget request.
// ponytail: doc leaves "tipis" undefined — treated as this budget consuming >80% of the forecast buffer
export function projectedCashRecommendation(forecastPos, budgetAmount) {
  const projected = forecastPos - budgetAmount;
  if (projected < 0) return { projected, label: '🔴 Hold' };
  if (forecastPos > 0 && budgetAmount / forecastPos > 0.8) return { projected, label: '🟡 Review' };
  return { projected, label: '🟢 Approve' };
}

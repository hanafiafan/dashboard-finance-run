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

// Maps an EWS color to the "Status" + "Arti" wording from the source doc, so
// direksi sees not just the number but what it means and how urgent it is.
export const STATUS_CLASS = { green: 'ok', amber: 'warn', rose: 'bad' };

const EWS_TEXT = {
  cashPosition: {
    green: { label: 'Sehat', arti: 'Kas operasional mencukupi seluruh kebutuhan hari ini.' },
    amber: { label: 'Waspada', arti: 'Kas hanya cukup untuk kebutuhan hari ini — pengeluaran tambahan akan mulai mengganggu likuiditas.' },
    rose: { label: 'Kritis', arti: 'Kas operasional tidak mencukupi — risiko keterlambatan bayar supplier, payroll, atau operasional meningkat.' },
  },
  cashOutRatio: {
    green: { label: 'Sehat', arti: 'Pengeluaran masih efisien — ada ruang untuk investasi maupun menghadapi risiko.' },
    amber: { label: 'Waspada', arti: 'Pengeluaran mulai mendekati batas kebijakan — cadangan kas bertambah lebih lambat.' },
    rose: { label: 'Kritis', arti: 'Pengeluaran melebihi kebijakan cashflow — likuiditas jangka panjang berpotensi melemah.' },
  },
  cashConversion: {
    green: { label: 'Sehat', arti: 'Sebagian besar omzet sudah menjadi kas — cashflow sehat, mudah memenuhi kewajiban.' },
    amber: { label: 'Waspada', arti: 'Sebagian omzet masih tertahan — perlu percepatan collection agar tidak mengganggu kas.' },
    rose: { label: 'Kritis', arti: 'Omzet tinggi tetapi kas belum masuk — risiko piutang meningkat, kemampuan bayar menurun.' },
  },
  omzetAchievement: {
    green: { label: 'Aman', arti: 'Target omzet tercapai atau melebihi target — Cash In sesuai/melebihi rencana.' },
    amber: { label: 'Waspada', arti: 'Target omzet belum tercapai namun masih dalam batas toleransi — forecast Cash In perlu dipantau.' },
    rose: { label: 'Bahaya', arti: 'Target omzet jauh di bawah target — risiko Cash In tidak tercapai, cashflow beberapa minggu ke depan terganggu.' },
  },
  receivableRisk: {
    green: { label: 'Low Risk', arti: 'Piutang masih terkendali — cashflow masih sehat.' },
    amber: { label: 'Medium Risk', arti: 'Piutang mulai meningkat — collection perlu dipercepat.' },
    rose: { label: 'High Risk', arti: 'Piutang terlalu besar dibanding aktivitas bisnis — risiko Cash In tertunda, likuiditas melemah.' },
  },
  payableRisk: {
    green: { label: 'Low Risk', arti: 'Kewajiban masih mudah dipenuhi — cashflow stabil.' },
    amber: { label: 'Medium Risk', arti: 'Tekanan pembayaran mulai meningkat — perlu pengaturan jadwal pembayaran.' },
    rose: { label: 'High Risk', arti: 'Kewajiban mulai membebani kemampuan kas — risiko kekurangan kas meningkat.' },
  },
  forecastCashPosition: {
    green: { label: 'Aman', arti: 'Seluruh kewajiban hingga tanggal tersebut masih dapat dipenuhi — likuiditas aman.' },
    amber: { label: 'Waspada', arti: 'Kas masih cukup tetapi ruang pengeluaran tambahan sangat terbatas — perlu pengendalian cash out.' },
    rose: { label: 'Kritis', arti: 'Perusahaan diproyeksikan kekurangan kas pada tanggal tersebut — risiko gagal bayar meningkat.' },
  },
};

// indicator: one of the EWS_TEXT keys above; color: 'green'|'amber'|'rose' from the status functions.
export function ewsDetail(indicator, color) {
  return EWS_TEXT[indicator]?.[color] || { label: '', arti: '' };
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

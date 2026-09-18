import { readAllRows } from './readAllRows';
import { demoState, demoRows, demoForecastBudget, buildEntities } from '../utils/demoData';
import { supabase, TABLE_MAP, dbToUi, uiToDb } from './supabaseClient';
import { humanizeError } from '../utils/errorMessage';
import { isToday, isCurrentMonth, isCurrentOmzetMonth, forecastCashPosition, addDays, localDateStr } from '../utils/ews';

// Which DB column each entity's From/To date filter and Kategori filter should
// apply to — entities without a real date/category column (omzet uses Tahun
// instead, bank/payables/receivables have neither) are simply skipped.
const ENTITY_DATE_COL = {
  budget: 'tgl_pengajuan', income: 'tanggal', outcome: 'tanggal',
  forecast: 'estimasi_cair', forecastOut: 'estimasi_keluar', service: 'tanggal',
};
const ENTITY_CATEGORY_COL = { budget: 'kategori', outcome: 'kategori', forecastOut: 'kategori' };

// ── Supabase live queries ──────────────────────────────────

async function supabaseGetAppState(filters = {}, auth) {
  const brandFilter = filters.brandKey;
  const brands = await readAllRows(supabase.from('fin_brands').select('*').eq('active', true).order('id'));
  const companyKeys = filters.company ? brands.data.filter(b => b.company === filters.company).map(b => b.brand_key) : null;

  // Each entity's own date/category column, if it has one — used to actually apply
  // the From/To/Kategori filters the FilterBar exposes (previously only Brand worked).
  const apply = (query, entity) => {
    if (brandFilter) query = query.eq('brand_key', brandFilter);
    if (companyKeys) query = query.in('brand_key', companyKeys);
    const dateCol = ENTITY_DATE_COL[entity];
    if (dateCol && filters.startDate) query = query.gte(dateCol, filters.startDate);
    if (dateCol && filters.endDate) query = query.lte(dateCol, filters.endDate);
    const catCol = ENTITY_CATEGORY_COL[entity];
    if (catCol && filters.category) query = query.eq(catCol, filters.category);
    return query;
  };

  const [budget, income, outcome, omzet, bank, payables, receivables, forecast, forecastOut, , vendors, customers] = await Promise.all([
    apply(supabase.from('fin_budget').select('*'), 'budget'),
    apply(supabase.from('fin_income').select('*'), 'income'),
    apply(supabase.from('fin_outcome').select('*'), 'outcome'),
    filters.year ? apply(supabase.from('fin_omzet').select('*'), 'omzet').eq('tahun', filters.year) : apply(supabase.from('fin_omzet').select('*'), 'omzet'),
    apply(supabase.from('fin_bank').select('*'), 'bank'),
    apply(supabase.from('fin_payables').select('*'), 'payables'),
    apply(supabase.from('fin_receivables').select('*'), 'receivables'),
    apply(supabase.from('fin_forecast_cashin').select('*'), 'forecast'),
    apply(supabase.from('fin_forecast_cashout').select('*'), 'forecastOut'),
    apply(supabase.from('fin_service').select('*'), 'service'),
    supabase.from('fin_vendors').select('*'),
    supabase.from('fin_customers').select('*'),
  ].map(query => readAllRows(query.order('id'))));

  const vendorList = (vendors.data || []).map(r => dbToUi('vendors', r));
  const customerList = (customers.data || []).map(r => dbToUi('customers', r));

  const brandRows = (brands.data || []).map(b => ({
    Company: b.company, Brand: b.brand, 'Brand Key': b.brand_key, 'PIC Email': b.pic_email,
  }));
  const companies = [...new Set(brandRows.map(b => b.Company))];

  const budgetRows = budget.data || [];
  const incomeRows = income.data || [];
  const outcomeRows = outcome.data || [];
  const omzetRows = omzet.data || [];
  const bankRows = bank.data || [];
  const payableRows = payables.data || [];
  const receivableRows = receivables.data || [];

  // Moving cash between your own accounts (see createBankTransfer()) is
  // recorded as an Income+Outcome pair tagged 'Transfer Antar Bank' so the
  // existing bank-balance sync triggers pick it up — but it's not real
  // revenue/expense, so every KPI/chart below excludes it. Bank balances
  // (bankRows) and the raw recent-activity feed are unaffected — the money
  // did move between real accounts, that part is true.
  const incomeRowsReal = incomeRows.filter(r => r.kategori !== 'Transfer Antar Bank');
  const outcomeRowsReal = outcomeRows.filter(r => r.kategori !== 'Transfer Antar Bank');

  // Recent transactions for the Analytics page — sourced from the rows already
  // fetched above, just sorted/sliced, no extra query needed.
  const recentIncome = [...incomeRows].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')).slice(0, 8).map(r => dbToUi('income', r));
  const recentOutcome = [...outcomeRows].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')).slice(0, 8).map(r => dbToUi('outcome', r));
  const bankRowsUi = bankRows.map(r => dbToUi('bank', r));

  const pendingBudget = budgetRows
    .filter(r => r.status === 'Pending')
    .map(r => dbToUi('budget', r));

  const dueSoon = budgetRows
    .filter(r => r.tgl_dibutuhkan && r.status !== 'Paid')
    .sort((a, b) => (a.tgl_dibutuhkan || '').localeCompare(b.tgl_dibutuhkan || ''))
    .slice(0, 6)
    .map(r => dbToUi('budget', r));

  // Summary — matching demo shape (dashboard.summary.*)
  const cashIn = incomeRowsReal.reduce((s, r) => s + Number(r.nominal || 0), 0);
  const cashOut = outcomeRowsReal.reduce((s, r) => s + Number(r.jumlah || 0) + Number(r.biaya || 0), 0);
  const netCash = cashIn - cashOut;
  const bankBalance = bankRows.reduce((s, r) => s + Number(r.saldo_awal || 0) + Number(r.pemasukan || 0) - Number(r.pengeluaran || 0), 0);
  const budgetRequested = budgetRows.reduce((s, r) => s + Number(r.nominal_pengajuan || 0), 0);
  const pendingApproval = pendingBudget.length;
  // Budget Request yang disetujui juga ditulis sebagai baris fin_payables sendiri
  // (lihat syncPayableFromBudget, ditandai budget_id) supaya kelihatan sebagai baris
  // nyata di tabel Hutang, bukan cuma angka KPI. payableRows jadi berisi keduanya —
  // hutang yang diketik manual DAN hasil sinkron dari budget — jadi "Modul Hutang"
  // di kartu Dashboard cuma menjumlahkan yang bukan hasil sinkron itu, supaya
  // payableFromBudget di bawah tidak terhitung dua kali.
  const payableFromLedger = payableRows.filter(r => !r.budget_id).reduce((s, r) => s + Number(r.total_hutang || 0) - Number(r.total_dibayar || 0), 0);
  const payableFromBudget = budgetRows
    .filter(r => r.status === 'Approved' || r.status === 'Paid')
    .reduce((s, r) => s + Math.max(0, Number(r.nominal_pengajuan || 0) - Number(r.nominal_dibayar || 0)), 0);
  const payableOutstanding = payableFromLedger + payableFromBudget;
  const totalTarget = omzetRows.reduce((s, r) => s + Number(r.target_omzet || 0), 0);
  const totalRealisasi = omzetRows.reduce((s, r) => s + Number(r.realisasi_omzet || 0), 0);
  const omzetAchievement = totalTarget > 0 ? totalRealisasi / totalTarget : 0;
  const approvedCount = budgetRows.filter(r => r.status === 'Approved' || r.status === 'Paid').length;
  const approvalRate = budgetRows.length > 0 ? approvedCount / budgetRows.length : 0;

  // Early Warning System indicators (RAW DATA DASHBOARD FINANCE/Early Warning System.docx)
  const receivableOutstanding = receivableRows.reduce((s, r) => s + Number(r.total_piutang || 0) - Number(r.total_diterima || 0), 0);
  const cashInToday = incomeRowsReal.filter(r => isToday(r.tanggal)).reduce((s, r) => s + Number(r.nominal || 0), 0);
  const cashOutToday = outcomeRowsReal.filter(r => isToday(r.tanggal)).reduce((s, r) => s + Number(r.jumlah || 0) + Number(r.biaya || 0), 0);
  // Saldo rekening disinkronkan trigger dari SELURUH Cash In/Cash Out tanpa batas
  // tanggal, jadi mutasi hari ini sudah ada di dalamnya. Menambahkan cash in/out
  // hari ini sekali lagi (seperti sebelumnya) menghitungnya dua kali. Nilai harian
  // tetap dikirim terpisah supaya kartunya bisa menampilkan mutasi hari ini.
  const cashPosition = bankBalance;
  const cashInMonth = incomeRowsReal.filter(r => isCurrentMonth(r.tanggal)).reduce((s, r) => s + Number(r.nominal || 0), 0);
  const cashOutMonth = outcomeRowsReal.filter(r => isCurrentMonth(r.tanggal)).reduce((s, r) => s + Number(r.jumlah || 0) + Number(r.biaya || 0), 0);
  const cashOutRatio = cashInMonth > 0 ? cashOutMonth / cashInMonth : 0;
  const omzetRealMonth = omzetRows.filter(r => isCurrentOmzetMonth(r)).reduce((s, r) => s + Number(r.realisasi_omzet || 0), 0);
  const cashConversion = omzetRealMonth > 0 ? cashInMonth / omzetRealMonth : 0;
  const receivableRisk = omzetRealMonth > 0 ? receivableOutstanding / omzetRealMonth : 0;
  const payableRisk = cashInMonth > 0 ? payableOutstanding / cashInMonth : 0;
  const npm = omzetRealMonth > 0 ? (omzetRealMonth - cashOutMonth) / omzetRealMonth : 0;
  const forecastInRows = (forecast.data || []).map(r => ({ date: r.estimasi_cair, nominal: Number(r.nominal_estimasi || 0) }));
  const forecastOutRows = (forecastOut.data || []).map(r => ({ date: r.estimasi_keluar, nominal: Number(r.nominal_estimasi || 0) }));
  const forecastCashPosition30 = forecastCashPosition(bankBalance, forecastInRows, forecastOutRows, addDays(30));

  // Charts — build from real data
  // Monthly cashflow: group income/outcome by month
  const monthMap = {};
  incomeRowsReal.forEach(r => {
    const m = (r.tanggal || '').slice(0, 7);
    if (!m) return;
    if (!monthMap[m]) monthMap[m] = { label: m, cashIn: 0, cashOut: 0, forecastIn: 0, forecastOut: 0, netCash: 0 };
    monthMap[m].cashIn += Number(r.nominal || 0);
  });
  outcomeRowsReal.forEach(r => {
    const m = (r.tanggal || '').slice(0, 7);
    if (!m) return;
    if (!monthMap[m]) monthMap[m] = { label: m, cashIn: 0, cashOut: 0, forecastIn: 0, forecastOut: 0, netCash: 0 };
    monthMap[m].cashOut += Number(r.jumlah || 0) + Number(r.biaya || 0);
  });
  (forecast.data || []).forEach(r => {
    const m = (r.estimasi_cair || '').slice(0, 7);
    if (!m) return;
    if (!monthMap[m]) monthMap[m] = { label: m, cashIn: 0, cashOut: 0, forecastIn: 0, forecastOut: 0, netCash: 0 };
    monthMap[m].forecastIn += Number(r.nominal_estimasi || 0);
  });
  (forecastOut.data || []).forEach(r => {
    const m = (r.estimasi_keluar || '').slice(0, 7);
    if (!m) return;
    if (!monthMap[m]) monthMap[m] = { label: m, cashIn: 0, cashOut: 0, forecastIn: 0, forecastOut: 0, netCash: 0 };
    monthMap[m].forecastOut += Number(r.nominal_estimasi || 0);
  });
  const monthlyCashFlow = Object.values(monthMap).sort((a, b) => a.label.localeCompare(b.label));
  monthlyCashFlow.forEach(m => { m.netCash = m.cashIn - m.cashOut; });

  // Brand performance
  const brandPerfMap = {};
  brandRows.forEach(b => {
    brandPerfMap[b['Brand Key']] = { label: b['Brand Key'], company: b.Company, cashIn: 0, cashOut: 0, budget: 0, netCash: 0, omzetAchievement: 0 };
  });
  incomeRowsReal.forEach(r => { if (brandPerfMap[r.brand_key]) brandPerfMap[r.brand_key].cashIn += Number(r.nominal || 0); });
  outcomeRowsReal.forEach(r => { if (brandPerfMap[r.brand_key]) brandPerfMap[r.brand_key].cashOut += Number(r.jumlah || 0) + Number(r.biaya || 0); });
  budgetRows.forEach(r => { if (brandPerfMap[r.brand_key]) brandPerfMap[r.brand_key].budget += Number(r.nominal_pengajuan || 0); });
  const brandOmzetMap = {};
  omzetRows.forEach(r => {
    if (!brandOmzetMap[r.brand_key]) brandOmzetMap[r.brand_key] = { target: 0, real: 0 };
    brandOmzetMap[r.brand_key].target += Number(r.target_omzet || 0);
    brandOmzetMap[r.brand_key].real += Number(r.realisasi_omzet || 0);
  });
  const brandPerformance = Object.values(brandPerfMap).map(b => {
    b.netCash = b.cashIn - b.cashOut;
    const om = brandOmzetMap[b.label];
    b.omzetAchievement = om && om.target > 0 ? om.real / om.target : 0;
    return b;
  });

  // Bank balance chart
  const bankBalanceChart = bankRows.map(r => ({
    label: `${r.bank} (${r.brand_key})`,
    value: Number(r.saldo_awal || 0) + Number(r.pemasukan || 0) - Number(r.pengeluaran || 0),
  }));

  // Budget status chart
  const statusCounts = {};
  budgetRows.forEach(r => {
    const s = r.status || 'Pending';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  const budgetStatus = Object.entries(statusCounts).map(([label, value]) => ({ label, value }));

  // Budget by priority
  const prioCounts = {};
  budgetRows.forEach(r => {
    const p = r.prioritas || 'Medium';
    prioCounts[p] = (prioCounts[p] || 0) + 1;
  });
  const priority = Object.entries(prioCounts).map(([label, value]) => ({ label, value }));

  // Outcome by category
  const catCounts = {};
  outcomeRowsReal.forEach(r => {
    const c = r.kategori || 'Lain-lain';
    catCounts[c] = (catCounts[c] || 0) + Number(r.jumlah || 0) + Number(r.biaya || 0);
  });
  const outcomeByCategory = Object.entries(catCounts).map(([label, value]) => ({ label, value }));

  // Omzet by month
  const omzetMonthMap = {};
  omzetRows.forEach(r => {
    const key = r.bulan || '';
    if (!omzetMonthMap[key]) omzetMonthMap[key] = { label: key, target: 0, real: 0 };
    omzetMonthMap[key].target += Number(r.target_omzet || 0);
    omzetMonthMap[key].real += Number(r.realisasi_omzet || 0);
  });
  const omzetByMonth = Object.values(omzetMonthMap);

  // Payable aging — bucketed by days overdue vs. Tgl Jatuh Tempo. Rows without a due
  // date (not filled in yet) default to the safest "0-30 hari" bucket rather than
  // being excluded, since we have no evidence they're actually overdue.
  const payableAging = [
    { label: '0-30 hari', value: 0 },
    { label: '31-60 hari', value: 0 },
    { label: '61-90 hari', value: 0 },
    { label: '90+ hari', value: 0 },
  ];
  const todayMs = new Date(localDateStr()).getTime();
  payableRows.forEach(r => {
    const sisa = Number(r.total_hutang || 0) - Number(r.total_dibayar || 0);
    if (sisa <= 0) return;
    const daysOverdue = r.tgl_jatuh_tempo ? Math.floor((todayMs - new Date(r.tgl_jatuh_tempo).getTime()) / 86400000) : 0;
    const bucket = daysOverdue > 90 ? 3 : daysOverdue > 60 ? 2 : daysOverdue > 30 ? 1 : 0;
    payableAging[bucket].value += sisa;
  });

  return {
    generatedAt: new Date().toISOString(),
    brands: brandRows,
    entities: buildEntities(auth?.role),
    options: {
      companies,
      categories: ['Marketing', 'Operasional', 'Produksi', 'Gaji dan Upah', 'Sewa', 'Aset', 'Hutang', 'Hutang Eksternal', 'Hutang Internal', 'Biaya Layanan', 'Persediaan', 'Transfer Antar Bank', 'Lain-lain'],
      // Bank Masuk/Bank Keluar pick from ID Bank registered via Saldo Rekening
      // (bankRowsUi already carries 'ID Bank' + 'Bank' from dbToUi) — banks
      // without an ID Bank yet are filtered out in Modal.jsx's picker.
      bankList: bankRowsUi,
      priorities: ['High', 'Medium', 'Low'],
      budgetStatuses: ['Pending', 'Approved', 'Need Revision', 'Rejected', 'Paid'],
      paymentTypes: ['Transfer', 'Cash', 'Giro', 'Kartu Kredit'],
      controls: ['OK', 'Revisi', 'Hold'],
      months: ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],
      roles: ['superadmin', 'finance', 'owner', 'pic_brand'],
      vendorList,
      customerList,
    },
    dashboard: {
      generatedAt: new Date().toISOString(),
      summary: {
        cashIn, cashOut, netCash, bankBalance,
        budgetRequested, pendingApproval,
        budgetOutstanding: payableOutstanding,
        payableOutstanding,
        receivableOutstanding,
        omzetAchievement,
        omzetReal: totalRealisasi,
        omzetTarget: totalTarget,
        approvalRate,
        cashPosition,
        cashInToday,
        cashOutToday,
        payableFromLedger,
        payableFromBudget,
        cashOutRatio,
        cashConversion,
        receivableRisk,
        payableRisk,
        npm,
        forecastCashPosition30,
      },
      charts: {
        monthlyCashFlow,
        brandPerformance,
        bankBalance: bankBalanceChart,
        budgetStatus,
        priority,
        outcomeByCategory,
        omzetByMonth,
        payableAging,
        budgetByCategory: outcomeByCategory,
      },
      forecast: { in: forecastInRows, out: forecastOutRows },
      tables: { pendingBudget, dueSoon, recentIncome, recentOutcome, bank: bankRowsUi },
    },
  };
}

async function supabaseGetRecords(entity, filters = {}) {
  const table = TABLE_MAP[entity];
  if (!table) return { rows: [] };

  let query = supabase.from(table).select('*');
  if (filters.company && !['vendors', 'customers', 'users'].includes(entity)) {
    const scoped = await readAllRows(supabase.from('fin_brands').select('brand_key').eq('company', filters.company).order('id'));
    query = query.in('brand_key', scoped.data.map(b => b.brand_key));
  }
  if (filters.brandKey && entity !== 'vendors' && entity !== 'customers' && entity !== 'users') {
    query = query.eq('brand_key', filters.brandKey);
  }
  // Vendor dibagi dua: milik brand tertentu, atau umum (brand_key NULL) yang
  // selalu ikut tampil — jadi filter brand tidak pernah menyembunyikan vendor
  // bersama seperti kantor pajak atau jasa ekspedisi.
  if (filters.brandKey && entity === 'vendors') {
    query = query.or(`brand_key.is.null,brand_key.eq."${filters.brandKey}"`);
  }
  const dateCol = ENTITY_DATE_COL[entity];
  if (dateCol && filters.startDate) query = query.gte(dateCol, filters.startDate);
  if (dateCol && filters.endDate) query = query.lte(dateCol, filters.endDate);
  const catCol = ENTITY_CATEGORY_COL[entity];
  if (catCol && filters.category) query = query.eq(catCol, filters.category);
  if (entity === 'omzet' && filters.year) query = query.eq('tahun', filters.year);

  const { data, error } = await readAllRows(query.order('created_at', { ascending: false }).order('id'));
  if (error) throw new Error(humanizeError(error));
  return { rows: (data || []).map(r => dbToUi(entity, r)) };
}

async function supabaseSaveRecord(entity, record) {
  const table = TABLE_MAP[entity];
  if (!table) throw new Error('Unknown entity');
  const dbRow = uiToDb(entity, record);

  if (record.ID) {
    const { error } = await supabase.from(table).update(dbRow).eq('id', record.ID);
    if (error) throw new Error(humanizeError(error));
    return { ok: true, created: false };
  }
  const { error } = await supabase.from(table).insert(dbRow);
  if (error) throw new Error(humanizeError(error));
  return { ok: true, created: true };
}

async function supabaseDeleteRecord(entity, id) {
  const table = TABLE_MAP[entity];
  if (!table) throw new Error('Unknown entity');
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw new Error(humanizeError(error));
  return { ok: true };
}

async function supabaseApproveBudget(id, status, paid, feedback) {
  const update = { status, feedback_finance: feedback };
  if (paid) update.nominal_dibayar = Number(paid) || 0;
  const { data: budget, error } = await supabase.from('fin_budget').update(update).eq('id', id).select().single();
  if (error) throw new Error(humanizeError(error));
  await syncPayableFromBudget(budget);
  return { ok: true };
}

// Approved (or Paid) Budget Requests are a real payable, so mirror them into
// fin_payables — tagged via budget_id — instead of leaving them invisible in
// the Hutang table and only counted in the Dashboard's payableFromBudget KPI.
// Reverting to Pending/Need Revision/Rejected removes the mirrored row again,
// since it's no longer a confirmed obligation.
async function syncPayableFromBudget(budget) {
  if (budget.status !== 'Approved' && budget.status !== 'Paid') {
    const { error } = await supabase.from('fin_payables').delete().eq('budget_id', budget.id);
    if (error) throw new Error(humanizeError(error));
    return;
  }
  const { error } = await supabase.from('fin_payables').upsert({
    budget_id: budget.id,
    brand_key: budget.brand_key,
    nama_pemasok: budget.vendor_name || '',
    id_pemasok: budget.vendor_id || '',
    total_hutang: Number(budget.nominal_pengajuan || 0),
    total_dibayar: Number(budget.nominal_dibayar || 0),
    status: budget.status,
    source: 'Budget Request',
    tgl_jatuh_tempo: budget.tgl_pembayaran_selanjutnya || budget.tgl_pelunasan || null,
  }, { onConflict: 'budget_id' });
  if (error) throw new Error(humanizeError(error));
}

// Moves cash between two Saldo Rekening accounts in one atomic RPC call —
// writes both the Cash Out (source) and Cash In (destination) legs, tagged
// 'Transfer Antar Bank' so financeApi.js's KPI calculations exclude them and
// the existing bank-balance sync triggers (0007/0012) pick them up like any
// other Cash In/Cash Out row.
async function supabaseCreateBankTransfer(payload) {
  const { error } = await supabase.rpc('create_bank_transfer', {
    p_brand_key: payload.brandKey,
    p_tanggal: payload.tanggal,
    p_source_bank: payload.sourceBankName,
    p_source_bank_id: payload.sourceBankId,
    p_dest_bank: payload.destBankName,
    p_dest_bank_id: payload.destBankId,
    p_nominal: Number(payload.nominal) || 0,
    p_catatan: payload.catatan || null,
  });
  if (error) throw new Error(humanizeError(error));
  return { ok: true };
}

// ── Public API (demo ↔ supabase switch) ────────────────────

export async function getAppState(filters = {}, auth) {
  if (auth?.isDemo) return demoState(filters, auth);
  // Never silently substitute demo data for a real session on failure — a finance
  // tool showing fabricated numbers as if they were live is worse than an error.
  // Callers (App.jsx, AppShell.jsx) are responsible for surfacing the rejection.
  return supabaseGetAppState(filters, auth);
}

export async function getRecords(entity, filters = {}, auth) {
  if (auth?.isDemo) return { rows: demoRows(entity, filters), canEdit: true, canApprove: entity === 'budget' };
  return supabaseGetRecords(entity, filters, auth);
}

export async function saveRecord(entity, record, auth) {
  if (auth?.isDemo) return { ok: true, record, created: !record.ID };
  return supabaseSaveRecord(entity, record);
}

export async function deleteRecord(entity, id, auth) {
  if (auth?.isDemo) return { ok: true };
  return supabaseDeleteRecord(entity, id);
}

export async function approveBudget(id, status, paid, feedback, auth) {
  if (auth?.isDemo) return { ok: true };
  return supabaseApproveBudget(id, status, paid, feedback);
}

export async function createBankTransfer(payload, auth) {
  if (auth?.isDemo) return { ok: true };
  return supabaseCreateBankTransfer(payload);
}

// ── Forecasting & Controlling Budget ───────────────────────
// Own read/write pair instead of the generic getRecords/saveRecord flow: this
// entity is a matrix (brand x month x P&L line) with an upsert-by-natural-key
// shape, not a flat list of freeform records, so it doesn't fit TABLE_COLUMNS/FORMS.

export async function getForecastBudget(filters = {}, auth) {
  if (auth?.isDemo) return demoForecastBudget(filters);
  // PostgREST caps a single response at 1000 rows — "Semua Brand" for a full
  // year can exceed that, so page through with .range() until a short page
  // signals the end, instead of silently truncating the P&L totals.
  const PAGE_SIZE = 1000;
  let data = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from('fin_forecast_budget').select('*').eq('tahun', filters.tahun).range(from, from + PAGE_SIZE - 1);
    if (filters.brandKey) query = query.eq('brand_key', filters.brandKey);
    const { data: page, error } = await query;
    if (error) throw new Error(humanizeError(error));
    data = data.concat(page || []);
    if (!page || page.length < PAGE_SIZE) break;
  }
  return data.map(r => ({
    id: r.id, brandKey: r.brand_key, tahun: r.tahun, bulan: r.bulan,
    lineKey: r.line_key, nilaiAnggaran: Number(r.nilai_anggaran || 0),
    nilaiRealisasi: Number(r.nilai_realisasi || 0), keterangan: r.keterangan || '',
  }));
}

export async function saveForecastBudgetLine(record, auth) {
  if (auth?.isDemo) return { ok: true };
  const { brandKey, tahun, bulan, lineKey, nilaiAnggaran, nilaiRealisasi, keterangan } = record;
  const { error } = await supabase.from('fin_forecast_budget')
    .upsert({
      brand_key: brandKey, tahun, bulan, line_key: lineKey,
      nilai_anggaran: Number(nilaiAnggaran || 0), nilai_realisasi: Number(nilaiRealisasi || 0),
      keterangan: keterangan || null, updated_at: new Date().toISOString(),
    }, { onConflict: 'brand_key,tahun,bulan,line_key' });
  if (error) throw new Error(humanizeError(error));
  return { ok: true };
}

export async function importFromSources(auth) {
  if (auth?.isDemo) return { ok: true, results: [{ brand: 'Demo', imported: 24 }] };
  // Not implemented yet — say so plainly instead of a fake "0 diproses" success,
  // which reads as "nothing new to import" rather than "this button doesn't work".
  throw new Error('Fitur import dari Source Workbooks belum tersedia.');
}

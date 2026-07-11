import { demoState, demoRows, demoApi, buildEntities } from '../utils/demoData';
import { supabase, TABLE_MAP, dbToUi, uiToDb } from './supabaseClient';

// ── Supabase live queries ──────────────────────────────────

async function supabaseGetAppState(filters = {}, auth) {
  const brandFilter = filters.brandKey;

  const apply = (query) => {
    if (brandFilter) return query.eq('brand_key', brandFilter);
    return query;
  };

  const [brands, budget, income, outcome, omzet, bank, payables, receivables, forecast, service] = await Promise.all([
    supabase.from('fin_brands').select('*').eq('active', true),
    apply(supabase.from('fin_budget').select('*')),
    apply(supabase.from('fin_income').select('*')),
    apply(supabase.from('fin_outcome').select('*')),
    apply(supabase.from('fin_omzet').select('*')),
    apply(supabase.from('fin_bank').select('*')),
    apply(supabase.from('fin_payables').select('*')),
    apply(supabase.from('fin_receivables').select('*')),
    apply(supabase.from('fin_forecast_cashin').select('*')),
    apply(supabase.from('fin_service').select('*')),
  ]);

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

  const pendingBudget = budgetRows
    .filter(r => r.status === 'Pending')
    .map(r => dbToUi('budget', r));

  const dueSoon = budgetRows
    .filter(r => r.tgl_dibutuhkan && r.status !== 'Paid')
    .sort((a, b) => (a.tgl_dibutuhkan || '').localeCompare(b.tgl_dibutuhkan || ''))
    .slice(0, 6)
    .map(r => dbToUi('budget', r));

  // Summary — matching demo shape (dashboard.summary.*)
  const cashIn = incomeRows.reduce((s, r) => s + Number(r.nominal || 0), 0);
  const cashOut = outcomeRows.reduce((s, r) => s + Number(r.jumlah || 0) + Number(r.biaya || 0), 0);
  const netCash = cashIn - cashOut;
  const bankBalance = bankRows.reduce((s, r) => s + Number(r.saldo_awal || 0) + Number(r.pemasukan || 0) - Number(r.pengeluaran || 0), 0);
  const budgetRequested = budgetRows.reduce((s, r) => s + Number(r.nominal_pengajuan || 0), 0);
  const pendingApproval = pendingBudget.length;
  const payableOutstanding = payableRows.reduce((s, r) => s + Number(r.total_hutang || 0) - Number(r.total_dibayar || 0), 0);
  const totalTarget = omzetRows.reduce((s, r) => s + Number(r.target_omzet || 0), 0);
  const totalRealisasi = omzetRows.reduce((s, r) => s + Number(r.realisasi_omzet || 0), 0);
  const omzetAchievement = totalTarget > 0 ? totalRealisasi / totalTarget : 0;
  const approvedCount = budgetRows.filter(r => r.status === 'Approved' || r.status === 'Paid').length;
  const approvalRate = budgetRows.length > 0 ? approvedCount / budgetRows.length : 0;

  // Charts — build from real data
  // Monthly cashflow: group income/outcome by month
  const monthMap = {};
  incomeRows.forEach(r => {
    const m = (r.tanggal || '').slice(0, 7);
    if (!m) return;
    if (!monthMap[m]) monthMap[m] = { label: m, cashIn: 0, cashOut: 0, forecastIn: 0, netCash: 0 };
    monthMap[m].cashIn += Number(r.nominal || 0);
  });
  outcomeRows.forEach(r => {
    const m = (r.tanggal || '').slice(0, 7);
    if (!m) return;
    if (!monthMap[m]) monthMap[m] = { label: m, cashIn: 0, cashOut: 0, forecastIn: 0, netCash: 0 };
    monthMap[m].cashOut += Number(r.jumlah || 0) + Number(r.biaya || 0);
  });
  (forecast.data || []).forEach(r => {
    const m = (r.estimasi_cair || '').slice(0, 7);
    if (!m) return;
    if (!monthMap[m]) monthMap[m] = { label: m, cashIn: 0, cashOut: 0, forecastIn: 0, netCash: 0 };
    monthMap[m].forecastIn += Number(r.nominal_estimasi || 0);
  });
  const monthlyCashFlow = Object.values(monthMap).sort((a, b) => a.label.localeCompare(b.label));
  monthlyCashFlow.forEach(m => { m.netCash = m.cashIn - m.cashOut; });

  // Brand performance
  const brandPerfMap = {};
  brandRows.forEach(b => {
    brandPerfMap[b['Brand Key']] = { label: b['Brand Key'], company: b.Company, cashIn: 0, cashOut: 0, budget: 0, netCash: 0, omzetAchievement: 0 };
  });
  incomeRows.forEach(r => { if (brandPerfMap[r.brand_key]) brandPerfMap[r.brand_key].cashIn += Number(r.nominal || 0); });
  outcomeRows.forEach(r => { if (brandPerfMap[r.brand_key]) brandPerfMap[r.brand_key].cashOut += Number(r.jumlah || 0) + Number(r.biaya || 0); });
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
  outcomeRows.forEach(r => {
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

  // Payable aging
  const payableAging = [
    { label: '0-30 hari', value: 0 },
    { label: '31-60 hari', value: 0 },
    { label: '61-90 hari', value: 0 },
    { label: '90+ hari', value: 0 },
  ];
  payableRows.forEach(r => {
    const sisa = Number(r.total_hutang || 0) - Number(r.total_dibayar || 0);
    if (sisa <= 0) return;
    payableAging[0].value += sisa;
  });

  return {
    generatedAt: new Date().toISOString(),
    brands: brandRows,
    entities: buildEntities(auth?.role),
    options: {
      companies,
      categories: ['Marketing', 'Operasional', 'Produksi', 'Gaji dan Upah', 'Sewa', 'Aset', 'Hutang', 'Lain-lain'],
      banks: ['BCA', 'BNI', 'BRI', 'Mandiri', 'BSI', 'Kas Kecil', 'E-wallet'],
      priorities: ['High', 'Medium', 'Low'],
      budgetStatuses: ['Pending', 'Approved', 'Need Revision', 'Rejected', 'Paid'],
      paymentTypes: ['Transfer', 'Cash', 'Giro', 'Kartu Kredit'],
      controls: ['OK', 'Revisi', 'Hold'],
      months: ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],
      roles: ['superadmin', 'finance', 'owner', 'pic_brand'],
    },
    dashboard: {
      generatedAt: new Date().toISOString(),
      summary: {
        cashIn, cashOut, netCash, bankBalance,
        budgetRequested, pendingApproval,
        budgetOutstanding: payableOutstanding,
        payableOutstanding,
        omzetAchievement,
        omzetReal: totalRealisasi,
        omzetTarget: totalTarget,
        approvalRate,
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
      tables: { pendingBudget, dueSoon },
    },
  };
}

async function supabaseGetRecords(entity, filters = {}, auth) {
  const table = TABLE_MAP[entity];
  if (!table) return { rows: [] };

  let query = supabase.from(table).select('*');
  if (filters.brandKey && entity !== 'vendors' && entity !== 'customers' && entity !== 'users') {
    query = query.eq('brand_key', filters.brandKey);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return { rows: (data || []).map(r => dbToUi(entity, r)) };
}

async function supabaseSaveRecord(entity, record) {
  const table = TABLE_MAP[entity];
  if (!table) throw new Error('Unknown entity');
  const dbRow = uiToDb(entity, record);

  if (record.ID) {
    const { error } = await supabase.from(table).update(dbRow).eq('id', record.ID);
    if (error) throw new Error(error.message);
    return { ok: true, created: false };
  }
  const { error } = await supabase.from(table).insert(dbRow);
  if (error) throw new Error(error.message);
  return { ok: true, created: true };
}

async function supabaseDeleteRecord(entity, id) {
  const table = TABLE_MAP[entity];
  if (!table) throw new Error('Unknown entity');
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function supabaseApproveBudget(id, status, paid, feedback) {
  const update = { status, feedback_finance: feedback };
  if (paid) update.nominal_dibayar = Number(paid) || 0;
  const { error } = await supabase.from('fin_budget').update(update).eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ── Public API (demo ↔ supabase switch) ────────────────────

export async function getAppState(filters = {}, auth) {
  if (auth?.isDemo) return demoState(filters, auth);
  try {
    return await supabaseGetAppState(filters, auth);
  } catch (err) {
    console.error('Supabase getAppState failed, falling back to demo:', err);
    return demoState(filters, auth);
  }
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

export async function importFromSources(auth) {
  if (auth?.isDemo) return { ok: true, results: [{ brand: 'Demo', imported: 24 }] };
  return { ok: true, results: [{ brand: 'Supabase', imported: 0 }] };
}

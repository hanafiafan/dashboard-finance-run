import { demoState, demoRows, demoApi } from '../utils/demoData';
import { supabase, TABLE_MAP, dbToUi, uiToDb } from './supabaseClient';

// ── Supabase live queries ──────────────────────────────────

async function supabaseGetAppState(filters = {}, auth) {
  const brandFilter = filters.brandKey;

  const apply = (query) => {
    if (brandFilter) return query.eq('brand_key', brandFilter);
    return query;
  };

  const [brands, budget, income, outcome, omzet, bank, payables, receivables] = await Promise.all([
    supabase.from('fin_brands').select('*').eq('active', true),
    apply(supabase.from('fin_budget').select('*')),
    apply(supabase.from('fin_income').select('*')),
    apply(supabase.from('fin_outcome').select('*')),
    apply(supabase.from('fin_omzet').select('*')),
    apply(supabase.from('fin_bank').select('*')),
    apply(supabase.from('fin_payables').select('*')),
    apply(supabase.from('fin_receivables').select('*')),
  ]);

  const brandRows = (brands.data || []).map(b => ({
    Company: b.company, Brand: b.brand, 'Brand Key': b.brand_key, 'PIC Email': b.pic_email,
  }));

  const pendingBudget = (budget.data || [])
    .filter(r => r.status === 'Pending')
    .map(r => dbToUi('budget', r));

  const totalIncome = (income.data || []).reduce((s, r) => s + Number(r.nominal || 0), 0);
  const totalOutcome = (outcome.data || []).reduce((s, r) => s + Number(r.jumlah || 0) + Number(r.biaya || 0), 0);
  const totalPayables = (payables.data || []).reduce((s, r) => s + Number(r.total_hutang || 0) - Number(r.total_dibayar || 0), 0);
  const totalReceivables = (receivables.data || []).reduce((s, r) => s + Number(r.total_piutang || 0) - Number(r.total_diterima || 0), 0);

  const omzetData = omzet.data || [];
  const totalTarget = omzetData.reduce((s, r) => s + Number(r.target_omzet || 0), 0);
  const totalRealisasi = omzetData.reduce((s, r) => s + Number(r.realisasi_omzet || 0), 0);

  const bankData = bank.data || [];
  const totalSaldo = bankData.reduce((s, r) => s + Number(r.saldo_awal || 0) + Number(r.pemasukan || 0) - Number(r.pengeluaran || 0), 0);

  const priorityCounts = { High: 0, Medium: 0, Low: 0 };
  (budget.data || []).filter(r => r.status === 'Pending').forEach(r => {
    const p = r.prioritas || 'Medium';
    priorityCounts[p] = (priorityCounts[p] || 0) + 1;
  });

  return {
    generatedAt: new Date().toISOString(),
    brands: brandRows,
    dashboard: {
      generatedAt: new Date().toISOString(),
      kpis: {
        totalIncome, totalOutcome, netCashflow: totalIncome - totalOutcome,
        totalPayables, totalReceivables, totalSaldo,
        omzetTarget: totalTarget, omzetRealisasi: totalRealisasi,
        pendingBudget: pendingBudget.length,
      },
      tables: { pendingBudget },
      charts: {
        priority: Object.entries(priorityCounts).map(([label, value]) => ({ label, value })),
        cashflow: [],
      },
    },
    entities: buildEntitiesFromRole(auth?.role),
    options: {
      categories: ['Marketing', 'Operasional', 'Produksi', 'Gaji', 'Lain-lain'],
      banks: ['BCA', 'BNI', 'BRI', 'Mandiri', 'CIMB', 'Danamon'],
      priorities: ['High', 'Medium', 'Low'],
      budgetStatuses: ['Pending', 'Approved', 'Need Revision', 'Rejected', 'Paid'],
      paymentTypes: ['Transfer', 'Cash', 'Giro', 'Kartu Kredit'],
      controls: ['OK', 'Revisi', 'Hold'],
      months: ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],
      roles: ['superadmin', 'finance', 'owner', 'pic_brand'],
    },
  };
}

function buildEntitiesFromRole(role) {
  const all = role === 'superadmin' || role === 'finance';
  const entities = {};
  for (const key of Object.keys(TABLE_MAP)) {
    entities[key] = { canEdit: all || false };
  }
  if (role === 'owner') {
    entities.budget.canEdit = true;
  }
  return entities;
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

// ponytail: removed Apps Script proxy, Supabase is the live backend now

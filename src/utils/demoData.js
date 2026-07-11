export function demoApi(action, args, session) {
  const state = demoState(args[0] || {}, session);
  if (action === 'getAppState') return state;
  if (action === 'getRecords') return { rows: demoRows(args[0]), canEdit: true, canApprove: args[0] === 'budget' };
  if (action === 'saveRecord') return { ok: true, record: args[1], created: !args[1].ID };
  if (action === 'deleteRecord') return { ok: true };
  if (action === 'approveBudget') return { ok: true };
  if (action === 'importFromSourceWorkbooks') return { ok: true, results: [{ brand: 'Demo', imported: 24 }] };
  return {};
}

// Role permission matrix
const ROLE_PERMISSIONS = {
  superadmin: { canApprove: true, canManageUsers: true, canImport: true, canEditAll: true },
  finance:    { canApprove: true, canManageUsers: true, canImport: true, canEditAll: true },
  owner:      { canApprove: true, canManageUsers: false, canImport: false, canEditAll: false },
  pic_brand:  { canApprove: false, canManageUsers: false, canImport: false, canEditAll: false },
};

const ALL_ENTITIES = ['budget', 'income', 'forecast', 'outcome', 'omzet', 'bank', 'service', 'payables', 'receivables'];
const MASTER_ENTITIES = ['users', 'brands', 'sources', 'vendors', 'customers'];

export function buildEntities(role) {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.pic_brand;
  const entities = {};

  for (const e of ALL_ENTITIES) {
    if (role === 'pic_brand') {
      // PIC can only submit budget requests and view their own data
      entities[e] = { canEdit: e === 'budget' };
    } else if (role === 'owner') {
      // Owner can view all, edit budget/income/forecast/outcome
      entities[e] = { canEdit: ['budget', 'income', 'forecast', 'outcome'].includes(e) };
    } else {
      // superadmin & finance: full CRUD
      entities[e] = { canEdit: true };
    }
  }

  for (const e of MASTER_ENTITIES) {
    if (role === 'superadmin') {
      entities[e] = { canEdit: true };
    } else if (role === 'finance') {
      entities[e] = { canEdit: e !== 'users' };
    } else {
      entities[e] = { canEdit: false };
    }
  }

  return entities;
}

export function demoState(filters = {}, session = null) {
  const allBrands = [
    { Company: 'CV HAN', Brand: 'HAN', 'Brand Key': 'HAN', Active: true, 'PIC Email': 'pic.han@example.com' },
    { Company: 'CV LBP', Brand: 'LBP', 'Brand Key': 'LBP', Active: true, 'PIC Email': 'pic.lbp@example.com' },
    { Company: 'CV LBP', Brand: 'PRP', 'Brand Key': 'PRP', Active: true, 'PIC Email': 'pic.prp@example.com' },
    { Company: 'CV LBP', Brand: 'KHEEMA', 'Brand Key': 'KHEEMA', Active: true, 'PIC Email': 'pic.kheema@example.com' },
    { Company: 'CV LBP', Brand: 'PG', 'Brand Key': 'PG', Active: true, 'PIC Email': 'pic.pg@example.com' },
    { Company: 'PT MBN', Brand: 'NUSASEED', 'Brand Key': 'NUSASEED', Active: true, 'PIC Email': 'pic.nusaseed@example.com' },
    { Company: 'PT MBN', Brand: 'BSS', 'Brand Key': 'BSS', Active: true, 'PIC Email': 'pic.bss@example.com' },
    { Company: 'PT MBN', Brand: 'BSSM/RBLN', 'Brand Key': 'BSSM_RBLN', Active: true, 'PIC Email': 'pic.bssm@example.com' },
    { Company: 'PT MBN', Brand: 'BSJT', 'Brand Key': 'BSJT', Active: true, 'PIC Email': 'pic.bsjt@example.com' },
    { Company: 'PT MBN', Brand: 'PT MBN', 'Brand Key': 'PT_MBN', Active: true, 'PIC Email': 'pic.ptmbn@example.com' },
  ];

  // Apply filters — company and brandKey
  let visibleBrands = allBrands;
  if (filters.company) {
    visibleBrands = visibleBrands.filter(b => b.Company === filters.company);
  }
  if (filters.brandKey) {
    visibleBrands = visibleBrands.filter(b => b['Brand Key'] === filters.brandKey);
  }
  const visibleKeys = new Set(visibleBrands.map(b => b['Brand Key']));

  const monthlyCashFlow = [
    { label: '2026-04', cashIn: 180000000, cashOut: 128000000, forecastIn: 70000000, netCash: 52000000 },
    { label: '2026-05', cashIn: 210000000, cashOut: 146000000, forecastIn: 94000000, netCash: 64000000 },
    { label: '2026-06', cashIn: 244000000, cashOut: 158000000, forecastIn: 110000000, netCash: 86000000 },
    { label: '2026-07', cashIn: 292349000, cashOut: 87310000, forecastIn: 454220000, netCash: 205039000 },
  ];

  const allPerformance = [
    { label: 'HAN', company: 'CV HAN', cashIn: 77000000, cashOut: 4183000, budget: 14670000, netCash: 72817000, omzetAchievement: 0.84 },
    { label: 'LBP', company: 'CV LBP', cashIn: 82000000, cashOut: 16005000, budget: 8200000, netCash: 65995000, omzetAchievement: 0.78 },
    { label: 'PRP', company: 'CV LBP', cashIn: 45000000, cashOut: 9500000, budget: 5200000, netCash: 35500000, omzetAchievement: 0.72 },
    { label: 'KHEEMA', company: 'CV LBP', cashIn: 38000000, cashOut: 7100000, budget: 4800000, netCash: 30900000, omzetAchievement: 0.65 },
    { label: 'PG', company: 'CV LBP', cashIn: 52000000, cashOut: 11200000, budget: 6500000, netCash: 40800000, omzetAchievement: 0.88 },
    { label: 'NUSASEED', company: 'PT MBN', cashIn: 63500000, cashOut: 11507000, budget: 11900000, netCash: 51993000, omzetAchievement: 0.91 },
    { label: 'BSS', company: 'PT MBN', cashIn: 38000000, cashOut: 8600000, budget: 8600000, netCash: 29400000, omzetAchievement: 0.69 },
    { label: 'BSSM/RBLN', company: 'PT MBN', cashIn: 28500000, cashOut: 5800000, budget: 4100000, netCash: 22700000, omzetAchievement: 0.76 },
    { label: 'BSJT', company: 'PT MBN', cashIn: 31000000, cashOut: 6900000, budget: 5500000, netCash: 24100000, omzetAchievement: 0.81 },
    { label: 'PT MBN', company: 'PT MBN', cashIn: 48000000, cashOut: 10200000, budget: 7800000, netCash: 37800000, omzetAchievement: 0.85 },
  ];

  const brandPerformance = allPerformance.filter(p => visibleKeys.has(p.label));

  const bankBalance = [
    { label: 'Bank BCA', value: 185000000 },
    { label: 'Bank Mandiri', value: 320000000 },
    { label: 'Bank BRI', value: 145000000 },
    { label: 'Bank BNI', value: 98000000 },
    { label: 'Bank Sentral', value: 220000000 },
    { label: 'Bank BSI', value: 75000000 },
    { label: 'Kas Kecil', value: 15000000 },
    { label: 'E-wallet', value: 8000000 },
  ];

  const budgetStatus = [
    { label: 'Diajukan', value: 8 },
    { label: 'Approved', value: 15 },
    { label: 'DP', value: 6 },
    { label: 'Termin', value: 4 },
    { label: 'Lunas', value: 22 },
    { label: 'Need Revision', value: 2 },
    { label: 'Rejected', value: 1 },
  ];

  const priority = [
    { label: 'High', value: 18 },
    { label: 'Medium', value: 28 },
    { label: 'Low', value: 12 },
  ];

  const outcomeByCategory = [
    { label: 'Operasional', value: 45000000 },
    { label: 'Marketing', value: 38000000 },
    { label: 'Gaji & Upah', value: 62000000 },
    { label: 'Sewa', value: 18000000 },
    { label: 'Aset', value: 25000000 },
    { label: 'Hutang', value: 32000000 },
  ];

  const omzetByMonth = [
    { label: 'Jan', target: 150000000, real: 132000000 },
    { label: 'Feb', target: 155000000, real: 148000000 },
    { label: 'Mar', target: 160000000, real: 171000000 },
    { label: 'Apr', target: 165000000, real: 144000000 },
    { label: 'May', target: 170000000, real: 162000000 },
    { label: 'Jun', target: 175000000, real: 189000000 },
  ];

  const payableAging = [
    { label: '0-30 hari', value: 25000000 },
    { label: '31-60 hari', value: 18000000 },
    { label: '61-90 hari', value: 9500000 },
    { label: '90+ hari', value: 4200000 },
  ];

  // Filter-aware summary
  const perf = brandPerformance;
  const cashIn = perf.reduce((s, p) => s + (p.cashIn || 0), 0);
  const cashOut = perf.reduce((s, p) => s + (p.cashOut || 0), 0);
  const netCash = cashIn - cashOut;
  const totalBank = bankBalance.reduce((s, b) => s + b.value, 0);
  const avgOmzet = perf.length ? perf.reduce((s, p) => s + (p.omzetAchievement || 0), 0) / perf.length : 0;

  // Filtered table data
  const makeRow = (brand) => ({
    Brand: brand,
    Kategori: ['Operasional', 'Marketing', 'Gaji & Upah'][Math.floor(Math.random() * 3)],
    Keterangan: `Kebutuhan ${brand} - Q3 ${new Date().getFullYear()}`,
    'Nominal Pengajuan (Rp)': Math.floor(Math.random() * 15000000) + 5000000,
    Prioritas: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
    Status: ['Diajukan', 'Approved', 'Need Revision'][Math.floor(Math.random() * 3)],
  });

  const pendingBudget = visibleBrands.map(b => makeRow(b.Brand)).slice(0, 8);
  const dueSoon = visibleBrands.map(b => ({
    Brand: b.Brand,
    'Tgl Dibutuhkan': `2026-0${7 + Math.floor(Math.random() * 5)}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
    Vendor: ['PT Supplier Indo', 'CV Distribusi Jaya', 'UD Sumber Makmur'][Math.floor(Math.random() * 3)],
    'Sisa Hutang (Rp)': Math.floor(Math.random() * 20000000) + 3000000,
    Status: ['DP', 'Termin', 'Belum Dibayar'][Math.floor(Math.random() * 3)],
  })).slice(0, 6);

  const role = session?.role || 'finance';
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.pic_brand;

  return {
    authorized: true,
    generatedAt: new Date().toISOString(),
    appliedFilters: filters,
    app: { title: 'Dashboard Finance RUN', subtitle: 'Dashboard finance multi-company & multi-brand' },
    session: {
      name: session?.name || 'Demo Finance',
      email: session?.email || 'demo@finance.local',
      role,
      permissions: { canApprove: perms.canApprove, canManageUsers: perms.canManageUsers, canImport: perms.canImport },
    },
    entities: buildEntities(role),
    brands: visibleBrands,
    options: {
      companies: [...new Set(allBrands.map(b => b.Company))],
      categories: ['Operasional', 'Marketing', 'Aset', 'Persediaan', 'Hutang', 'Gaji dan Upah', 'Sewa', 'Saving', 'Transfer Antar Bank', 'Jasa Konsultasi & Manajemen RUN'],
      banks: ['Bank Sentral', 'Bank BRI', 'Bank BCA', 'Bank BSI', 'Bank BNI', 'Bank Mandiri', 'Kas Kecil', 'Kas Ditangan', 'E-wallet'],
      priorities: ['High', 'Medium', 'Low'],
      budgetStatuses: ['Diajukan', 'Approved', 'Need Revision', 'Rejected', 'DP', 'Termin', 'Lunas'],
      paymentTypes: ['Belum Dibayar', 'DP', 'Termin', 'Lunas'],
    },
    period: { year: 2026, month: 7 },
    dashboard: {
      generatedAt: new Date().toISOString(),
      summary: {
        cashIn,
        cashOut,
        netCash,
        bankBalance: totalBank,
        budgetRequested: pendingBudget.reduce((s, r) => s + (r['Nominal Pengajuan (Rp)'] || 0), 0),
        pendingApproval: pendingBudget.filter(r => r.Status !== 'Approved').length,
        budgetOutstanding: pendingBudget.reduce((s, r) => s + (r['Nominal Pengajuan (Rp)'] || 0), 0),
        payableOutstanding: dueSoon.reduce((s, r) => s + (r['Sisa Hutang (Rp)'] || 0), 0),
        omzetAchievement: avgOmzet,
        omzetReal: perf.reduce((s, p) => s + (p.cashIn || 0), 0),
        omzetTarget: perf.reduce((s, p) => s + ((p.cashIn || 0) / (p.omzetAchievement || 1)), 0),
        approvalRate: pendingBudget.length ? pendingBudget.filter(r => r.Status === 'Approved').length / pendingBudget.length : 0,
      },
      charts: {
        monthlyCashFlow,
        brandPerformance,
        bankBalance,
        budgetStatus,
        priority,
        outcomeByCategory,
        omzetByMonth,
        payableAging,
        budgetByCategory: outcomeByCategory,
      },
      tables: { pendingBudget, dueSoon },
    },
    auditLog: [],
  };
}

const DEMO_ROWS = {
  budget: [
    { ID: 1, Brand: 'HAN', Kategori: 'Operasional', Keterangan: 'Listrik', 'Nominal Pengajuan (Rp)': 2500000, Prioritas: 'High', Status: 'Diajukan', 'Tgl Pengajuan': '2026-07-01' },
    { ID: 2, Brand: 'LBP', Kategori: 'Marketing', Keterangan: 'Social media ads', 'Nominal Pengajuan (Rp)': 8000000, Prioritas: 'Medium', Status: 'Approved', 'Tgl Pengajuan': '2026-07-02' },
    { ID: 3, Brand: 'BSS', Kategori: 'Gaji dan Upah', Keterangan: 'Gaji staff', 'Nominal Pengajuan (Rp)': 15000000, Prioritas: 'High', Status: 'Approved', 'Tgl Pengajuan': '2026-07-03' },
  ],
  outcome: [
    { ID: 1, Brand: 'HAN', Kategori: 'Operasional', 'Nominal (Rp)': 1800000, 'Tgl': '2026-07-05', Vendor: 'PLN', Status: 'Lunas' },
    { ID: 2, Brand: 'LBP', Kategori: 'Marketing', 'Nominal (Rp)': 7500000, 'Tgl': '2026-07-08', Vendor: 'FB Ads', Status: 'DP' },
  ],
  income: [
    { ID: 1, Brand: 'NUSASEED', 'Nominal (Rp)': 25000000, 'Tgl': '2026-07-10', Sumber: 'Penjualan', Keterangan: 'Sales batch 1' },
  ],
};

export function demoRows(entity) {
  return DEMO_ROWS[entity] || [];
}

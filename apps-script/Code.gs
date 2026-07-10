/**
 * FINANCE JOYBOARD — Apps Script Backend (Updated)
 * ============================================================
 * Mempertahankan struktur existing: HEADERS, ENTITIES, session, import.
 * Menambahkan: Data Vendor, Data Pelanggan, dropdown ID vendor/customer.
 * 
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1GsLA3sUm-f3-nUcFesg0FM9OfugTHZNMS4HUHQdIgZw/edit
 */

const FINANCE_APP = {
  title: 'Finance Joyboard',
  subtitle: 'Dashboard operasional finance multi-company dan multi-brand',
  timezone: 'Asia/Jakarta',
  devAllowEmailOverride: false
};

let API_REQUEST_CONTEXT = { email: '' };

// ============================================================
// SHEET NAMES — Match actual Google Sheets structure
// ============================================================
const SHEETS = {
  users: 'DataBase',          // Users, Brands, Categories, Banks all in one sheet
  brands: 'DataBase',
  sources: 'Source_Workbooks',
  budget: 'Weekly_Budget_Requests',
  income: 'Income',
  forecast: 'Income_Forecast',
  outcome: 'Outcome',
  omzet: 'Omzet',
  bank: 'Bank_Balances',
  service: 'Service_Fees',
  payables: 'Payables',
  receivables: 'Receivables',
  audit: 'Audit_Log',
  settings: 'Settings',
  vendors: 'Data Vendor',      // NEW
  customers: 'Data Pelanggan'  // NEW
};

const BRAND_SEED = [
  ['CV HAN', 'HAN', 'HAN', true, ''],
  ['CV LBP', 'LBP', 'LBP', true, ''],
  ['CV LBP', 'PRP', 'PRP', true, ''],
  ['CV LBP', 'KHEEMA', 'KHEEMA', true, ''],
  ['CV LBP', 'PG', 'PG', true, ''],
  ['PT MBN', 'NUSASEED', 'NUSASEED', true, ''],
  ['PT MBN', 'BSS', 'BSS', true, ''],
  ['PT MBN', 'BSSM/RBLN', 'BSSM_RBLN', true, ''],
  ['PT MBN', 'BSJT', 'BSJT', true, ''],
  ['PT MBN', 'PT MBN', 'PT_MBN', true, '']
];

const DEFAULT_OPTIONS = {
  categories: ['Gaji dan Upah', 'Operasional', 'Marketing', 'Sewa', 'Aset', 'Hutang', 'Saving', 'Persediaan', 'Transfer Antar Bank', 'Jasa Konsultasi & Manajemen RUN'],
  banks: ['Bank Sentral', 'Bank BCA', 'Bank BRI', 'Bank BNI', 'Bank BSI', 'Bank Mandiri', 'Kas Kecil', 'Kas Ditangan', 'E-wallet'],
  priorities: ['High', 'Medium', 'Low'],
  budgetStatuses: ['Diajukan', 'Approved', 'Need Revision', 'Rejected', 'DP', 'Termin', 'Lunas'],
  paymentTypes: ['Belum Dibayar', 'DP', 'Termin', 'Lunas'],
  controls: ['OK', '⚠️ Terlambat Diajukan', '⚠️ Perlu Revisi']
};

// ============================================================
// HEADERS — Extended with Data Vendor & Data Pelanggan
// ============================================================
const HEADERS = {};
HEADERS[SHEETS.users] = ['ID', 'Email', 'Name', 'Role', 'Company Scope', 'Brand Scope', 'Active', 'Last Login'];
HEADERS[SHEETS.brands] = ['Company', 'Brand', 'Brand Key', 'Active', 'PIC Email'];
HEADERS[SHEETS.sources] = ['Company', 'Brand', 'Brand Key', 'Spreadsheet ID', 'Active', 'Last Imported At', 'Notes'];
HEADERS[SHEETS.budget] = [
  'ID', 'Company', 'Brand', 'Brand Key', 'No', 'Tgl Pengajuan', 'Tgl Dibutuhkan', 'Week',
  'Kategori', 'Keterangan', 'Vendor', 'ID Vendor', 'Nominal Pengajuan (Rp)', 'Nominal Dibayar (Rp)',
  'Sisa Hutang (Rp)', 'Jenis Bayar', 'Tgl Pembayaran Selanjutnya', 'Tgl Pelunasan',
  'Prioritas', 'Status', 'Kontrol Pengajuan', 'Dokumen URL', 'Form Feedback Finance',
  'Created By', 'Created At', 'Updated By', 'Updated At', 'Approved By', 'Approved At'
];
HEADERS[SHEETS.income] = ['ID', 'Company', 'Brand', 'Brand Key', 'Tanggal', 'Keterangan', 'Customer', 'ID Pelanggan', 'Nominal', 'Bank Masuk', 'Catatan', 'Created By', 'Created At', 'Updated By', 'Updated At'];
HEADERS[SHEETS.forecast] = ['ID', 'Company', 'Brand', 'Brand Key', 'Estimasi Cair', 'Marketplace', 'Nominal Estimasi', 'Catatan', 'Status', 'Created By', 'Created At', 'Updated By', 'Updated At'];
HEADERS[SHEETS.outcome] = ['ID', 'Company', 'Brand', 'Brand Key', 'Tanggal', 'Keterangan', 'Kategori', 'Jumlah (Rp)', 'Biaya (Rp)', 'Bank Keluar', 'Total Pengeluaran (Rp)', 'Catatan', 'Created By', 'Created At', 'Updated By', 'Updated At'];
HEADERS[SHEETS.omzet] = ['ID', 'Company', 'Brand', 'Brand Key', 'Tahun', 'Bulan', 'Target Omzet', 'Realisasi Omzet', 'Selisih', 'Capaian', 'Updated By', 'Updated At'];
HEADERS[SHEETS.bank] = ['ID', 'Company', 'Brand', 'Brand Key', 'Bank', 'Saldo Awal', 'Pemasukan', 'Pengeluaran', 'Total', 'Updated By', 'Updated At'];
HEADERS[SHEETS.service] = ['ID', 'Company', 'Brand', 'Brand Key', 'Tanggal', 'Keterangan', 'Vendor', 'Nominal', 'Status', 'Catatan', 'Created By', 'Created At', 'Updated By', 'Updated At'];
HEADERS[SHEETS.payables] = ['ID', 'Company', 'Brand', 'Brand Key', 'Nama Pemasok', 'ID Pemasok', 'Total Hutang', 'Total Dibayar', 'Sisa Hutang', 'Progress %', 'Status', 'Source', 'Updated By', 'Updated At'];
HEADERS[SHEETS.receivables] = ['ID', 'Company', 'Brand', 'Brand Key', 'Nama Pelanggan', 'ID Pelanggan', 'Total Piutang', 'Total Diterima', 'Sisa Piutang', 'Progress %', 'Status', 'Source', 'Updated By', 'Updated At'];
HEADERS[SHEETS.vendors] = ['ID Vendor', 'Nama Vendor', 'PIC', 'Telepon', 'Alamat', 'Keterangan', 'Created By', 'Created At', 'Updated By', 'Updated At'];
HEADERS[SHEETS.customers] = ['ID Pelanggan', 'Nama Pelanggan', 'PIC', 'Telepon', 'Alamat', 'Keterangan', 'Created By', 'Created At', 'Updated By', 'Updated At'];
HEADERS[SHEETS.audit] = ['Timestamp', 'User', 'Action', 'Entity', 'Record ID', 'Company', 'Brand', 'Detail JSON'];
HEADERS[SHEETS.settings] = ['Key', 'Value', 'Notes'];

// ============================================================
// ENTITIES — Extended
// ============================================================
const ENTITIES = {
  budget: { sheet: SHEETS.budget, label: 'Budget Request', dateField: 'Tgl Pengajuan', idPrefix: 'BUD', approveable: true },
  income: { sheet: SHEETS.income, label: 'Cash In Real', dateField: 'Tanggal', idPrefix: 'INC' },
  forecast: { sheet: SHEETS.forecast, label: 'Forecast Cash In', dateField: 'Estimasi Cair', idPrefix: 'FCI' },
  outcome: { sheet: SHEETS.outcome, label: 'Cash Out', dateField: 'Tanggal', idPrefix: 'OUT' },
  omzet: { sheet: SHEETS.omzet, label: 'Omzet', dateField: null, idPrefix: 'OMZ' },
  bank: { sheet: SHEETS.bank, label: 'Saldo Rekening', dateField: null, idPrefix: 'BNK' },
  service: { sheet: SHEETS.service, label: 'Biaya Layanan', dateField: 'Tanggal', idPrefix: 'SRV' },
  payables: { sheet: SHEETS.payables, label: 'Hutang', dateField: null, idPrefix: 'AP' },
  receivables: { sheet: SHEETS.receivables, label: 'Piutang', dateField: null, idPrefix: 'AR' },
  users: { sheet: SHEETS.users, label: 'Users', adminOnly: true, idPrefix: 'USR' },
  brands: { sheet: SHEETS.brands, label: 'Brands', adminOnly: true, noId: true },
  sources: { sheet: SHEETS.sources, label: 'Source Workbooks', adminOnly: true, noId: true },
  vendors: { sheet: SHEETS.vendors, label: 'Data Vendor', idPrefix: 'VEN' },
  customers: { sheet: SHEETS.customers, label: 'Data Pelanggan', idPrefix: 'CST' }
};

const DATE_FIELDS = ['Tgl Pengajuan', 'Tgl Dibutuhkan', 'Tgl Pembayaran Selanjutnya', 'Tgl Pelunasan', 'Tanggal', 'Estimasi Cair', 'Created At', 'Updated At', 'Approved At', 'Last Login', 'Last Imported At', 'Timestamp'];
const NUMERIC_FIELDS = ['No', 'Nominal Pengajuan (Rp)', 'Nominal Dibayar (Rp)', 'Sisa Hutang (Rp)', 'Nominal', 'Nominal Estimasi', 'Jumlah (Rp)', 'Biaya (Rp)', 'Total Pengeluaran (Rp)', 'Tahun', 'Target Omzet', 'Realisasi Omzet', 'Selisih', 'Capaian', 'Saldo Awal', 'Pemasukan', 'Pengeluaran', 'Total', 'Total Hutang', 'Total Dibayar', 'Sisa Hutang', 'Progress %', 'Total Piutang', 'Total Diterima', 'Sisa Piutang'];

// ============================================================
// ENTRY POINTS
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Finance Dashboard')
    .addItem('Setup database', 'setupFinanceDashboard')
    .addItem('Generate Vercel API token', 'generateVercelApiToken')
    .addItem('Import source workbooks', 'importFromSourceWorkbooks')
    .addToUi();
}

function doGet(e) {
  if (e && e.parameter && e.parameter.api === '1') {
    return jsonResponse_({ ok: true, app: FINANCE_APP.title, mode: 'api', configured: !!getConfiguredApiToken_() });
  }
  return HtmlService.createHtmlOutput('<h2>' + FINANCE_APP.title + ' API</h2><p>Gunakan POST request untuk mengakses API.</p>')
    .setTitle(FINANCE_APP.title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) { return handleApiRequest_(e); }

// ============================================================
// API HANDLER
// ============================================================
function handleApiRequest_(e) {
  let payload = {};
  try {
    payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    validateApiToken_(payload.token);
    API_REQUEST_CONTEXT = { email: normalizeEmail_(payload.userEmail || payload.email || '') };

    const action = payload.action;
    const args = Array.isArray(payload.args) ? payload.args : [];
    let result;

    if (action === 'health') result = getApiHealth_();
    else if (action === 'getAppState') result = getAppState(args[0] || {});
    else if (action === 'getDashboardData') result = getDashboardData(args[0] || {});
    else if (action === 'getRecords') result = getRecords(args[0], args[1] || {});
    else if (action === 'saveRecord') result = saveRecord(args[0], args[1] || {});
    else if (action === 'deleteRecord') result = deleteRecord(args[0], args[1]);
    else if (action === 'approveBudget') result = approveBudget(args[0], args[1], args[2], args[3]);
    else if (action === 'importFromSourceWorkbooks') result = importFromSourceWorkbooks();
    else throw new Error('Action API tidak dikenal: ' + action);

    return jsonResponse_({ ok: true, result: result });
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message || String(error) });
  } finally {
    API_REQUEST_CONTEXT = { email: '' };
  }
}

function getApiHealth_() {
  return { app: publicAppInfo_(), configured: !!getConfiguredApiToken_(), userEmail: API_REQUEST_CONTEXT.email || '', time: new Date() };
}

function validateApiToken_(token) {
  const expected = getConfiguredApiToken_();
  if (!expected) throw new Error('FINANCE_API_TOKEN belum dibuat. Jalankan generateVercelApiToken di Apps Script.');
  if (!token || token !== expected) throw new Error('Token API tidak valid.');
}

function getConfiguredApiToken_() {
  return PropertiesService.getScriptProperties().getProperty('FINANCE_API_TOKEN') || '';
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload, replacerForJson_)).setMimeType(ContentService.MimeType.JSON);
}

function replacerForJson_(key, value) {
  if (value instanceof Date) return Utilities.formatDate(value, FINANCE_APP.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
  return value;
}

function publicAppInfo_() {
  return { title: FINANCE_APP.title, subtitle: FINANCE_APP.subtitle };
}

// ============================================================
// SETUP
// ============================================================
function setupFinanceDashboard() {
  ensureBaseSheets_();
  const email = normalizeEmail_(Session.getEffectiveUser().getEmail());
  const users = readTable_(SHEETS.users);
  const currentUserExists = users.some(row => normalizeEmail_(row.Email) === email);
  if (email && (users.length === 0 || !currentUserExists)) {
    appendRecordBySheet_(SHEETS.users, { ID: makeId_('USR'), Email: email, Name: email.split('@')[0], Role: 'superadmin', 'Company Scope': '*', 'Brand Scope': '*', Active: true });
  }
  logAudit_('system', 'SETUP', 'system', '', '', '', { message: 'Database setup completed' });
  return { ok: true, message: 'Setup selesai.' };
}

function generateApiToken_() {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('FINANCE_API_TOKEN', token);
  upsertSetting_('FINANCE_API_TOKEN', token, 'Token rahasia untuk env Vercel. Jangan dibagikan.');
  logAudit_('system', 'TOKEN_GENERATED', 'api', '', '', '', { message: 'Finance API token generated' });
  return token;
}

function generateVercelApiToken() { return generateApiToken_(); }

function ensureBaseSheets_() {
  Object.keys(HEADERS).forEach(name => ensureSheet_(name, HEADERS[name]));
  seedBrands_();
  seedSources_();
  seedSettings_();
}

function ensureSheet_(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (!current.some(value => value !== '')) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setFontColor('#17202a').setBackground('#dff7f1');
    sheet.autoResizeColumns(1, headers.length);
  }
}

function seedBrands_() {
  if (readTable_(SHEETS.brands).length > 0) return;
  getSheet_(SHEETS.brands).getRange(2, 1, BRAND_SEED.length, BRAND_SEED[0].length).setValues(BRAND_SEED);
}

function seedSources_() {
  if (readTable_(SHEETS.sources).length > 0) return;
  const rows = BRAND_SEED.map(item => [item[0], item[1], item[2], '', true, '', 'Isi Spreadsheet ID setelah file XLSX dikonversi ke Google Sheets']);
  getSheet_(SHEETS.sources).getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function seedSettings_() {
  if (readTable_(SHEETS.settings).length > 0) return;
  getSheet_(SHEETS.settings).getRange(2, 1, 3, 3).setValues([
    ['App Title', FINANCE_APP.title, 'Judul dashboard'],
    ['Late Budget Lead Days', 7, 'Pengajuan dianggap terlambat bila kurang dari hari ini'],
    ['Currency', 'IDR', 'Format nilai rupiah']
  ]);
}

// ============================================================
// SESSION & PERMISSIONS
// ============================================================
function getSession_() {
  const requestEmail = API_REQUEST_CONTEXT && API_REQUEST_CONTEXT.email ? API_REQUEST_CONTEXT.email : '';
  const email = normalizeEmail_(requestEmail || Session.getActiveUser().getEmail());
  const users = readTable_(SHEETS.users);
  const user = users.find(row => normalizeEmail_(row.Email) === email && isTruthy_(row.Active));
  if (!email || !user) {
    return { authorized: false, email: email, name: email || 'Guest', role: 'guest', visibleBrandKeys: [], permissions: permissionsForRole_('guest') };
  }
  const role = String(user.Role || 'owner').toLowerCase();
  return {
    authorized: true, email: email, name: user.Name || email, role: role,
    companyScope: user['Company Scope'] || '', brandScope: user['Brand Scope'] || '',
    visibleBrandKeys: getVisibleBrandKeys_(user, role),
    permissions: permissionsForRole_(role)
  };
}

function permissionsForRole_(role) {
  return {
    canManageUsers: role === 'superadmin',
    canApprove: role === 'superadmin' || role === 'finance',
    canEditAllBrands: role === 'superadmin' || role === 'finance',
    canEditOwnBrand: role === 'pic_brand',
    readOnly: role === 'owner' || role === 'guest'
  };
}

function getVisibleBrandKeys_(user, role) {
  const all = readBrands_().map(brand => brand['Brand Key']);
  if (role === 'superadmin' || role === 'finance') return all;
  const raw = String(user['Brand Scope'] || '').trim();
  if (!raw || raw === '*') return role === 'owner' ? all : [];
  return raw.split(',').map(item => item.trim()).filter(Boolean);
}

function readBrands_() { return readTable_(SHEETS.brands).filter(row => isTruthy_(row.Active)); }

function getVisibleBrands_(session) {
  const keys = {}; session.visibleBrandKeys.forEach(key => keys[key] = true);
  return readBrands_().filter(brand => keys[brand['Brand Key']]);
}

// ============================================================
// OPTIONS BUILDER — Extended with vendor/customer lists
// ============================================================
function buildOptions_() {
  const rows = {
    budget: readTable_(SHEETS.budget), income: readTable_(SHEETS.income),
    outcome: readTable_(SHEETS.outcome), bank: readTable_(SHEETS.bank),
    forecast: readTable_(SHEETS.forecast)
  };
  let vendorList = [], customerList = [];
  try { vendorList = readTable_(SHEETS.vendors); } catch(e) {}
  try { customerList = readTable_(SHEETS.customers); } catch(e) {}

  return {
    companies: uniqueSorted_(readBrands_().map(row => row.Company)),
    brands: readBrands_(),
    categories: uniqueSorted_(DEFAULT_OPTIONS.categories.concat(rows.budget.map(row => row.Kategori), rows.outcome.map(row => row.Kategori))),
    banks: uniqueSorted_(DEFAULT_OPTIONS.banks.concat(rows.income.map(row => row['Bank Masuk']), rows.outcome.map(row => row['Bank Keluar']), rows.bank.map(row => row.Bank))),
    priorities: DEFAULT_OPTIONS.priorities,
    budgetStatuses: DEFAULT_OPTIONS.budgetStatuses,
    paymentTypes: DEFAULT_OPTIONS.paymentTypes,
    controls: DEFAULT_OPTIONS.controls,
    months: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
    roles: ['superadmin', 'finance', 'owner', 'pic_brand'],
    vendorList: vendorList,
    customerList: customerList
  };
}

function buildClientEntities_(session) {
  const result = {};
  Object.keys(ENTITIES).forEach(name => {
    if (ENTITIES[name].adminOnly && !session.permissions.canManageUsers) return;
    result[name] = { label: ENTITIES[name].label, headers: HEADERS[ENTITIES[name].sheet], canEdit: canEditEntity_(name, session), canApprove: name === 'budget' && session.permissions.canApprove };
  });
  return result;
}

function canEditEntity_(entityName, session) {
  const entity = getEntity_(entityName);
  if (session.permissions.readOnly) return false;
  if (entity.adminOnly) return session.permissions.canManageUsers;
  return session.permissions.canEditAllBrands || session.permissions.canEditOwnBrand;
}

function requireEntityAccess_(entityName, session, mode) {
  const entity = getEntity_(entityName);
  if (mode === 'read') {
    if (entity.adminOnly && !session.permissions.canManageUsers) throw new Error('Akses admin dibutuhkan.');
    return;
  }
  if (!canEditEntity_(entityName, session)) throw new Error('Role Anda tidak punya akses edit untuk area ini.');
}

function assertBrandReadAccess_(record, session) {
  if (session.permissions.canEditAllBrands || session.role === 'owner') {
    if (session.visibleBrandKeys.indexOf(record['Brand Key']) === -1) throw new Error('Brand di luar scope akses Anda.');
    return;
  }
  if (session.visibleBrandKeys.indexOf(record['Brand Key']) === -1) throw new Error('Brand di luar scope akses Anda.');
}

function assertBrandWriteAccess_(record, session) {
  if (record['Brand Key']) assertBrandReadAccess_(record, session);
  if (session.permissions.readOnly) throw new Error('Role ini hanya bisa melihat data.');
  if (session.permissions.canEditAllBrands) return;
  if (session.permissions.canEditOwnBrand && session.visibleBrandKeys.indexOf(record['Brand Key']) !== -1) return;
  throw new Error('Anda hanya bisa mengubah data brand yang menjadi scope Anda.');
}

// ============================================================
// APP STATE & DASHBOARD
// ============================================================
function getAppState(filters) {
  ensureBaseSheets_();
  const session = getSession_();
  if (!session.authorized) {
    return { authorized: false, app: publicAppInfo_(), session: session, message: 'Email Anda belum terdaftar.' };
  }
  touchLastLogin_(session.email);
  return {
    authorized: true, app: publicAppInfo_(), session: session,
    brands: getVisibleBrands_(session), allBrands: readBrands_(),
    options: buildOptions_(), entities: buildClientEntities_(session),
    dashboard: getDashboardData(filters || {})
  };
}

function getDashboardData(filters) {
  ensureBaseSheets_();
  const session = getSession_();
  requireAuthorized_(session);

  const scope = normalizeFilters_(filters || {}, session);
  const budget = filterRows_(readTable_(SHEETS.budget), ENTITIES.budget, scope, session);
  const income = filterRows_(readTable_(SHEETS.income), ENTITIES.income, scope, session);
  const forecast = filterRows_(readTable_(SHEETS.forecast), ENTITIES.forecast, scope, session);
  const outcome = filterRows_(readTable_(SHEETS.outcome), ENTITIES.outcome, scope, session);
  const omzet = filterRows_(readTable_(SHEETS.omzet), ENTITIES.omzet, scope, session);
  const bank = filterRows_(readTable_(SHEETS.bank), ENTITIES.bank, scope, session);
  const service = filterRows_(readTable_(SHEETS.service), ENTITIES.service, scope, session);
  const payables = filterRows_(readTable_(SHEETS.payables), ENTITIES.payables, scope, session);
  const receivables = filterRows_(readTable_(SHEETS.receivables), ENTITIES.receivables, scope, session);

  const cashIn = sum_(income, 'Nominal');
  const forecastIn = sum_(forecast, 'Nominal Estimasi');
  const cashOut = sum_(outcome, 'Total Pengeluaran (Rp)');
  const serviceFees = sum_(service, 'Nominal');
  const budgetRequested = sum_(budget, 'Nominal Pengajuan (Rp)');
  const budgetPaid = sum_(budget, 'Nominal Dibayar (Rp)');
  const budgetOutstanding = sum_(budget, 'Sisa Hutang (Rp)');
  const bankBalance = sum_(bank, 'Total');
  const omzetTarget = sum_(omzet, 'Target Omzet');
  const omzetReal = sum_(omzet, 'Realisasi Omzet');
  const payableOutstanding = budgetOutstanding + sum_(payables, 'Sisa Hutang');
  const receivableOutstanding = forecastIn + sum_(receivables, 'Sisa Piutang');
  const pendingBudget = budget.filter(row => isPendingBudget_(row));
  const approvedBudget = budget.filter(row => isApprovedBudget_(row));

  return {
    generatedAt: new Date(), filters: scope,
    summary: {
      cashIn, forecastIn, cashOut, netCash: cashIn - cashOut, serviceFees,
      budgetRequested, budgetPaid, budgetOutstanding, bankBalance,
      omzetTarget, omzetReal, omzetAchievement: omzetTarget ? omzetReal / omzetTarget : 0,
      payableOutstanding, receivableOutstanding, pendingApproval: pendingBudget.length,
      approvalRate: budget.length ? approvedBudget.length / budget.length : 0
    },
    charts: {
      monthlyCashFlow: buildMonthlyCashFlow_(income, outcome, forecast),
      budgetByCategory: groupSum_(budget, 'Kategori', 'Nominal Pengajuan (Rp)', 9),
      outcomeByCategory: groupSum_(outcome, 'Kategori', 'Total Pengeluaran (Rp)', 9),
      budgetStatus: groupCount_(budget, 'Status'),
      priority: groupCount_(budget, 'Prioritas'),
      brandPerformance: buildBrandPerformance_(income, outcome, budget, omzet),
      bankBalance: groupSum_(bank, 'Bank', 'Total', 12),
      omzetByMonth: buildOmzetByMonth_(omzet),
      payableAging: buildPayableAging_(budget)
    },
    tables: {
      pendingBudget: serializeRows_(pendingBudget.slice(0, 12)),
      dueSoon: serializeRows_(buildDueSoon_(budget).slice(0, 12)),
      recentIncome: serializeRows_(sortByDateDesc_(income, 'Tanggal').slice(0, 8)),
      recentOutcome: serializeRows_(sortByDateDesc_(outcome, 'Tanggal').slice(0, 8)),
      bank: serializeRows_(bank.slice(0, 20))
    }
  };
}

// ============================================================
// GET / SAVE / DELETE RECORDS
// ============================================================
function getRecords(entityName, filters) {
  ensureBaseSheets_();
  const session = getSession_();
  requireAuthorized_(session);
  const entity = getEntity_(entityName);
  requireEntityAccess_(entityName, session, 'read');

  const scope = normalizeFilters_(filters || {}, session);
  const rows = entity.sheet === SHEETS.vendors || entity.sheet === SHEETS.customers
    ? readTable_(entity.sheet)  // No brand scope for vendor/customer
    : filterRows_(readTable_(entity.sheet), entity, scope, session);
  return { entity: entityName, rows: serializeRows_(rows.slice(0, 500)), canEdit: canEditEntity_(entityName, session), canApprove: !!session.permissions.canApprove };
}

function saveRecord(entityName, payload) {
  ensureBaseSheets_();
  const session = getSession_();
  requireAuthorized_(session);
  const entity = getEntity_(entityName);
  requireEntityAccess_(entityName, session, 'write');

  const record = normalizeRecordForSave_(entityName, payload || {}, session);
  if (entity.sheet !== SHEETS.vendors && entity.sheet !== SHEETS.customers) {
    assertBrandWriteAccess_(record, session);
  }
  const saved = upsertRecord_(entity.sheet, record, entity);
  logAudit_(session.email, saved.created ? 'CREATE' : 'UPDATE', entityName, saved.record.ID || '', saved.record.Company || '', saved.record.Brand || '', saved.record);
  return { ok: true, record: serializeRecord_(saved.record), created: saved.created };
}

function deleteRecord(entityName, id) {
  ensureBaseSheets_();
  const session = getSession_();
  requireAuthorized_(session);
  const entity = getEntity_(entityName);
  requireEntityAccess_(entityName, session, 'delete');
  if (entity.noId) throw new Error('Entity ini tidak memakai ID untuk hapus lewat dashboard.');

  const found = findRowById_(entity.sheet, id);
  if (!found) throw new Error('Data tidak ditemukan.');
  if (entity.sheet !== SHEETS.vendors && entity.sheet !== SHEETS.customers) {
    assertBrandWriteAccess_(found.record, session);
  }

  getSheet_(entity.sheet).deleteRow(found.rowNumber);
  logAudit_(session.email, 'DELETE', entityName, id, found.record.Company || '', found.record.Brand || '', found.record);
  return { ok: true };
}

function approveBudget(id, status, paidAmount, feedback) {
  ensureBaseSheets_();
  const session = getSession_();
  requireAuthorized_(session);
  if (!session.permissions.canApprove) throw new Error('Role Anda tidak punya akses approval.');

  const found = findRowById_(SHEETS.budget, id);
  if (!found) throw new Error('Budget request tidak ditemukan.');
  assertBrandReadAccess_(found.record, session);

  const record = found.record;
  record.Status = status || 'Approved';
  if (paidAmount !== undefined && paidAmount !== null && paidAmount !== '') record['Nominal Dibayar (Rp)'] = asNumber_(paidAmount);
  record['Sisa Hutang (Rp)'] = Math.max(0, asNumber_(record['Nominal Pengajuan (Rp)']) - asNumber_(record['Nominal Dibayar (Rp)']));
  record['Jenis Bayar'] = record['Sisa Hutang (Rp)'] <= 0 ? 'Lunas' : (record['Nominal Dibayar (Rp)'] > 0 ? 'Termin' : 'Belum Dibayar');
  record['Form Feedback Finance'] = feedback || record['Form Feedback Finance'] || '';
  record['Approved By'] = session.email;
  record['Approved At'] = new Date();
  record['Updated By'] = session.email;
  record['Updated At'] = new Date();
  upsertRecord_(SHEETS.budget, record, ENTITIES.budget);
  logAudit_(session.email, 'APPROVE', 'budget', id, record.Company || '', record.Brand || '', { status: record.Status, paidAmount: record['Nominal Dibayar (Rp)'] });
  return { ok: true, record: serializeRecord_(record) };
}

function importFromSourceWorkbooks() {
  ensureBaseSheets_();
  const session = getSession_();
  requireAuthorized_(session);
  if (!session.permissions.canManageUsers && !session.permissions.canApprove) throw new Error('Import hanya untuk superadmin atau finance.');

  const sources = readTable_(SHEETS.sources).filter(row => isTruthy_(row.Active) && String(row['Spreadsheet ID'] || '').trim());
  const results = [];
  sources.forEach(source => {
    assertBrandReadAccess_(source, session);
    const count = importSingleSource_(source, session);
    source['Last Imported At'] = new Date();
    upsertSourceRow_(source);
    results.push({ company: source.Company, brand: source.Brand, imported: count });
  });
  logAudit_(session.email, 'IMPORT', 'sources', '', '', '', results);
  return { ok: true, results: results };
}

// ============================================================
// FILTERS
// ============================================================
function normalizeFilters_(filters, session) {
  const visible = session.visibleBrandKeys || [];
  let brandKey = filters.brandKey || filters.brand || '';
  if (brandKey && visible.indexOf(brandKey) === -1) brandKey = '';
  return { company: filters.company || '', brandKey: brandKey, startDate: filters.startDate || '', endDate: filters.endDate || '', year: filters.year || '', visibleBrandKeys: visible };
}

function filterRows_(rows, entity, filters, session) {
  return rows.filter(row => {
    const brandKey = row['Brand Key'] || '';
    if (brandKey && filters.visibleBrandKeys.indexOf(brandKey) === -1) return false;
    if (filters.company && row.Company !== filters.company) return false;
    if (filters.brandKey && brandKey !== filters.brandKey) return false;
    if (filters.year && entity.sheet === SHEETS.omzet && String(row.Tahun || '') !== String(filters.year)) return false;
    if (entity.dateField && (filters.startDate || filters.endDate)) {
      const value = asDate_(row[entity.dateField]);
      if (!value) return false;
      if (filters.startDate && value < asDate_(filters.startDate)) return false;
      if (filters.endDate) { const end = asDate_(filters.endDate); end.setHours(23, 59, 59, 999); if (value > end) return false; }
    }
    return true;
  });
}

// ============================================================
// RECORD NORMALIZATION
// ============================================================
function normalizeRecordForSave_(entityName, payload, session) {
  const entity = getEntity_(entityName);
  const headers = HEADERS[entity.sheet];
  const record = {};
  headers.forEach(header => { record[header] = payload[header] !== undefined ? payload[header] : ''; });

  if (!entity.noId && !record.ID) record.ID = makeId_(entity.idPrefix);
  if (!entity.adminOnly && entity.sheet !== SHEETS.vendors && entity.sheet !== SHEETS.customers) hydrateBrandFields_(record, session);
  coerceRecordTypes_(record);
  applyDerivedFields_(entityName, record);

  const now = new Date();
  if (headers.indexOf('Created By') !== -1 && !record['Created By']) record['Created By'] = session.email;
  if (headers.indexOf('Created At') !== -1 && !record['Created At']) record['Created At'] = now;
  if (headers.indexOf('Updated By') !== -1) record['Updated By'] = session.email;
  if (headers.indexOf('Updated At') !== -1) record['Updated At'] = now;
  return record;
}

function hydrateBrandFields_(record, session) {
  const brands = readBrands_();
  if (!record['Brand Key'] && session.visibleBrandKeys.length === 1) record['Brand Key'] = session.visibleBrandKeys[0];
  const brand = brands.find(item => item['Brand Key'] === record['Brand Key']) || brands.find(item => item.Brand === record.Brand);
  if (brand) { record.Company = brand.Company; record.Brand = brand.Brand; record['Brand Key'] = brand['Brand Key']; }
}

function coerceRecordTypes_(record) {
  Object.keys(record).forEach(key => {
    if (DATE_FIELDS.indexOf(key) !== -1) record[key] = asDate_(record[key]) || '';
    if (NUMERIC_FIELDS.indexOf(key) !== -1) record[key] = asNumberOrBlank_(record[key]);
  });
}

function applyDerivedFields_(entityName, record) {
  if (entityName === 'budget') {
    record['Nominal Dibayar (Rp)'] = asNumber_(record['Nominal Dibayar (Rp)']);
    record['Nominal Pengajuan (Rp)'] = asNumber_(record['Nominal Pengajuan (Rp)']);
    record['Sisa Hutang (Rp)'] = Math.max(0, record['Nominal Pengajuan (Rp)'] - record['Nominal Dibayar (Rp)']);
    if (!record['Jenis Bayar']) record['Jenis Bayar'] = record['Sisa Hutang (Rp)'] <= 0 ? 'Lunas' : 'Belum Dibayar';
    if (!record.Week) record.Week = weekLabel_(record['Tgl Dibutuhkan'] || record['Tgl Pengajuan']);
    record['Kontrol Pengajuan'] = budgetControl_(record['Tgl Pengajuan'], record['Tgl Dibutuhkan']);
    if (!record.Status) record.Status = 'Diajukan';
  }
  if (entityName === 'outcome') {
    record['Jumlah (Rp)'] = asNumber_(record['Jumlah (Rp)']); record['Biaya (Rp)'] = asNumber_(record['Biaya (Rp)']);
    record['Total Pengeluaran (Rp)'] = record['Jumlah (Rp)'] + record['Biaya (Rp)'];
  }
  if (entityName === 'omzet') {
    record['Target Omzet'] = asNumber_(record['Target Omzet']); record['Realisasi Omzet'] = asNumber_(record['Realisasi Omzet']);
    record.Selisih = record['Realisasi Omzet'] - record['Target Omzet']; record.Capaian = record['Target Omzet'] ? record['Realisasi Omzet'] / record['Target Omzet'] : 0;
  }
  if (entityName === 'bank') {
    record['Saldo Awal'] = asNumber_(record['Saldo Awal']); record.Pemasukan = asNumber_(record.Pemasukan);
    record.Pengeluaran = asNumber_(record.Pengeluaran); record.Total = record['Saldo Awal'] + record.Pemasukan - record.Pengeluaran;
  }
  if (entityName === 'payables') {
    record['Sisa Hutang'] = Math.max(0, asNumber_(record['Total Hutang']) - asNumber_(record['Total Dibayar']));
    record['Progress %'] = asNumber_(record['Total Hutang']) ? asNumber_(record['Total Dibayar']) / asNumber_(record['Total Hutang']) : 0;
  }
  if (entityName === 'receivables') {
    record['Sisa Piutang'] = Math.max(0, asNumber_(record['Total Piutang']) - asNumber_(record['Total Diterima']));
    record['Progress %'] = asNumber_(record['Total Piutang']) ? asNumber_(record['Total Diterima']) / asNumber_(record['Total Piutang']) : 0;
  }
}

// ============================================================
// CRUD HELPERS — same as existing
// ============================================================
function upsertRecord_(sheetName, record, entity) {
  if (entity && entity.noId) {
    const keyFields = sheetName === SHEETS.brands || sheetName === SHEETS.sources ? ['Brand Key'] : [];
    const foundByKey = findRowByKeyFields_(sheetName, record, keyFields);
    if (foundByKey) { writeRecordToRow_(sheetName, foundByKey.rowNumber, record); return { created: false, record: record }; }
    return appendRecordBySheet_(sheetName, record);
  }
  const found = record.ID ? findRowById_(sheetName, record.ID) : null;
  if (found) { writeRecordToRow_(sheetName, found.rowNumber, record); return { created: false, record: record }; }
  appendRecordBySheet_(sheetName, record);
  return { created: true, record: record };
}

function appendRecordBySheet_(sheetName, record) {
  const headers = HEADERS[sheetName];
  const row = headers.map(header => record[header] !== undefined ? record[header] : '');
  getSheet_(sheetName).appendRow(row);
  return { created: true, record: record };
}

function writeRecordToRow_(sheetName, rowNumber, record) {
  const headers = HEADERS[sheetName];
  const row = headers.map(header => record[header] !== undefined ? record[header] : '');
  getSheet_(sheetName).getRange(rowNumber, 1, 1, headers.length).setValues([row]);
}

function findRowById_(sheetName, id) {
  const rows = readTable_(sheetName);
  const record = rows.find(row => String(row.ID || '') === String(id || ''));
  return record ? { rowNumber: record._rowNumber, record: record } : null;
}

function findRowByKeyFields_(sheetName, record, fields) {
  if (!fields || fields.length === 0) return null;
  const rows = readTable_(sheetName);
  const found = rows.find(row => fields.every(field => String(row[field] || '') === String(record[field] || '')));
  return found ? { rowNumber: found._rowNumber, record: found } : null;
}

function readTable_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0].map(String);
  return values.slice(1).map((row, index) => {
    const record = { _rowNumber: index + 2 };
    headers.forEach((header, col) => record[header] = row[col]);
    return record;
  }).filter(record => Object.keys(record).some(key => key !== '_rowNumber' && record[key] !== '' && record[key] !== null));
}

function getSheet_(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet "' + sheetName + '" tidak ditemukan.');
  return sheet;
}

function getEntity_(entityName) {
  const entity = ENTITIES[entityName];
  if (!entity) throw new Error('Entity tidak dikenal: ' + entityName);
  return entity;
}

// ============================================================
// IMPORT FUNCTIONS — same as existing
// ============================================================
function importSingleSource_(source, session) {
  const sourceBook = SpreadsheetApp.openById(String(source['Spreadsheet ID']).trim());
  const context = { company: source.Company, brand: source.Brand, brandKey: source['Brand Key'], user: session.email };
  let count = 0;
  count += importBudget_(sourceBook, context);
  count += importIncome_(sourceBook, context);
  count += importForecast_(sourceBook, context);
  count += importOutcome_(sourceBook, context);
  count += importOmzet_(sourceBook, context);
  count += importBank_(sourceBook, context);
  count += importService_(sourceBook, context);
  count += importPayables_(sourceBook, context);
  count += importReceivables_(sourceBook, context);
  return count;
}

function importBudget_(book, context) {
  const rows = readSourceRows_(book, 'Weekly Budget Req', 'A2:S120');
  let count = 0;
  rows.forEach((row, index) => {
    if (!hasAny_(row, [1, 2, 4, 5, 6, 7, 8, 13, 14])) return;
    const record = {
      ID: stableImportId_('BUD', context.brandKey, index + 1), Company: context.company, Brand: context.brand, 'Brand Key': context.brandKey,
      No: row[0], 'Tgl Pengajuan': row[1], 'Tgl Dibutuhkan': row[2], Week: row[3], Kategori: row[4], Keterangan: row[5],
      Vendor: row[6], 'ID Vendor': row[7] || '', 'Nominal Pengajuan (Rp)': row[8], 'Nominal Dibayar (Rp)': row[9],
      'Sisa Hutang (Rp)': row[10], 'Jenis Bayar': row[11], 'Tgl Pembayaran Selanjutnya': row[12], 'Tgl Pelunasan': row[13],
      Prioritas: row[14], Status: row[15], 'Kontrol Pengajuan': row[16], 'Dokumen URL': row[17], 'Form Feedback Finance': row[18],
      'Created By': 'source import', 'Created At': new Date(), 'Updated By': context.user, 'Updated At': new Date()
    };
    coerceRecordTypes_(record); applyDerivedFields_('budget', record); upsertRecord_(SHEETS.budget, record, ENTITIES.budget);
    count++;
  });
  return count;
}

function importIncome_(book, context) {
  const rows = readSourceRows_(book, 'Income', 'B8:G160'); let count = 0;
  rows.forEach((row, index) => {
    if (!hasAny_(row, [0, 1, 2, 3, 4])) return;
    const record = { ID: stableImportId_('INC', context.brandKey, index + 1), Company: context.company, Brand: context.brand, 'Brand Key': context.brandKey, Tanggal: row[0], Keterangan: row[1], Customer: row[2], 'ID Pelanggan': row[3] || '', Nominal: row[4], 'Bank Masuk': row[5], Catatan: '', 'Created By': 'source import', 'Created At': new Date(), 'Updated By': context.user, 'Updated At': new Date() };
    coerceRecordTypes_(record); upsertRecord_(SHEETS.income, record, ENTITIES.income); count++;
  });
  return count;
}

function importForecast_(book, context) {
  const rows = readSourceRows_(book, 'Income', 'H8:K160'); let count = 0;
  rows.forEach((row, index) => {
    if (!hasAny_(row, [0, 1, 2, 3])) return;
    const record = { ID: stableImportId_('FCI', context.brandKey, index + 1), Company: context.company, Brand: context.brand, 'Brand Key': context.brandKey, 'Estimasi Cair': row[0], Marketplace: row[1], 'Nominal Estimasi': row[2], Catatan: row[3], Status: 'Open', 'Created By': 'source import', 'Created At': new Date(), 'Updated By': context.user, 'Updated At': new Date() };
    coerceRecordTypes_(record); upsertRecord_(SHEETS.forecast, record, ENTITIES.forecast); count++;
  });
  return count;
}

function importOutcome_(book, context) {
  const rows = readSourceRows_(book, 'Outcome', 'B7:I180'); let count = 0;
  rows.forEach((row, index) => {
    if (!hasAny_(row, [0, 1, 2, 3, 4, 5, 6])) return;
    const record = { ID: stableImportId_('OUT', context.brandKey, index + 1), Company: context.company, Brand: context.brand, 'Brand Key': context.brandKey, Tanggal: row[0], Keterangan: row[1], Kategori: row[2], 'Jumlah (Rp)': row[3], 'Biaya (Rp)': row[4], 'Bank Keluar': row[5], 'Total Pengeluaran (Rp)': row[6], Catatan: row[7], 'Created By': 'source import', 'Created At': new Date(), 'Updated By': context.user, 'Updated At': new Date() };
    coerceRecordTypes_(record); applyDerivedFields_('outcome', record); upsertRecord_(SHEETS.outcome, record, ENTITIES.outcome); count++;
  });
  return count;
}

function importOmzet_(book, context) {
  const sheet = book.getSheetByName('Omzet'); if (!sheet) return 0;
  const year = sheet.getRange('C5').getValue() || new Date().getFullYear();
  const rows = sheet.getRange('B8:F19').getValues(); let count = 0;
  rows.forEach((row, index) => {
    if (!row[0]) return;
    const record = { ID: stableImportId_('OMZ', context.brandKey, index + 1), Company: context.company, Brand: context.brand, 'Brand Key': context.brandKey, Tahun: year, Bulan: row[0], 'Target Omzet': row[1], 'Realisasi Omzet': row[2], Selisih: row[3], Capaian: row[4], 'Updated By': context.user, 'Updated At': new Date() };
    coerceRecordTypes_(record); applyDerivedFields_('omzet', record); upsertRecord_(SHEETS.omzet, record, ENTITIES.omzet); count++;
  });
  return count;
}

function importBank_(book, context) {
  const rows = readSourceRows_(book, 'Saldo Rekening', 'A8:E30'); let count = 0;
  rows.forEach((row, index) => {
    if (!row[0]) return;
    const record = { ID: stableImportId_('BNK', context.brandKey, index + 1), Company: context.company, Brand: context.brand, 'Brand Key': context.brandKey, Bank: row[0], 'Saldo Awal': row[1], Pemasukan: row[2], Pengeluaran: row[3], Total: row[4], 'Updated By': context.user, 'Updated At': new Date() };
    coerceRecordTypes_(record); applyDerivedFields_('bank', record); upsertRecord_(SHEETS.bank, record, ENTITIES.bank); count++;
  });
  return count;
}

function importService_(book, context) {
  const rows = readSourceRows_(book, 'Biaya Layanan', 'G7:J160'); let count = 0;
  rows.forEach((row, index) => {
    if (!hasAny_(row, [0, 1, 2, 3])) return;
    const record = { ID: stableImportId_('SRV', context.brandKey, index + 1), Company: context.company, Brand: context.brand, 'Brand Key': context.brandKey, Tanggal: row[0], Keterangan: row[1], Vendor: row[2], Nominal: row[3], Status: 'Open', Catatan: '', 'Created By': 'source import', 'Created At': new Date(), 'Updated By': context.user, 'Updated At': new Date() };
    coerceRecordTypes_(record); upsertRecord_(SHEETS.service, record, ENTITIES.service); count++;
  });
  return count;
}

function importPayables_(book, context) {
  const rows = readSourceRows_(book, 'Hutang', 'B7:I120'); let count = 0;
  rows.forEach((row, index) => {
    if (containsError_(row) || !hasAny_(row, [1, 2, 3, 4])) return;
    const record = { ID: stableImportId_('AP', context.brandKey, index + 1), Company: context.company, Brand: context.brand, 'Brand Key': context.brandKey, 'Nama Pemasok': row[1], 'ID Pemasok': row[2] || '', 'Total Hutang': row[3], 'Total Dibayar': row[4], 'Sisa Hutang': row[5], 'Progress %': row[6], Status: row[7], Source: 'Hutang source workbook', 'Updated By': context.user, 'Updated At': new Date() };
    coerceRecordTypes_(record); applyDerivedFields_('payables', record); upsertRecord_(SHEETS.payables, record, ENTITIES.payables); count++;
  });
  return count;
}

function importReceivables_(book, context) {
  const rows = readSourceRows_(book, 'Piutang', 'B7:I120'); let count = 0;
  rows.forEach((row, index) => {
    if (containsError_(row) || !hasAny_(row, [1, 2, 3, 4])) return;
    const record = { ID: stableImportId_('AR', context.brandKey, index + 1), Company: context.company, Brand: context.brand, 'Brand Key': context.brandKey, 'Nama Pelanggan': row[1], 'ID Pelanggan': row[2] || '', 'Total Piutang': row[3], 'Total Diterima': row[4], 'Sisa Piutang': row[5], 'Progress %': row[6], Status: row[7], Source: 'Piutang source workbook', 'Updated By': context.user, 'Updated At': new Date() };
    coerceRecordTypes_(record); applyDerivedFields_('receivables', record); upsertRecord_(SHEETS.receivables, record, ENTITIES.receivables); count++;
  });
  return count;
}

function readSourceRows_(book, sheetName, a1) {
  const sheet = book.getSheetByName(sheetName);
  if (!sheet) return [];
  return sheet.getRange(a1).getValues();
}

function upsertSourceRow_(record) {
  const rows = readTable_(SHEETS.sources);
  const found = rows.find(row => row['Brand Key'] === record['Brand Key']);
  if (found) writeRecordToRow_(SHEETS.sources, found._rowNumber, record);
}

// ============================================================
// CHART BUILDERS — same as existing
// ============================================================
function buildMonthlyCashFlow_(income, outcome, forecast) {
  const map = {};
  income.forEach(row => addMonthly_(map, row.Tanggal, 'cashIn', asNumber_(row.Nominal)));
  outcome.forEach(row => addMonthly_(map, row.Tanggal, 'cashOut', asNumber_(row['Total Pengeluaran (Rp)'])));
  forecast.forEach(row => addMonthly_(map, row['Estimasi Cair'], 'forecastIn', asNumber_(row['Nominal Estimasi'])));
  return Object.keys(map).sort().map(key => { const item = map[key]; item.netCash = item.cashIn - item.cashOut; return item; });
}

function addMonthly_(map, dateValue, field, amount) {
  const date = asDate_(dateValue); if (!date) return;
  const key = Utilities.formatDate(date, FINANCE_APP.timezone, 'yyyy-MM');
  if (!map[key]) map[key] = { label: key, cashIn: 0, cashOut: 0, forecastIn: 0, netCash: 0 };
  map[key][field] += amount;
}

function buildBrandPerformance_(income, outcome, budget, omzet) {
  const brands = {};
  getVisibleBrandRecords_(income.concat(outcome, budget, omzet)).forEach(row => {
    const key = row['Brand Key'];
    if (!brands[key]) brands[key] = { label: row.Brand || key, company: row.Company || '', cashIn: 0, cashOut: 0, budget: 0, omzetTarget: 0, omzetReal: 0, pending: 0 };
  });
  income.forEach(row => brands[row['Brand Key']] && (brands[row['Brand Key']].cashIn += asNumber_(row.Nominal)));
  outcome.forEach(row => brands[row['Brand Key']] && (brands[row['Brand Key']].cashOut += asNumber_(row['Total Pengeluaran (Rp)'])));
  budget.forEach(row => { if (!brands[row['Brand Key']]) return; brands[row['Brand Key']].budget += asNumber_(row['Nominal Pengajuan (Rp)']); if (isPendingBudget_(row)) brands[row['Brand Key']].pending += 1; });
  omzet.forEach(row => { if (!brands[row['Brand Key']]) return; brands[row['Brand Key']].omzetTarget += asNumber_(row['Target Omzet']); brands[row['Brand Key']].omzetReal += asNumber_(row['Realisasi Omzet']); });
  return Object.keys(brands).map(key => { const item = brands[key]; item.netCash = item.cashIn - item.cashOut; item.omzetAchievement = item.omzetTarget ? item.omzetReal / item.omzetTarget : 0; return item; }).sort((a, b) => b.cashIn - a.cashIn);
}

function getVisibleBrandRecords_(rows) {
  const seen = {}; const result = [];
  rows.forEach(row => { const key = row['Brand Key']; if (!key || seen[key]) return; seen[key] = true; result.push(row); });
  return result;
}

function buildOmzetByMonth_(rows) {
  const map = {};
  rows.forEach(row => {
    const label = row.Bulan || 'Tanpa bulan';
    if (!map[label]) map[label] = { label: label, target: 0, real: 0, achievement: 0 };
    map[label].target += asNumber_(row['Target Omzet']); map[label].real += asNumber_(row['Realisasi Omzet']);
  });
  const order = buildOptions_().months;
  return Object.keys(map).sort((a, b) => order.indexOf(a) - order.indexOf(b)).map(key => { map[key].achievement = map[key].target ? map[key].real / map[key].target : 0; return map[key]; });
}

function buildPayableAging_(budget) {
  const buckets = { 'Lewat tempo': 0, '0-7 hari': 0, '8-14 hari': 0, '15+ hari': 0, 'Tanpa tanggal': 0 };
  const today = startOfDay_(new Date());
  budget.forEach(row => {
    const outstanding = asNumber_(row['Sisa Hutang (Rp)']); if (outstanding <= 0) return;
    const due = asDate_(row['Tgl Pembayaran Selanjutnya'] || row['Tgl Dibutuhkan']);
    if (!due) { buckets['Tanpa tanggal'] += outstanding; return; }
    const days = Math.floor((startOfDay_(due) - today) / 86400000);
    if (days < 0) buckets['Lewat tempo'] += outstanding;
    else if (days <= 7) buckets['0-7 hari'] += outstanding;
    else if (days <= 14) buckets['8-14 hari'] += outstanding;
    else buckets['15+ hari'] += outstanding;
  });
  return Object.keys(buckets).map(label => ({ label: label, value: buckets[label] }));
}

function buildDueSoon_(budget) {
  const today = startOfDay_(new Date());
  return budget.filter(row => {
    if (asNumber_(row['Sisa Hutang (Rp)']) <= 0) return false;
    const due = asDate_(row['Tgl Pembayaran Selanjutnya'] || row['Tgl Dibutuhkan']);
    if (!due) return false;
    return Math.floor((startOfDay_(due) - today) / 86400000) <= 14;
  }).sort((a, b) => asDate_(a['Tgl Pembayaran Selanjutnya'] || a['Tgl Dibutuhkan']) - asDate_(b['Tgl Pembayaran Selanjutnya'] || b['Tgl Dibutuhkan']));
}

function groupSum_(rows, labelField, valueField, limit) {
  const map = {};
  rows.forEach(row => { const label = row[labelField] || 'Tidak ditentukan'; map[label] = (map[label] || 0) + asNumber_(row[valueField]); });
  return Object.keys(map).map(label => ({ label: label, value: map[label] })).sort((a, b) => b.value - a.value).slice(0, limit || 20);
}

function groupCount_(rows, labelField) {
  const map = {};
  rows.forEach(row => { const label = row[labelField] || 'Tidak ditentukan'; map[label] = (map[label] || 0) + 1; });
  return Object.keys(map).map(label => ({ label: label, value: map[label] })).sort((a, b) => b.value - a.value);
}

function sortByDateDesc_(rows, field) {
  return rows.slice().sort((a, b) => { const left = asDate_(a[field]); const right = asDate_(b[field]); return (right ? right.getTime() : 0) - (left ? left.getTime() : 0); });
}

function sum_(rows, field) { return rows.reduce((total, row) => total + asNumber_(row[field]), 0); }

// ============================================================
// UTILITY FUNCTIONS — same as existing
// ============================================================
function makeId_(prefix) { return prefix + '-' + new Date().getTime().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase(); }
function stableImportId_(prefix, brandKey, index) { return prefix + '-' + (brandKey || 'GEN') + '-' + String(index).padStart(4, '0'); }
function normalizeEmail_(email) { return String(email || '').trim().toLowerCase(); }
function isTruthy_(value) { return value === true || String(value).toLowerCase() === 'true' || value === 1 || value === '1'; }
function isPendingBudget_(row) { return row.Status === 'Diajukan' || row.Status === 'Need Revision'; }
function isApprovedBudget_(row) { return row.Status === 'Approved' || row.Status === 'DP' || row.Status === 'Termin' || row.Status === 'Lunas'; }
function asNumber_(value) { const n = Number(String(value || '').replace(/[^0-9.,-]/g, '').replace(/,/g, '')); return isNaN(n) ? 0 : n; }
function asNumberOrBlank_(value) { if (value === '' || value === null || value === undefined) return ''; return asNumber_(value); }
function asDate_(value) { if (!value) return null; if (value instanceof Date) return new Date(value); const d = new Date(value); return isNaN(d.getTime()) ? null : d; }
function startOfDay_(date) { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; }
function weekLabel_(date) { const d = asDate_(date); if (!d) return ''; return Utilities.formatDate(d, FINANCE_APP.timezone, "'W'w-yyyy"); }
function budgetControl_(submitDate, dueDate) { const submit = asDate_(submitDate); const due = asDate_(dueDate); if (!submit || !due) return 'OK'; const diff = Math.floor((startOfDay_(due) - startOfDay_(submit)) / 86400000); return diff < 1 ? '⚠️ Terlambat Diajukan' : 'OK'; }
function upsertSetting_(key, value, notes) { const rows = readTable_(SHEETS.settings); const found = rows.find(row => row.Key === key); if (found) { const idx = found._rowNumber; getSheet_(SHEETS.settings).getRange(idx, 2).setValue(value); } else { getSheet_(SHEETS.settings).appendRow([key, value, notes || '']); } }
function touchLastLogin_(email) { if (!email) return; const rows = readTable_(SHEETS.users); const found = rows.find(row => normalizeEmail_(row.Email) === email); if (found) { getSheet_(SHEETS.users).getRange(found._rowNumber, 8).setValue(new Date()); } }
function requireAuthorized_(session) { if (!session.authorized) throw new Error('Session tidak valid.'); }
function hasAny_(row, indices) { return indices.some(i => { const value = row[i]; return value !== '' && value !== null && value !== undefined && value !== 0; }); }
function containsError_(row) { return row.some(value => String(value || '').indexOf('#') !== -1); }
function logAudit_(user, action, entity, recordId, company, brand, detail) { try { appendRecordBySheet_(SHEETS.audit, { Timestamp: new Date(), User: user, Action: action, Entity: entity, 'Record ID': recordId, Company: company, Brand: brand, 'Detail JSON': JSON.stringify(detail || {}) }); } catch(e) { Logger.log('Audit log error: ' + e.message); } }
function serializeRows_(rows) { return rows.map(row => serializeRecord_(row)); }
function serializeRecord_(record) { const r = {}; Object.keys(record).forEach(key => { if (key !== '_rowNumber') r[key] = record[key]; }); return r; }
function uniqueSorted_(arr) { return [...new Set(arr.filter(Boolean))].sort(); }

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qpxinysxxjphzmgrlyyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweGlueXN4eGpwaHptZ3JseXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzIyODgsImV4cCI6MjA5Njc0ODI4OH0.XsNS7pq1hlsUAMnRmi2M_DrKxxHgl52D1gm7r10C024';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ponytail: entity name → supabase table mapping
export const TABLE_MAP = {
  budget: 'fin_budget',
  income: 'fin_income',
  forecast: 'fin_forecast_cashin',
  outcome: 'fin_outcome',
  omzet: 'fin_omzet',
  bank: 'fin_bank',
  service: 'fin_service',
  payables: 'fin_payables',
  receivables: 'fin_receivables',
  users: 'fin_users',
  brands: 'fin_brands',
  sources: 'fin_sources',
  vendors: 'fin_vendors',
  customers: 'fin_customers',
};

// DB column → UI column mapping per entity
const COL_MAP = {
  budget: {
    brand_key: 'Brand', tgl_pengajuan: 'Tgl Pengajuan', tgl_dibutuhkan: 'Tgl Dibutuhkan',
    kategori: 'Kategori', keterangan: 'Keterangan', vendor_name: 'Vendor', vendor_id: 'ID Vendor',
    nominal_pengajuan: 'Nominal Pengajuan (Rp)', nominal_dibayar: 'Nominal Dibayar (Rp)',
    sisa_hutang: 'Sisa Hutang (Rp)', jenis_bayar: 'Jenis Bayar',
    tgl_pembayaran_selanjutnya: 'Tgl Pembayaran Selanjutnya', tgl_pelunasan: 'Tgl Pelunasan',
    prioritas: 'Prioritas', status: 'Status', kontrol_pengajuan: 'Kontrol Pengajuan',
    feedback_finance: 'Form Feedback Finance',
  },
  income: {
    brand_key: 'Brand', tanggal: 'Tanggal', keterangan: 'Keterangan',
    customer: 'Customer', nominal: 'Nominal', bank_masuk: 'Bank Masuk',
  },
  forecast: {
    brand_key: 'Brand', estimasi_cair: 'Estimasi Cair', marketplace: 'Marketplace',
    nominal_estimasi: 'Nominal Estimasi', status: 'Status', catatan: 'Catatan',
  },
  outcome: {
    brand_key: 'Brand', tanggal: 'Tanggal', keterangan: 'Keterangan',
    kategori: 'Kategori', jumlah: 'Jumlah (Rp)', biaya: 'Biaya (Rp)',
    total_pengeluaran: 'Total Pengeluaran (Rp)', bank_keluar: 'Bank Keluar',
  },
  omzet: {
    brand_key: 'Brand', tahun: 'Tahun', bulan: 'Bulan',
    target_omzet: 'Target Omzet', realisasi_omzet: 'Realisasi Omzet',
    selisih: 'Selisih', capaian: 'Capaian',
  },
  bank: {
    brand_key: 'Brand', bank: 'Bank', saldo_awal: 'Saldo Awal',
    pemasukan: 'Pemasukan', pengeluaran: 'Pengeluaran', total: 'Total',
  },
  service: {
    brand_key: 'Brand', tanggal: 'Tanggal', keterangan: 'Keterangan',
    vendor: 'Vendor', nominal: 'Nominal', status: 'Status',
  },
  payables: {
    brand_key: 'Brand', nama_pemasok: 'Nama Pemasok', id_pemasok: 'ID Pemasok',
    total_hutang: 'Total Hutang', total_dibayar: 'Total Dibayar',
    sisa_hutang: 'Sisa Hutang', progress_pct: 'Progress %', status: 'Status',
  },
  receivables: {
    brand_key: 'Brand', nama_pelanggan: 'Nama Pelanggan', id_pelanggan: 'ID Pelanggan',
    total_piutang: 'Total Piutang', total_diterima: 'Total Diterima',
    sisa_piutang: 'Sisa Piutang', progress_pct: 'Progress %', status: 'Status',
  },
  users: {
    email: 'Email', name: 'Name', role: 'Role',
    company_scope: 'Company Scope', brand_scope: 'Brand Scope', active: 'Active',
  },
  brands: {
    company: 'Company', brand: 'Brand', brand_key: 'Brand Key',
    active: 'Active', pic_email: 'PIC Email',
  },
  sources: {
    company: 'Company', brand: 'Brand', brand_key: 'Brand Key',
    spreadsheet_id: 'Spreadsheet ID', active: 'Active', last_imported_at: 'Last Imported At',
  },
  vendors: {
    vendor_id: 'ID Vendor', nama: 'Nama Vendor', pic: 'PIC',
    telepon: 'Telepon', alamat: 'Alamat', keterangan: 'Keterangan',
  },
  customers: {
    customer_id: 'ID Pelanggan', nama: 'Nama Pelanggan', pic: 'PIC',
    telepon: 'Telepon', alamat: 'Alamat', keterangan: 'Keterangan',
  },
};

// Convert DB row → UI row (snake_case → display labels)
export function dbToUi(entity, row) {
  const map = COL_MAP[entity];
  if (!map) return row;
  const out = { ID: row.id };
  for (const [dbCol, uiCol] of Object.entries(map)) {
    if (row[dbCol] !== undefined) out[uiCol] = row[dbCol];
  }
  return out;
}

// Convert UI form data → DB row (display labels → snake_case)
export function uiToDb(entity, formData) {
  const map = COL_MAP[entity];
  if (!map) return formData;
  const reverse = {};
  for (const [dbCol, uiCol] of Object.entries(map)) {
    reverse[uiCol] = dbCol;
    reverse[dbCol] = dbCol;
  }
  const out = {};
  for (const [key, val] of Object.entries(formData)) {
    if (key === 'ID' || key === 'id') continue;
    const dbCol = reverse[key] || key;
    out[dbCol] = val;
  }
  return out;
}

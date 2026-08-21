// Full P&L structure from "CV LBP - Forecasting & Controlling Budget - 2026.xlsx" —
// same row order/labels as the sheet, so the on-screen report reads exactly like it.
// Leaf rows are entered manually (anggaran + realisasi per brand/month), matching
// how the source workbook itself is filled in. Subtotal/highlight rows are always
// computed here (sum of children) rather than replicated from the sheet's own
// formulas, since a few of those had copy-paste artifacts that don't reconcile.
export const LINE_ITEMS = [
  { key: 'omzet', label: 'Jumlah Pendapatan', group: 'OMZET', pic: 'Finance, Marketing' },
  { key: 'cogs', label: 'Jumlah Beban Pokok Penjualan', group: 'COGS', pic: 'Operasional' },
  { key: 'ppn', label: 'PPN Non Benih', group: 'PPN', pic: '' },
  { key: 'laba_kotor', label: 'LABA KOTOR', highlight: true, computed: v => v.omzet - v.cogs - v.ppn },

  { key: 'hr_gaji_honorer', label: 'Beban Gaji, Upah & Honorer', group: 'HR', pic: 'HR' },
  { key: 'hr_bonus_pesangon', label: 'Beban Bonus, Pesangon & Kompensasi', group: 'HR', pic: 'HR' },
  { key: 'hr_tunjangan_karyawan', label: 'Beban Tunjangan Karyawan', group: 'HR', pic: 'HR' },
  { key: 'hr_transportasi', label: 'Beban Transportasi Karyawan', group: 'HR', pic: 'HR' },
  { key: 'hr_kesehatan', label: 'Beban Tunjangan Kesehatan Karyawan', group: 'HR', pic: 'HR' },
  { key: 'hr_ketenagakerjaan', label: 'Beban Tunjangan Ketenagakerjaan', group: 'HR', pic: 'HR' },
  { key: 'hr_thr', label: 'Beban Tunjangan Hari Raya', group: 'HR', pic: 'HR' },
  { key: 'hr_zakat', label: 'Beban Tunjangan Zakat Karyawan', group: 'HR', pic: 'HR' },
  { key: 'hr_makan', label: 'Beban Tunjangan Makan Karyawan', group: 'HR', pic: 'HR' },
  { key: 'hr_katering', label: 'Beban Katering & Makan Karyawan', group: 'HR', pic: 'HR' },
  { key: 'hr_bensin', label: 'Beban Bensin, Parkir, Tol Kendaraan', group: 'HR', pic: 'HR' },
  { key: 'hr_pelatihan', label: 'Beban Pelatihan dan Pengembangan Karyawan', group: 'HR', pic: 'HR' },
  { key: 'hr_kegiatan', label: 'Beban Kegiatan Karyawan', group: 'HR', pic: 'HR' },
  { key: 'hr_total', label: 'Biaya Gaji dan Upah (Total HR)', group: 'HR', subtotal: true, computed: v => sumGroup(v, 'HR') },

  { key: 'sga_kantor', label: 'Biaya Kantor', group: 'SGA', pic: '' },
  { key: 'sga_listrik', label: 'Beban Listrik & PAM', group: 'SGA', pic: 'Operasional' },
  { key: 'sga_telekomunikasi', label: 'Beban Telekomunikasi', group: 'SGA', pic: 'Operasional' },
  { key: 'sga_ekspedisi', label: 'Beban Ekspedisi, Pos & Materai', group: 'SGA', pic: 'Operasional' },
  { key: 'sga_perjalanan_dinas', label: 'Beban Perjalanan Dinas', group: 'SGA', pic: 'Operasional' },
  { key: 'sga_perlengkapan_kantor', label: 'Beban Perlengkapan Kantor', group: 'SGA', pic: 'Operasional' },
  { key: 'sga_aplikasi_sistem', label: 'Beban Aplikasi Sistem', group: 'SGA', pic: 'Operasional' },
  { key: 'sga_rnd', label: 'Beban R & D', group: 'SGA', pic: 'Operasional' },
  { key: 'sga_kebersihan', label: 'Beban Kebersihan Kantor', group: 'SGA', pic: 'Operasional' },
  { key: 'sga_peralatan_kantor', label: 'Beban Peralatan Kantor', group: 'SGA', pic: 'Operasional' },
  { key: 'sga_service_alat', label: 'Beban Service Alat Kantor', group: 'SGA', pic: 'Operasional' },
  { key: 'sga_jasa_manajemen', label: 'Beban Jasa Manajemen & Konsultasi', group: 'SGA', pic: 'Finance' },
  { key: 'sga_total', label: 'Biaya SG & A (Total)', group: 'SGA', subtotal: true, computed: v => sumGroup(v, 'SGA') },

  { key: 'mkt_iklan_branding', label: 'Beban Iklan Branding', group: 'MARKETING', pic: 'Marketing' },
  { key: 'mkt_iklan_shopee', label: 'Beban Iklan Shopee', group: 'MARKETING', pic: 'Marketing' },
  { key: 'mkt_iklan_meta', label: 'Beban Iklan Meta', group: 'MARKETING', pic: 'Marketing' },
  { key: 'mkt_iklan_tiktok', label: 'Beban Iklan Tiktok', group: 'MARKETING', pic: 'Marketing' },
  { key: 'mkt_afiliasi_tiktok', label: 'Beban Afiliasi Tiktok', group: 'MARKETING', pic: 'Marketing' },
  { key: 'mkt_afiliasi_tiktok_store', label: 'Beban Afiliasi Tiktok Store', group: 'MARKETING', pic: 'Marketing' },
  { key: 'mkt_afiliasi_shopee', label: 'Beban Afiliasi Shopee', group: 'MARKETING', pic: 'Marketing' },
  { key: 'mkt_afiliasi_tokopedia', label: 'Beban Afiliasi Tokopedia', group: 'MARKETING', pic: 'Marketing' },
  { key: 'mkt_promo_shopee', label: 'Beban Promo Shopee', group: 'MARKETING', pic: 'Marketing' },
  { key: 'mkt_promo_tiktok', label: 'Beban Promo Tiktok', group: 'MARKETING', pic: 'Marketing' },
  { key: 'mkt_sosmed_team', label: 'Beban Sosial Media Team', group: 'MARKETING', pic: 'Marketing' },
  { key: 'mkt_pengembangan_branding', label: 'Pengembangan Branding dan Marketing', group: 'MARKETING', pic: 'Marketing' },
  { key: 'mkt_total', label: 'Biaya Pemasaran (Total)', group: 'MARKETING', subtotal: true, computed: v => sumGroup(v, 'MARKETING') },

  { key: 'prod_ongkir', label: 'Beban Ongkir', group: 'PRODUKSI', pic: 'Operasional' },
  { key: 'prod_packaging', label: 'Beban Packaging', group: 'PRODUKSI', pic: 'Operasional' },
  { key: 'prod_perlengkapan_gudang', label: 'Beban Perlengkapan Gudang', group: 'PRODUKSI', pic: 'Operasional' },
  { key: 'prod_total', label: 'Biaya Produksi (Total)', group: 'PRODUKSI', subtotal: true, computed: v => sumGroup(v, 'PRODUKSI') },

  { key: 'sewa_kendaraan', label: 'Beban Sewa Kendaraan', group: 'SEWA', pic: 'Operasional' },
  { key: 'sewa_gedung', label: 'Beban Sewa Gedung', group: 'SEWA', pic: 'Operasional' },
  { key: 'sewa_peralatan_kantor', label: 'Beban Sewa Peralatan Kantor', group: 'SEWA', pic: 'Operasional' },
  { key: 'sewa_total', label: 'Beban Sewa (Total)', group: 'SEWA', subtotal: true, computed: v => sumGroup(v, 'SEWA') },

  { key: 'susut_mesin', label: 'Beban Penyusutan Mesin', group: 'PENYUSUTAN', pic: 'Finance' },
  { key: 'susut_inventaris', label: 'Beban Penyusutan Inventaris Kantor', group: 'PENYUSUTAN', pic: 'Finance' },
  { key: 'susut_perlengkapan_gudang', label: 'Beban Penyusutan Perlengkapan Gudang', group: 'PENYUSUTAN', pic: 'Finance' },
  { key: 'susut_gedung', label: 'Beban Penyusutan Gedung', group: 'PENYUSUTAN', pic: 'Finance' },
  { key: 'susut_total', label: 'Biaya Penyusutan (Total)', group: 'PENYUSUTAN', subtotal: true, computed: v => sumGroup(v, 'PENYUSUTAN') },

  { key: 'opex_marketplace', label: 'Biaya Marketplace', group: 'OPEX', pic: 'Marketing' },
  { key: 'oprs_lain', label: 'Biaya Operasional Lainnya', group: 'OPRS_LAIN', pic: 'Finance' },

  {
    key: 'beban_operasional_total', label: 'Jumlah Beban Operasional', highlight: true,
    computed: v => v.hr_total + v.sga_total + v.mkt_total + v.prod_total + v.sewa_total + v.susut_total + v.opex_marketplace + v.oprs_lain,
  },
  { key: 'pendapatan_operasional', label: 'PENDAPATAN OPERASIONAL', highlight: true, computed: v => v.laba_kotor - v.beban_operasional_total },

  { key: 'non_operasional', label: 'Jumlah Pendapatan dan Beban Non Operasional', group: 'NON_OPS', pic: 'Finance' },
  { key: 'laba_sebelum_pajak', label: 'LABA BERSIH SEBELUM PAJAK', highlight: true, computed: v => v.pendapatan_operasional + v.non_operasional },
  { key: 'pajak', label: 'Pajak Penghasilan', group: 'NON_OPS', pic: 'Finance' },
  { key: 'laba_setelah_pajak', label: 'LABA BERSIH SETELAH PAJAK', highlight: true, computed: v => v.laba_sebelum_pajak - v.pajak },
];

export const GROUP_LABELS = {
  OMZET: 'Omzet', COGS: 'COGS', PPN: 'PPN', HR: 'HR (Gaji & Upah)', SGA: 'SG & A',
  MARKETING: 'Biaya Pemasaran', PRODUKSI: 'Biaya Produksi', SEWA: 'Beban Sewa',
  PENYUSUTAN: 'Biaya Penyusutan', OPEX: 'OPEX (Marketplace)', OPRS_LAIN: 'Operasional Lainnya',
  NON_OPS: 'Non Operasional & Pajak',
};

function sumGroup(values, group) {
  return LINE_ITEMS
    .filter(item => item.group === group && !item.computed)
    .reduce((sum, item) => sum + (values[item.key] || 0), 0);
}

export const LEAF_KEYS = LINE_ITEMS.filter(item => !item.computed).map(item => item.key);

// raw: { [lineKey]: { anggaran, realisasi, keterangan, id } } — leaf keys only.
// Returns every row (leaf + computed) with anggaran/realisasi filled in.
export function computeLineValues(raw) {
  const anggaran = {};
  const realisasi = {};
  for (const item of LINE_ITEMS) {
    if (item.computed) {
      anggaran[item.key] = item.computed(anggaran);
      realisasi[item.key] = item.computed(realisasi);
    } else {
      anggaran[item.key] = Number(raw[item.key]?.anggaran || 0);
      realisasi[item.key] = Number(raw[item.key]?.realisasi || 0);
    }
  }
  return { anggaran, realisasi };
}

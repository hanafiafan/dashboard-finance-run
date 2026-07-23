import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Step-by-step input guide per data module — shared across roles, since the
// form itself doesn't change per role, only who's allowed to open it.
const ENTITY_GUIDES = {
  budget: {
    title: 'Budget Request (Pengajuan Dana)',
    menu: 'Operasional → tab "Budget Request"',
    tujuan: 'Mengajukan permintaan dana untuk kebutuhan operasional, marketing, gaji, dll.',
    steps: [
      'Klik tombol "Tambah".',
      'Pilih Brand Key — brand yang mengajukan.',
      'Isi Tgl Pengajuan (hari ini) dan Tgl Dibutuhkan (tanggal dana harus sudah cair).',
      'Pilih Kategori (Operasional, Marketing, Gaji dan Upah, dst).',
      'Isi Keterangan — jelaskan kebutuhan dana sedetail mungkin, ini yang dibaca Finance saat approval.',
      'Pilih Vendor dari daftar ID Vendor. Kalau vendor belum ada di daftar, minta Finance/Super Admin tambahkan dulu lewat Master Data → Vendor.',
      'Isi Nominal Pengajuan (Rp).',
      'Pilih Prioritas (High/Medium/Low) sesuai urgensi kebutuhan.',
      'Klik Simpan — status otomatis "Diajukan", menunggu approval.',
    ],
    catatan: 'Field Nominal Dibayar, Status akhir, dan Form Feedback Finance diisi oleh Finance saat proses approval — pengaju tidak perlu (dan sebaiknya tidak) mengisi field itu.',
  },
  income: {
    title: 'Cash In (Pemasukan Real)',
    menu: 'Operasional → tab "Cash In Real"',
    tujuan: 'Mencatat uang yang benar-benar sudah masuk ke rekening.',
    steps: [
      'Klik "Tambah".',
      'Pilih Brand Key, isi Tanggal uang masuk.',
      'Isi Keterangan (contoh: "Pembayaran invoice #123").',
      'Pilih Customer dari daftar (tambahkan dulu di Master Data → Customer kalau belum ada).',
      'Isi Nominal yang masuk.',
      'Pilih Bank Masuk — rekening/kas mana yang menerima.',
      'Simpan.',
    ],
    catatan: 'Ini beda dengan "Forecast Cash In" — Cash In hanya untuk uang yang SUDAH masuk, bukan perkiraan.',
  },
  forecast: {
    title: 'Forecast Cash In (Estimasi Uang Masuk)',
    menu: 'Operasional → tab "Forecast Cash In"',
    tujuan: 'Mencatat perkiraan uang yang AKAN masuk (misal dari marketplace yang belum cair), dipakai untuk proyeksi kas ke depan.',
    steps: [
      'Klik "Tambah".',
      'Pilih Brand Key.',
      'Isi Estimasi Cair — perkiraan tanggal uang akan masuk.',
      'Isi Marketplace/sumbernya (contoh: Shopee, Tokopedia).',
      'Isi Nominal Estimasi.',
      'Simpan.',
    ],
    catatan: 'Data ini dipakai sistem untuk menghitung indikator "Forecast Cash Position" di Dashboard — makin akurat tanggalnya, makin akurat proyeksi kasnya.',
  },
  forecastOut: {
    title: 'Forecast Cash Out (Estimasi Uang Keluar)',
    menu: 'Operasional → tab "Forecast Cash Out"',
    tujuan: 'Mencatat perkiraan pengeluaran yang akan datang (misal cicilan, sewa jatuh tempo, pembelian terjadwal).',
    steps: [
      'Klik "Tambah".',
      'Pilih Brand Key.',
      'Isi Estimasi Keluar — perkiraan tanggal uang akan keluar.',
      'Pilih Kategori pengeluaran.',
      'Isi Nominal Estimasi.',
      'Simpan.',
    ],
    catatan: 'Sama seperti Forecast Cash In, dipakai untuk menghitung proyeksi kas — dan untuk "Rekomendasi Kas" saat Finance meng-approve Budget Request baru di halaman Approval.',
  },
  outcome: {
    title: 'Cash Out (Pengeluaran)',
    menu: 'Operasional → tab "Cash Out"',
    tujuan: 'Mencatat uang yang benar-benar sudah keluar dari rekening/kas.',
    steps: [
      'Klik "Tambah".',
      'Pilih Brand Key, isi Tanggal.',
      'Isi Keterangan.',
      'Pilih Kategori.',
      'Isi Jumlah (Rp) dan Biaya (Rp) kalau ada biaya tambahan (misal biaya admin/transfer).',
      'Pilih Bank Keluar.',
      'Simpan.',
    ],
  },
  omzet: {
    title: 'Omzet (Target vs Realisasi)',
    menu: 'Operasional → tab "Omzet"',
    tujuan: 'Mencatat target dan realisasi omzet per brand per bulan.',
    steps: [
      'Klik "Tambah".',
      'Pilih Brand Key, isi Tahun dan pilih Bulan.',
      'Isi Target Omzet dan Realisasi Omzet.',
      'Simpan — Selisih dan Capaian % dihitung otomatis oleh sistem.',
    ],
    catatan: 'Data ini dipakai indikator "Capaian Omzet" dan "Cash Conversion" di Dashboard.',
  },
  bank: {
    title: 'Saldo Rekening',
    menu: 'Operasional → tab "Saldo Rekening"',
    tujuan: 'Mencatat saldo awal, pemasukan, dan pengeluaran per rekening/kas per brand.',
    steps: [
      'Klik "Tambah".',
      'Pilih Brand Key dan Nama Bank.',
      'Isi Saldo Awal, Pemasukan, Pengeluaran.',
      'Simpan — Total saldo dihitung otomatis.',
    ],
  },
  service: {
    title: 'Biaya Layanan',
    menu: 'Operasional → tab "Biaya Layanan"',
    tujuan: 'Mencatat biaya jasa/layanan pihak ketiga (konsultan, langganan software, dst).',
    steps: [
      'Klik "Tambah".',
      'Pilih Brand Key, isi Tanggal.',
      'Isi Keterangan, pilih Vendor.',
      'Isi Nominal, isi Status.',
      'Simpan.',
    ],
  },
  payables: {
    title: 'Hutang (Payables)',
    menu: 'Operasional → tab "Hutang"',
    tujuan: 'Mencatat kewajiban ke supplier/vendor yang belum lunas.',
    steps: [
      'Klik "Tambah".',
      'Pilih Brand Key, isi Nama Pemasok dan pilih ID Pemasok dari daftar Vendor.',
      'Isi Total Hutang dan Total Dibayar (Sisa Hutang & Progress % dihitung otomatis).',
      'Isi Status.',
      'Simpan.',
    ],
  },
  receivables: {
    title: 'Piutang (Receivables)',
    menu: 'Operasional → tab "Piutang"',
    tujuan: 'Mencatat uang yang masih harus diterima dari pelanggan.',
    steps: [
      'Klik "Tambah".',
      'Pilih Brand Key, isi Nama Pelanggan dan pilih ID Pelanggan dari daftar Customer.',
      'Isi Total Piutang dan Total Diterima (Sisa Piutang & Progress % dihitung otomatis).',
      'Isi Status.',
      'Simpan.',
    ],
  },
  vendors: {
    title: 'Master Data — Vendor',
    menu: 'Master Data → tab "Data Vendor"',
    tujuan: 'Daftar supplier/vendor yang dipakai sebagai pilihan di form Budget Request, Biaya Layanan, dan Hutang.',
    steps: [
      'Klik "Tambah".',
      'Isi ID Vendor (kode unik, bebas tapi jangan sama dengan yang sudah ada).',
      'Isi Nama Vendor, PIC, Telepon, Alamat.',
      'Simpan.',
    ],
  },
  customers: {
    title: 'Master Data — Pelanggan',
    menu: 'Master Data → tab "Data Pelanggan"',
    tujuan: 'Daftar pelanggan yang dipakai sebagai pilihan di form Cash In dan Piutang.',
    steps: [
      'Klik "Tambah".',
      'Isi ID Pelanggan (kode unik), Nama Pelanggan, PIC, Telepon, Alamat.',
      'Simpan.',
    ],
  },
  brands: {
    title: 'Master Data — Brand',
    menu: 'Master Data → tab "Brands"',
    tujuan: 'Daftar company & brand yang terdaftar di sistem — menentukan pilihan "Brand Key" di semua form lain.',
    steps: [
      'Klik "Tambah".',
      'Isi Company, Brand, Brand Key (harus unik, dipakai sebagai referensi di semua tabel lain).',
      'Isi PIC Email, aktifkan toggle Active.',
      'Simpan.',
    ],
    catatan: 'Brand Key yang dipakai di sini HARUS sama persis dengan yang diisi di kolom "Brand Scope" milik akun PIC Brand terkait (lihat panduan User Management), kalau tidak, PIC tidak akan melihat datanya sendiri.',
  },
};

const ROLE_META = {
  superadmin: { label: 'Super Admin', color: 'ok' },
  finance: { label: 'Finance', color: 'warn' },
  owner: { label: 'Owner', color: 'info' },
  pic_brand: { label: 'PIC Brand', color: 'bad' },
};

// Which entities each role can EDIT (source of truth mirrors src/utils/demoData.js buildEntities()).
const ROLE_EDIT_ACCESS = {
  superadmin: ['budget', 'income', 'forecast', 'forecastOut', 'outcome', 'omzet', 'bank', 'service', 'payables', 'receivables', 'vendors', 'customers', 'brands'],
  finance: ['budget', 'income', 'forecast', 'forecastOut', 'outcome', 'omzet', 'bank', 'service', 'payables', 'receivables', 'vendors', 'customers', 'brands'],
  owner: ['budget', 'income', 'forecast', 'forecastOut', 'outcome'],
  pic_brand: ['budget'],
};
// Everything else in ENTITY_GUIDES that a role can't edit is still visible to them read-only,
// except pic_brand's view is also scoped to their own Brand Key only.

const EWS_GLOSSARY = [
  { name: 'Cash Position', formula: 'Saldo Rekening + Cash In hari ini − Cash Out hari ini', tiers: '> 0 Sehat · = 0 Waspada · < 0 Kritis' },
  { name: 'Cash Out Ratio', formula: 'Cash Out bulan ini ÷ Cash In bulan ini', tiers: '≤ 85% Sehat · 85–90% Waspada · ≥ 90% Kritis' },
  { name: 'Cash Conversion', formula: 'Cash In bulan ini ÷ Realisasi Omzet bulan ini', tiers: '≥ 65% Sehat · 50–65% Waspada · ≤ 50% Kritis' },
  { name: 'Capaian Omzet', formula: 'Realisasi Omzet ÷ Target Omzet', tiers: '≥ 100% Aman · 80–99% Waspada · ≤ 80% Bahaya' },
  { name: 'Receivable Risk', formula: 'Piutang ÷ Realisasi Omzet bulan ini', tiers: '≤ 20% Low Risk · 20–35% Medium Risk · ≥ 35% High Risk' },
  { name: 'Payable Risk', formula: 'Hutang ÷ Cash In bulan ini', tiers: '≤ 30% Low Risk · 30–50% Medium Risk · ≥ 50% High Risk' },
  { name: 'Forecast Cash Position (30 hari)', formula: 'Saldo + forecast in − forecast out, 30 hari ke depan', tiers: '> 0 Aman · di bawah 10% saldo Waspada · < 0 Kritis' },
  { name: 'Rekomendasi Kas (di halaman Approval)', formula: 'Forecast Cash Position (s/d Tgl Dibutuhkan) − Nominal Pengajuan', tiers: 'Positif & sisa besar Approve · sisa tipis (>80% terpakai) Review · negatif Hold' },
];

function EntityGuide({ id }) {
  const g = ENTITY_GUIDES[id];
  if (!g) return null;
  return (
    <details className="doc-entity">
      <summary>{g.title} <span className="doc-menu-path">{g.menu}</span></summary>
      <p className="doc-tujuan">{g.tujuan}</p>
      <ol>{g.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      {g.catatan && <p className="doc-catatan">⚠️ {g.catatan}</p>}
    </details>
  );
}

const ROLE_CONTENT = {
  superadmin: {
    ringkasan: 'Akses penuh ke seluruh sistem — semua company & brand, semua modul, tanpa batasan.',
    bullets: [
      'Bisa mengedit semua modul operasional dan semua master data.',
      'Bisa approve/reject/minta revisi Budget Request.',
      'Satu-satunya role yang bisa membuat akun Super Admin baru (lewat menu Master Data → Users → Add User).',
      'Bisa reset password dan menonaktifkan user mana pun.',
    ],
    entities: ['budget', 'income', 'forecast', 'forecastOut', 'outcome', 'omzet', 'bank', 'service', 'payables', 'receivables', 'vendors', 'customers', 'brands'],
  },
  finance: {
    ringkasan: 'Setara Super Admin untuk operasional harian — bedanya cuma tidak bisa membuat akun Super Admin baru.',
    bullets: [
      'Bisa mengedit semua modul operasional dan master data (Brand, Vendor, Customer).',
      'Bertugas melakukan approval Budget Request — cek tab "Rekomendasi Kas" di halaman Approval sebelum klik Approve.',
      'Bisa mengelola user (tambah/reset password/hapus) untuk role Finance, Owner, PIC Brand.',
    ],
    entities: ['budget', 'income', 'forecast', 'forecastOut', 'outcome', 'omzet', 'bank', 'service', 'payables', 'receivables', 'vendors', 'customers', 'brands'],
  },
  owner: {
    ringkasan: 'Bisa melihat semua data di semua company/brand untuk pengawasan, tapi hanya bisa mengedit modul transaksi utama.',
    bullets: [
      'Bisa mengajukan dan mengedit Budget Request, Cash In, Forecast Cash In/Out, dan Cash Out.',
      'Bisa approve Budget Request.',
      'Read-only untuk Omzet, Saldo Rekening, Biaya Layanan, Hutang, Piutang, dan semua Master Data — kalau ada yang perlu diubah, minta Finance.',
      'Tidak bisa mengelola user atau import data.',
    ],
    entities: ['budget', 'income', 'forecast', 'forecastOut', 'outcome'],
    readonlyNote: 'Omzet, Saldo Rekening, Biaya Layanan, Hutang, Piutang, dan Master Data bisa dilihat tapi tidak bisa diedit — kalau perlu koreksi data, hubungi Finance.',
  },
  pic_brand: {
    ringkasan: 'Akses paling terbatas — hanya untuk brand yang jadi tanggung jawabnya sendiri.',
    bullets: [
      'Hanya bisa mengajukan Budget Request untuk brand-nya sendiri.',
      'Tidak bisa approve budget, tidak bisa kelola user, tidak bisa import data.',
      'Semua data yang terlihat (termasuk di Dashboard/Analytics) otomatis terbatas ke brand milik sendiri saja — brand lain tidak akan muncul.',
    ],
    entities: ['budget'],
    readonlyNote: 'Modul lain (Cash In, Cash Out, Omzet, dst.) bisa dilihat read-only untuk brand sendiri saja, tidak bisa diedit.',
    warning: 'Kalau setelah login dashboard terlihat KOSONG sama sekali, kemungkinan kolom "Brand Scope" di akun kamu belum diisi oleh Finance/Super Admin — minta mereka cek di Master Data → Users.',
  },
};

export function Documentation() {
  const { session } = useAuth();
  const myRole = session?.role || 'pic_brand';
  const [activeRole, setActiveRole] = useState(myRole);

  const content = ROLE_CONTENT[activeRole];

  return (
    <div className="doc-page">
      <div className="panel tight">
        <div className="panel-head">
          <div>
            <h3><BookOpen size={16} style={{ verticalAlign: -3, marginRight: 6 }} />Dokumentasi & Panduan Penggunaan</h3>
            <p>Cara input data dan menjalankan dashboard untuk setiap role.</p>
          </div>
        </div>

        <div className="tabs" style={{ marginTop: '0.75rem' }}>
          {Object.keys(ROLE_META).map((role) => (
            <button key={role} className={activeRole === role ? 'active' : ''} onClick={() => setActiveRole(role)}>
              {ROLE_META[role].label}{role === myRole ? ' (Kamu)' : ''}
            </button>
          ))}
        </div>

        <div style={{ padding: '1rem 0 0.25rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{content.ringkasan}</p>
          <ul style={{ margin: '0 0 1rem 1.1rem', fontSize: '0.85rem', lineHeight: 1.7 }}>
            {content.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>

          {content.warning && <p className="doc-catatan" style={{ marginBottom: '1rem' }}>⚠️ {content.warning}</p>}

          <h4 style={{ margin: '0.5rem 0' }}>Cara input data — modul yang bisa diedit oleh {ROLE_META[activeRole].label}</h4>
          {content.entities.map((id) => <EntityGuide key={id} id={id} />)}

          {content.readonlyNote && <p className="doc-catatan" style={{ marginTop: '1rem' }}>ℹ️ {content.readonlyNote}</p>}

          {(activeRole === 'superadmin' || activeRole === 'finance') && (
            <details className="doc-entity">
              <summary>Kelola User <span className="doc-menu-path">Master Data → tab "Users"</span></summary>
              <p className="doc-tujuan">Menambah akun baru, reset password, atau menghapus user.</p>
              <ol>
                <li>Buka Master Data → tab Users.</li>
                <li>Klik "Add User" — isi Email, Nama, Role, dan Password awal.</li>
                <li>Super Admin bisa memilih role apa saja termasuk Super Admin; Finance tidak bisa membuat akun Super Admin baru.</li>
                <li>Kalau role-nya PIC Brand, ingatkan untuk mengisi kolom Brand Scope (lewat Supabase, belum ada form khusus di UI) supaya user itu bisa melihat data brand-nya.</li>
                <li>Untuk reset password: klik ikon kunci di baris user, isi password baru.</li>
                <li>Untuk hapus akun: klik ikon tempat sampah — aksi ini permanen.</li>
              </ol>
            </details>
          )}

          {(activeRole === 'superadmin' || activeRole === 'finance' || activeRole === 'owner') && (
            <details className="doc-entity">
              <summary>Approve Budget Request <span className="doc-menu-path">Menu "Approval"</span></summary>
              <p className="doc-tujuan">Menyetujui, meminta revisi, atau menolak pengajuan dana dari PIC Brand/role lain.</p>
              <ol>
                <li>Buka menu Approval — lihat daftar "Antrian approval".</li>
                <li>Cek kolom "Rekomendasi Kas" di sebelah kanan setiap baris: 🟢 Approve (aman), 🟡 Review (kas menipis, pertimbangkan dulu), 🔴 Hold (proyeksi kas jadi negatif kalau disetujui).</li>
                <li>Klik ikon centang untuk Approve (akan diminta isi nominal yang dibayar & catatan feedback), ikon panah untuk minta revisi, atau ikon silang untuk tolak.</li>
              </ol>
              <p className="doc-catatan">⚠️ Rekomendasi Kas ini bantu keputusan, bukan aturan otomatis — kamu tetap bisa approve walau statusnya Hold kalau memang ada pertimbangan lain.</p>
            </details>
          )}
        </div>
      </div>

      <div className="panel tight" style={{ marginTop: '1rem' }}>
        <div className="panel-head">
          <div>
            <h3>Kamus Indikator Early Warning System</h3>
            <p>Muncul di panel "Early Warning System" pada halaman Dashboard.</p>
          </div>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Indikator</th><th>Formula</th><th>Ambang Status</th></tr></thead>
            <tbody>
              {EWS_GLOSSARY.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td className="mono" style={{ fontSize: '0.78rem' }}>{row.formula}</td>
                  <td style={{ fontSize: '0.78rem' }}>{row.tiers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel tight" style={{ marginTop: '1rem' }}>
        <div className="panel-head">
          <div>
            <h3>Panduan Umum</h3>
          </div>
        </div>
        <ul style={{ margin: '0.5rem 0 0.75rem 1.1rem', fontSize: '0.85rem', lineHeight: 1.8 }}>
          <li><strong>Filter (Company/Brand/Kategori/Tanggal)</strong> di bagian atas berlaku ke semua halaman — kosongkan filter untuk melihat semua data lagi.</li>
          <li><strong>Refresh</strong> di pojok kanan atas / sidebar untuk menarik ulang data terbaru dari database.</li>
          <li><strong>CSV</strong> muncul saat kamu sedang membuka tabel data (Operasional/Master Data) — untuk unduh data yang sedang tampil.</li>
          <li><strong>Light/Dark mode</strong> di pojok kanan atas, murni preferensi tampilan.</li>
          <li>Kalau muncul pesan error saat menyimpan data, screenshot pesannya dan kirim ke Finance/Super Admin untuk dicek.</li>
        </ul>
      </div>
    </div>
  );
}

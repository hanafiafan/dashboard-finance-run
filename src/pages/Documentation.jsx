import {
  BookOpen, ShieldCheck, Landmark, Eye, UserCog, Wallet, ArrowDownCircle, ArrowUpCircle,
  CalendarClock, CalendarX2, BarChart3, Truck, Users, Tag, HandCoins, Briefcase,
  CheckCircle2, Filter, RefreshCw, Download, SunMoon, MessageCircleWarning,
  ClipboardList, AlertTriangle, ShieldAlert, FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ENTITY_ICON = {
  budget: Wallet,
  income: ArrowDownCircle,
  forecast: CalendarClock,
  forecastOut: CalendarX2,
  outcome: ArrowUpCircle,
  omzet: BarChart3,
  bank: Landmark,
  service: Briefcase,
  payables: HandCoins,
  receivables: HandCoins,
  vendors: Truck,
  customers: Users,
  brands: Tag,
  sources: FileSpreadsheet,
};

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
      'Pilih ID Bank Masuk — rekening/kas mana yang menerima (nama bank otomatis tampil di sebelah ID-nya). Kalau rekeningnya belum punya ID Bank, minta Finance isi dulu ID Bank-nya lewat Saldo Rekening.',
      'Simpan.',
    ],
    catatan: 'Ini beda dengan "Forecast Cash In" — Cash In hanya untuk uang yang SUDAH masuk, bukan perkiraan. Nominal ini juga otomatis menambah Pemasukan di Saldo Rekening untuk ID Bank Masuk yang sama.',
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
      'Pilih ID Bank Keluar — sama seperti Cash In, dipilih dari ID Bank yang sudah terdaftar di Saldo Rekening.',
      'Simpan.',
    ],
    catatan: 'Jumlah + Biaya otomatis menambah Pengeluaran di Saldo Rekening untuk ID Bank Keluar yang sama.',
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
    tujuan: 'Mendaftarkan rekening/kas per brand dengan saldo pembukaannya.',
    steps: [
      'Klik "Tambah".',
      'Pilih Brand Key.',
      'Isi ID Bank (kode unik, bebas — misalnya BNK-001) — ini yang dipakai Cash In/Cash Out untuk menautkan ke rekening ini, jadi wajib diisi dan jangan sampai sama dengan ID Bank rekening lain.',
      'Ketik Nama Bank (bebas — rekening bank, kas kecil, e-wallet, apa saja).',
      'Isi Saldo Awal (saldo pembukaan rekening).',
      'Simpan — Pemasukan, Pengeluaran, dan Total dihitung otomatis dari data Cash In/Cash Out yang ID Bank-nya sama, tidak perlu diisi manual.',
    ],
    catatan: 'Buat dulu baris Saldo Rekening (dengan ID Bank-nya) sebelum mencatat Cash In/Cash Out dengan bank itu — di form Cash In/Cash Out, ID Bank dipilih dari dropdown yang cuma menampilkan rekening yang sudah punya ID Bank. Untuk rekening lama yang dibuat sebelum ID Bank ada, buka baris itu di Saldo Rekening dan isi ID Bank-nya supaya bisa dipakai lagi di Cash In/Cash Out — data lama tetap tersinkron otomatis selama proses ini.',
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
      'Pilih Brand Key, lalu pilih ID Pemasok dari daftar Vendor — nama pemasok otomatis terisi, tidak perlu diketik.',
      'Isi Total Hutang dan Total Dibayar (Sisa Hutang & Progress % dihitung otomatis).',
      'Isi Tgl Jatuh Tempo — tanggal ini yang dipakai grafik "Payable Aging" di Dashboard untuk menghitung berapa hari sudah/akan telat.',
      'Isi Status.',
      'Simpan.',
    ],
    catatan: 'Kalau Tgl Jatuh Tempo dikosongkan, hutang itu tidak akan masuk ke bucket aging manapun di grafik Dashboard.',
  },
  receivables: {
    title: 'Piutang (Receivables)',
    menu: 'Operasional → tab "Piutang"',
    tujuan: 'Mencatat uang yang masih harus diterima dari pelanggan.',
    steps: [
      'Klik "Tambah".',
      'Pilih Brand Key, lalu pilih ID Pelanggan dari daftar Customer — nama pelanggan otomatis terisi, tidak perlu diketik.',
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
  sources: {
    title: 'Master Data — Source Workbooks',
    menu: 'Master Data → tab "Source Workbooks"',
    tujuan: 'Daftar spreadsheet sumber data per brand — dipakai kalau nanti fitur Import dari Source Workbooks sudah aktif.',
    steps: [
      'Klik "Tambah".',
      'Pilih Company dan Brand, isi Brand Key.',
      'Isi Spreadsheet ID (ID dari URL Google Sheets sumbernya).',
      'Aktifkan toggle Active kalau sumber ini mau dipakai.',
      'Isi Notes kalau perlu catatan tambahan.',
      'Simpan.',
    ],
    catatan: 'Hanya Super Admin dan Finance yang bisa melihat/mengubah data ini — role lain tidak melihat tab ini sama sekali. Tombol "Import" di pojok kanan atas belum berfungsi (fitur belum tersedia), jadi mengisi data di sini belum berdampak ke sistem.',
  },
};

const ROLE_META = {
  superadmin: { label: 'Super Admin', icon: ShieldCheck, banner: 'violet' },
  finance: { label: 'Finance', icon: Landmark, banner: 'teal' },
  owner: { label: 'Owner', icon: Eye, banner: 'blue' },
  pic_brand: { label: 'PIC Brand', icon: UserCog, banner: 'amber' },
};

function EntityGuide({ id }) {
  const g = ENTITY_GUIDES[id];
  const Icon = ENTITY_ICON[id];
  if (!g) return null;
  return (
    <details className="doc-entity">
      <summary>
        <span className="doc-entity-title">{Icon && <Icon size={16} className="doc-entity-icon" />}{g.title}</span>
        <span className="doc-menu-path">{g.menu}</span>
      </summary>
      <p className="doc-tujuan">{g.tujuan}</p>
      <ol className="doc-steps">{g.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      {g.catatan && <p className="doc-catatan"><AlertTriangle size={14} /> {g.catatan}</p>}
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
    entities: ['budget', 'income', 'forecast', 'forecastOut', 'outcome', 'omzet', 'bank', 'service', 'payables', 'receivables', 'vendors', 'customers', 'brands', 'sources'],
  },
  finance: {
    ringkasan: 'Setara Super Admin untuk operasional harian — bedanya cuma tidak bisa membuat akun Super Admin baru.',
    bullets: [
      'Bisa mengedit semua modul operasional dan master data (Brand, Vendor, Customer).',
      'Bertugas melakukan approval Budget Request — cek tab "Rekomendasi Kas" di halaman Approval sebelum klik Approve.',
      'Bisa mengelola user (tambah/reset password/hapus) untuk role Finance, Owner, PIC Brand.',
    ],
    entities: ['budget', 'income', 'forecast', 'forecastOut', 'outcome', 'omzet', 'bank', 'service', 'payables', 'receivables', 'vendors', 'customers', 'brands', 'sources'],
  },
  owner: {
    ringkasan: 'Bisa melihat semua data di semua company/brand untuk pengawasan — akses murni read-only, tidak bisa mengedit data apa pun.',
    bullets: [
      'Read-only di seluruh modul operasional (Budget Request, Cash In, Cash Out, Forecast Cash In/Out, Omzet, Saldo Rekening, Biaya Layanan, Hutang, Piutang) dan seluruh Master Data.',
      'Tidak bisa approve/reject/minta revisi Budget Request — approval sepenuhnya di tangan Finance/Super Admin.',
      'Tidak bisa mengelola user atau import data.',
    ],
    entities: [],
    readonlyNote: 'Semua modul di atas bisa dilihat tapi tidak bisa diedit sama sekali — kalau ada data yang perlu diubah atau budget yang perlu diproses, hubungi Finance/Super Admin.',
  },
  pic_brand: {
    ringkasan: 'Akses operasional harian untuk brand yang jadi tanggung jawabnya sendiri — Budget Request, Cash In, Cash Out, Hutang, dan menambah data Vendor.',
    bullets: [
      'Bisa mengajukan & mengedit Budget Request (selama masih Pending), mencatat Cash In & Cash Out, dan mencatat Hutang — semuanya untuk brand sendiri saja.',
      'Bisa menambah Vendor baru di Master Data (tidak bisa mengedit atau menghapus vendor yang sudah ada).',
      'Tidak ada tombol hapus di Budget Request/Cash In/Cash Out/Hutang — begitu tersimpan, data hanya bisa dikoreksi, bukan dihapus, supaya jejak transaksinya tetap utuh.',
      'Tidak bisa approve budget, tidak bisa kelola user, tidak bisa import data.',
      'Semua data yang terlihat (termasuk di Dashboard/Analytics) otomatis terbatas ke brand milik sendiri saja — brand lain tidak akan muncul.',
    ],
    entities: ['budget', 'income', 'outcome', 'payables', 'vendors'],
    readonlyNote: 'Modul lain (Forecast Cash In/Out, Omzet, Saldo Rekening, Biaya Layanan, Piutang, dan Master Data selain Vendor) bisa dilihat read-only untuk brand sendiri saja, tidak bisa diedit.',
    warning: 'Kalau setelah login dashboard terlihat KOSONG sama sekali, kemungkinan kolom "Brand Scope" di akun kamu belum diisi oleh Finance/Super Admin — minta mereka cek di Master Data → Users.',
  },
};

const GENERAL_TIPS = [
  { icon: Filter, text: <><strong>Filter</strong> (Company/Brand/Kategori/Tanggal) di bagian atas berlaku ke semua halaman — kosongkan filter untuk melihat semua data lagi.</> },
  { icon: RefreshCw, text: <><strong>Refresh</strong> di pojok kanan atas / sidebar untuk menarik ulang data terbaru dari database.</> },
  { icon: Download, text: <><strong>CSV</strong> muncul saat kamu sedang membuka tabel data (Operasional/Master Data) — untuk unduh data yang sedang tampil.</> },
  { icon: SunMoon, text: <><strong>Light/Dark mode</strong> di pojok kanan atas, murni preferensi tampilan.</> },
  { icon: MessageCircleWarning, text: 'Kalau muncul pesan error saat menyimpan data, screenshot pesannya dan kirim ke Finance/Super Admin untuk dicek.' },
];

export function Documentation() {
  const { session } = useAuth();
  const myRole = session?.role || 'pic_brand';

  const content = ROLE_CONTENT[myRole];
  const meta = ROLE_META[myRole];
  const RoleIcon = meta.icon;
  const activeRole = myRole;

  return (
    <div className="doc-page">
      <div className="panel tight">
        <div className="panel-head">
          <div>
            <h3><BookOpen size={18} style={{ verticalAlign: -3, marginRight: 6 }} />Dokumentasi & Panduan Penggunaan</h3>
            <p>Panduan pengoperasian dashboard untuk akun {meta.label}.</p>
          </div>
        </div>

        <div style={{ padding: '1.1rem 1.15rem 0.25rem' }}>
          <div className={`doc-role-hero ${meta.banner}`}>
            <div className="doc-role-hero-icon"><RoleIcon size={26} /></div>
            <div>
              <div className="doc-role-hero-label">{meta.label}</div>
              <p>{content.ringkasan}</p>
            </div>
          </div>

          <ul className="doc-checklist">
            {content.bullets.map((b, i) => (
              <li key={i}><CheckCircle2 size={16} className="doc-check-icon" /><span>{b}</span></li>
            ))}
          </ul>

          {content.warning && <p className="doc-catatan doc-catatan-strong"><ShieldAlert size={15} /> {content.warning}</p>}

          <h4 className="doc-section-heading"><ClipboardList size={16} /> Cara input data — modul yang bisa diedit oleh {meta.label}</h4>
          {content.entities.map((id) => <EntityGuide key={id} id={id} />)}

          {content.readonlyNote && <p className="doc-catatan"><Eye size={14} /> {content.readonlyNote}</p>}

          {(activeRole === 'superadmin' || activeRole === 'finance') && (
            <details className="doc-entity">
              <summary>
                <span className="doc-entity-title"><UserCog size={16} className="doc-entity-icon" />Kelola User</span>
                <span className="doc-menu-path">Master Data → tab "Users"</span>
              </summary>
              <p className="doc-tujuan">Menambah akun baru, reset password, atau menghapus user.</p>
              <ol className="doc-steps">
                <li>Buka Master Data → tab Users.</li>
                <li>Klik "Add User" — isi Email, Nama, Role, dan Password awal.</li>
                <li>Super Admin bisa memilih role apa saja termasuk Super Admin; Finance tidak bisa membuat akun Super Admin baru.</li>
                <li>Kalau role-nya PIC Brand, form akan menampilkan dropdown "Brand" — wajib pilih satu brand, ini yang membatasi akun tersebut hanya bisa melihat data brand itu saja. Kolom "Brand" di tabel User Management menunjukkan brand yang sudah diatur untuk tiap akun PIC.</li>
                <li>Untuk reset password: klik ikon kunci di baris user, isi password baru.</li>
                <li>Untuk hapus akun: klik ikon tempat sampah — aksi ini permanen.</li>
              </ol>
            </details>
          )}

          {(activeRole === 'superadmin' || activeRole === 'finance') && (
            <details className="doc-entity">
              <summary>
                <span className="doc-entity-title"><CheckCircle2 size={16} className="doc-entity-icon" />Approve Budget Request</span>
                <span className="doc-menu-path">Menu "Approval"</span>
              </summary>
              <p className="doc-tujuan">Menyetujui, meminta revisi, atau menolak pengajuan dana dari PIC Brand/role lain.</p>
              <ol className="doc-steps">
                <li>Buka menu Approval — lihat daftar "Antrian approval".</li>
                <li>Cek kolom "Rekomendasi Kas" di sebelah kanan setiap baris: 🟢 Approve (aman), 🟡 Review (kas menipis, pertimbangkan dulu), 🔴 Hold (proyeksi kas jadi negatif kalau disetujui).</li>
                <li>Klik ikon centang untuk Approve (akan diminta isi nominal yang dibayar & catatan feedback), ikon panah untuk minta revisi, atau ikon silang untuk tolak.</li>
              </ol>
              <p className="doc-catatan"><AlertTriangle size={14} /> Rekomendasi Kas ini bantu keputusan, bukan aturan otomatis — kamu tetap bisa approve walau statusnya Hold kalau memang ada pertimbangan lain.</p>
            </details>
          )}
        </div>
      </div>

      <div className="panel tight" style={{ marginTop: '1rem' }}>
        <div className="panel-head">
          <div>
            <h3>Panduan Umum</h3>
          </div>
        </div>
        <ul className="doc-tips">
          {GENERAL_TIPS.map((t, i) => {
            const TipIcon = t.icon;
            return <li key={i}><TipIcon size={16} className="doc-tip-icon" /><span>{t.text}</span></li>;
          })}
        </ul>
      </div>
    </div>
  );
}

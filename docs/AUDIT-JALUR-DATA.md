# Audit Jalur Data & Perhitungan — Dashboard Finance RUN

Ditulis untuk tim finance dan developer yang memelihara sistem ini.
Tanggal audit: 16 September 2026 · Basis: commit `a1aa03e` + database produksi `yksfwxqpxcsmhqgrrrfa`.

Semua angka di dokumen ini diambil dari database produksi saat audit, bukan perkiraan.

---

## 1. Peta jalur: dari input sampai layar

| # | Modul input | Tabel database | Diproses jadi | Muncul di |
|---|---|---|---|---|
| 1 | Budget Request | `fin_budget` | `sisa_hutang` (kolom generated: pengajuan − dibayar), hitung status & prioritas | Approval, Dashboard (Pengajuan, Approval Rate), Analytics (Brand Performance) |
| 2 | Cash In Real | `fin_income` | Σ nominal → Cash In; trigger sinkron ke saldo rekening | Dashboard (Cash In, Net Cash), Analytics (arus kas bulanan), Saldo Rekening |
| 3 | Cash Out | `fin_outcome` | Σ (jumlah + biaya) → Cash Out; `total_pengeluaran` generated; trigger sinkron ke saldo | Dashboard (Cash Out, Net Cash, biaya per kategori), Saldo Rekening |
| 4 | Omzet | `fin_omzet` | `selisih` & `capaian` kolom generated | Dashboard (Capaian Omzet, Cash Conversion, NPM), Analytics (target vs realisasi) |
| 5 | Saldo Rekening | `fin_bank` | `total` generated (awal + masuk − keluar); `pemasukan`/`pengeluaran` **diisi trigger**, bukan diketik | Dashboard (Saldo Rekening, Cash Position) |
| 6 | Forecast Cash In | `fin_forecast_cashin` | Σ dalam rentang tanggal | Dashboard (Forecast Cash Position 30 hari), Approval (rekomendasi kas) |
| 7 | Forecast Cash Out | `fin_forecast_cashout` | Σ dalam rentang tanggal | idem |
| 8 | Hutang | `fin_payables` | Σ (total − dibayar); `progress_pct` generated | Dashboard (Hutang, Payable Risk), Payable Aging |
| 9 | Piutang | `fin_receivables` | Σ (total − diterima) | Dashboard (Piutang, Receivable Risk) |
| 10 | Biaya Layanan | `fin_service` | — | Tabel Operasional saja |
| 11 | Forecasting & Controlling | `fin_forecast_budget` | Laporan laba rugi: subtotal & laba dihitung di aplikasi | Halaman Forecasting & Controlling |
| 12 | Master Vendor / Pelanggan / Brand | `fin_vendors`, `fin_customers`, `fin_brands` | Sumber dropdown | Semua form |

### Diagram versi FigJam

https://www.figma.com/board/yK84E1T8UJhfStZaSjGqK4 — enam diagram dalam satu papan:

1. Peta jalur data antarmodul (garis penuh = jalur jalan, putus-putus = terputus)
2. Dashboard: rumus 8 kartu ringkasan
3. Dashboard: rumus dan ambang warna 7 indikator Early Warning
4. Operasional dan Approval: kolom yang dihitung otomatis per tab
5. Forecasting & Controlling: susunan laba rugi, mana yang manual dan mana yang dihitung sistem
6. Analytics dan Master Data: sumber tiap grafik

### Satu-satunya jalur otomatis antarmodul

```
Cash In  ──┐
           ├──► trigger sync_fin_bank_balance() ──► fin_bank.pemasukan / .pengeluaran ──► Saldo Rekening
Cash Out ──┘
```

Semua hubungan lain di sistem ini **diketik ulang oleh manusia**, tidak mengalir sendiri.

---

## 2. Tabel jalur tiap nilai di Dashboard

| Nilai di layar | Rumus yang dipakai kode | Sumber data | Status |
|---|---|---|---|
| Cash In | Σ `nominal` | `fin_income` | ✅ nyambung |
| Cash Out | Σ (`jumlah` + `biaya`) | `fin_outcome` | ✅ nyambung |
| Net Cash | Cash In − Cash Out | keduanya | ✅ nyambung |
| Saldo Rekening | Σ (saldo awal + pemasukan − pengeluaran) | `fin_bank` | ✅ nyambung, terverifikasi cocok di 11 rekening |
| Cash Position | Saldo Rekening + Cash In hari ini − Cash Out hari ini | `fin_bank` + `fin_income` + `fin_outcome` | ⚠️ hitung ganda (temuan #3) |
| Pengajuan | Σ `nominal_pengajuan` | `fin_budget` | ✅ nyambung |
| Menunggu Approval | jumlah baris berstatus `Pending` | `fin_budget` | ⚠️ rumus tertulis beda (temuan #6) |
| Approval Rate | (Approved + Paid) ÷ semua baris | `fin_budget` | ✅ nyambung |
| Hutang | Σ (total hutang − dibayar) | `fin_payables` | 🔴 tabel kosong → selalu Rp 0 (temuan #2) |
| Piutang | Σ (total piutang − diterima) | `fin_receivables` | 🔴 tabel kosong → selalu Rp 0 |
| Capaian Omzet | realisasi ÷ target | `fin_omzet` | ⚠️ hanya 1 baris data |
| Cash Out Ratio | Cash Out bulan ini ÷ Cash In bulan ini | income + outcome | ✅ nyambung |
| Cash Conversion | Cash In bulan ini ÷ Omzet realisasi bulan ini | income + `fin_omzet` | 🔴 penyebut 0 → hasil 0 |
| Receivable Risk | Piutang ÷ Omzet realisasi bulan ini | receivables + omzet | 🔴 pembilang & penyebut 0 |
| Payable Risk | Hutang ÷ Cash In bulan ini | payables + income | 🔴 pembilang 0 |
| NPM | (Omzet realisasi − Cash Out) ÷ Omzet realisasi, bulan berjalan | omzet + outcome | ⚠️ campur basis (temuan #9) |
| Forecast Cash Position 30 hari | Saldo + Σ forecast in − Σ forecast out (hari ini s/d +30 hari) | `fin_bank` + kedua tabel forecast | ✅ nyambung (13 baris forecast) |
| Payable Aging | sisa hutang dikelompokkan per umur jatuh tempo | `fin_payables` | 🔴 tabel kosong |

---

## 3. Jalur yang seharusnya nyambung tapi terputus

| Dari | Ke | Kondisi sekarang | Akibatnya |
|---|---|---|---|
| Budget Request disetujui | Cash Out | Tidak ada kaitan. `fin_outcome` tidak punya kolom budget | Pembayaran diketik dua kali; tidak bisa ditelusuri budget mana yang jadi pengeluaran mana |
| Budget Request belum lunas | Hutang | Tidak ada kaitan | Sisa hutang Rp 8.163.311 di Budget Request tidak muncul di kartu Hutang |
| Cash In dari pelanggan | Piutang | Tidak ada kaitan | Pelunasan piutang tidak mengurangi piutang otomatis |
| Omzet | Cash In | Tidak ada kaitan | Cash Conversion hanya berarti kalau kedua modul diisi rajin |
| Forecast Cash In/Out | realisasi | Status diketik manual | Tidak ada laporan akurasi forecast |
| Forecasting & Controlling | Omzet / Cash Out | Tidak ada kaitan | Dua versi kebenaran (temuan #5) |
| Biaya Layanan | Cash Out | Tidak ada kaitan | Biaya layanan tidak masuk hitungan pengeluaran |
| Source Workbooks | semua modul | Fungsi import melempar "belum tersedia" | Tombol Import di header selalu gagal |

---

## 4. Temuan, urut dari yang paling mendesak

### 🔴 1. Dua migrasi tidak pernah dijalankan di produksi

`0014_owner_scope.sql` dan `0015_bank_transfers.sql` ada di repo, keduanya bertulis "Run manually in the Supabase SQL editor", dan tidak pernah dijalankan. Tiga akibat nyata:

- **Tombol "Transfer Antar Bank" pasti gagal.** Fungsi `create_bank_transfer()` tidak ada di database.
- **Filter transfer diam-diam tidak bekerja.** Kode membuang baris `kategori = 'Transfer Antar Bank'` dari Cash In, tapi kolom `kategori` tidak pernah ditambahkan ke `fin_income`. Perbandingan dengan kolom yang tidak ada selalu bernilai benar, jadi filter itu tidak pernah membuang apa pun. Belum menimbulkan salah angka hanya karena fitur transfernya sendiri juga mati.
- **Pembatasan Owner tidak berlaku.** Diuji langsung: akun `owner@ptmbn.com` (dibatasi ke PT MBN) tetap melihat data brand HAN (CV HAN) dan LBP (CV LBP) — 259 baris Cash In lintas perusahaan.

### 🔴 2. Kartu Hutang selalu Rp 0

Dashboard membaca `fin_payables`, yang berisi 0 baris. Sementara itu `fin_budget` memegang sisa hutang **Rp 8.163.311** (98 pengajuan Approved, Rp 442.493.924 sudah dibayar dari Rp 450.657.234 diajukan). Angka hutang yang sebenarnya ada di sistem, hanya tidak pernah sampai ke kartu itu. Kartu Piutang dan Payable Aging bernasib sama.

### 🟠 3. Cash Position menghitung transaksi hari ini dua kali

Saldo rekening disinkronkan trigger dari **seluruh** Cash In/Cash Out tanpa batas tanggal, jadi transaksi hari ini sudah termasuk di dalamnya. Lalu rumusnya menambahkan Cash In hari ini dan mengurangi Cash Out hari ini sekali lagi. Selama ada transaksi hari ini, Cash Position selalu meleset sebesar (cash in hari ini − cash out hari ini).

### 🟠 4. 27 Budget Request menunjuk vendor yang tidak ada

Nilai Rp 92.272.225 menggantung pada 5 ID vendor yang tidak terdaftar di Master Vendor:

| ID di transaksi | Nama tertulis | Baris | Nilai |
|---|---|---|---|
| `JT0001` | Ads Tiktok | 13 | Rp 64.360.000 |
| `JT0002` | Ads Shopee | 8 | Rp 16.203.000 |
| `PG002` | CV Loka Bumi Persada | 2 | Rp 5.538.462 |
| `JT0004` | CV. Hasbuna Artha Niaga | 3 | Rp 4.670.763 |
| `JT0005` | CV RANTAI USAHA NUSANTARA | 1 | Rp 1.500.000 |

Nama vendornya tersimpan di baris transaksi, jadi laporan tetap terbaca — tapi tidak bisa ditelusuri ke master, dan vendor ini tidak akan pernah muncul di dropdown.

### 🟠 5. Forecasting & Controlling hidup di dunia terpisah

766 dari 1.404 baris terisi, semuanya diketik manual. Perbandingannya dengan modul operasional:

| | Forecasting & Controlling | Modul operasional |
|---|---|---|
| Omzet realisasi 2026 | Rp 31.319.174.489 | Rp 100.000 (modul Omzet) |
| Beban realisasi 2026 | Rp 29.409.614.887 | Rp 1.021.260.642 (Cash Out) |

Selisihnya bukan soal pembulatan — ini dua pembukuan berbeda yang kebetulan ada di satu aplikasi. Selama realisasi di sini diketik tangan, tidak ada yang menjamin keduanya pernah cocok.

### 🟡 6. Rumus yang ditampilkan tidak sama dengan yang dihitung

Tooltip "Menunggu Approval" menulis *Jumlah Budget Request dengan Status ≠ Approved*, tapi kode menghitung `status === 'Pending'`. Bedanya nyata: 32 baris Pending, sedangkan yang bukan Approved ada 35.

### 🟡 7. Tombol Import tidak berfungsi

`importFromSources()` langsung melempar "Fitur import dari Source Workbooks belum tersedia", dan `fin_sources` berisi 0 baris. Tombolnya tetap tampil di header untuk superadmin dan finance.

### 🟡 8. Tiga modul kosong membuat lima indikator mati

Piutang (0 baris), Biaya Layanan (0 baris), Omzet (1 baris) → Cash Conversion, Receivable Risk, Payable Risk, NPM, dan Payable Aging tidak punya bahan hitung. Yang tampil di layar bukan "kondisi aman", melainkan "tidak ada data".

### 🟡 9. NPM mencampur dua basis akuntansi

`(Omzet realisasi − Cash Out) ÷ Omzet realisasi`. Omzet adalah basis akrual (penjualan yang diakui), Cash Out adalah basis kas (uang yang keluar). Hasilnya bukan margin laba bersih dalam arti akuntansi. Ambang 15%/5% juga catatan internal, bukan dari dokumen EWS.

### 🟡 10. ID Bank tidak dijamin unik

`fin_bank.id_bank` tanpa unique constraint, sementara trigger saldo mencocokkan transaksi ke rekening **berdasarkan `id_bank` saja, tanpa cek brand**. Saat ini aman (11 ID semuanya berbeda), tapi LBP memakai ID bernama `Sentral` dan `BCA CV` — begitu brand lain mendaftarkan ID yang sama, saldo dua brand akan saling tercampur diam-diam.

---

## 5. Yang sudah terbukti benar

- Saldo 11 rekening cocok sempurna dengan hasil hitung ulang dari seluruh transaksi.
- Tidak ada satu pun Cash In/Cash Out yang menggantung tanpa rekening; semua rekening punya ID Bank.
- Semua Budget Request mencantumkan ID Vendor, dan semua Cash In mencantumkan pelanggan terdaftar.
- Kolom generated (`selisih`, `capaian`, `sisa_hutang`, `total`, `progress_pct`) dihitung database, bukan aplikasi — tidak bisa melenceng.
- Rumus Cash In, Cash Out, Net Cash, Saldo Rekening, Approval Rate, dan Forecast Cash Position sudah sesuai antara kode dan tampilan.

---

## 6. Sudah dikerjakan setelah audit (16 Sep 2026)

| Temuan | Tindakan | Bukti |
|---|---|---|
| #1 Migrasi tertinggal | 0014 & 0015 dijalankan di produksi | `create_bank_transfer()` diuji: Rp 500.000 pindah dari Bank Sentral ke Kas Kecil, total brand tetap. `owner@ptmbn.com` kini melihat 5 brand PT MBN saja (dari sebelumnya 8 lintas perusahaan), sedangkan owner tanpa scope tetap melihat semuanya |
| #2 Kartu Hutang Rp 0 | Kartu Hutang kini menjumlahkan modul Hutang + sisa Budget Request yang sudah Approved/Paid | Menampilkan Rp 6.164.303 (modul Rp 0 + Budget Rp 6.164.303). Pending Rp 1.999.008 sengaja tidak ikut: belum disetujui, belum kewajiban |
| #3 Cash Position ganda | Rumus jadi saldo rekening apa adanya; mutasi hari ini ditampilkan sebagai catatan di kartu, bukan ditambahkan lagi | Cash Position = Rp 487.760.619 |
| #6 Rumus menyesatkan | Tooltip "Menunggu Approval", "Cash Position", dan "Hutang" disamakan dengan kode | — |
| #7 Tombol Import | Disembunyikan sampai fiturnya benar-benar ada | — |
| #10 ID Bank bentrok | Unique index parsial pada `fin_bank.id_bank` | Migrasi 0019 |

Masih terbuka: #4 (5 vendor yatim), #5 (Forecasting & Controlling terpisah), #8 (modul kosong), #9 (basis NPM).

---

## 7. Urutan perbaikan yang disarankan

| Prioritas | Tindakan | Dampak |
|---|---|---|
| 1 | Daftarkan 5 vendor yatim, atau petakan ke ID yang sudah ada | 27 transaksi senilai Rp 92.272.225 tertelusur kembali ke master |
| 2 | Tarik realisasi Forecasting & Controlling dari Cash Out, atau tegaskan ia laporan terpisah | Menghapus satu dari dua versi kebenaran |
| 3 | Isi modul Piutang, Biaya Layanan, dan Omzet — atau sembunyikan indikator yang bergantung padanya | Lima indikator berhenti menampilkan nol yang menyesatkan |
| 4 | Sepakati definisi NPM (kas atau akrual), lalu samakan rumusnya | Margin laba bersih jadi angka yang bisa dipertanggungjawabkan |
| 5 | Sambungkan Budget Request yang dibayar → Cash Out otomatis | Berhenti mengetik pembayaran dua kali |

import { columnLabel, entityOfTable } from '../api/supabaseClient.js';

// Supabase/Postgres melempar error dalam bahasa Inggris teknis, misalnya
//   null value in column "tahun" of relation "fin_omzet" violates not-null constraint
// yang tidak berarti apa-apa untuk user finance. SEMUA error aplikasi lewat sini
// supaya keterangannya seragam: baris 1 = apa yang terjadi, baris 2 = cara
// membetulkannya. Dipanggil di lapisan API (financeApi) jadi setiap halaman,
// form, dan tombol otomatis ikut, tanpa perlu diterjemahkan satu per satu.
const line = (judul, keterangan) => `${judul}\n${keterangan}`;

export function humanizeError(err, entity) {
  const raw = typeof err === 'string'
    ? err
    : (err?.message || err?.error_description || err?.error || String(err ?? ''));
  const full = `${raw} ${err?.details || ''} ${err?.hint || ''}`;

  // Nama tabel di pesan Postgres → entitas UI, supaya nama kolom bisa
  // diterjemahkan ke label yang sama persis dengan yang tertulis di form.
  const rel = /relation "([^"]+)"|table "([^"]+)"/i.exec(full);
  const ent = entity || entityOfTable(rel?.[1] || rel?.[2]);
  const col = c => columnLabel(c, ent);

  let m = /null value in column "([^"]+)"/i.exec(raw);
  if (m) return line(
    `Kolom "${col(m[1])}" wajib diisi.`,
    `Data tidak bisa disimpan karena "${col(m[1])}" masih kosong. Lengkapi kolom tersebut lalu klik Simpan lagi.`,
  );

  if (/duplicate key value|violates unique constraint/i.test(full)) {
    const k = /Key \(([^)]+)\)=\(([^)]+)\)/.exec(full);
    return line('Data duplikat — sudah pernah ada.',
      k ? `Sudah ada baris dengan ${k[1].split(', ').map(col).join(' + ')} = ${k[2]}. Ubah nilainya, atau edit data lama daripada menambah baru.`
        : 'Sudah ada baris dengan kode/kombinasi yang sama. Ubah nilainya, atau edit data lama daripada menambah baru.');
  }

  if (/foreign key constraint/i.test(full)) {
    return /still referenced|update or delete/i.test(full)
      ? line('Data ini masih dipakai data lain.',
          'Hapus atau pindahkan dulu transaksi yang memakai data ini (mis. Cash In/Cash Out yang menunjuk ke bank atau vendor ini), baru data ini bisa dihapus.')
      : line('Referensi tidak ditemukan di Master Data.',
          'Nilai yang dipilih (Brand, ID Bank, Vendor, atau Pelanggan) belum terdaftar. Daftarkan dulu lewat menu Master Data, lalu simpan ulang.');
  }

  if (/row-level security|permission denied|insufficient privilege/i.test(full))
    return line('Akses ditolak untuk data ini.',
      'Role akunmu tidak berhak menulis data ini, atau brand/company-nya di luar jangkauan akunmu. Hubungi admin kalau seharusnya boleh.');

  if (/jwt|refresh token|not authenticated|invalid token|unauthorized/i.test(full))
    return line('Sesi login sudah berakhir.', 'Keluar lalu login ulang untuk melanjutkan. Data yang belum tersimpan perlu diisi ulang.');

  m = /invalid input syntax for type (\w+)(?::\s*"([^"]*)")?/i.exec(raw);
  if (m) {
    const t = m[1].toLowerCase();
    const jenis = /num|int|float|double|money/.test(t) ? 'angka' : /date|time/.test(t) ? 'tanggal' : t;
    return line(`Format ${jenis} tidak valid${m[2] ? ` — "${m[2]}"` : ''}.`,
      jenis === 'angka'
        ? 'Isi nominal dengan angka polos saja, tanpa "Rp", titik, koma, atau spasi. Contoh: 76309662.'
        : jenis === 'tanggal'
          ? 'Pilih tanggal lewat kalender di form (format YYYY-MM-DD), jangan diketik bebas.'
          : 'Periksa kembali isian pada form.');
  }

  if (/value too long/i.test(full))
    return line('Teks terlalu panjang.', 'Persingkat isian (biasanya Keterangan atau Catatan) lalu simpan lagi.');

  if (/numeric field overflow|out of range/i.test(full))
    return line('Nilai angka terlalu besar.', 'Periksa lagi nominal yang diisi — kemungkinan ada digit berlebih.');

  if (/check constraint/i.test(full))
    return line('Nilai tidak sesuai aturan sistem.',
      'Salah satu isian di luar nilai yang diizinkan (misal Status, Kategori, atau Prioritas). Pilih dari daftar dropdown yang tersedia.');

  if (/failed to fetch|networkerror|load failed|fetch failed|timeout|network request failed/i.test(full))
    return line('Tidak bisa terhubung ke server.',
      'Cek koneksi internet lalu klik Refresh / Coba Lagi. Kalau jaringan normal, kemungkinan server sedang gangguan.');

  if (/rate limit|too many requests|429/i.test(full))
    return line('Terlalu banyak permintaan.', 'Tunggu kira-kira satu menit, lalu coba lagi.');

  m = /column "?([\w.]+)"? does not exist/i.exec(raw);
  if (m) return line('Struktur data tidak cocok.',
    `Kolom "${m[1]}" tidak ada di database. Ini bug aplikasi, bukan kesalahan input — laporkan ke tim teknis.`);

  if (/relation "[^"]*" does not exist/i.test(raw))
    return line('Tabel tidak ditemukan di database.',
      'Migrasi database kemungkinan belum dijalankan di server ini. Laporkan ke tim teknis.');

  return line('Terjadi kesalahan.', raw || 'Server tidak mengirim keterangan tambahan. Coba ulangi, dan laporkan ke tim teknis bila berulang.');
}

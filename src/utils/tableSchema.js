export function columnType(column) {
  if (/%|Capaian|Progress/i.test(column)) return 'percent';
  if (/^(ID|Kode|No[. ]|Nomor)|URL|Nama|Keterangan|Kategori|Status|Jenis|Kontrol|Catatan|PIC|Bank|Brand|Company|Email/i.test(column)) return 'text';
  if (/Tanggal|Tgl |Estimasi Cair|Estimasi Keluar/i.test(column)) return 'date';
  if (/Nominal|Jumlah|Biaya|Total|Saldo|Pemasukan|Pengeluaran|Sisa|Hutang|Piutang|Target|Realisasi|Selisih|Anggaran/i.test(column)) return 'money';
  return 'text';
}
export function statusClass(value) {
  const text = String(value).toLowerCase();
  if (/nonaktif|false|reject|tolak|cancel|high|terlambat/.test(text)) return 'bad';
  if (/diajukan|pending|termin|dp|medium|revision|belum|partially/.test(text)) return 'warn';
  if (/approved|lunas|^ok$|paid|true|aktif/.test(text)) return 'ok';
  return 'info';
}

// Cek cepat helper tanggal: node scripts/test-ews-dates.mjs
// Yang diuji: dipakai langsung sebagai callback .filter() tidak boleh meledak.
// Dulu omzetRows.filter(isCurrentOmzetMonth) mengisi parameter `today` dengan
// INDEX array, sehingga today.getMonth() melempar TypeError dan SELURUH dashboard
// gagal dimuat — tapi hanya setelah ada minimal satu baris omzet, jadi lolos
// sampai data pertama masuk.
import assert from 'node:assert';
import { isToday, isCurrentMonth, isCurrentOmzetMonth, MONTHS_ID, localDateStr } from '../src/utils/ews.js';

const now = new Date();
const bulanIni = MONTHS_ID[now.getMonth()];
const rows = [
  { bulan: bulanIni, tahun: now.getFullYear() },
  { bulan: bulanIni, tahun: now.getFullYear() - 1 },
  { bulan: MONTHS_ID[(now.getMonth() + 1) % 12], tahun: now.getFullYear() },
];

// Inti perbaikan: dipakai telanjang di .filter(), tanpa pembungkus.
const cocok = rows.filter(isCurrentOmzetMonth);
assert.strictEqual(cocok.length, 1, 'hanya baris bulan dan tahun berjalan yang cocok');
assert.strictEqual(cocok[0].tahun, now.getFullYear());

assert.strictEqual([localDateStr()].filter(isToday).length, 1, 'isToday aman di .filter()');
assert.strictEqual([localDateStr()].filter(isCurrentMonth).length, 1, 'isCurrentMonth aman di .filter()');

// Pemanggilan normal dengan tanggal tetap tetap harus bekerja.
const tetap = new Date(2026, 8, 16);
assert.ok(isCurrentOmzetMonth({ bulan: 'September', tahun: 2026 }, tetap));
assert.ok(!isCurrentOmzetMonth({ bulan: 'Agustus', tahun: 2026 }, tetap));
assert.ok(isToday('2026-09-16', tetap));
assert.ok(isCurrentMonth('2026-09-01', tetap));

console.log('OK - helper tanggal aman dipakai sebagai callback .filter()');

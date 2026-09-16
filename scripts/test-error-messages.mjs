// Cek cepat penerjemah error: node scripts/test-error-messages.mjs
// Yang diuji cuma satu hal — error mentah Postgres harus berubah jadi kalimat
// Indonesia yang menyebut nama kolom seperti di form, bukan nama kolom database.
import assert from 'node:assert';
import { humanizeError } from '../src/utils/errorMessage.js';

const cases = [
  [{ message: 'null value in column "tahun" of relation "fin_omzet" violates not-null constraint' },
   ['Tahun', 'wajib diisi']],
  [{ message: 'duplicate key value violates unique constraint "fin_bank_id_bank_key"', details: 'Key (id_bank)=(BCA-01) already exists.' },
   ['duplikat', 'ID Bank', 'BCA-01']],
  [{ message: 'insert or update on table "fin_income" violates foreign key constraint "fin_income_brand_key_fkey"' },
   ['Master Data']],
  [{ message: 'update or delete on table "fin_bank" violates foreign key constraint' },
   ['masih dipakai']],
  [{ message: 'new row violates row-level security policy for table "fin_outcome"' },
   ['Akses ditolak']],
  [{ message: 'invalid input syntax for type numeric: "Rp 1.000"' },
   ['angka', 'tanpa']],
  [{ message: 'JWT expired' }, ['Sesi login']],
  [{ message: 'Failed to fetch' }, ['terhubung ke server']],
  ['sesuatu yang aneh', ['Terjadi kesalahan', 'sesuatu yang aneh']],
];

for (const [input, expected] of cases) {
  const out = humanizeError(input);
  assert.ok(out.includes('\n'), `harus punya judul + keterangan: ${out}`);
  for (const frag of expected) {
    assert.ok(out.includes(frag), `"${frag}" tidak ada di: ${out}`);
  }
}
console.log(`OK — ${cases.length} jenis error diterjemahkan dengan benar.`);

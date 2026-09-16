-- sync_fin_bank_balance() mencocokkan transaksi ke rekening lewat id_bank SAJA,
-- tanpa ikut mengecek brand — jadi kalau dua brand kebetulan memakai ID Bank yang
-- sama, pemasukan/pengeluaran keduanya akan saling tercampur tanpa peringatan.
-- Saat audit 16 Sep 2026 ke-11 ID masih unik, tapi penamaannya longgar ("Sentral",
-- "BCA CV"), jadi bentrokan tinggal menunggu waktu.
--
-- Partial index: baris tanpa ID Bank (belum diisi) tidak ikut dibatasi.
create unique index if not exists fin_bank_id_bank_unique
  on fin_bank (id_bank) where id_bank is not null and id_bank <> '';

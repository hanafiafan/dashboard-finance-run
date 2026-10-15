-- Omzet bisa diinput harian: tambah tanggal (opsional, data lama tetap NULL).
alter table fin_omzet add column if not exists tanggal date;

notify pgrst, 'reload schema';

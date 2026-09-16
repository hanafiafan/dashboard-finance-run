-- Menutup lubang: setiap tabel fin_* masih menyisakan policy "fin_allow_all"
-- (for all using (true)) dari masa sebelum RLS dirapikan di 0002. Policy RLS
-- di-OR, jadi satu policy `true` membatalkan SELURUH aturan role di 0002/0011:
-- dengan anon key yang memang publik di bundle JS, tanpa login sama sekali,
-- semua transaksi keuangan bisa dibaca, ditulis, dan dihapus siapa pun.
--
-- Aman di-drop: ke-13 tabel ini sudah punya pasangan policy _select/_write
-- (plus _pic_insert/_pic_update) yang mengatur akses per role dan per brand.
-- Konsekuensi yang memang disengaja: pic_brand kehilangan hak DELETE di
-- fin_income/fin_outcome/fin_budget — persis seperti yang dirancang di 0011,
-- yang selama ini bocor gara-gara policy ini.
do $$
declare
  t text;
begin
  foreach t in array array[
    'fin_bank', 'fin_brands', 'fin_budget', 'fin_customers', 'fin_forecast_cashin',
    'fin_income', 'fin_omzet', 'fin_outcome', 'fin_payables', 'fin_receivables',
    'fin_service', 'fin_sources', 'fin_vendors'
  ] loop
    execute format('drop policy if exists "fin_allow_all" on %I', t);
  end loop;
end $$;

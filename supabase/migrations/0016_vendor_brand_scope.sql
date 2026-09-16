-- Vendor per brand. Sebelumnya fin_vendors sepenuhnya global (lihat 0011):
-- dropdown Vendor di Budget Request / Hutang / Biaya Layanan menampilkan SEMUA
-- vendor dari semua brand, jadi PIC brand A bisa salah pilih vendor brand B.
--
-- brand_key nullable dan TIDAK di-FK (konvensi sama seperti id_bank di 0012 —
-- ditegakkan aplikasi, bukan schema):
--   brand_key NULL  → vendor umum, muncul di semua brand (perilaku lama,
--                     semua baris existing tetap seperti sekarang)
--   brand_key terisi → vendor khusus brand itu, hanya muncul di brand tsb
alter table fin_vendors add column if not exists brand_key text;

-- Dipakai setiap kali dropdown vendor difilter per brand.
create index if not exists fin_vendors_brand_key_idx on fin_vendors (brand_key);

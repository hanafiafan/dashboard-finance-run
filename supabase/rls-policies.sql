-- =============================================================================
-- Dashboard Finance RUN — Row Level Security (RLS) hardening
-- =============================================================================
-- KONDISI TERVERIFIKASI (dari pg_policies):
--   Semua 14 tabel fin_* punya policy `fin_allow_all` untuk role {public},
--   cmd = ALL, using = true, check = true. Artinya RLS aktif TAPI mengizinkan
--   siapa pun (anon key ada di bundle JS) untuk baca/tulis/hapus semua data,
--   termasuk dump email + password dari fin_users. Ini praktis = tanpa proteksi.
--
-- CATATAN PENTING soal urutan Postgres RLS:
--   Policy PERMISSIVE di-OR-kan. Menambah policy ketat TIDAK menutup apa pun
--   selama `fin_allow_all` masih ada. Jadi policy itu HARUS di-DROP dulu.
--
-- CATATAN soal aplikasi:
--   App menulis ke Supabase juga pakai anon key (approval/insert/update/delete).
--   Mengunci tulis => fitur tulis mati, KECUALI sudah migrasi ke Supabase Auth
--   (ada role `authenticated`). Karena itu file ini dibagi 2 FASE.
-- =============================================================================


-- #############################################################################
-- FASE 1 — Tutup lubang dump kredensial (BISA dijalankan sekarang)
-- #############################################################################
-- Efek: fin_users tidak lagi bisa dibaca/ditulis langsung oleh anon.
-- WAJIB dibarengi: ganti login di frontend ke RPC fin_verify_login
--   (lihat AUTH-MIGRATION.md §Interim). Begitu blok ini dijalankan, login lama
--   (anon select ke fin_users) akan GAGAL sampai frontend memakai RPC.
--   Jalankan di staging/preview dulu, lalu deploy frontend, baru produksi.

create extension if not exists pgcrypto;

-- 1a. RPC verifikasi login server-side (tidak membocorkan hash ke client).
--     password_hash saat ini PLAINTEXT; setelah di-hash, tukar ke baris crypt().
create or replace function fin_verify_login(p_email text, p_password text)
returns table (email text, name text, role text, company_scope text, brand_scope text)
language sql
security definer
set search_path = public
as $$
  select u.email, u.name, u.role, u.company_scope, u.brand_scope
  from fin_users u
  where u.email = p_email
    and u.active = true
    and u.password_hash = p_password
    -- HASHED (setelah migrasi hashing): ganti baris di atas dengan:
    -- and u.password_hash = crypt(p_password, u.password_hash)
$$;

revoke all on function fin_verify_login(text, text) from public;
grant execute on function fin_verify_login(text, text) to anon, authenticated;

-- 1b. Cabut akses publik langsung ke fin_users.
drop policy if exists fin_allow_all on fin_users;
-- Tidak dibuat policy pengganti untuk anon: dengan RLS aktif tanpa policy anon,
-- akses langsung dari client ditolak. Login lewat RPC di atas. Manajemen user
-- dilakukan lewat Edge Function ber-service_role (lihat AUTH-MIGRATION.md).


-- #############################################################################
-- FASE 2 — Kunci tabel data per-role (BUTUH Supabase Auth aktif dulu)
-- #############################################################################
-- JANGAN jalankan blok ini sebelum migrasi Supabase Auth selesai (Target phase
-- di AUTH-MIGRATION.md). Tanpa role `authenticated` + JWT, men-drop fin_allow_all
-- akan mematikan SEMUA fitur baca & tulis di aplikasi (app pakai anon key).
--
-- Setelah Auth aktif, hapus komentar blok di bawah dan jalankan:
/*
do $$
declare t text;
begin
  foreach t in array array[
    'fin_budget','fin_income','fin_outcome','fin_omzet','fin_bank',
    'fin_payables','fin_receivables','fin_forecast_cashin','fin_service',
    'fin_brands','fin_sources','fin_vendors','fin_customers'
  ] loop
    -- buang policy permisif lama
    execute format('drop policy if exists fin_allow_all on %I;', t);

    -- BACA: superadmin/finance/owner lihat semua; role lain hanya brand-nya
    execute format($p$
      create policy %I on %I for select to authenticated using (
        (auth.jwt() ->> 'role') in ('superadmin','finance','owner')
        or brand_key = (auth.jwt() ->> 'brand_scope')
      );$p$, t||'_read', t);

    -- TULIS (insert/update/delete): hanya superadmin & finance
    execute format($p$
      create policy %I on %I for all to authenticated
      using ((auth.jwt() ->> 'role') in ('superadmin','finance'))
      with check ((auth.jwt() ->> 'role') in ('superadmin','finance'));
    $p$, t||'_write', t);
  end loop;
end $$;
*/
-- Catatan: `brand_key` ada di tabel transaksi; untuk tabel master (vendors/
-- customers) sesuaikan syarat baca (mis. semua authenticated boleh baca).


-- #############################################################################
-- OPSIONAL — hash password yang saat ini plaintext (jalankan SEKALI, kapan saja)
-- #############################################################################
-- update fin_users set password_hash = crypt(password_hash, gen_salt('bf'))
-- where password_hash !~ '^\$2[aby]\$';   -- lewati yang sudah ter-hash
-- Lalu aktifkan baris crypt() di fin_verify_login & nonaktifkan baris plaintext.

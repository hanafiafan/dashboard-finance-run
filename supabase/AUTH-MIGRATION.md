# Auth & Security Migration Plan

Status audit: autentikasi **belum** memakai Supabase Auth. Login membandingkan
password plaintext ke kolom `fin_users.password_hash` via query anon, dan RBAC
hanya ditegakkan di UI. Dokumen ini membagi perbaikan jadi 2 tahap: **Interim**
(cepat, menutup lubang terbesar tanpa mengganti seluruh sistem) dan **Target**
(Supabase Auth penuh).

---

## Tahap 1 — INTERIM (menutup lubang dump kredensial)

**Tujuan:** anon tidak lagi bisa membaca `fin_users` (email + password) langsung.

### 1a. Jalankan SQL
Jalankan `supabase/rls-policies.sql` di Supabase → SQL Editor. Ini membuat RPC
`fin_verify_login`, mengunci `fin_users`, dan mengaktifkan RLS di tabel data.

### 1b. Ganti login di frontend
Setelah SQL di atas dijalankan, ubah `src/contexts/AuthContext.jsx` — ganti dua
blok query langsung (di `useEffect` restore-session dan di `login`) dari:

```js
const { data, error } = await supabase
  .from('fin_users').select('*')
  .eq('email', email).eq('password_hash', password).eq('active', true).single();
```

menjadi panggilan RPC (tidak pernah menyentuh tabel langsung):

```js
const { data, error } = await supabase
  .rpc('fin_verify_login', { p_email: email, p_password: password });
const user = data?.[0];
if (error || !user) { /* gagal login */ }
// user = { email, name, role, company_scope, brand_scope }
```

> ⚠️ Uji di staging / preview deploy dulu. Kalau SQL belum dijalankan di DB yang
> dipakai, RPC belum ada dan login akan gagal. Jangan deploy 1b sebelum 1a.

### 1c. (Opsional) hash password plaintext
Lihat blok "OPSIONAL" di akhir `rls-policies.sql`.

---

## Tahap 2 — TARGET (Supabase Auth penuh)

**Tujuan:** hilangkan password buatan sendiri, session/refresh dikelola Supabase,
RBAC ditegakkan Postgres (RLS), bukan UI.

1. **Buat auth users.** Untuk tiap baris `fin_users`, buat user di Supabase Auth
   (`auth.admin.createUser`) via script bertoken service_role. Karena password
   lama plaintext, bisa langsung dipakai sebagai password awal + paksa reset.
2. **Jadikan `fin_users` tabel profil**, di-key dengan `id uuid references auth.users`.
   Simpan `role`, `company_scope`, `brand_scope` di sini. Hapus `password_hash`.
3. **Role claim.** Isi `role` ke `raw_app_meta_data` user Auth (lewat trigger /
   Edge Function) supaya bisa dibaca di policy via `auth.jwt() ->> 'role'`.
4. **Frontend:** ganti `login()` jadi `supabase.auth.signInWithPassword(...)`,
   `logout()` jadi `supabase.auth.signOut()`, dan restore-session pakai
   `supabase.auth.getSession()` + `onAuthStateChange`. Hapus penyimpanan password
   di localStorage (`STORAGE_KEY_PASSWORD`) dan fungsi base64 `encode/decodePassword`.
5. **RLS ketat.** Aktifkan policy per-brand & per-role (lihat blok TODO di
   `rls-policies.sql`) menggantikan policy baca anon interim.
6. **UserManagement:** operasi create/reset/delete user harus lewat Edge Function
   ber-service_role (bukan tulis localStorage seperti sekarang), dengan cek role
   di server — bukan hanya menyembunyikan tombol di UI.

---

## Checklist masalah audit yang ditutup

| Kode | Masalah | Ditutup di |
|------|---------|-----------|
| C2 | Password plaintext dibanding via query anon | Interim 1b + Target 1-4 |
| C3 | RLS tidak aktif / RBAC hanya di UI | Interim 1a + Target 5 |
| H1 | Password base64 di localStorage | Target 4 |
| H3 | Kredensial demo hardcoded di bundle | Tetap aman selama gating `isProduction`; hilang total di Target 4 |

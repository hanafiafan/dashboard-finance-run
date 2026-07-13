# Dashboard Finance RUN

Multi-company & multi-brand finance operating system. React SPA yang menampilkan
cashflow, budget/approval, omzet, hutang-piutang, dan saldo bank lintas brand,
dengan data dari Supabase PostgreSQL.

## Stack

- **Frontend:** React 19 + Vite 8 (SPA, tanpa router lib — navigasi via state)
- **Charts:** Chart.js + react-chartjs-2, dan D3 untuk waterfall/treemap
- **Backend/data:** Supabase (PostgreSQL, 14 tabel `fin_*`) via `@supabase/supabase-js`
- **Deploy:** Vercel (`dashboard-finance-run.vercel.app`)

## Struktur

```
src/
  api/            financeApi.js (query & transform), supabaseClient.js (client + mapping tabel/kolom)
  contexts/       AuthContext (login/session), AppContext (state global)
  hooks/          useFilters
  layouts/        AppShell (sidebar, topbar, routing view)
  pages/          CommandCenter, Analytics, Operations, Approval, Master, UserManagement, Login
  components/     charts/*, ui/*, filters/*
  utils/          formatters, constants, chartTheme, demoData (mode demo lokal)
```

## Menjalankan lokal

```bash
npm install
npm run dev      # http://localhost:5173 — mode demo (data dummy, tanpa Supabase)
```

Di localhost aplikasi berjalan **mode demo**: login pakai kredensial demo yang
ada di layar Login, data berasal dari `src/utils/demoData.js`. Tidak menyentuh
Supabase.

## Environment variables

Set di Vercel (Project → Settings → Environment Variables), lihat `.env.example`:

| Var | Keterangan |
|-----|-----------|
| `VITE_SUPABASE_URL` | URL project Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key (publik — data dilindungi RLS, bukan oleh kerahasiaan key) |

Kalau kedua var kosong, kode fallback ke nilai hardcoded di `supabaseClient.js`.

## Perintah

```bash
npm run dev       # dev server
npm run build     # build produksi ke dist/
npm run preview   # preview hasil build
npm run lint      # oxlint
```

## Keamanan — WAJIB DIBACA

- **RLS harus aktif** di semua tabel `fin_*`. Anon key bersifat publik; tanpa
  Row Level Security, siapa pun bisa membaca/menulis tabel langsung. Lihat
  `supabase/rls-policies.sql`.
- **Auth saat ini belum pakai Supabase Auth** (masih membandingkan password ke
  kolom `password_hash` via query). Rencana migrasi ke Supabase Auth ada di
  `supabase/AUTH-MIGRATION.md`.

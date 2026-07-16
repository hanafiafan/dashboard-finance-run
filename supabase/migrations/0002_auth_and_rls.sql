-- Migrates auth from the custom fin_users plaintext-password table to Supabase Auth,
-- and turns on Row Level Security so permissions are enforced by Postgres itself
-- instead of only by the React UI (anon key can currently read/write every table).
--
-- Run manually in the Supabase SQL editor, AFTER creating auth.users accounts for
-- your real users (see scripts/migrate-users-to-auth.mjs in this repo — run that
-- FIRST, it creates the auth.users rows and calls this migration's profiles insert
-- for you). Running this file alone only sets up the schema; it does not create
-- any user accounts.

-- 1. Profile table — one row per Supabase Auth user, holds the app-specific role.
-- Replaces fin_users (which stored email/name/role/password_hash in plaintext).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null check (role in ('superadmin', 'finance', 'owner', 'pic_brand')),
  company_scope text,
  brand_scope text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Every authenticated user can read their own profile (needed right after login
-- to know their role); superadmin/finance can read everyone's for User Management.
create policy "profiles_select" on profiles for select
  using (auth.uid() = id or exists (
    select 1 from profiles me where me.id = auth.uid() and me.role in ('superadmin', 'finance') and me.active
  ));
-- No insert/update/delete policy: profile rows are only ever written by the
-- api/manage-user.js serverless function using the service_role key, which
-- bypasses RLS entirely — nobody can self-promote their own role from the client.

-- 2. Helper functions — read the calling user's role/scope once, reuse everywhere below.
create or replace function auth_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_brand_scope() returns text
language sql stable security definer set search_path = public as $$
  select brand_scope from profiles where id = auth.uid()
$$;

create or replace function auth_active() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select active from profiles where id = auth.uid()), false)
$$;

-- 3. Brand-scoped operational tables.
-- Read: superadmin/finance/owner see all brands; pic_brand sees only their own.
-- Write groups differ per table to match the permissions already encoded in
-- src/utils/demoData.js buildEntities() — this does not change what any role
-- could already do through the UI, it just makes Postgres enforce it too.
do $$
declare
  t text;
  read_scoped_tables text[] := array[
    'fin_budget', 'fin_income', 'fin_forecast_cashin', 'fin_forecast_cashout',
    'fin_outcome', 'fin_omzet', 'fin_bank', 'fin_service', 'fin_payables', 'fin_receivables'
  ];
begin
  foreach t in array read_scoped_tables loop
    execute format('alter table %I enable row level security', t);
    execute format($f$
      create policy "%1$s_select" on %1$s for select
      using (
        auth_active() and (
          auth_role() in ('superadmin', 'finance', 'owner')
          or (auth_role() = 'pic_brand' and brand_key = auth_brand_scope())
        )
      )
    $f$, t);
  end loop;
end $$;

-- Write: fin_budget — every active role, pic_brand restricted to their own brand.
create policy "fin_budget_write" on fin_budget for all
  using (
    auth_active() and (
      auth_role() in ('superadmin', 'finance', 'owner')
      or (auth_role() = 'pic_brand' and brand_key = auth_brand_scope())
    )
  )
  with check (
    auth_active() and (
      auth_role() in ('superadmin', 'finance', 'owner')
      or (auth_role() = 'pic_brand' and brand_key = auth_brand_scope())
    )
  );

-- Write: cash movement/forecast tables — superadmin/finance/owner, no pic_brand.
do $$
declare
  t text;
  owner_write_tables text[] := array['fin_income', 'fin_forecast_cashin', 'fin_forecast_cashout', 'fin_outcome'];
begin
  foreach t in array owner_write_tables loop
    execute format($f$
      create policy "%1$s_write" on %1$s for all
      using (auth_active() and auth_role() in ('superadmin', 'finance', 'owner'))
      with check (auth_active() and auth_role() in ('superadmin', 'finance', 'owner'))
    $f$, t);
  end loop;
end $$;

-- Write: finance-only ledgers — omzet targets, bank balances, payables/receivables,
-- service fees. Owner and pic_brand are read-only here (matches buildEntities()).
do $$
declare
  t text;
  finance_only_tables text[] := array['fin_omzet', 'fin_bank', 'fin_service', 'fin_payables', 'fin_receivables'];
begin
  foreach t in array finance_only_tables loop
    execute format($f$
      create policy "%1$s_write" on %1$s for all
      using (auth_active() and auth_role() in ('superadmin', 'finance'))
      with check (auth_active() and auth_role() in ('superadmin', 'finance'))
    $f$, t);
  end loop;
end $$;

-- 4. Shared reference/master tables — readable by everyone logged in (forms need
-- vendor/customer/brand pickers regardless of role); writable by superadmin/finance.
do $$
declare
  t text;
  reference_tables text[] := array['fin_brands', 'fin_sources', 'fin_vendors', 'fin_customers'];
begin
  foreach t in array reference_tables loop
    execute format('alter table %I enable row level security', t);
    execute format($f$
      create policy "%1$s_select" on %1$s for select using (auth_active())
    $f$, t);
    execute format($f$
      create policy "%1$s_write" on %1$s for all
      using (auth_active() and auth_role() in ('superadmin', 'finance'))
      with check (auth_active() and auth_role() in ('superadmin', 'finance'))
    $f$, t);
  end loop;
end $$;

-- 5. Old plaintext-password user table — no longer used for login once the app
-- is switched over (see AuthContext.jsx). Kept temporarily so you can double-check
-- the migrated data in scripts/migrate-users-to-auth.mjs matches, then drop it:
--   drop table fin_users;

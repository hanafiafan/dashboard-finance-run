-- Owner accounts currently see every brand/company (0002_auth_and_rls.sql
-- bundles 'owner' in with 'superadmin'/'finance' on every SELECT policy, with
-- no scope check). This adds optional per-owner scoping, reusing the
-- `company_scope`/`brand_scope` columns that already exist on `profiles`
-- (added in 0002 but never read for owner) — same mechanism pic_brand already
-- uses for `brand_scope`, extended with a company-level option since one
-- company can have several brands.
--
-- NULL/NULL on both columns = unrestricted (today's behavior, unchanged).
-- brand_scope set = owner sees only that one brand.
-- company_scope set (brand_scope null) = owner sees every brand under that company.
--
-- Run manually in the Supabase SQL editor.

create or replace function auth_company_scope() returns text
language sql stable security definer set search_path = public as $$
  select company_scope from profiles where id = auth.uid()
$$;

-- Only meaningful when called for an 'owner' row (see usage below) — reads
-- the calling user's own brand_scope/company_scope and checks p_brand_key
-- against whichever is set, most-specific (brand) first.
create or replace function auth_owner_scope_ok(p_brand_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when auth_brand_scope() is not null then p_brand_key = auth_brand_scope()
    when auth_company_scope() is not null then exists (
      select 1 from fin_brands b where b.brand_key = p_brand_key and b.company = auth_company_scope()
    )
    else true
  end
$$;

do $$
declare
  t text;
  brand_scoped_tables text[] := array[
    'fin_budget', 'fin_income', 'fin_forecast_cashin', 'fin_forecast_cashout',
    'fin_outcome', 'fin_omzet', 'fin_bank', 'fin_service', 'fin_payables',
    'fin_receivables', 'fin_forecast_budget'
  ];
begin
  foreach t in array brand_scoped_tables loop
    execute format('drop policy if exists "%1$s_select" on %1$s', t);
    execute format($f$
      create policy "%1$s_select" on %1$s for select
      using (
        auth_active() and (
          auth_role() in ('superadmin', 'finance')
          or (auth_role() = 'owner' and auth_owner_scope_ok(brand_key))
          or (auth_role() = 'pic_brand' and brand_key = auth_brand_scope())
        )
      )
    $f$, t);
  end loop;
end $$;

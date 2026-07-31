-- Revises the role permission matrix:
--   Owner: was able to write fin_budget/fin_income/fin_outcome/fin_forecast_cashin/
--   fin_forecast_cashout and approve budgets — becomes read-only everywhere.
--   PIC Brand: was budget-only — gains insert+update (no delete) on fin_income,
--   fin_outcome, fin_payables scoped to their own brand, plus insert-only on
--   fin_vendors (vendors are a shared/global table, not brand-scoped).
-- No delete policy is created anywhere for pic_brand — Postgres RLS denies any
-- operation with no matching policy, so omitting delete is the block (same
-- pattern as fin_budget_pic_update in 0008).

-- 1. Owner loses write access to fin_budget (canApprove is revoked separately
-- in AuthContext.jsx buildSession(), this only covers direct table writes).
drop policy if exists "fin_budget_write_admin" on fin_budget;
create policy "fin_budget_write_admin" on fin_budget for all
  using (auth_active() and auth_role() in ('superadmin', 'finance'))
  with check (auth_active() and auth_role() in ('superadmin', 'finance'));

-- 2. Owner loses write access to forecast tables (no pic_brand access added —
-- forecasting stays out of PIC's granted scope per the revision).
do $$
declare
  t text;
  tables text[] := array['fin_forecast_cashin', 'fin_forecast_cashout'];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "%1$s_write" on %1$s', t);
    execute format($f$
      create policy "%1$s_write" on %1$s for all
      using (auth_active() and auth_role() in ('superadmin', 'finance'))
      with check (auth_active() and auth_role() in ('superadmin', 'finance'))
    $f$, t);
  end loop;
end $$;

-- 3. fin_income / fin_outcome: owner loses write, pic_brand gains scoped
-- insert+update (no delete).
do $$
declare
  t text;
  tables text[] := array['fin_income', 'fin_outcome'];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "%1$s_write" on %1$s', t);
    execute format($f$
      create policy "%1$s_write_admin" on %1$s for all
      using (auth_active() and auth_role() in ('superadmin', 'finance'))
      with check (auth_active() and auth_role() in ('superadmin', 'finance'))
    $f$, t);
    execute format($f$
      create policy "%1$s_pic_insert" on %1$s for insert
      with check (auth_active() and auth_role() = 'pic_brand' and brand_key = auth_brand_scope())
    $f$, t);
    execute format($f$
      create policy "%1$s_pic_update" on %1$s for update
      using (auth_active() and auth_role() = 'pic_brand' and brand_key = auth_brand_scope())
      with check (auth_active() and auth_role() = 'pic_brand' and brand_key = auth_brand_scope())
    $f$, t);
  end loop;
end $$;

-- 4. fin_payables: was finance-only, pic_brand gains scoped insert+update (no delete).
drop policy if exists "fin_payables_write" on fin_payables;
create policy "fin_payables_write_admin" on fin_payables for all
  using (auth_active() and auth_role() in ('superadmin', 'finance'))
  with check (auth_active() and auth_role() in ('superadmin', 'finance'));
create policy "fin_payables_pic_insert" on fin_payables for insert
  with check (auth_active() and auth_role() = 'pic_brand' and brand_key = auth_brand_scope());
create policy "fin_payables_pic_update" on fin_payables for update
  using (auth_active() and auth_role() = 'pic_brand' and brand_key = auth_brand_scope())
  with check (auth_active() and auth_role() = 'pic_brand' and brand_key = auth_brand_scope());

-- 5. fin_vendors: pic_brand can add new vendors (global table, no brand scoping —
-- a vendor added by one brand's PIC becomes usable by every brand, matching how
-- vendors already work for every other role).
create policy "fin_vendors_pic_insert" on fin_vendors for insert
  with check (auth_active() and auth_role() = 'pic_brand');

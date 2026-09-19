-- Month-end close: once a superadmin locks a period, no role (including
-- superadmin) can insert/update/delete fin_budget, fin_income, or fin_outcome
-- rows dated inside it — enforced in RLS, not just the UI, since a closed
-- book that the app merely "discourages" editing isn't actually closed.
-- To edit a locked month again, a superadmin must explicitly unlock it first
-- (delete its fin_period_locks row), which is itself audit-logged by the app.

create table fin_period_locks (
  id bigint generated always as identity primary key,
  period_month date not null unique,
  locked_by uuid references profiles(id),
  locked_at timestamptz not null default now()
);
alter table fin_period_locks enable row level security;

create policy fin_period_locks_select on fin_period_locks for select
  using (auth_active());
create policy fin_period_locks_write on fin_period_locks for all
  using (auth_active() and auth_role() = 'superadmin')
  with check (auth_active() and auth_role() = 'superadmin');

create or replace function is_period_locked(check_date date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from fin_period_locks
    where period_month = date_trunc('month', check_date)::date
  )
$$;

-- fin_budget: re-create 0024's two write policies with the lock check added
-- to both using and with check (using also covers delete/pre-update visibility).
drop policy fin_budget_superadmin_write on fin_budget;
create policy fin_budget_superadmin_write on fin_budget
  for all
  using (auth_active() and auth_role() = 'superadmin' and not is_period_locked(tgl_pengajuan))
  with check (auth_active() and auth_role() = 'superadmin' and not is_period_locked(tgl_pengajuan));

drop policy fin_budget_finance_write on fin_budget;
create policy fin_budget_finance_write on fin_budget
  for all
  using (auth_active() and auth_role() = 'finance' and not is_period_locked(tgl_pengajuan))
  with check (
    auth_active() and auth_role() = 'finance'
    and not is_period_locked(tgl_pengajuan)
    and (status not in ('Approved', 'Paid') or nominal_pengajuan <= fin_budget_approval_threshold())
  );

-- fin_income / fin_outcome: re-create 0002's write policy with the lock check added.
drop policy fin_income_write on fin_income;
create policy fin_income_write on fin_income
  for all
  using (auth_active() and auth_role() in ('superadmin', 'finance', 'owner') and not is_period_locked(tanggal))
  with check (auth_active() and auth_role() in ('superadmin', 'finance', 'owner') and not is_period_locked(tanggal));

drop policy fin_outcome_write on fin_outcome;
create policy fin_outcome_write on fin_outcome
  for all
  using (auth_active() and auth_role() in ('superadmin', 'finance', 'owner') and not is_period_locked(tanggal))
  with check (auth_active() and auth_role() in ('superadmin', 'finance', 'owner') and not is_period_locked(tanggal));

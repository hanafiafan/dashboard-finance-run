-- Bank reconciliation v1: compares the system-tracked running balance
-- (fin_bank.total) against the real bank statement's ending balance for a
-- period, and records the check (not full line-item transaction matching —
-- that would need bank-statement import/matching, a much larger feature).
create table fin_bank_reconciliation (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references fin_bank(id) on delete cascade,
  brand_key text not null references fin_brands(brand_key),
  period_date date not null,
  system_balance numeric not null,
  statement_balance numeric not null,
  difference numeric generated always as (statement_balance - system_balance) stored,
  note text,
  reconciled_by text,
  created_at timestamptz not null default now()
);

create index fin_bank_reconciliation_bank_idx on fin_bank_reconciliation (bank_id, period_date desc);

alter table fin_bank_reconciliation enable row level security;

create policy fin_bank_reconciliation_select on fin_bank_reconciliation for select using (
  auth_active() and (
    auth_role() in ('superadmin', 'finance')
    or (auth_role() = 'owner' and auth_owner_scope_ok(brand_key))
    or (auth_role() = 'pic_brand' and brand_key = auth_brand_scope())
  )
);

create policy fin_bank_reconciliation_write on fin_bank_reconciliation for all using (
  auth_active() and auth_role() in ('superadmin', 'finance')
) with check (
  auth_active() and auth_role() in ('superadmin', 'finance')
);

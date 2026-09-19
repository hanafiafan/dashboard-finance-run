-- Amount-based two-tier approval: Finance can approve budget requests up to
-- the threshold on their own; above it, their "Approve" only moves the
-- request to 'Pending Final Approval' and a Super Admin must finalize it.
-- Enforced at the RLS layer (not just the UI) since that's the actual
-- security boundary — the app's Approval.jsx sets the right target status,
-- but even if a client sent the wrong one, the database rejects it.

alter table fin_budget drop constraint fin_budget_status_check;
alter table fin_budget add constraint fin_budget_status_check
  check (status = any (array['Pending', 'Approved', 'Need Revision', 'Rejected', 'Paid', 'Pending Final Approval']));

create or replace function fin_budget_approval_threshold() returns numeric
language sql immutable as $$ select 10000000::numeric $$;

drop policy fin_budget_write_admin on fin_budget;

create policy fin_budget_superadmin_write on fin_budget
  for all
  using (auth_active() and auth_role() = 'superadmin')
  with check (auth_active() and auth_role() = 'superadmin');

create policy fin_budget_finance_write on fin_budget
  for all
  using (auth_active() and auth_role() = 'finance')
  with check (
    auth_active() and auth_role() = 'finance'
    and (status not in ('Approved', 'Paid') or nominal_pengajuan <= fin_budget_approval_threshold())
  );

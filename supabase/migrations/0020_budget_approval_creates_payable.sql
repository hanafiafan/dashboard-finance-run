-- Approving a Budget Request (fin_budget) used to only update its own status —
-- the amount still owed never showed up as a row in fin_payables (the Hutang
-- table), only in the Dashboard's payableFromBudget KPI math. financeApi.js's
-- syncPayableFromBudget() now mirrors an Approved/Paid budget into its own
-- fin_payables row, linked back via budget_id so it can be upserted/removed
-- as the budget's status changes instead of piling up duplicates.
--
-- Plain (non-partial) unique constraint: Postgres never treats two NULLs as
-- conflicting, so rows with no budget_id (ordinary manually-entered payables)
-- are unaffected — this only enforces "at most one payable per budget". A
-- partial index (`where budget_id is not null`) looked equivalent but broke
-- supabase-js's .upsert(..., {onConflict: 'budget_id'}), which issues a plain
-- `ON CONFLICT (budget_id)` with no predicate to match it against.
alter table fin_payables add column if not exists budget_id uuid references fin_budget(id) on delete cascade;

alter table fin_payables add constraint fin_payables_budget_id_key unique (budget_id);

-- Old plaintext-password user table, fully replaced by Supabase Auth + profiles
-- (see 0002_auth_and_rls.sql). All 4 accounts confirmed logging in successfully
-- via the new flow before this was applied.
--
-- CASCADE only drops the fin_budget_created_by_fkey constraint that referenced
-- this table — it does not touch fin_budget's rows or any other table's data.
drop table if exists fin_users cascade;

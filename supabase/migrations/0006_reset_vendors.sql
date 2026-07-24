-- Clears vendor master data per user request. CASCADE is required because
-- fin_budget/fin_payables have FK constraints referencing fin_vendors — both
-- are already empty from 0005, so this only clears fin_vendors itself.
truncate table fin_vendors restart identity cascade;

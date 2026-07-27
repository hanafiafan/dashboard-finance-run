-- Fixes forms that reference columns which never existed on these tables —
-- saving Payables/Receivables with a "Source" value, or Source Workbooks with
-- "Notes", failed outright (PostgREST rejects an unknown column name), because
-- FORMS in constants.js had these fields but COL_MAP never mapped them and no
-- migration had ever created them.
--
-- Also adds fin_payables.tgl_jatuh_tempo (due date), needed so the Payable
-- Aging chart can bucket by real elapsed days instead of always showing
-- everything in the "0-30 hari" bucket (there was no date to bucket by before).
alter table fin_payables add column if not exists source text;
alter table fin_payables add column if not exists tgl_jatuh_tempo date;
alter table fin_receivables add column if not exists source text;
alter table fin_sources add column if not exists notes text;

-- Dedicated bank-to-bank transfer support (e.g. moving cash from "Bank Sentral"
-- to "Kas Kecil"). Previously the only way to record this was two independent
-- manual entries (a Cash Out + a Cash In) with nothing tying them together,
-- and Income had no Kategori column at all so the inbound leg could never be
-- flagged as a transfer — meaning both legs silently inflated the Cash In/Cash
-- Out totals on the dashboard as if they were real revenue/expense.
--
-- This keeps using fin_income/fin_outcome (so the existing bank-balance sync
-- triggers from 0007/0012 keep working untouched) but adds:
--   1. fin_income.kategori, so the inbound leg can be tagged too.
--   2. create_bank_transfer(), an RPC that inserts both legs in one atomic
--      transaction so a network drop can't leave one leg orphaned.
-- financeApi.js is responsible for excluding kategori = 'Transfer Antar Bank'
-- rows from Cash In/Cash Out KPI and chart calculations.
--
-- Run manually in the Supabase SQL editor.

alter table fin_income add column if not exists kategori text;

-- security invoker (the default) — runs as the calling user, so the existing
-- insert policies (fin_income_write_admin/_pic_insert, fin_outcome_write_admin/
-- _pic_insert from 0011) still apply. A pic_brand calling this for a brand
-- they don't own simply fails the insert and the whole transfer rolls back.
create or replace function create_bank_transfer(
  p_brand_key text,
  p_tanggal date,
  p_source_bank text,
  p_source_bank_id text,
  p_dest_bank text,
  p_dest_bank_id text,
  p_nominal numeric,
  p_catatan text default null
) returns void
language plpgsql as $$
begin
  if p_nominal is null or p_nominal <= 0 then
    raise exception 'Nominal transfer harus lebih dari 0';
  end if;
  if p_source_bank_id is not distinct from p_dest_bank_id then
    raise exception 'Bank asal dan tujuan tidak boleh sama';
  end if;

  insert into fin_outcome (brand_key, tanggal, keterangan, kategori, jumlah, biaya, bank_keluar, bank_id)
  values (p_brand_key, p_tanggal, coalesce(p_catatan, 'Transfer ke ' || p_dest_bank), 'Transfer Antar Bank', p_nominal, 0, p_source_bank, p_source_bank_id);

  insert into fin_income (brand_key, tanggal, keterangan, kategori, nominal, bank_masuk, bank_id)
  values (p_brand_key, p_tanggal, coalesce(p_catatan, 'Transfer dari ' || p_source_bank), 'Transfer Antar Bank', p_nominal, p_dest_bank, p_dest_bank_id);
end;
$$;

grant execute on function create_bank_transfer(text, date, text, text, text, text, numeric, text) to authenticated;

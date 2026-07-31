-- Adds a stable ID Bank (like ID Vendor) so Cash In/Cash Out link to a Saldo
-- Rekening row by ID instead of matching the bank name as an exact string —
-- "BCA" vs "Bank BCA" used to be silently treated as two different accounts.
--
-- id_bank/bank_id are nullable and not DB-unique-constrained (same lightweight
-- convention as ID Vendor/ID Pelanggan — enforced by the app, not the schema).
-- bank_masuk/bank_keluar (name) columns are kept as-is: still written
-- automatically for display, and used as a fallback match for any row that
-- predates this column.

alter table fin_bank add column if not exists id_bank text;
alter table fin_income add column if not exists bank_id text;
alter table fin_outcome add column if not exists bank_id text;

-- Sums BOTH id_bank-matched rows AND legacy name-matched rows (where the
-- transaction predates this column and bank_id is null) for the same fin_bank
-- row, always — not an either/or by whether the fin_bank row itself has an
-- id_bank yet. This matters: once finance assigns an ID Bank to an existing
-- Saldo Rekening row, its historical Cash In/Cash Out (which will never
-- retroactively gain a bank_id) must keep counting, or the balance would
-- suddenly drop the moment an ID is assigned.
create or replace function sync_fin_bank_balance(p_brand_key text, p_bank text, p_bank_id text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  update fin_bank b
  set
    pemasukan = coalesce((
      select sum(i.nominal) from fin_income i
      where (i.bank_id is not null and i.bank_id = b.id_bank)
         or (i.bank_id is null and i.brand_key = b.brand_key and i.bank_masuk = b.bank)
    ), 0),
    pengeluaran = coalesce((
      select sum(o.jumlah) + sum(o.biaya) from fin_outcome o
      where (o.bank_id is not null and o.bank_id = b.id_bank)
         or (o.bank_id is null and o.brand_key = b.brand_key and o.bank_keluar = b.bank)
    ), 0)
  where (p_bank_id is not null and b.id_bank = p_bank_id)
     or (p_bank_id is null and b.brand_key = p_brand_key and b.bank = p_bank);
end;
$$;

create or replace function trg_sync_bank_from_income() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'DELETE' then
    perform sync_fin_bank_balance(OLD.brand_key, OLD.bank_masuk, OLD.bank_id);
    return OLD;
  end if;
  perform sync_fin_bank_balance(NEW.brand_key, NEW.bank_masuk, NEW.bank_id);
  if TG_OP = 'UPDATE' and (OLD.brand_key, OLD.bank_masuk, OLD.bank_id) is distinct from (NEW.brand_key, NEW.bank_masuk, NEW.bank_id) then
    perform sync_fin_bank_balance(OLD.brand_key, OLD.bank_masuk, OLD.bank_id);
  end if;
  return NEW;
end;
$$;

create or replace function trg_sync_bank_from_outcome() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'DELETE' then
    perform sync_fin_bank_balance(OLD.brand_key, OLD.bank_keluar, OLD.bank_id);
    return OLD;
  end if;
  perform sync_fin_bank_balance(NEW.brand_key, NEW.bank_keluar, NEW.bank_id);
  if TG_OP = 'UPDATE' and (OLD.brand_key, OLD.bank_keluar, OLD.bank_id) is distinct from (NEW.brand_key, NEW.bank_keluar, NEW.bank_id) then
    perform sync_fin_bank_balance(OLD.brand_key, OLD.bank_keluar, OLD.bank_id);
  end if;
  return NEW;
end;
$$;

-- Triggers themselves are unchanged (already created in 0007) — replacing the
-- functions they point to is enough, no need to drop/recreate the triggers.

-- Re-run the backfill so any row with an id_bank already set (none yet, but
-- harmless) or matched by name gets its balance recomputed under the new logic.
do $$
declare r record;
begin
  for r in select distinct brand_key, bank, id_bank from fin_bank loop
    perform sync_fin_bank_balance(r.brand_key, r.bank, r.id_bank);
  end loop;
end $$;

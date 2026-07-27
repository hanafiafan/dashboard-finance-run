-- Cash In / Cash Out now automatically update the matching Saldo Rekening
-- (fin_bank) row's Pemasukan/Pengeluaran, per (brand_key, bank name) — the
-- same pairing income/outcome forms already capture, no new "bank ID" needed.
--
-- Recomputes from scratch (sum of all fin_income/fin_outcome rows for that
-- brand+bank) rather than incrementing, so it can never drift — correct
-- after insert, update (including changing which bank a row belongs to),
-- delete, or bulk import.
--
-- security definer: runs with elevated privileges so the sync always
-- succeeds regardless of the calling user's role — Owner can create Cash In
-- (allowed by fin_income's RLS) even though Owner cannot directly write
-- fin_bank (finance-only per 0002's RLS). Without this, the trigger's own
-- UPDATE on fin_bank would be silently blocked by RLS for non-finance roles.
create or replace function sync_fin_bank_balance(p_brand_key text, p_bank text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update fin_bank
  set
    pemasukan = coalesce((select sum(nominal) from fin_income where brand_key = p_brand_key and bank_masuk = p_bank), 0),
    pengeluaran = coalesce((select sum(jumlah) + sum(biaya) from fin_outcome where brand_key = p_brand_key and bank_keluar = p_bank), 0)
  where brand_key = p_brand_key and bank = p_bank;
end;
$$;

create or replace function trg_sync_bank_from_income() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'DELETE' then
    perform sync_fin_bank_balance(OLD.brand_key, OLD.bank_masuk);
    return OLD;
  end if;
  perform sync_fin_bank_balance(NEW.brand_key, NEW.bank_masuk);
  if TG_OP = 'UPDATE' and (OLD.brand_key, OLD.bank_masuk) is distinct from (NEW.brand_key, NEW.bank_masuk) then
    perform sync_fin_bank_balance(OLD.brand_key, OLD.bank_masuk);
  end if;
  return NEW;
end;
$$;

drop trigger if exists fin_income_sync_bank on fin_income;
create trigger fin_income_sync_bank
after insert or update or delete on fin_income
for each row execute function trg_sync_bank_from_income();

create or replace function trg_sync_bank_from_outcome() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'DELETE' then
    perform sync_fin_bank_balance(OLD.brand_key, OLD.bank_keluar);
    return OLD;
  end if;
  perform sync_fin_bank_balance(NEW.brand_key, NEW.bank_keluar);
  if TG_OP = 'UPDATE' and (OLD.brand_key, OLD.bank_keluar) is distinct from (NEW.brand_key, NEW.bank_keluar) then
    perform sync_fin_bank_balance(OLD.brand_key, OLD.bank_keluar);
  end if;
  return NEW;
end;
$$;

drop trigger if exists fin_outcome_sync_bank on fin_outcome;
create trigger fin_outcome_sync_bank
after insert or update or delete on fin_outcome
for each row execute function trg_sync_bank_from_outcome();

-- One-time backfill so existing fin_bank rows reflect already-entered Cash In/Out.
do $$
declare r record;
begin
  for r in select distinct brand_key, bank from fin_bank loop
    perform sync_fin_bank_balance(r.brand_key, r.bank);
  end loop;
end $$;

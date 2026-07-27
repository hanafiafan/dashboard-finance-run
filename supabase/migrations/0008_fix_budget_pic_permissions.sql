-- Closes a security gap: 0002's blanket "fin_budget_write" policy let pic_brand
-- insert/update/delete their own brand's budget rows with NO restriction on which
-- columns they touch or what state the row is in. In practice that meant a
-- pic_brand account could set its own request's Status to Approved/Paid (self-
-- approval, bypassing the entire approval workflow) or delete an already-approved/
-- paid request — even though every other layer (UI, Documentation) says pic_brand
-- cannot approve budgets and has no delete button at all.

drop policy if exists "fin_budget_write" on fin_budget;

-- Superadmin/finance/owner: unchanged, full control.
create policy "fin_budget_write_admin" on fin_budget for all
  using (auth_active() and auth_role() in ('superadmin', 'finance', 'owner'))
  with check (auth_active() and auth_role() in ('superadmin', 'finance', 'owner'));

-- pic_brand: can submit a new request for their own brand.
create policy "fin_budget_pic_insert" on fin_budget for insert
  with check (auth_active() and auth_role() = 'pic_brand' and brand_key = auth_brand_scope());

-- pic_brand: can edit their own request ONLY while finance hasn't acted on it yet
-- (status still 'Pending') — once processed, USING excludes the row entirely, so
-- there is no row left for them to touch. No delete policy at all for pic_brand.
create policy "fin_budget_pic_update" on fin_budget for update
  using (auth_active() and auth_role() = 'pic_brand' and brand_key = auth_brand_scope() and status = 'Pending')
  with check (auth_active() and auth_role() = 'pic_brand' and brand_key = auth_brand_scope());

-- Belt-and-braces trigger: regardless of what the client sends, force a pic_brand
-- submission to start as Pending with no finance-only fields set, and hard-block
-- any update once the row is no longer Pending (defends even if a future RLS
-- change or client bug tried to slip a different status through).
create or replace function enforce_pic_budget_rules() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth_role() = 'pic_brand' then
    if TG_OP = 'INSERT' then
      NEW.status := 'Pending';
      NEW.nominal_dibayar := null;
      NEW.feedback_finance := null;
    elsif TG_OP = 'UPDATE' then
      if OLD.status is distinct from 'Pending' then
        raise exception 'Budget request ini sudah diproses finance, tidak bisa diubah lagi oleh pengaju.';
      end if;
      NEW.status := 'Pending';
      NEW.nominal_dibayar := OLD.nominal_dibayar;
      NEW.feedback_finance := OLD.feedback_finance;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists fin_budget_pic_guard on fin_budget;
create trigger fin_budget_pic_guard
before insert or update on fin_budget
for each row execute function enforce_pic_budget_rules();

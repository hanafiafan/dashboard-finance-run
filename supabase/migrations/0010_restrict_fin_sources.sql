-- fin_sources (spreadsheet import config) was accidentally grouped into 0002's
-- "reference_tables" (readable by everyone, alongside brands/vendors/customers
-- which genuinely need to be — they're used as picker options in every role's
-- forms). fin_sources isn't used by any picker and has no legitimate reason to
-- be visible to owner/pic_brand — restrict it to superadmin/finance like the
-- other internal-only tables.
drop policy if exists "fin_sources_select" on fin_sources;
drop policy if exists "fin_sources_write" on fin_sources;

create policy "fin_sources_select" on fin_sources for select
  using (auth_active() and auth_role() in ('superadmin', 'finance'));

create policy "fin_sources_write" on fin_sources for all
  using (auth_active() and auth_role() in ('superadmin', 'finance'))
  with check (auth_active() and auth_role() in ('superadmin', 'finance'));

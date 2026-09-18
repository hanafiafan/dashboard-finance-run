-- Audit trail for mutations (create/update/delete/approve/reject) and a
-- client error log, both self-hosted (no third-party monitoring SaaS).
-- Insert is open to any authenticated caller (they're logging their own
-- action); select is restricted to superadmin/finance so ordinary roles
-- can't read other users' activity.

create table fin_audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_email text,
  actor_role text,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  note text
);

create table fin_error_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  message text,
  stack text,
  url text,
  user_email text,
  user_agent text,
  source text
);

create index fin_audit_log_created_at_idx on fin_audit_log (created_at desc);
create index fin_error_log_created_at_idx on fin_error_log (created_at desc);

alter table fin_audit_log enable row level security;
alter table fin_error_log enable row level security;

create policy fin_audit_log_insert on fin_audit_log
  for insert to authenticated with check (true);

create policy fin_audit_log_select on fin_audit_log
  for select to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('superadmin', 'finance'))
  );

create policy fin_error_log_insert on fin_error_log
  for insert to authenticated, anon with check (true);

create policy fin_error_log_select on fin_error_log
  for select to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('superadmin', 'finance'))
  );

-- Admin session visibility/revocation + login-attempt throttling, both as
-- public-schema RPC functions (self-hosted PostgREST only exposes public by
-- default, so this avoids needing a new serverless admin endpoint). Each
-- function does its own authorization/anonymity check internally rather than
-- relying on table-level grants, since the underlying tables (auth.sessions,
-- the login-attempts log) should never be queried directly by a client.

create or replace function admin_list_sessions()
returns table(
  session_id uuid, user_id uuid, email text, name text, role text,
  user_agent text, ip text, created_at timestamptz, updated_at timestamptz, not_after timestamptz
)
language plpgsql security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'superadmin') then
    raise exception 'not authorized';
  end if;
  return query
    select s.id, s.user_id, p.email, p.name, p.role, s.user_agent, s.ip::text, s.created_at, s.updated_at, s.not_after
    from auth.sessions s
    join profiles p on p.id = s.user_id
    order by s.updated_at desc;
end;
$$;

create or replace function admin_force_logout(target_user_id uuid)
returns void
language plpgsql security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'superadmin') then
    raise exception 'not authorized';
  end if;
  delete from auth.sessions where user_id = target_user_id;
end;
$$;

revoke all on function admin_list_sessions() from public;
revoke all on function admin_force_logout(uuid) from public;
grant execute on function admin_list_sessions() to authenticated;
grant execute on function admin_force_logout(uuid) to authenticated;

-- Login-attempt throttling. anon can call these (a login attempt has no JWT
-- yet), but the underlying table is never directly selectable/insertable —
-- only through these two functions, and they only ever return a boolean.
create table fin_login_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index fin_login_attempts_email_idx on fin_login_attempts (email, created_at desc);
alter table fin_login_attempts enable row level security;

create or replace function record_login_attempt(p_email text, p_success boolean)
returns void language sql security definer set search_path = public as $$
  insert into fin_login_attempts(email, success) values (lower(p_email), p_success);
$$;

create or replace function check_login_locked(p_email text)
returns boolean language sql security definer set search_path = public as $$
  select count(*) >= 5
  from fin_login_attempts
  where email = lower(p_email) and success = false and created_at > now() - interval '15 minutes';
$$;

revoke all on function record_login_attempt(text, boolean) from public;
revoke all on function check_login_locked(text) from public;
grant execute on function record_login_attempt(text, boolean) to anon, authenticated;
grant execute on function check_login_locked(text) to anon, authenticated;

-- 0022's admin_list_sessions() has an ambiguous "role" column reference:
-- the function's own RETURNS TABLE(..., role text, ...) output column
-- collides with profiles.role in the unqualified WHERE clause, so
-- plpgsql's default variable_conflict=error rejects every call (even from
-- real superadmins) with "column reference \"role\" is ambiguous".

create or replace function admin_list_sessions()
returns table(
  session_id uuid, user_id uuid, email text, name text, role text,
  user_agent text, ip text, created_at timestamptz, updated_at timestamptz, not_after timestamptz
)
language plpgsql security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'superadmin') then
    raise exception 'not authorized';
  end if;
  return query
    select s.id, s.user_id, p.email, p.name, p.role, s.user_agent, s.ip::text, s.created_at, s.updated_at, s.not_after
    from auth.sessions s
    join profiles p on p.id = s.user_id
    order by s.updated_at desc;
end;
$$;

-- Fixes login being broken for every account right after the Supabase Auth
-- migration ("Akun tidak aktif atau tidak ditemukan" even with the correct
-- password). Root cause: 0002's "profiles_select" policy checked admin access
-- via a subquery on `profiles` itself (self-referential RLS), which Postgres
-- can fail to evaluate correctly. Splits it into two independent policies —
-- multiple permissive SELECT policies are OR'd together — so "see my own row"
-- never depends on any subquery, and "see everyone (admin)" goes through a
-- security definer function that bypasses RLS instead of recursing into it.
drop policy if exists "profiles_select" on profiles;

create policy "profiles_select_own" on profiles for select
  using (auth.uid() = id);

create or replace function is_admin_caller() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from profiles where id = auth.uid() and role in ('superadmin', 'finance') and active
  )
$$;

create policy "profiles_select_admin" on profiles for select
  using (is_admin_caller());

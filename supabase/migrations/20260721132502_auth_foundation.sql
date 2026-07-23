-- Phase 1 (non-breaking): OTP authentication foundation and tester allowlist.
-- This migration intentionally leaves the legacy anonymous policies in place.
-- Run the secure cutover migration only together with the authenticated frontend deploy.

create schema if not exists private;
revoke all on schema private from public, anon;

alter table public.users add column if not exists auth_user_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_auth_user_id_key'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_auth_user_id_key unique (auth_user_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'users_auth_user_id_fkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users(id) on delete set null;
  end if;
end $$;

create table if not exists public.tester_allowlist (
  email text primary key,
  active boolean not null default true,
  added_by text,
  created_at timestamptz not null default now(),
  constraint tester_allowlist_normalized_email_check
    check (email = lower(trim(email))),
  constraint tester_allowlist_company_email_check
    check (email ~ '^[^@[:space:]]+@goldengoose[.]com$')
);

alter table public.tester_allowlist enable row level security;

-- Preserve the current pilot users and roles.
update public.users set email = lower(trim(email));

insert into public.tester_allowlist (email, active, added_by)
select lower(trim(email)), true, coalesce(created_by, 'migration')
from public.users
on conflict (email) do update set active = true;

-- Link any Auth identities that already exist.
update public.users as profile
set auth_user_id = auth_user.id
from auth.users as auth_user
where lower(auth_user.email) = lower(profile.email)
  and profile.auth_user_id is distinct from auth_user.id;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select profile.role
  from public.users as profile
  join public.tester_allowlist as allowed
    on allowed.email = lower(profile.email)
   and allowed.active
  where profile.auth_user_id = (select auth.uid())
    and lower(profile.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;
$$;

create or replace function private.is_allowed_tester()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.current_user_role()) is not null;
$$;

revoke all on function private.current_user_role() from public, anon;
revoke all on function private.is_allowed_tester() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.is_allowed_tester() to authenticated;

-- Supabase Auth hook: reject every signup not present in the explicit allowlist.
create or replace function public.hook_restrict_dta_signup(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  candidate_email text := lower(trim(event -> 'user' ->> 'email'));
begin
  if candidate_email is null
     or candidate_email !~ '^[^@[:space:]]+@goldengoose[.]com$'
     or not exists (
       select 1
       from public.tester_allowlist
       where email = candidate_email and active
     ) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Email not allowed for this pilot.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant select on public.tester_allowlist to supabase_auth_admin;
grant execute on function public.hook_restrict_dta_signup(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_dta_signup(jsonb)
  from public, anon, authenticated;

drop policy if exists "tester allow auth hook" on public.tester_allowlist;
create policy "tester allow auth hook"
  on public.tester_allowlist
  for select
  to supabase_auth_admin
  using (active);

-- Attach an Auth identity to an existing role, or create a default user profile.
create or replace function private.handle_dta_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(new.email));
begin
  if normalized_email is null then
    return new;
  end if;

  insert into public.users (auth_user_id, email, role, created_by, last_login)
  select new.id, normalized_email, 'user', 'supabase-auth', now()
  from public.tester_allowlist
  where email = normalized_email and active
  on conflict (email) do update
    set auth_user_id = excluded.auth_user_id,
        last_login = excluded.last_login;

  return new;
end;
$$;

revoke execute on function private.handle_dta_auth_user() from public, anon, authenticated;

drop trigger if exists on_dta_auth_user_created on auth.users;
create trigger on_dta_auth_user_created
  after insert or update of email on auth.users
  for each row execute function private.handle_dta_auth_user();

-- Re-adding a previously removed tester reconnects an existing Auth identity.
create or replace function private.link_allowlisted_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.active then
    update public.users as profile
    set auth_user_id = auth_user.id
    from auth.users as auth_user
    where lower(auth_user.email) = new.email
      and lower(profile.email) = new.email;
  end if;
  return new;
end;
$$;

revoke execute on function private.link_allowlisted_auth_user() from public, anon, authenticated;

drop trigger if exists on_dta_tester_allowlisted on public.tester_allowlist;
create trigger on_dta_tester_allowlisted
  after insert or update of active on public.tester_allowlist
  for each row execute function private.link_allowlisted_auth_user();

grant select, insert, update, delete on public.tester_allowlist to authenticated;

comment on table public.tester_allowlist is
  'Explicit pilot allowlist. Auth signup and every data policy require an active row.';
comment on function public.hook_restrict_dta_signup(jsonb) is
  'Enable as Authentication > Hooks > Before User Created after configuring SMTP.';


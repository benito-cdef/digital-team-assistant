-- Phase 2 (cutover): run only when all of the following are ready:
-- 1. custom SMTP and the six-digit OTP email template;
-- 2. hook public.hook_restrict_dta_signup enabled as Before User Created;
-- 3. authenticated frontend deployed and tested with pilot accounts.

-- Remove broad legacy table policies and anonymous privileges.
drop policy if exists "allow all anon" on public.users;
drop policy if exists "allow all anon" on public.plan_changes;
drop policy if exists "wiki read all authed" on public.docs_wiki;
drop policy if exists "wiki write editors" on public.docs_wiki;

revoke all on public.users from anon;
revoke all on public.plan_changes from anon;
revoke all on public.docs_wiki from anon;
revoke all on public.tester_allowlist from anon;

revoke all on public.users from authenticated;
revoke all on public.plan_changes from authenticated;
revoke all on public.docs_wiki from authenticated;
revoke all on public.tester_allowlist from authenticated;

grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.tester_allowlist to authenticated;
grant select, insert on public.plan_changes to authenticated;
grant select, insert, update, delete on public.docs_wiki to authenticated;

-- Profiles: users see themselves; super admins manage the pilot roster and roles.
drop policy if exists "users read self or admin" on public.users;
create policy "users read self or admin"
  on public.users for select to authenticated
  using (
    (
      auth_user_id = (select auth.uid())
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (select private.is_allowed_tester())
    )
    or (select private.current_user_role()) = 'super_admin'
  );

drop policy if exists "users admin insert" on public.users;
create policy "users admin insert"
  on public.users for insert to authenticated
  with check ((select private.current_user_role()) = 'super_admin');

drop policy if exists "users admin update" on public.users;
create policy "users admin update"
  on public.users for update to authenticated
  using ((select private.current_user_role()) = 'super_admin')
  with check ((select private.current_user_role()) = 'super_admin');

drop policy if exists "users admin delete" on public.users;
create policy "users admin delete"
  on public.users for delete to authenticated
  using ((select private.current_user_role()) = 'super_admin');

-- Whitelist visibility and management are super-admin only.
drop policy if exists "tester admins read" on public.tester_allowlist;
create policy "tester admins read"
  on public.tester_allowlist for select to authenticated
  using ((select private.current_user_role()) = 'super_admin');

drop policy if exists "tester admins insert" on public.tester_allowlist;
create policy "tester admins insert"
  on public.tester_allowlist for insert to authenticated
  with check ((select private.current_user_role()) = 'super_admin');

drop policy if exists "tester admins update" on public.tester_allowlist;
create policy "tester admins update"
  on public.tester_allowlist for update to authenticated
  using ((select private.current_user_role()) = 'super_admin')
  with check ((select private.current_user_role()) = 'super_admin');

drop policy if exists "tester admins delete" on public.tester_allowlist;
create policy "tester admins delete"
  on public.tester_allowlist for delete to authenticated
  using ((select private.current_user_role()) = 'super_admin');

-- Audit log: immutable to clients; only editors create entries.
drop policy if exists "plan changes testers read" on public.plan_changes;
create policy "plan changes testers read"
  on public.plan_changes for select to authenticated
  using ((select private.is_allowed_tester()));

drop policy if exists "plan changes editors insert" on public.plan_changes;
create policy "plan changes editors insert"
  on public.plan_changes for insert to authenticated
  with check (
    (select private.current_user_role()) in ('editor', 'super_admin')
    and lower(changed_by) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- Knowledge Base: all testers read, editors manage entries.
drop policy if exists "wiki testers read" on public.docs_wiki;
create policy "wiki testers read"
  on public.docs_wiki for select to authenticated
  using ((select private.is_allowed_tester()));

drop policy if exists "wiki editors insert" on public.docs_wiki;
create policy "wiki editors insert"
  on public.docs_wiki for insert to authenticated
  with check (
    (select private.current_user_role()) in ('editor', 'super_admin')
    and lower(created_by) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "wiki editors update" on public.docs_wiki;
create policy "wiki editors update"
  on public.docs_wiki for update to authenticated
  using ((select private.current_user_role()) in ('editor', 'super_admin'))
  with check (
    (select private.current_user_role()) in ('editor', 'super_admin')
    and lower(updated_by) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "wiki editors delete" on public.docs_wiki;
create policy "wiki editors delete"
  on public.docs_wiki for delete to authenticated
  using ((select private.current_user_role()) in ('editor', 'super_admin'));

-- Storage is no longer public. Authenticated requests use the user's JWT.
update storage.buckets
set public = false,
    allowed_mime_types = array['application/json']::text[]
where id = 'calendar-data';

drop policy if exists "public read calendar" on storage.objects;
drop policy if exists "anon write calendar" on storage.objects;
drop policy if exists "anon update calendar" on storage.objects;

drop policy if exists "calendar testers read" on storage.objects;
create policy "calendar testers read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'calendar-data'
    and (select private.is_allowed_tester())
  );

drop policy if exists "calendar editors insert" on storage.objects;
create policy "calendar editors insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'calendar-data'
    and (select private.current_user_role()) in ('editor', 'super_admin')
  );

drop policy if exists "calendar editors update" on storage.objects;
create policy "calendar editors update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'calendar-data'
    and (select private.current_user_role()) in ('editor', 'super_admin')
  )
  with check (
    bucket_id = 'calendar-data'
    and (select private.current_user_role()) in ('editor', 'super_admin')
  );


-- The allowlist table already constrains company emails and the one explicit
-- pilot exception. The Auth hook should use it as the single source of truth.
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

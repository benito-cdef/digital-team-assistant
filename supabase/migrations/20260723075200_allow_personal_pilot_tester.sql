-- Temporary, explicit pilot exception for the project owner.
-- All other testers must keep using the company domain.
alter table public.tester_allowlist
  drop constraint if exists tester_allowlist_company_email_check;

alter table public.tester_allowlist
  add constraint tester_allowlist_company_email_check
  check (
    email like '%@goldengoose.com'
    or email = 'b.condemi@gmail.com'
  );

insert into public.tester_allowlist (email, active, added_by)
values ('b.condemi@gmail.com', true, 'pilot_setup')
on conflict (email) do update
  set active = true;

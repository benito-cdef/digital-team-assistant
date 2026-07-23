-- The project owner confirmed that the corporate address is the correct tester.
-- Remove the temporary personal-address exception everywhere.
delete from public.tester_allowlist
where email = 'b.condemi@gmail.com';

alter table public.tester_allowlist
  drop constraint if exists tester_allowlist_company_email_check;

alter table public.tester_allowlist
  add constraint tester_allowlist_company_email_check
  check (email like '%@goldengoose.com');

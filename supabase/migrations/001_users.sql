create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'user' check (role in ('super_admin', 'editor', 'user')),
  created_at timestamptz default now(),
  created_by text,
  last_login timestamptz
);

insert into public.users (email, role, created_by)
values ('b.condemi@goldengoose.com', 'super_admin', 'system')
on conflict (email) do update set role = 'super_admin';

alter table public.users enable row level security;

drop policy if exists "allow all anon" on public.users;
create policy "allow all anon" on public.users for all using (true) with check (true);

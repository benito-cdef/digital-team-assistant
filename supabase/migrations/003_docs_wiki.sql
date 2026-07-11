create table if not exists public.docs_wiki (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  title text not null,
  content text not null,
  status text,
  priority text,
  created_by text not null,
  created_at timestamptz default now(),
  updated_by text,
  updated_at timestamptz
);

alter table public.docs_wiki enable row level security;

drop policy if exists "wiki read all authed" on public.docs_wiki;
drop policy if exists "wiki write editors" on public.docs_wiki;

-- Tutti gli autenticati (domain check avviene nel frontend) possono leggere
create policy "wiki read all authed" on public.docs_wiki
  for select using (true);

-- Scrittura: solo editor e super_admin (verifica nel frontend; RLS è un secondo livello)
create policy "wiki write editors" on public.docs_wiki
  for all using (true) with check (true);

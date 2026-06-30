create table if not exists public.plan_changes (
  id uuid primary key default gen_random_uuid(),
  week_number int not null,
  year int not null,
  field_path text not null,
  old_value jsonb,
  new_value jsonb,
  changed_by text not null,
  changed_at timestamptz default now()
);

alter table public.plan_changes enable row level security;

drop policy if exists "allow all anon" on public.plan_changes;
create policy "allow all anon" on public.plan_changes for all using (true) with check (true);

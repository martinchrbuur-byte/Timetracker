-- Supabase schema migration for Work Hours Tracker
-- Safe to run multiple times (idempotent).

begin;

-- 1) Ensure base table exists (for fresh or partially-initialized projects).
create table if not exists public.time_entries (
  id uuid primary key,
  user_id text not null default 'default',
  check_in_at timestamptz not null,
  check_out_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Bring legacy time_entries schema up to date.
alter table public.time_entries
  add column if not exists user_id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.time_entries
set user_id = 'default'
where user_id is null;

alter table public.time_entries
  alter column user_id set default 'default',
  alter column user_id set not null;

create index if not exists time_entries_check_in_at_idx
  on public.time_entries (check_in_at desc);

create index if not exists time_entries_user_id_idx
  on public.time_entries (user_id);

-- 3) Ensure tracker_users table exists.
create table if not exists public.tracker_users (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.tracker_users (id, name, created_at)
values ('default', 'Default', now())
on conflict (id) do nothing;

-- 4) Ensure updated_at trigger exists for time_entries updates.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_time_entries_updated_at on public.time_entries;

create trigger trg_time_entries_updated_at
before update on public.time_entries
for each row execute function public.set_updated_at();

-- 5) Enable RLS + recreate simple anon policies used by this app.
alter table public.time_entries enable row level security;
alter table public.tracker_users enable row level security;

drop policy if exists "anon_read_time_entries" on public.time_entries;
drop policy if exists "anon_write_time_entries" on public.time_entries;
drop policy if exists "anon_update_time_entries" on public.time_entries;

drop policy if exists "anon_read_tracker_users" on public.tracker_users;
drop policy if exists "anon_write_tracker_users" on public.tracker_users;
drop policy if exists "anon_update_tracker_users" on public.tracker_users;

create policy "anon_read_time_entries"
on public.time_entries
for select
to anon
using (true);

create policy "anon_write_time_entries"
on public.time_entries
for insert
to anon
with check (true);

create policy "anon_update_time_entries"
on public.time_entries
for update
to anon
using (true)
with check (true);

create policy "anon_read_tracker_users"
on public.tracker_users
for select
to anon
using (true);

create policy "anon_write_tracker_users"
on public.tracker_users
for insert
to anon
with check (true);

create policy "anon_update_tracker_users"
on public.tracker_users
for update
to anon
using (true)
with check (true);

commit;

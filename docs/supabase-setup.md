# Supabase Persistence Setup

## 1) Create Table

Run this SQL in your Supabase SQL editor:

```sql
create table if not exists public.time_entries (
  id uuid primary key,
  check_in_at timestamptz not null,
  check_out_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists time_entries_check_in_at_idx
  on public.time_entries (check_in_at desc);

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
```

## 2) RLS Policy (Simple V1)

For the current single-tenant/browser app (no auth yet), use public anon access:

```sql
alter table public.time_entries enable row level security;

drop policy if exists "anon_read_time_entries" on public.time_entries;
drop policy if exists "anon_write_time_entries" on public.time_entries;

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
```

## 3) Configure App Runtime

Copy values into [public/app-config.js](public/app-config.js):

```javascript
window.TRACKER_CONFIG = {
  persistence: {
    provider: "supabase",
    supabaseUrl: "https://YOUR-PROJECT.supabase.co",
    supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
  },
};
```

Security note: never put `sb_secret_*` (service-role/secret) keys in frontend files. Use only the Supabase anon/public key in `supabaseAnonKey`.

Template is available at [public/app-config.example.js](public/app-config.example.js).

## 4) Verify

1. Start app and check in/check out.
2. Refresh browser and confirm records remain.
3. Confirm rows appear in `public.time_entries`.

## Notes

- If `provider` is `local`, app uses browser localStorage.
- If `provider` is `supabase` and credentials are present, app uses Supabase REST API.
- Current implementation upserts all known entries by `id` and never deletes rows.
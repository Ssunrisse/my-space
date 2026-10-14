-- Run once in Supabase SQL Editor. Each signed-in user owns exactly one snapshot.
create table if not exists public.myspace_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint payload_object check (jsonb_typeof(payload) = 'object'),
  constraint payload_size check (octet_length(payload::text) <= 4000000)
);
alter table public.myspace_snapshots enable row level security;
revoke all on public.myspace_snapshots from anon, authenticated;
grant select, insert, update on public.myspace_snapshots to authenticated;
drop policy if exists "snapshot_read_own" on public.myspace_snapshots;
drop policy if exists "snapshot_insert_own" on public.myspace_snapshots;
drop policy if exists "snapshot_update_own" on public.myspace_snapshots;
create policy "snapshot_read_own" on public.myspace_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy "snapshot_insert_own" on public.myspace_snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "snapshot_update_own" on public.myspace_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

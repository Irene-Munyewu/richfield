-- Events — run once in Supabase Dashboard → SQL Editor.
-- Safe to re-run. Also folded into supabase/schema.sql for fresh installs.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  event_date date not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, profile_id)
);

alter table public.events enable row level security;
alter table public.event_registrations enable row level security;

-- ---- events (create/edit/delete admin-only, everyone can view) ----
drop policy if exists "events_select_authenticated" on public.events;
create policy "events_select_authenticated" on public.events
  for select to authenticated using (true);

drop policy if exists "events_insert_admin" on public.events;
create policy "events_insert_admin" on public.events
  for insert to authenticated with check (public.is_admin());

drop policy if exists "events_update_admin" on public.events;
create policy "events_update_admin" on public.events
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "events_delete_admin" on public.events;
create policy "events_delete_admin" on public.events
  for delete to authenticated using (public.is_admin());

-- ---- event_registrations (each student manages their own registration) ----
drop policy if exists "event_registrations_select_own" on public.event_registrations;
create policy "event_registrations_select_own" on public.event_registrations
  for select to authenticated using (auth.uid() = profile_id or public.is_admin());

drop policy if exists "event_registrations_insert_own" on public.event_registrations;
create policy "event_registrations_insert_own" on public.event_registrations
  for insert to authenticated with check (auth.uid() = profile_id);

drop policy if exists "event_registrations_delete_own" on public.event_registrations;
create policy "event_registrations_delete_own" on public.event_registrations
  for delete to authenticated using (auth.uid() = profile_id);

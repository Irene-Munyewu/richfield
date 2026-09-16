-- Jobs apply flow — run once in Supabase Dashboard → SQL Editor.
-- Safe to re-run. Also folded into supabase/schema.sql for fresh installs.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (opportunity_id, student_id)
);

alter table public.applications enable row level security;

drop policy if exists "applications_select_own" on public.applications;
create policy "applications_select_own" on public.applications
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.opportunities o where o.id = opportunity_id and o.business_id = auth.uid())
  );

drop policy if exists "applications_insert_own" on public.applications;
create policy "applications_insert_own" on public.applications
  for insert to authenticated with check (student_id = auth.uid() and not public.is_suspended());

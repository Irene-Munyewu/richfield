-- Richfield Rise — full schema + RLS
-- Run this once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run: everything is IF NOT EXISTS / CREATE OR REPLACE / DROP+CREATE for policies.

create extension if not exists pgcrypto;

-- =========================================================
-- TABLES
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'alumni', 'business', 'admin')),
  full_name text not null default '',
  email text not null default '',
  avatar_url text,
  headline text,               -- e.g. "BSc Computer Science, Year 3" or "Software Engineer @ Acme"
  bio text,
  company text,                -- alumni / business
  career_goal text,            -- student
  current_stage text,          -- student career pathway stage: student | internship | junior_dev | dev | senior_dev
  career_readiness_pct int not null default 0 check (career_readiness_pct between 0 and 100),
  profile_completion_pct int not null default 0 check (profile_completion_pct between 0 and 100),
  cv_url text,
  cv_score int check (cv_score between 0 and 100),
  cv_strengths text[],
  cv_gaps text[],
  cv_missing_skills text[],
  business_status text check (business_status in ('pending', 'approved', 'rejected')), -- business accounts only; gates business.tsx until admin-approved
  alumni_status text check (alumni_status in ('pending', 'approved')), -- alumni accounts only; gates visibility in the alumni network until admin-approved
  suspended boolean not null default false, -- admin-set; blocks posting/commenting/reacting when true
  is_public boolean not null default true, -- toggle in profile settings; gates visibility in the alumni network
  popia_consent_at timestamptz, -- set once from the sign-up consent checkbox, never updated after
  created_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null default 'technical' check (category in ('technical', 'soft'))
);

create table if not exists public.profile_skills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  proficiency int not null default 0 check (proficiency between 0 and 100),
  is_gap boolean not null default false, -- true = target skill not yet acquired
  why_it_matters text,
  recommended_action text,
  unique (profile_id, skill_id)
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  company text not null,
  location text,
  type text not null default 'internship' check (type in ('internship', 'full_time', 'part_time', 'graduate')),
  description text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  closing_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunity_skills (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  unique (opportunity_id, skill_id)
);

create table if not exists public.alumni_journey (
  id uuid primary key default gen_random_uuid(),
  alumni_id uuid not null references public.profiles (id) on delete cascade,
  stage_order int not null default 0,
  year text,
  stage_title text not null,
  stage_subtitle text,
  description text
);

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'connected')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'like',
  created_at timestamptz not null default now(),
  unique (post_id, profile_id)
);

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

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (opportunity_id, student_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  status text not null default 'open' check (status in ('open', 'dismissed', 'resolved')),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade, -- recipient
  title text not null,
  body text,
  type text not null default 'general',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- Role + name come from supabase.auth.signUp({ options: { data: { role, full_name } } })
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_role text := coalesce(new.raw_user_meta_data ->> 'role', 'student');
begin
  insert into public.profiles (id, role, full_name, email, business_status, alumni_status, popia_consent_at)
  values (
    new.id,
    new_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    case when new_role = 'business' then 'pending' else null end,
    case when new_role = 'alumni' then 'pending' else null end,
    case when (new.raw_user_meta_data ->> 'consent')::boolean then now() else null end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Only an admin may change business_status/alumni_status/suspended — a user
-- must not be able to self-approve or un-suspend via a normal profile update.
create or replace function public.prevent_business_status_self_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (
    new.business_status is distinct from old.business_status
    or new.alumni_status is distinct from old.alumni_status
    or new.suspended is distinct from old.suspended
  ) and not public.is_admin() then
    raise exception 'Only an admin can change business_status/alumni_status/suspended';
  end if;
  return new;
end;
$$;

drop trigger if exists on_profiles_business_status_guard on public.profiles;
create trigger on_profiles_business_status_guard
  before update on public.profiles
  for each row execute procedure public.prevent_business_status_self_update();

-- =========================================================
-- ROW LEVEL SECURITY — enabled everywhere, nothing exposed by default
-- =========================================================

alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.profile_skills enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_skills enable row level security;
alter table public.alumni_journey enable row level security;
alter table public.connections enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.applications enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

-- helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- helper: is the current user suspended?
create or replace function public.is_suspended()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select suspended from public.profiles where id = auth.uid()), false);
$$;

-- ---- profiles ----
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- no insert policy: rows are created only by the handle_new_user trigger (security definer)
-- no delete policy: nobody deletes profiles from the client

-- ---- skills (reference data, read-only from the client) ----
drop policy if exists "skills_select_authenticated" on public.skills;
create policy "skills_select_authenticated" on public.skills
  for select to authenticated using (true);

-- ---- profile_skills ----
drop policy if exists "profile_skills_select_authenticated" on public.profile_skills;
create policy "profile_skills_select_authenticated" on public.profile_skills
  for select to authenticated using (true);

drop policy if exists "profile_skills_mutate_own" on public.profile_skills;
create policy "profile_skills_mutate_own" on public.profile_skills
  for all to authenticated
  using (auth.uid() = profile_id or public.is_admin())
  with check (auth.uid() = profile_id or public.is_admin());

-- ---- opportunities ----
-- visible if approved, or you own it (business), or you're admin
drop policy if exists "opportunities_select" on public.opportunities;
create policy "opportunities_select" on public.opportunities
  for select to authenticated
  using (status = 'approved' or business_id = auth.uid() or public.is_admin());

drop policy if exists "opportunities_insert_own" on public.opportunities;
create policy "opportunities_insert_own" on public.opportunities
  for insert to authenticated with check (business_id = auth.uid());

drop policy if exists "opportunities_update" on public.opportunities;
create policy "opportunities_update" on public.opportunities
  for update to authenticated
  using (business_id = auth.uid() or public.is_admin())
  with check (business_id = auth.uid() or public.is_admin());

-- ---- opportunity_skills (not sensitive — mirrors opportunity visibility loosely) ----
drop policy if exists "opportunity_skills_select_authenticated" on public.opportunity_skills;
create policy "opportunity_skills_select_authenticated" on public.opportunity_skills
  for select to authenticated using (true);

drop policy if exists "opportunity_skills_mutate" on public.opportunity_skills;
create policy "opportunity_skills_mutate" on public.opportunity_skills
  for all to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.opportunities o where o.id = opportunity_id and o.business_id = auth.uid())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.opportunities o where o.id = opportunity_id and o.business_id = auth.uid())
  );

-- ---- alumni_journey ----
drop policy if exists "alumni_journey_select_authenticated" on public.alumni_journey;
create policy "alumni_journey_select_authenticated" on public.alumni_journey
  for select to authenticated using (true);

drop policy if exists "alumni_journey_mutate_own" on public.alumni_journey;
create policy "alumni_journey_mutate_own" on public.alumni_journey
  for all to authenticated
  using (auth.uid() = alumni_id or public.is_admin())
  with check (auth.uid() = alumni_id or public.is_admin());

-- ---- connections ----
drop policy if exists "connections_select_own" on public.connections;
create policy "connections_select_own" on public.connections
  for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "connections_insert_own" on public.connections;
create policy "connections_insert_own" on public.connections
  for insert to authenticated with check (auth.uid() = requester_id);

drop policy if exists "connections_update_own" on public.connections;
create policy "connections_update_own" on public.connections
  for update to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ---- posts ----
drop policy if exists "posts_select_authenticated" on public.posts;
create policy "posts_select_authenticated" on public.posts
  for select to authenticated using (true);

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert to authenticated with check (auth.uid() = author_id and not public.is_suspended());

drop policy if exists "posts_mutate_own" on public.posts;
create policy "posts_mutate_own" on public.posts
  for all to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- admin can remove any post (moderation "Remove" action)
drop policy if exists "posts_delete_admin" on public.posts;
create policy "posts_delete_admin" on public.posts
  for delete to authenticated using (public.is_admin());

-- ---- comments ----
drop policy if exists "comments_select_authenticated" on public.comments;
create policy "comments_select_authenticated" on public.comments
  for select to authenticated using (true);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments
  for insert to authenticated with check (auth.uid() = author_id and not public.is_suspended());

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments
  for delete to authenticated using (auth.uid() = author_id);

-- ---- reactions ----
drop policy if exists "reactions_select_authenticated" on public.reactions;
create policy "reactions_select_authenticated" on public.reactions
  for select to authenticated using (true);

drop policy if exists "reactions_insert_own" on public.reactions;
create policy "reactions_insert_own" on public.reactions
  for insert to authenticated with check (auth.uid() = profile_id and not public.is_suspended());

drop policy if exists "reactions_delete_own" on public.reactions;
create policy "reactions_delete_own" on public.reactions
  for delete to authenticated using (auth.uid() = profile_id);

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

-- ---- applications ----
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

-- ---- reports (flag a post; admin reviews the queue) ----
drop policy if exists "reports_select_admin" on public.reports;
create policy "reports_select_admin" on public.reports
  for select to authenticated using (public.is_admin() or reporter_id = auth.uid());

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin" on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- notifications ----
-- you can only ever see your own; admins may insert a notification for
-- someone else (used by the approval flow in Phase 7)
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (auth.uid() = profile_id);

drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert to authenticated with check (
    auth.uid() = profile_id
    or public.is_admin()
    -- a student who just applied may notify the business that owns that opportunity
    or exists (
      select 1 from public.applications a
      join public.opportunities o on o.id = a.opportunity_id
      where a.student_id = auth.uid() and o.business_id = profile_id
    )
  );

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications
  for delete to authenticated using (auth.uid() = profile_id or public.is_admin());

-- =========================================================
-- SEED: skills catalog (reference data, not demo accounts —
-- demo accounts/opportunities/posts are seeded in later phases)
-- =========================================================

-- =========================================================
-- REALTIME — notifications badge updates live without refetch-on-focus
-- =========================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

insert into public.skills (name, category) values
  ('JavaScript', 'technical'),
  ('TypeScript', 'technical'),
  ('React', 'technical'),
  ('React Native', 'technical'),
  ('SQL', 'technical'),
  ('Git', 'technical'),
  ('Python', 'technical'),
  ('REST APIs', 'technical'),
  ('Testing / QA', 'technical'),
  ('Cloud Fundamentals', 'technical'),
  ('Communication', 'soft'),
  ('Teamwork', 'soft'),
  ('Problem Solving', 'soft'),
  ('Time Management', 'soft'),
  ('Adaptability', 'soft')
on conflict (name) do nothing;

-- Flagged post moderation + suspend user — run once in Supabase Dashboard → SQL Editor.
-- Safe to re-run. Also folded into supabase/schema.sql for fresh installs.

alter table public.profiles add column if not exists suspended boolean not null default false;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  status text not null default 'open' check (status in ('open', 'dismissed', 'resolved')),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

alter table public.reports enable row level security;

drop policy if exists "reports_select_admin" on public.reports;
create policy "reports_select_admin" on public.reports
  for select to authenticated using (public.is_admin() or reporter_id = auth.uid());

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin" on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- helper: is the current user suspended?
create or replace function public.is_suspended()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select suspended from public.profiles where id = auth.uid()), false);
$$;

-- Suspended users can't post, comment, or react.
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert to authenticated with check (auth.uid() = author_id and not public.is_suspended());

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own" on public.comments
  for insert to authenticated with check (auth.uid() = author_id and not public.is_suspended());

drop policy if exists "reactions_insert_own" on public.reactions;
create policy "reactions_insert_own" on public.reactions
  for insert to authenticated with check (auth.uid() = profile_id and not public.is_suspended());

-- Admin can remove any post (moderation "Remove" action) in addition to the
-- existing owner-only mutate policy.
drop policy if exists "posts_delete_admin" on public.posts;
create policy "posts_delete_admin" on public.posts
  for delete to authenticated using (public.is_admin());

-- Extend the existing self-update guard to also cover suspended — only an
-- admin may flip any of these three gated fields.
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

-- Business registration + approval gate — run once in Supabase Dashboard → SQL Editor.
-- Safe to re-run. Also folded into supabase/schema.sql for fresh installs.

alter table public.profiles add column if not exists business_status text
  check (business_status in ('pending', 'approved', 'rejected'));

-- Existing business accounts predate this gate — approve them so nobody
-- currentl testing the app gets locked out retroactively.
update public.profiles set business_status = 'approved'
where role = 'business' and business_status is null;

-- handle_new_user: new business sign-ups start out pending.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, business_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    case when coalesce(new.raw_user_meta_data ->> 'role', 'student') = 'business' then 'pending' else null end
  );
  return new;
end;
$$;

-- Only an admin may change business_status — a business account must not be
-- able to self-approve via a normal profile update.
create or replace function public.prevent_business_status_self_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.business_status is distinct from old.business_status and not public.is_admin() then
    raise exception 'Only an admin can change business_status';
  end if;
  return new;
end;
$$;

drop trigger if exists on_profiles_business_status_guard on public.profiles;
create trigger on_profiles_business_status_guard
  before update on public.profiles
  for each row execute procedure public.prevent_business_status_self_update();

-- profiles_update_own only let you touch your own row; admins now also need
-- to be able to update business_status on other people's rows.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

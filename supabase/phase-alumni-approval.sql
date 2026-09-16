-- Alumni approval queue — run once in Supabase Dashboard → SQL Editor.
-- Safe to re-run. Also folded into supabase/schema.sql for fresh installs.
-- Mirrors the business_status pattern from phase-business-approval.sql, but
-- alumni only ever go pending -> approved (no reject state, matching the
-- opportunities admin pattern which also has no reject flow).

alter table public.profiles add column if not exists alumni_status text
  check (alumni_status in ('pending', 'approved'));

-- Existing alumni accounts predate this gate — approve them so nobody
-- currently testing the app disappears from the alumni network.
update public.profiles set alumni_status = 'approved'
where role = 'alumni' and alumni_status is null;

-- handle_new_user: new alumni sign-ups start out pending (hidden from the
-- public alumni network until an admin approves).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_role text := coalesce(new.raw_user_meta_data ->> 'role', 'student');
begin
  insert into public.profiles (id, role, full_name, email, business_status, alumni_status)
  values (
    new.id,
    new_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    case when new_role = 'business' then 'pending' else null end,
    case when new_role = 'alumni' then 'pending' else null end
  );
  return new;
end;
$$;

-- Extend the existing self-update guard to also cover alumni_status —
-- only an admin may flip either gated field.
create or replace function public.prevent_business_status_self_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (
    new.business_status is distinct from old.business_status
    or new.alumni_status is distinct from old.alumni_status
  ) and not public.is_admin() then
    raise exception 'Only an admin can change business_status/alumni_status';
  end if;
  return new;
end;
$$;

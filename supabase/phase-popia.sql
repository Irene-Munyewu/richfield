-- Profile POPIA / visibility — run once in Supabase Dashboard → SQL Editor.
-- Safe to re-run. Also folded into supabase/schema.sql for fresh installs.

alter table public.profiles add column if not exists is_public boolean not null default true;
alter table public.profiles add column if not exists popia_consent_at timestamptz;

-- handle_new_user: record consent timestamp from the sign-up checkbox.
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

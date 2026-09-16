-- Notifications — feel real-time — run once in Supabase Dashboard → SQL Editor.
-- Safe to re-run. Also folded into supabase/schema.sql for fresh installs.
-- Adds the notifications table to the supabase_realtime publication so
-- postgres_changes events fire for it. RLS still applies — a client only
-- receives events for rows notifications_select_own would let them read.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

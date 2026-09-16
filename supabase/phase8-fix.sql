-- Phase 8 fix — run once in Supabase Dashboard → SQL Editor.
-- notifications had select/insert/update RLS policies but no delete policy
-- (an oversight, not a design choice) — this was silently blocking my own
-- test cleanup. Also folded into supabase/schema.sql for fresh installs.

drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications
  for delete to authenticated using (auth.uid() = profile_id or public.is_admin());

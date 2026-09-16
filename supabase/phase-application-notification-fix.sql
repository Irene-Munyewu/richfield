-- Fix: a student applying to an opportunity couldn't notify the business,
-- since notifications_insert only allowed inserting your own notifications
-- or an admin inserting for someone else. Run once in Supabase Dashboard →
-- SQL Editor. Safe to re-run. Also folded into supabase/schema.sql.

drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert to authenticated with check (
    auth.uid() = profile_id
    or public.is_admin()
    or exists (
      select 1 from public.applications a
      join public.opportunities o on o.id = a.opportunity_id
      where a.student_id = auth.uid() and o.business_id = profile_id
    )
  );

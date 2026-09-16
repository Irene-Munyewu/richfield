-- Phase 3 additions — run once in Supabase Dashboard → SQL Editor.
-- Safe to re-run.

-- Gemini's CV analysis returns 4 buckets (score, strengths, gaps, missing
-- skills); schema.sql only had 3 of them.
alter table public.profiles add column if not exists cv_missing_skills text[];

-- Private bucket for CV uploads — each user can only touch their own folder.
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;

drop policy if exists "cvs_select_own" on storage.objects;
create policy "cvs_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "cvs_insert_own" on storage.objects;
create policy "cvs_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "cvs_update_own" on storage.objects;
create policy "cvs_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "cvs_delete_own" on storage.objects;
create policy "cvs_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

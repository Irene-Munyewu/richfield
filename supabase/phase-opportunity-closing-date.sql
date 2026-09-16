-- Opportunity creation — run once in Supabase Dashboard → SQL Editor.
-- Safe to re-run. Also folded into supabase/schema.sql for fresh installs.

alter table public.opportunities add column if not exists closing_date date;

-- Add materials field for customer project intake
alter table if exists public.projects
  add column if not exists materials text;

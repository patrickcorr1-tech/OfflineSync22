alter table public.projects
  add column if not exists notes text,
  add column if not exists preferred_date date;

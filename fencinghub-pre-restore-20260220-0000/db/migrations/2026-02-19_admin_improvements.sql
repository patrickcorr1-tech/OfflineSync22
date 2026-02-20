-- Admin improvements: checklist, reminders, internal notes

alter table public.projects
  add column if not exists internal_notes text;

create table if not exists public.project_checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  sort_order integer default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_reminders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  assigned_to uuid references public.profiles(id),
  completed boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Phase 1 hub enhancements

-- Quotes expiry + reminders
alter table public.quotes
  add column if not exists expires_at timestamptz,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists response_due_at timestamptz;

-- Company contacts
alter table public.company_contacts
  add column if not exists is_primary boolean not null default false,
  add column if not exists role text;

-- Message templates
create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null default 'email',
  subject text,
  body text not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Photo checklist
alter table public.project_checklist_items
  add column if not exists requires_photo boolean not null default false;

create table if not exists public.project_checklist_photos (
  id uuid primary key default gen_random_uuid(),
  checklist_item_id uuid references public.project_checklist_items(id) on delete cascade,
  photo_url text,
  file_path text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Inbox + triage
create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  from_name text,
  from_email text,
  subject text,
  body text,
  status text not null default 'new',
  priority text not null default 'normal',
  tags text[],
  project_id uuid references public.projects(id),
  company_id uuid references public.companies(id),
  assigned_to uuid references public.profiles(id),
  sla_due_at timestamptz,
  triage_reason text,
  received_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Status banner
create table if not exists public.status_banners (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  level text not null default 'info',
  active_from timestamptz default now(),
  active_to timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- WhatsApp group approval
alter table public.companies
  add column if not exists whatsapp_group_link text,
  add column if not exists whatsapp_group_placeholder text;

-- SLA policies
create table if not exists public.sla_policies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  entity text not null,
  hours integer not null,
  created_at timestamptz default now()
);

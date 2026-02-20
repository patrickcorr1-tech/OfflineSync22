-- FencingHub core schema

-- Enums
create type public.role_type as enum ('admin','sales','contractor','customer');
create type public.project_status as enum ('lead','quoted','approved','in_progress','completed','on_hold');
create type public.quote_status as enum ('sent','accepted','rejected','expired');
create type public.approval_status as enum ('pending','approved','rejected');
create type public.snag_status as enum ('open','in_progress','closed');

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.role_type not null default 'customer',
  full_name text,
  email text,
  company_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Companies (customers)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Customer contacts
create table if not exists public.company_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  status public.project_status not null default 'lead',
  address text,
  lat double precision,
  lng double precision,
  customer_email text,
  materials text,
  preferred_date date,
  notes text,
  internal_notes text,
  assigned_contractor_user_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Project assignments (contractors)
create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  contractor_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- Quotes
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  status public.quote_status not null default 'sent',
  file_path text,
  notes text,
  internal_notes text,
  version integer not null default 1,
  pinned boolean not null default false,
  archived boolean not null default false,
  sent_at timestamptz,
  viewed_at timestamptz,
  responded_at timestamptz,
  response_comment text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_quote_version()
returns trigger as $$
begin
  if new.version is null or new.version < 1 then
    select coalesce(max(version), 0) + 1 into new.version
    from public.quotes
    where project_id = new.project_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_quote_version on public.quotes;
create trigger set_quote_version
before insert on public.quotes
for each row execute function public.set_quote_version();

-- Discount-approved companies
create table if not exists public.discount_approved_companies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  created_at timestamptz default now(),
  unique (company_id)
);

-- Quote discount requests
create table if not exists public.quote_discounts (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  percent numeric not null,
  status text not null default 'pending',
  pdf_path text,
  requested_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  approved_at timestamptz
);

-- Sales Orders
create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  expected_delivery_date date,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Invoices
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  file_path text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Notes (offline capable)
create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Measurements
create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  data jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Gallery
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  file_path text,
  caption text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Snagging list
create table if not exists public.snags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  status public.snag_status not null default 'open',
  description text,
  is_internal boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Snag photos
create table if not exists public.snag_photos (
  id uuid primary key default gen_random_uuid(),
  snag_id uuid references public.snags(id) on delete cascade,
  file_path text,
  photo_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Project photos (customer uploads)
create table if not exists public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  photo_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Project checklist
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

-- Project reminders
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

-- Quote requests (customer engagement)
create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  details text,
  status text not null default 'new',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.quote_request_photos (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid references public.quote_requests(id) on delete cascade,
  file_path text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Activities (audit feed)
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id),
  type text not null,
  payload jsonb,
  created_at timestamptz default now()
);

-- Email events
create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'queued',
  metadata jsonb,
  created_at timestamptz default now()
);

-- Approvals (boundaries/gates)
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  type text not null,
  status public.approval_status not null default 'pending',
  submitted_by uuid references public.profiles(id),
  decided_by uuid references public.profiles(id),
  comment text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chat (per project)
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  sender_id uuid references public.profiles(id),
  message text,
  attachment_path text,
  created_at timestamptz default now()
);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  type text,
  payload jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

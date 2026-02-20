-- Customer portal: projects/snags offline + engagement

alter table if exists public.projects
  add column if not exists assigned_contractor_user_id uuid references public.profiles(id);

alter table if exists public.snags
  add column if not exists is_internal boolean not null default false;

alter table if exists public.snag_photos
  add column if not exists photo_url text;

create table if not exists public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  photo_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id),
  type text not null,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'queued',
  metadata jsonb,
  created_at timestamptz default now()
);

-- RLS: allow customers to create projects/snags for their company
create policy if not exists "projects_insert_customer" on public.projects
for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'customer' and p.company_id = projects.company_id)
  and projects.status = 'lead'
  and projects.assigned_contractor_user_id is null
);

create policy if not exists "snags_insert_customer" on public.snags
for insert with check (
  snags.is_internal = false
  and exists (select 1 from public.projects pr join public.profiles p on p.company_id = pr.company_id
              where pr.id = snags.project_id and p.id = auth.uid())
);

create policy if not exists "snag_photos_insert_customer" on public.snag_photos
for insert with check (
  exists (select 1 from public.snags s join public.projects pr on pr.id = s.project_id
          join public.profiles p on p.company_id = pr.company_id
          where s.id = snag_photos.snag_id and p.id = auth.uid())
);

create policy if not exists "project_photos_insert_customer" on public.project_photos
for insert with check (
  exists (select 1 from public.projects pr join public.profiles p on p.company_id = pr.company_id
          where pr.id = project_photos.project_id and p.id = auth.uid())
);

create policy if not exists "activities_insert_customer" on public.activities
for insert with check (auth.uid() is not null);

create policy if not exists "email_events_insert_customer" on public.email_events
for insert with check (auth.uid() is not null);

-- Storage policies for private bucket: customer-uploads
-- NOTE: run in SQL editor (storage.objects)
-- Allow insert/select for own folder
-- create policy if not exists "customer_uploads_insert" on storage.objects
-- for insert to authenticated with check (bucket_id = 'customer-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
-- create policy if not exists "customer_uploads_select" on storage.objects
-- for select to authenticated using (bucket_id = 'customer-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

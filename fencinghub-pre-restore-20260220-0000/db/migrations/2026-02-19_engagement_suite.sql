-- Engagement suite: quote requests + photo attachments

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

create index if not exists quote_requests_project_idx on public.quote_requests(project_id);
create index if not exists quote_request_photos_request_idx on public.quote_request_photos(quote_request_id);

create table if not exists public.cobrowse_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  project_id uuid references public.projects(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  joined_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending',
  allow_control boolean not null default false,
  bug_reported boolean not null default false,
  recording_consent boolean not null default false,
  consented_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz default now()
);

alter table public.cobrowse_sessions enable row level security;

create policy "cobrowse_sessions_select" on public.cobrowse_sessions
for select using (auth.role() = 'authenticated');

create policy "cobrowse_sessions_insert" on public.cobrowse_sessions
for insert with check (auth.role() = 'authenticated');

create policy "cobrowse_sessions_update" on public.cobrowse_sessions
for update using (auth.role() = 'authenticated');

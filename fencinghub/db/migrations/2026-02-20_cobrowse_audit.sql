-- Cobrowse audit logs + bug notes
alter table public.cobrowse_sessions
  add column if not exists bug_notes text;

create table if not exists public.support_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  context jsonb,
  created_at timestamptz default now()
);

alter table public.support_audit_logs enable row level security;

create policy "support_audit_logs_select" on public.support_audit_logs
for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
);

create policy "support_audit_logs_insert" on public.support_audit_logs
for insert with check (auth.role() = 'authenticated');

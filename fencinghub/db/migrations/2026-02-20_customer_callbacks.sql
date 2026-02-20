-- Customer callback requests
create table if not exists public.customer_callback_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  phone text,
  notes text,
  status text not null default 'open',
  created_at timestamptz default now()
);

alter table public.customer_callback_requests enable row level security;

create policy "callback_requests_select" on public.customer_callback_requests
for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = customer_callback_requests.company_id)
);

create policy "callback_requests_insert" on public.customer_callback_requests
for insert with check (
  requested_by = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = customer_callback_requests.company_id)
);

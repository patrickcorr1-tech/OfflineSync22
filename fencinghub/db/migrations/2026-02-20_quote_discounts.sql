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
  status text not null default 'pending', -- pending | approved | rejected | auto_approved
  pdf_path text,
  requested_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  approved_at timestamptz
);

alter table public.discount_approved_companies enable row level security;
alter table public.quote_discounts enable row level security;

-- Basic RLS for authenticated access (server-side still enforces roles)
create policy "discount_approved_companies_select" on public.discount_approved_companies
for select using (auth.role() = 'authenticated');

create policy "quote_discounts_select" on public.quote_discounts
for select using (auth.role() = 'authenticated');

create policy "quote_discounts_insert" on public.quote_discounts
for insert with check (auth.role() = 'authenticated');

create policy "quote_discounts_update" on public.quote_discounts
for update using (auth.role() = 'authenticated');

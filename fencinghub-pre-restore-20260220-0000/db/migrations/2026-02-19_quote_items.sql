-- Quote items
create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  total numeric generated always as (quantity * unit_price) stored,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.quote_items enable row level security;

drop policy if exists "quote_items_select" on public.quote_items;
create policy "quote_items_select" on public.quote_items
for select using (
  auth.role() = 'authenticated'
);

drop policy if exists "quote_items_insert" on public.quote_items;
create policy "quote_items_insert" on public.quote_items
for insert with check (
  auth.role() = 'authenticated'
);

drop policy if exists "quote_items_update" on public.quote_items;
create policy "quote_items_update" on public.quote_items
for update using (
  auth.role() = 'authenticated'
);

-- updated_at trigger
create or replace function public.touch_quote_items_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_quote_items_updated_at on public.quote_items;
create trigger trg_quote_items_updated_at
before update on public.quote_items
for each row execute function public.touch_quote_items_updated_at();

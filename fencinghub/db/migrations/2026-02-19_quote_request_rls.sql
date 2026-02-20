-- RLS policies for quote requests and photos

alter table public.quote_requests enable row level security;
alter table public.quote_request_photos enable row level security;

-- Quote requests select (project scoped)
create policy if not exists "quote_requests_select" on public.quote_requests
for select using (
  exists (
    select 1 from public.projects pr where pr.id = quote_requests.project_id and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
      or exists (select 1 from public.project_assignments pa where pa.project_id = pr.id and pa.contractor_id = auth.uid())
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
    )
  )
);

-- Quote requests write (admin/sales/contractor)
create policy if not exists "quote_requests_write_staff" on public.quote_requests
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales','contractor'))
);

-- Quote requests insert (customer)
create policy if not exists "quote_requests_insert_customer" on public.quote_requests
for insert with check (
  exists (
    select 1 from public.projects pr join public.profiles p on p.company_id = pr.company_id
    where pr.id = quote_requests.project_id and p.id = auth.uid()
  )
);

-- Quote request photos select (project scoped)
create policy if not exists "quote_request_photos_select" on public.quote_request_photos
for select using (
  exists (
    select 1 from public.quote_requests qr
    join public.projects pr on pr.id = qr.project_id
    where qr.id = quote_request_photos.quote_request_id and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
      or exists (select 1 from public.project_assignments pa where pa.project_id = pr.id and pa.contractor_id = auth.uid())
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
    )
  )
);

-- Quote request photos write (admin/sales/contractor)
create policy if not exists "quote_request_photos_write_staff" on public.quote_request_photos
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales','contractor'))
);

-- Quote request photos insert (customer)
create policy if not exists "quote_request_photos_insert_customer" on public.quote_request_photos
for insert with check (
  exists (
    select 1 from public.quote_requests qr
    join public.projects pr on pr.id = qr.project_id
    join public.profiles p on p.company_id = pr.company_id
    where qr.id = quote_request_photos.quote_request_id and p.id = auth.uid()
  )
);

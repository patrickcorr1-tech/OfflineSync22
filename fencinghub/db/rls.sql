-- Enable RLS
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_contacts enable row level security;
alter table public.projects enable row level security;
alter table public.project_assignments enable row level security;
alter table public.quotes enable row level security;
alter table public.sales_orders enable row level security;
alter table public.invoices enable row level security;
alter table public.project_notes enable row level security;
alter table public.measurements enable row level security;
alter table public.gallery_items enable row level security;
alter table public.snags enable row level security;
alter table public.snag_photos enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_request_photos enable row level security;
alter table public.project_photos enable row level security;
alter table public.activities enable row level security;
alter table public.email_events enable row level security;
alter table public.approvals enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;

-- Profiles
create policy "profiles_self" on public.profiles
for select using (auth.uid() = id);
create policy "profiles_update_self" on public.profiles
for update using (auth.uid() = id);

-- Companies: customers only see own company, admins/sales see all
create policy "companies_select" on public.companies
for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = companies.id)
);

create policy "companies_insert_admin" on public.companies
for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
);

create policy "companies_update_admin" on public.companies
for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
);

-- Company contacts
create policy "company_contacts_select" on public.company_contacts
for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = company_contacts.company_id)
);

create policy "company_contacts_write" on public.company_contacts
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
);

-- Projects
create policy "projects_select" on public.projects
for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
  or exists (select 1 from public.project_assignments pa where pa.project_id = projects.id and pa.contractor_id = auth.uid())
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = projects.company_id)
);

create policy "projects_write_admin" on public.projects
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
);

create policy "projects_insert_customer" on public.projects
for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'customer' and p.company_id = projects.company_id)
  and projects.status = 'lead'
  and projects.assigned_contractor_user_id is null
);

-- Project assignments
create policy "assignments_admin" on public.project_assignments
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
);

-- Quotes
create policy "quotes_select" on public.quotes
for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
  or exists (select 1 from public.projects pr join public.project_assignments pa on pa.project_id = pr.id where pr.id = quotes.project_id and pa.contractor_id = auth.uid())
  or exists (select 1 from public.projects pr join public.profiles p on p.company_id = pr.company_id where pr.id = quotes.project_id and p.id = auth.uid())
);

create policy "quotes_write_admin" on public.quotes
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
);

-- Sales orders / invoices / notes / measurements / gallery / snags / approvals / chat
create policy "project_scoped_select" on public.sales_orders
for select using (
  exists (select 1 from public.projects pr where pr.id = sales_orders.project_id and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
    or exists (select 1 from public.project_assignments pa where pa.project_id = pr.id and pa.contractor_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
  ))
);

create policy "project_scoped_select_invoices" on public.invoices
for select using (
  exists (select 1 from public.projects pr where pr.id = invoices.project_id and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
    or exists (select 1 from public.project_assignments pa where pa.project_id = pr.id and pa.contractor_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
  ))
);

create policy "project_scoped_select_notes" on public.project_notes
for select using (
  exists (select 1 from public.projects pr where pr.id = project_notes.project_id and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
    or exists (select 1 from public.project_assignments pa where pa.project_id = pr.id and pa.contractor_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
  ))
);

create policy "project_scoped_select_measurements" on public.measurements
for select using (
  exists (select 1 from public.projects pr where pr.id = measurements.project_id and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
    or exists (select 1 from public.project_assignments pa where pa.project_id = pr.id and pa.contractor_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
  ))
);

create policy "project_scoped_select_gallery" on public.gallery_items
for select using (
  exists (select 1 from public.projects pr where pr.id = gallery_items.project_id and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
    or exists (select 1 from public.project_assignments pa where pa.project_id = pr.id and pa.contractor_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
  ))
);

create policy "project_scoped_select_snags" on public.snags
for select using (
  exists (select 1 from public.projects pr where pr.id = snags.project_id and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
    or exists (select 1 from public.project_assignments pa where pa.project_id = pr.id and pa.contractor_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
  ))
);

create policy "project_scoped_select_approvals" on public.approvals
for select using (
  exists (select 1 from public.projects pr where pr.id = approvals.project_id and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
    or exists (select 1 from public.project_assignments pa where pa.project_id = pr.id and pa.contractor_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
  ))
);

create policy "project_scoped_select_chat" on public.chat_messages
for select using (
  exists (select 1 from public.projects pr where pr.id = chat_messages.project_id and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
    or exists (select 1 from public.project_assignments pa where pa.project_id = pr.id and pa.contractor_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
  ))
);

-- Writes (admin/sales or assigned contractor)
create policy "project_scoped_write_admin_sales" on public.sales_orders
for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales')));
create policy "project_scoped_write_admin_sales_invoices" on public.invoices
for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales')));
create policy "project_scoped_write_notes" on public.project_notes
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales','contractor'))
);
create policy "project_scoped_write_measurements" on public.measurements
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales','contractor'))
);
create policy "project_scoped_write_gallery" on public.gallery_items
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales','contractor'))
);
create policy "project_scoped_write_snags" on public.snags
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales','contractor'))
);

create policy "snags_insert_customer" on public.snags
for insert with check (
  snags.is_internal = false
  and exists (select 1 from public.projects pr join public.profiles p on p.company_id = pr.company_id
              where pr.id = snags.project_id and p.id = auth.uid())
);

-- Quote requests
create policy "quote_requests_select" on public.quote_requests
for select using (
  exists (select 1 from public.projects pr where pr.id = quote_requests.project_id and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
    or exists (select 1 from public.project_assignments pa where pa.project_id = pr.id and pa.contractor_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
  ))
);

create policy "quote_requests_write_staff" on public.quote_requests
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales','contractor'))
);

create policy "quote_requests_insert_customer" on public.quote_requests
for insert with check (
  exists (select 1 from public.projects pr join public.profiles p on p.company_id = pr.company_id
          where pr.id = quote_requests.project_id and p.id = auth.uid())
);

create policy "quote_request_photos_select" on public.quote_request_photos
for select using (
  exists (select 1 from public.quote_requests qr join public.projects pr on pr.id = qr.project_id
          where qr.id = quote_request_photos.quote_request_id and (
            exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
            or exists (select 1 from public.project_assignments pa where pa.project_id = pr.id and pa.contractor_id = auth.uid())
            or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
          ))
);

create policy "quote_request_photos_write_staff" on public.quote_request_photos
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales','contractor'))
);

create policy "quote_request_photos_insert_customer" on public.quote_request_photos
for insert with check (
  exists (select 1 from public.quote_requests qr join public.projects pr on pr.id = qr.project_id
          join public.profiles p on p.company_id = pr.company_id
          where qr.id = quote_request_photos.quote_request_id and p.id = auth.uid())
);

create policy "project_scoped_write_approvals_admin" on public.approvals
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
);
create policy "project_scoped_write_chat" on public.chat_messages
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid())
);

-- Checklist
alter table public.project_checklist_items enable row level security;
create policy "project_checklist_select" on public.project_checklist_items
for select using (
  exists (select 1 from public.projects pr where pr.id = project_checklist_items.project_id and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales','contractor'))
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
  ))
);
create policy "project_checklist_write" on public.project_checklist_items
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales','contractor'))
);

-- Customer callback requests
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

-- Reminders
alter table public.project_reminders enable row level security;
create policy "project_reminders_select" on public.project_reminders
for select using (
  exists (select 1 from public.projects pr where pr.id = project_reminders.project_id and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales','contractor'))
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
  ))
);
create policy "project_reminders_write" on public.project_reminders
for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales','contractor'))
);

-- Notifications
create policy "notifications_self" on public.notifications
for select using (auth.uid() = user_id);
create policy "notifications_update_self" on public.notifications
for update using (auth.uid() = user_id);

-- Snag photos
create policy "snag_photos_select" on public.snag_photos
for select using (
  exists (select 1 from public.snags s join public.projects pr on pr.id = s.project_id where s.id = snag_photos.snag_id and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
    or exists (select 1 from public.project_assignments pa where pa.project_id = pr.id and pa.contractor_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
  ))
);

create policy "snag_photos_insert_customer" on public.snag_photos
for insert with check (
  exists (select 1 from public.snags s join public.projects pr on pr.id = s.project_id
          join public.profiles p on p.company_id = pr.company_id
          where s.id = snag_photos.snag_id and p.id = auth.uid())
);

-- Project photos
create policy "project_photos_select" on public.project_photos
for select using (
  exists (select 1 from public.projects pr where pr.id = project_photos.project_id and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
    or exists (select 1 from public.project_assignments pa where pa.project_id = pr.id and pa.contractor_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.company_id = pr.company_id)
  ))
);

create policy "project_photos_insert_customer" on public.project_photos
for insert with check (
  exists (select 1 from public.projects pr join public.profiles p on p.company_id = pr.company_id
          where pr.id = project_photos.project_id and p.id = auth.uid())
);

-- Activities and email events
create policy "activities_insert_customer" on public.activities
for insert with check (auth.uid() is not null);

create policy "activities_select_admin" on public.activities
for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
);

create policy "email_events_insert_customer" on public.email_events
for insert with check (auth.uid() is not null);

create policy "email_events_select_admin" on public.email_events
for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','sales'))
);

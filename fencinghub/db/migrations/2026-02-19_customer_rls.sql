-- Customer RLS additions (projects, snags, photos, activities, email_events)

-- Projects (customer insert)
create policy if not exists "projects_insert_customer" on public.projects
for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'customer' and p.company_id = projects.company_id)
  and projects.status = 'lead'
  and projects.assigned_contractor_user_id is null
);

-- Snags (customer insert, customer-visible)
create policy if not exists "snags_insert_customer" on public.snags
for insert with check (
  snags.is_internal = false
  and exists (select 1 from public.projects pr join public.profiles p on p.company_id = pr.company_id
              where pr.id = snags.project_id and p.id = auth.uid())
);

-- Snag photos (customer insert)
create policy if not exists "snag_photos_insert_customer" on public.snag_photos
for insert with check (
  exists (select 1 from public.snags s join public.projects pr on pr.id = s.project_id
          join public.profiles p on p.company_id = pr.company_id
          where s.id = snag_photos.snag_id and p.id = auth.uid())
);

-- Project photos (customer insert)
create policy if not exists "project_photos_insert_customer" on public.project_photos
for insert with check (
  exists (select 1 from public.projects pr join public.profiles p on p.company_id = pr.company_id
          where pr.id = project_photos.project_id and p.id = auth.uid())
);

-- Activities + email_events (insert)
create policy if not exists "activities_insert_customer" on public.activities
for insert with check (auth.uid() is not null);

create policy if not exists "email_events_insert_customer" on public.email_events
for insert with check (auth.uid() is not null);

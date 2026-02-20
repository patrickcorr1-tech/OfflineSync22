-- Storage policies for customer-uploads bucket
-- Ensure bucket is private and created first.

create policy if not exists "customer_uploads_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'customer-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy if not exists "customer_uploads_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'customer-uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

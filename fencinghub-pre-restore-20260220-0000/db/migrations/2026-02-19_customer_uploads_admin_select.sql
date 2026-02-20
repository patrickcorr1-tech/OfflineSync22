-- Allow admins/sales/contractors to read customer-uploads (for signed URLs)
-- Supabase storage policies require joins via auth.uid() -> profiles

drop policy if exists "customer_uploads_select" on storage.objects;

create policy "customer_uploads_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'customer-uploads'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin','sales','contractor')
    )
  )
);

-- Bodemania · armazenamento de arquivos
--   product-images : fotos da vitrine (leitura pública, escrita só admin)
--   order-uploads  : fotos para lithophane e arquivos STL dos clientes (privado: dono + admin)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true, 5242880,
     array['image/jpeg', 'image/png', 'image/webp']),
  ('order-uploads', 'order-uploads', false, 52428800,
     array['image/jpeg', 'image/png', 'image/webp', 'model/stl', 'application/sla', 'application/vnd.ms-pki.stl', 'application/octet-stream'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');
create policy product_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy product_images_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
create policy product_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

create policy order_uploads_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'order-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy order_uploads_select on storage.objects for select to authenticated
  using (bucket_id = 'order-uploads' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy order_uploads_delete on storage.objects for delete to authenticated
  using (bucket_id = 'order-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

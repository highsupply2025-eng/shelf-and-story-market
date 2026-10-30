DROP POLICY IF EXISTS "publishers public" ON public.publishers;
CREATE POLICY "publishers visible" ON public.publishers FOR SELECT TO anon, authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.books b WHERE b.publisher_id = publishers.id AND b.status = 'approved'));
DROP POLICY IF EXISTS "covers read" ON storage.objects;
CREATE POLICY "covers read own or admin" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'covers' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
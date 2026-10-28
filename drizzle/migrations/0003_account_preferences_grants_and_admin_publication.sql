GRANT SELECT,UPDATE ON public.profiles TO authenticated; GRANT ALL ON public.profiles TO service_role;
CREATE POLICY admin_publishes_author_books ON public.books FOR INSERT TO authenticated WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE POLICY admin_uploads_covers ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='covers' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY admin_uploads_book_files ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='book-files' AND public.has_role(auth.uid(),'admin'));
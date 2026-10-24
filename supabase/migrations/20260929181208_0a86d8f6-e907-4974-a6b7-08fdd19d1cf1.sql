-- Sellers own their folder (path = <user_id>/<file>)
CREATE POLICY "Sellers upload own product files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Sellers update own product files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Sellers delete own product files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Sellers read own product files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'product-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Buyers can read files of products they purchased
CREATE POLICY "Buyers read purchased files" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'product-files' AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.file_path = storage.objects.name
      AND public.has_purchased(auth.uid(), p.id)
  )
);

-- Previews: sellers manage own folder, everyone may read
CREATE POLICY "Sellers manage own previews" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'product-previews' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'product-previews' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Previews readable by everyone" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'product-previews');

-- Avatars: users manage own folder, everyone may read
CREATE POLICY "Users manage own avatar" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatars readable by everyone" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'avatars');
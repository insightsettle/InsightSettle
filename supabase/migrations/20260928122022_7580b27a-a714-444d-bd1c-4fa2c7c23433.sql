CREATE POLICY deal_files_read ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'deal-files' AND (
    has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.deals d WHERE d.id::text = (storage.foldername(name))[1] AND auth.uid() IN (d.buyer_id, d.seller_id))
  ));
CREATE POLICY deal_files_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'deal-files' AND EXISTS (SELECT 1 FROM public.deals d WHERE d.id::text = (storage.foldername(name))[1] AND auth.uid() IN (d.buyer_id, d.seller_id))
);
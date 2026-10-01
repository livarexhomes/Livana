-- KYC submissions use private storage and a per-document metadata row.
-- Landlords can manage only their own files; admins can read submissions.

CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.landlords(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  storage_path text NOT NULL,
  file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kyc_documents_landlord_created_idx
  ON public.kyc_documents (landlord_id, created_at);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kyc_documents_owner_select ON public.kyc_documents;
CREATE POLICY kyc_documents_owner_select
  ON public.kyc_documents FOR SELECT TO authenticated
  USING (
    landlord_id IN (
      SELECT id FROM public.landlords WHERE user_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS kyc_documents_owner_insert ON public.kyc_documents;
CREATE POLICY kyc_documents_owner_insert
  ON public.kyc_documents FOR INSERT TO authenticated
  WITH CHECK (
    landlord_id IN (
      SELECT id FROM public.landlords WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS kyc_documents_owner_delete ON public.kyc_documents;
CREATE POLICY kyc_documents_owner_delete
  ON public.kyc_documents FOR DELETE TO authenticated
  USING (
    landlord_id IN (
      SELECT id FROM public.landlords WHERE user_id = auth.uid()
    )
    OR public.is_admin()
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS kyc_documents_storage_select ON storage.objects;
CREATE POLICY kyc_documents_storage_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS kyc_documents_storage_insert ON storage.objects;
CREATE POLICY kyc_documents_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS kyc_documents_storage_update ON storage.objects;
CREATE POLICY kyc_documents_storage_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS kyc_documents_storage_delete ON storage.objects;
CREATE POLICY kyc_documents_storage_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR public.is_admin()
    )
  );
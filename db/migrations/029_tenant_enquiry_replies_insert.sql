-- Allow tenants to reply within their own property enquiry threads.
-- Existing rows and admin/landlord access are preserved.

ALTER TABLE public.enquiry_replies
  DROP CONSTRAINT IF EXISTS enquiry_replies_sender_role_check;

ALTER TABLE public.enquiry_replies
  ADD CONSTRAINT enquiry_replies_sender_role_check
  CHECK (sender_role IN ('landlord', 'admin', 'tenant'));

CREATE POLICY "tenant_insert_own_enquiry_replies"
  ON public.enquiry_replies FOR INSERT TO authenticated
  WITH CHECK (
    sender_role = 'tenant'
    AND EXISTS (
      SELECT 1
      FROM public.enquiries e
      WHERE e.id = enquiry_replies.enquiry_id
        AND e.tenant_id IN (
          SELECT t.id
          FROM public.tenants t
          WHERE t.user_id = auth.uid()
        )
    )
  );
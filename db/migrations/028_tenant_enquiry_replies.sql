-- Allow tenants to read replies on their own property enquiries.
-- Admin access remains unchanged; tenants cannot read other tenants' replies.

CREATE POLICY "tenant_select_own_enquiry_replies"
  ON public.enquiry_replies FOR SELECT TO authenticated
  USING (
    EXISTS (
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

-- Resend webhooks are delivered at least once. Preserve one thread entry per
-- received Resend email even if the provider retries a successful delivery.
create unique index if not exists email_thread_replies_resend_id_unique_idx
  on public.email_thread_replies (resend_id)
  where resend_id is not null;

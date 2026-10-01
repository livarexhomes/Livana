# Resend inbound contact replies

The admin support screen sends contact-form replies through Resend. To have a
customer's email response appear in both the admin thread and the team's email
inbox, configure Resend receiving before enabling this workflow.

1. Create and verify a dedicated receiving subdomain, such as
   `inbound.livarex.com.ng`, in Resend. Keep it separate from the normal
   outbound domain so incoming routing is isolated from transactional mail.
2. In Resend, route the wildcard receiving address
   `replies+*@inbound.livarex.com.ng` to the webhook URL
   `https://<production-domain>/api/resend-inbound`, and subscribe it to the
   `email.received` event.
3. Add these production environment variables:

   ```text
   RESEND_INBOUND_ADDRESS=replies@inbound.livarex.com.ng
   RESEND_WEBHOOK_SECRET=whsec_...
   RESEND_INBOUND_ENABLED=true
   ```

4. Apply database migration `026_email_thread_inbound_deduplication.sql`.
5. Send a reply from a contact-form thread, then reply to that email from an
   external mailbox. Verify one inbound bubble appears in Admin Support and
   one notification is delivered to the configured admin email address.

`RESEND_INBOUND_ADDRESS` is deliberately not an Admin Settings field: it is a
mail-routing control and must remain a deployment secret/configuration value.
When it is set, outgoing replies use a tagged Reply-To address containing the
contact ID. The webhook uses that tag to associate the incoming message with
the exact contact thread; it only falls back to email headers or sender email
for legacy messages.

Do not use the Gmail compose link for this workflow. It sends messages outside
the application's audit trail and cannot make an incoming reply appear in the
admin panel. The UI's inbox shortcut opens the Resend email dashboard instead.

// Supabase Edge Function: Send Admin Email Notifications via Resend
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { Resend } from 'npm:resend@3.2.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get email config from settings
    const { data: configData } = await supabaseClient
      .from('admin_settings')
      .select('value')
      .eq('key', 'email_config')
      .single()

    const emailConfig = configData?.value || {}
    const resendApiKey = emailConfig.resendApiKey || Deno.env.get('RESEND_API_KEY')
    const fromEmail = emailConfig.fromEmail || 'noreply@livana.ng'
    const fromName = emailConfig.fromName || 'Livana'
    const enabled = emailConfig.enabled !== false

    if (!enabled) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email notifications are disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Resend API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const resend = new Resend(resendApiKey)

    // Check if this is a direct send request or a batch processing request
    const body = await req.json().catch(() => ({}))

    if (body.to && body.subject) {
      // Direct email send
      const { to, subject, html, text } = body as EmailPayload

      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        html,
        text,
      })

      if (error) {
        throw error
      }

      return new Response(
        JSON.stringify({ success: true, id: data?.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process pending notifications
    const { data: pendingNotifications, error: fetchError } = await supabaseClient
      .from('admin_email_notifications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      throw fetchError
    }

    const results = []

    for (const notification of pendingNotifications || []) {
      try {
        // Parse the body to get details
        const details = JSON.parse(notification.body)
        
        // Generate HTML email template
        const html = generateEmailTemplate(notification.type, details)
        
        // Get admin email
        const { data: adminData } = await supabaseClient
          .from('admins')
          .select('email')
          .eq('id', notification.admin_id)
          .single()

        const adminEmail = adminData?.email
        if (!adminEmail) {
          throw new Error('Admin email not found')
        }

        // Send email via Resend
        const { data: sendData, error: sendError } = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: adminEmail,
          subject: notification.subject,
          html,
        })

        if (sendError) {
          throw sendError
        }

        // Update notification status
        await supabaseClient
          .from('admin_email_notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id)

        results.push({ id: notification.id, status: 'sent', emailId: sendData?.id })
      } catch (err) {
        // Update notification with error
        await supabaseClient
          .from('admin_email_notifications')
          .update({
            status: 'failed',
            error: err.message,
          })
          .eq('id', notification.id)

        results.push({ id: notification.id, status: 'failed', error: err.message })
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

function generateEmailTemplate(type: string, details: any): string {
  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: #2563eb; color: white; padding: 24px; border-radius: 12px 12px 0 0; }
      .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
      .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; }
      .footer { margin-top: 24px; text-align: center; font-size: 12px; color: #6b7280; }
      .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
      .detail-label { font-weight: 600; color: #374151; }
      .detail-value { color: #6b7280; }
    </style>
  `

  const formatDate = (date: string) => new Date(date).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  switch (type) {
    case 'new_landlord':
      return `
        <!DOCTYPE html>
        <html>
        <head>${baseStyles}</head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">New Landlord Registration</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">A new landlord has signed up on Livana</p>
          </div>
          <div class="content">
            <div class="detail-row">
              <span class="detail-label">Landlord Name</span>
              <span class="detail-value">${details.landlordName || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email</span>
              <span class="detail-value">${details.landlordEmail || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Registration Time</span>
              <span class="detail-value">${formatDate(details.timestamp)}</span>
            </div>
            <div style="margin-top: 24px;">
              <a href="https://livana.ng/admin/clients" class="button">View in Admin Panel</a>
            </div>
          </div>
          <div class="footer">
            <p>This notification was sent from Livana Property Manager</p>
          </div>
        </body>
        </html>
      `

    case 'new_enquiry':
      return `
        <!DOCTYPE html>
        <html>
        <head>${baseStyles}</head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">New Property Enquiry</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">A tenant has submitted an enquiry</p>
          </div>
          <div class="content">
            <div class="detail-row">
              <span class="detail-label">Enquiry ID</span>
              <span class="detail-value">${details.enquiryId || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Property ID</span>
              <span class="detail-value">${details.propertyId || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Tenant ID</span>
              <span class="detail-value">${details.tenantId || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Received At</span>
              <span class="detail-value">${formatDate(details.timestamp)}</span>
            </div>
            <div style="margin-top: 24px;">
              <a href="https://livana.ng/admin/support" class="button">View Enquiry</a>
            </div>
          </div>
          <div class="footer">
            <p>This notification was sent from Livana Property Manager</p>
          </div>
        </body>
        </html>
      `

    case 'new_property':
      return `
        <!DOCTYPE html>
        <html>
        <head>${baseStyles}</head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">New Property Listed</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">A new property has been published</p>
          </div>
          <div class="content">
            <div class="detail-row">
              <span class="detail-label">Property Title</span>
              <span class="detail-value">${details.propertyTitle || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Property ID</span>
              <span class="detail-value">${details.propertyId || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Landlord ID</span>
              <span class="detail-value">${details.landlordId || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Listed At</span>
              <span class="detail-value">${formatDate(details.timestamp)}</span>
            </div>
            <div style="margin-top: 24px;">
              <a href="https://livana.ng/admin/properties" class="button">Review Property</a>
            </div>
          </div>
          <div class="footer">
            <p>This notification was sent from Livana Property Manager</p>
          </div>
        </body>
        </html>
      `

    default:
      return `
        <!DOCTYPE html>
        <html>
        <head>${baseStyles}</head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">Admin Notification</h1>
          </div>
          <div class="content">
            <p>You have a new notification from Livana.</p>
            <pre style="background: #f3f4f6; padding: 12px; border-radius: 8px; overflow-x: auto;">${JSON.stringify(details, null, 2)}</pre>
          </div>
        </body>
        </html>
      `
  }
}

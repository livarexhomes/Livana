import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { Resend } from 'npm:resend@3.2.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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
        { headers: corsHeaders, status: 400 }
      )
    }

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Resend API key not configured' }),
        { headers: corsHeaders, status: 400 }
      )
    }

    const resend = new Resend(resendApiKey)
    const body = await req.json().catch(() => ({}))

    if (body.to && body.subject) {
      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: body.to,
        subject: body.subject,
        html: body.html,
        text: body.text,
      })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, id: data?.id }),
        { headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid request' }),
      { headers: corsHeaders, status: 400 }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: corsHeaders, status: 500 }
    )
  }
})

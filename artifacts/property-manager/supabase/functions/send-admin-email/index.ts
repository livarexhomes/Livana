import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { Resend } from 'npm:resend@3.2.0'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    
    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured in secrets' }),
        { headers: corsHeaders, status: 400 }
      )
    }

    if (!body.to || !body.subject || !body.html) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, subject, html' }),
        { headers: corsHeaders, status: 400 }
      )
    }

    const resend = new Resend(resendApiKey)
    
    const { data, error } = await resend.emails.send({
      from: body.from || 'Livana <noreply@livana.ng>',
      to: body.to,
      subject: body.subject,
      html: body.html,
      text: body.text,
    })

    if (error) {
      console.error('Resend error:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message || 'Failed to send email' }),
        { headers: corsHeaders, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: data?.id }),
      { headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { headers: corsHeaders, status: 500 }
    )
  }
})

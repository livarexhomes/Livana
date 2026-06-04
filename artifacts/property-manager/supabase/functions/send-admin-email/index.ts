import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { Resend } from 'npm:resend@3.2.0'

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: jsonHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: jsonHeaders }
    )
  }

  try {
    const body = await req.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not set in environment')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'RESEND_API_KEY not configured. Add the secret to your Supabase Edge Function environment.',
        }),
        { status: 500, headers: jsonHeaders }
      )
    }

    if (!body.to) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required field: to' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    if (!body.subject) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required field: subject' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    if (!body.html && !body.text) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing email content: provide html or text' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    const from = typeof body.from === 'string' && body.from.trim()
      ? body.from
      : 'Livana <noreply@livana.ng>'

    const resend = new Resend(resendApiKey)
    console.log('Sending email to:', body.to)

    const { data, error } = await resend.emails.send({
      from,
      to: body.to,
      subject: body.subject,
      html: body.html,
      text: body.text,
    })

    if (error) {
      console.error('Resend API error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Resend API error: ${error.message || JSON.stringify(error)}`,
        }),
        { status: 500, headers: jsonHeaders }
      )
    }

    console.log('Email sent successfully:', data?.id)
    return new Response(
      JSON.stringify({ success: true, id: data?.id }),
      { status: 200, headers: jsonHeaders }
    )
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: `Server error: ${error?.message || 'Unknown error'}`,
      }),
      { status: 500, headers: jsonHeaders }
    )
  }
})

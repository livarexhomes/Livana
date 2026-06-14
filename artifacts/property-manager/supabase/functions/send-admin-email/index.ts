import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from 'npm:resend@3.2.0'

const ALLOWED_ORIGIN = Deno.env.get('APP_URL') ?? 'https://livarex.com.ng'

const jsonHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const MAX_HTML_LENGTH = 500_000
const MAX_SUBJECT_LENGTH = 500

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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

  // Authentication check
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: jsonHeaders }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid token' }),
      { status: 401, headers: jsonHeaders }
    )
  }

  // Optional: verify admin role
  const { data: adminRow } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!adminRow) {
    return new Response(
      JSON.stringify({ success: false, error: 'Admin access required' }),
      { status: 403, headers: jsonHeaders }
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
          error: 'RESEND_API_KEY not configured.',
        }),
        { status: 500, headers: jsonHeaders }
      )
    }

    if (!body.to || !isValidEmail(body.to)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid recipient email' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    if (!body.subject || body.subject.length > MAX_SUBJECT_LENGTH) {
      return new Response(
        JSON.stringify({ success: false, error: `Subject required and must be under ${MAX_SUBJECT_LENGTH} characters` }),
        { status: 400, headers: jsonHeaders }
      )
    }

    if (!body.html && !body.text) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing email content: provide html or text' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    if (body.html && body.html.length > MAX_HTML_LENGTH) {
      return new Response(
        JSON.stringify({ success: false, error: 'HTML content too large' }),
        { status: 400, headers: jsonHeaders }
      )
    }

    // Hardcode from address — do not allow caller to spoof
    const from = 'Livarex <noreply@livarex.com.ng>'

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
          error: 'Failed to send email',
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
        error: 'Internal server error',
      }),
      { status: 500, headers: jsonHeaders }
    )
  }
})

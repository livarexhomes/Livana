import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { Resend } from 'npm:resend@3.2.0'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      } 
    })
  }

  try {
    const body = await req.json().catch(() => ({}))
    
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured' }),
        { 
          headers: { 
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }, 
          status: 400 
        }
      )
    }

    if (!body.to || !body.subject) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing to or subject' }),
        { 
          headers: { 
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }, 
          status: 400 
        }
      )
    }

    const resend = new Resend(resendApiKey)
    
    const { data, error } = await resend.emails.send({
      from: body.from || 'Livana <noreply@livana.ng>',
      to: body.to,
      subject: body.subject,
      html: body.html || '',
      text: body.text,
    })

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { 
          headers: { 
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          }, 
          status: 500 
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: data?.id }),
      { 
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }, 
        status: 500 
      }
    )
  }
})

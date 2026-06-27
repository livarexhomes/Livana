import { Router } from 'express'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { sendText, sendButtons, sendList, markRead } from '../lib/whatsapp'
import { logger } from '../lib/logger'

const router = Router()

// ─── Supabase admin client ────────────────────────────────────────────────────
function getAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const APP_URL = () => process.env.APP_URL ?? 'https://livarex.com.ng'
const ADMIN_PHONE = () => process.env.WHATSAPP_ADMIN_PHONE ?? ''

function formatNaira(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

async function fetchListings(type: string): Promise<string> {
  try {
    const db = getAdmin()
    const { data, error } = await db
      .from('properties')
      .select('id, title, city, price, bedrooms, type')
      .eq('status', 'available')
      .eq('type', type)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5)

    if (error || !data || data.length === 0) {
      return `No ${type} listings found right now. Browse all available properties:\n${APP_URL()}/listings?type=${type}`
    }

    const lines = data.map((p: any, i: number) => {
      const beds = p.bedrooms ? `${p.bedrooms}bd · ` : ''
      const price = p.price ? formatNaira(p.price) : 'Price on request'
      return `${i + 1}. *${p.title}*\n   📍 ${p.city}  ${beds}💰 ${price}\n   🔗 ${APP_URL()}/property/${p.id}`
    })

    return lines.join('\n\n')
  } catch {
    return `Browse listings here: ${APP_URL()}/listings?type=${type}`
  }
}

async function saveInspectionRequest(phone: string, property: string, date: string) {
  try {
    const db = getAdmin()
    await db.from('enquiries').insert({
      tenant_id: null,
      property_id: null,
      landlord_id: null,
      message: `📲 WhatsApp inspection request\nPhone: +${phone}\nProperty: ${property}\nPreferred date: ${date}`,
      status: 'open',
    })
  } catch {
    logger.warn({ phone, property }, 'enquiries insert failed for WhatsApp bot request')
  }
}

async function notifyAdmin(message: string) {
  const adminPhone = ADMIN_PHONE()
  if (!adminPhone) return
  try {
    await sendText(adminPhone, message)
  } catch {
    logger.warn('Admin WhatsApp notification failed')
  }
}

// ─── Session state ────────────────────────────────────────────────────────────
type Step = 'idle' | 'browse' | 'inspect_await' | 'inspect_date'

const sessions = new Map<string, { step: Step; data: Record<string, string> }>()

function getSession(phone: string) {
  if (!sessions.has(phone)) sessions.set(phone, { step: 'idle', data: {} })
  return sessions.get(phone)!
}

function setStep(phone: string, step: Step) {
  getSession(phone).step = step
}

// ─── Menu builders ────────────────────────────────────────────────────────────
async function sendMainMenu(phone: string) {
  return sendList(
    phone,
    '🏠 LIVAREX',
    "Welcome to *LIVAREX* — Nigeria's Verified Property Marketplace.\n\nHow can we help you today?",
    'View Menu',
    [
      {
        title: 'Properties',
        rows: [
          { id: 'menu_browse', title: '🔍 Browse Properties', description: 'Search homes to rent, buy or lease' },
          { id: 'menu_inspect', title: '📅 Schedule Inspection', description: 'Book a visit to a property' },
        ],
      },
      {
        title: 'Landlords',
        rows: [
          { id: 'menu_list', title: '🏘️ List My Property', description: 'Register as a landlord on LIVAREX' },
        ],
      },
      {
        title: 'Support',
        rows: [
          { id: 'menu_agent', title: '💬 Talk to an Agent', description: 'Speak with a LIVAREX team member' },
          { id: 'menu_about', title: 'ℹ️ About LIVAREX', description: 'Learn how LIVAREX works' },
        ],
      },
    ],
  )
}

async function sendBrowseMenu(phone: string) {
  return sendButtons(phone, 'What type of property are you looking for?', [
    { id: 'browse_rent', title: '🏠 For Rent' },
    { id: 'browse_lease', title: '📋 Lease' },
    { id: 'browse_buy', title: '🏗️ Buy / Sale' },
  ])
}

// ─── Core message handler ─────────────────────────────────────────────────────
async function handleMessage(phone: string, messageId: string, incoming: string) {
  const session = getSession(phone)
  const id = incoming.trim().toLowerCase()

  await markRead(messageId).catch(() => {})

  // ── Multi-step flows ──────────────────────────────────────────────────────
  if (session.step === 'inspect_await') {
    session.data.property = incoming.trim()
    setStep(phone, 'inspect_date')
    return sendText(
      phone,
      `Got it — *${incoming.trim()}*.\n\nWhat date would you like to inspect? (e.g. Saturday 28 June 2026)`,
    )
  }

  if (session.step === 'inspect_date') {
    const property = session.data.property ?? 'unspecified property'
    const date = incoming.trim()
    setStep(phone, 'idle')
    session.data = {}

    // Save to Supabase + notify admin
    await saveInspectionRequest(phone, property, date)
    await notifyAdmin(
      `📅 *New Inspection Request*\n\nPhone: +${phone}\nProperty: ${property}\nDate: ${date}\n\nAdmin panel: ${APP_URL()}/admin`,
    )

    return sendText(
      phone,
      `✅ *Inspection request received!*\n\nProperty: ${property}\nDate requested: ${date}\n\nA LIVAREX agent will confirm your inspection within 24 hours.\n\nBrowse more listings: ${APP_URL()}/listings`,
    )
  }

  // ── Menu / button IDs ─────────────────────────────────────────────────────
  switch (id) {
    case 'menu_browse':
    case 'browse':
    case '1':
      setStep(phone, 'browse')
      return sendBrowseMenu(phone)

    case 'menu_inspect':
    case 'inspect':
    case '2':
      setStep(phone, 'inspect_await')
      return sendText(
        phone,
        '📅 *Schedule an Inspection*\n\nSend the property name or paste the listing link from our website so we know which property you want to visit.',
      )

    case 'menu_list':
    case 'list':
    case '3':
      setStep(phone, 'idle')
      return sendText(
        phone,
        `🏘️ *List Your Property on LIVAREX*\n\nAll landlords are verified before properties go live:\n\n1️⃣ Register at: ${APP_URL()}/landlord/register\n2️⃣ Complete identity & property verification\n3️⃣ Your listing goes live after admin approval\n\nReply *agent* to speak with our team.`,
      )

    case 'menu_agent':
    case 'agent':
    case '4':
      setStep(phone, 'idle')
      return sendText(
        phone,
        "💬 *Talk to a LIVAREX Agent*\n\nOur team is available Mon–Sat, 8am–6pm (WAT).\n\n📞 +234 706 052 8437\n📧 livarexhomes@gmail.com\n\nAlternatively reply with your question and we'll get back to you shortly.",
      )

    case 'menu_about':
    case 'about':
    case '5':
      setStep(phone, 'idle')
      return sendText(
        phone,
        `ℹ️ *About LIVAREX*\n\nLIVAREX is Nigeria's verified property marketplace — built to eliminate fake listings, agent fraud, and rental scams.\n\n✅ Every property reviewed by our team\n✅ Every landlord identity-verified\n✅ No hidden agent fees\n✅ Safe, transparent transactions\n\nBrowse: ${APP_URL()}/listings\n\nReply *menu* anytime to see options.`,
      )

    // ── Browse by type — queries Supabase for real listings ─────────────────
    case 'browse_rent': {
      setStep(phone, 'idle')
      await sendText(phone, '🏠 *Rental Properties* — fetching live listings...')
      const listings = await fetchListings('rent')
      await sendText(phone, listings)
      return sendButtons(phone, 'What would you like to do next?', [
        { id: 'menu_inspect', title: '📅 Book Inspection' },
        { id: 'menu_browse', title: '🔍 Browse More' },
        { id: 'menu_agent', title: '💬 Talk to Agent' },
      ])
    }

    case 'browse_lease': {
      setStep(phone, 'idle')
      await sendText(phone, '📋 *Lease Listings* — fetching live listings...')
      const listings = await fetchListings('lease')
      await sendText(phone, listings)
      return sendButtons(phone, 'What would you like to do next?', [
        { id: 'menu_inspect', title: '📅 Book Inspection' },
        { id: 'menu_browse', title: '🔍 Browse More' },
        { id: 'menu_agent', title: '💬 Talk to Agent' },
      ])
    }

    case 'browse_buy': {
      setStep(phone, 'idle')
      await sendText(phone, '🏗️ *Properties For Sale* — fetching live listings...')
      const listings = await fetchListings('sale')
      await sendText(phone, listings)
      return sendButtons(phone, 'What would you like to do next?', [
        { id: 'menu_inspect', title: '📅 Book Inspection' },
        { id: 'menu_browse', title: '🔍 Browse More' },
        { id: 'menu_agent', title: '💬 Talk to Agent' },
      ])
    }

    case 'hi':
    case 'hello':
    case 'hey':
    case 'menu':
    case 'start':
    case 'help':
    default:
      setStep(phone, 'idle')
      return sendMainMenu(phone)
  }
}

// ─── Admin notification endpoint (called by website after enquiry saved) ─────
router.post('/whatsapp/notify-inspection', async (req, res) => {
  const adminPhone = ADMIN_PHONE()
  if (!adminPhone) {
    res.status(200).json({ ok: false, reason: 'WHATSAPP_ADMIN_PHONE not configured' })
    return
  }

  const { tenantName, propertyTitle, propertyCity, message, propertyId } = req.body ?? {}

  const text = [
    '🔔 *New Inspection Request — LIVAREX*',
    '',
    `👤 Tenant: ${tenantName ?? 'Unknown'}`,
    `🏠 Property: ${propertyTitle ?? 'Unknown'}${propertyCity ? ` · ${propertyCity}` : ''}`,
    propertyId ? `🔗 ${APP_URL()}/property/${propertyId}` : '',
    '',
    `📝 "${message ?? ''}"`,
    '',
    `📋 Admin inbox: ${APP_URL()}/admin/support`,
  ]
    .filter(l => l !== null)
    .join('\n')

  try {
    await sendText(adminPhone, text)
    res.status(200).json({ ok: true })
  } catch (err) {
    logger.error({ err }, 'notify-inspection WhatsApp send failed')
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// ─── Webhook verification (GET) ───────────────────────────────────────────────
router.get('/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified')
    res.status(200).send(challenge)
  } else {
    logger.warn({ mode, token }, 'WhatsApp webhook verification failed')
    res.sendStatus(403)
  }
})

// ─── Incoming messages (POST) ─────────────────────────────────────────────────
router.post('/whatsapp/webhook', async (req, res) => {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (secret) {
    const sig = req.headers['x-hub-signature-256'] as string | undefined
    const expected =
      'sha256=' + crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex')
    if (!sig || sig !== expected) {
      logger.warn('WhatsApp webhook signature mismatch')
      res.sendStatus(403)
      return
    }
  }

  res.sendStatus(200)

  try {
    const messages: any[] = req.body?.entry?.[0]?.changes?.[0]?.value?.messages ?? []

    for (const msg of messages) {
      const phone: string = msg.from
      const messageId: string = msg.id
      let text = ''

      if (msg.type === 'text') {
        text = msg.text?.body ?? ''
      } else if (msg.type === 'interactive') {
        text = msg.interactive?.list_reply?.id ?? msg.interactive?.button_reply?.id ?? ''
      } else {
        text = 'menu'
      }

      await handleMessage(phone, messageId, text)
    }
  } catch (err) {
    logger.error({ err }, 'WhatsApp webhook processing error')
  }
})

export default router

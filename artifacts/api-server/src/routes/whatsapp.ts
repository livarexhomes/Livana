import { Router } from 'express'
import crypto from 'node:crypto'
import { sendText, sendButtons, sendList, markRead } from '../lib/whatsapp'
import { logger } from '../lib/logger'

const router = Router()

// ─── In-memory session state ─────────────────────────────────────────────────
// Maps phone → current step in the conversation
type Step =
  | 'idle'
  | 'browse'
  | 'inspect_await'
  | 'inspect_name'
  | 'inspect_date'

const sessions = new Map<string, { step: Step; data: Record<string, string> }>()

function getSession(phone: string) {
  if (!sessions.has(phone)) sessions.set(phone, { step: 'idle', data: {} })
  return sessions.get(phone)!
}

function setStep(phone: string, step: Step) {
  const s = getSession(phone)
  s.step = step
}

// ─── Menu builders ───────────────────────────────────────────────────────────
const APP_URL = () => process.env.APP_URL ?? 'https://livarex.com.ng'

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

// ─── Incoming message handler ─────────────────────────────────────────────────
async function handleMessage(phone: string, messageId: string, incoming: string) {
  const session = getSession(phone)
  const text = incoming.trim().toLowerCase()

  await markRead(messageId).catch(() => {})

  // ── Inspect flow ─────────────────────────────────────────────────────────
  if (session.step === 'inspect_await') {
    session.data.property = incoming.trim()
    setStep(phone, 'inspect_date')
    return sendText(
      phone,
      `Got it — *${incoming.trim()}*.\n\nWhat date would you like to inspect? (e.g. Saturday 28 June 2026)`,
    )
  }

  if (session.step === 'inspect_date') {
    const property = session.data.property ?? 'the property'
    const date = incoming.trim()
    setStep(phone, 'idle')
    sessions.get(phone)!.data = {}
    return sendText(
      phone,
      `✅ *Inspection request received!*\n\nProperty: ${property}\nDate requested: ${date}\n\nA LIVAREX agent will confirm your inspection within 24 hours. You can also browse more listings at:\n${APP_URL()}/listings`,
    )
  }

  // ── Button / list reply IDs ───────────────────────────────────────────────
  switch (text) {
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
        '📅 *Schedule an Inspection*\n\nPlease send the property name or paste the listing link from our website so we know which property you want to visit.',
      )

    case 'menu_list':
    case 'list':
    case '3':
      setStep(phone, 'idle')
      return sendText(
        phone,
        `🏘️ *List Your Property on LIVAREX*\n\nAll landlords are verified before their properties go live. To get started:\n\n1. Visit: ${APP_URL()}/landlord/register\n2. Create your landlord account\n3. Complete identity & property verification\n4. Your listing goes live after admin approval\n\nNeed help? Reply *agent* to speak with someone.`,
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
        `ℹ️ *About LIVAREX*\n\nLIVAREX is Nigeria's verified property marketplace — built to eliminate fake listings, agent fraud, and rental scams.\n\n✅ Every property is reviewed by our team\n✅ Every landlord is identity-verified\n✅ No hidden agent fees\n✅ Safe, transparent transactions\n\nBrowse listings: ${APP_URL()}/listings\n\nReply *menu* anytime to see options.`,
      )

    case 'browse_rent':
      setStep(phone, 'idle')
      return sendText(
        phone,
        `🏠 *Properties For Rent*\n\nBrowse verified rental homes across Nigeria:\n${APP_URL()}/listings?type=rent\n\nReply *inspect* to schedule a viewing, or *menu* to go back.`,
      )

    case 'browse_lease':
      setStep(phone, 'idle')
      return sendText(
        phone,
        `📋 *Lease Listings*\n\nBrowse lease options:\n${APP_URL()}/listings?type=lease\n\nReply *inspect* to schedule a viewing, or *menu* to go back.`,
      )

    case 'browse_buy':
      setStep(phone, 'idle')
      return sendText(
        phone,
        `🏗️ *Properties For Sale*\n\nBrowse properties available to buy:\n${APP_URL()}/listings?type=sale\n\nReply *inspect* to schedule a viewing, or *menu* to go back.`,
      )

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
  // Verify signature if app secret is configured
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

  // Always respond 200 immediately so Meta doesn't retry
  res.sendStatus(200)

  try {
    const entry = req.body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    const messages: Array<{ from: string; id: string; type: string; text?: { body: string }; interactive?: { list_reply?: { id: string }; button_reply?: { id: string } } }> =
      value?.messages ?? []

    for (const msg of messages) {
      const phone: string = msg.from
      const messageId: string = msg.id
      let text = ''

      if (msg.type === 'text') {
        text = msg.text?.body ?? ''
      } else if (msg.type === 'interactive') {
        text =
          msg.interactive?.list_reply?.id ??
          msg.interactive?.button_reply?.id ??
          ''
      } else {
        // Unsupported message type — show menu
        text = 'menu'
      }

      await handleMessage(phone, messageId, text)
    }
  } catch (err) {
    logger.error({ err }, 'WhatsApp webhook processing error')
  }
})

export default router

// ── WhatsApp Cloud API webhook handlers ────────────────────────────────────
import { sendText, sendButtons, markRead } from "./whatsapp.js"
import { processMessage } from "./ai.js"
import { getSession, saveSession } from "./sessions.js"
import { upsertLead, scheduleFollowUp } from "./leads.js"

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "livarex_verify_token"
const AGENT_KEYWORDS  = ["agent", "human", "speak to", "call me", "call back"]
const GREETING_KEYWORDS = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "start", "helo"]

// Meta's webhook verification handshake
export function verifyWebhook(req, res) {
  const mode      = req.query["hub.mode"]
  const token     = req.query["hub.verify_token"]
  const challenge = req.query["hub.challenge"]

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified by Meta")
    return res.status(200).send(challenge)
  }
  return res.sendStatus(403)
}

// Handle all incoming WhatsApp messages
export async function handleWebhook(req, res) {
  res.sendStatus(200)  // always ack immediately

  const body = req.body
  if (body.object !== "whatsapp_business_account") return

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value
      if (!value?.messages?.length) continue

      for (const msg of value.messages) {
        const phone   = msg.from
        const contact = value.contacts?.[0]?.profile?.name || "there"
        await handleMessage(phone, contact, msg)
      }
    }
  }
}

async function handleMessage(phone, contactName, msg) {
  try {
    if (msg.id) await markRead(msg.id)

    const session = getSession(phone)
    if (contactName && !session.name) saveSession(phone, { name: contactName })

    const name    = session.name || contactName
    const msgText = extractText(msg).trim()
    if (!msgText) return

    console.log(`📩 [${phone}] ${name}: ${msgText}`)

    await upsertLead(phone, name, msgText)

    // ── Agent escalation ──────────────────────────────────────────────────
    if (AGENT_KEYWORDS.some((kw) => msgText.toLowerCase().includes(kw))) {
      saveSession(phone, { agentRequested: true })
      await sendText(
        phone,
        `Got it, ${name}! 🙋 Connecting you with a Livarex agent right away.\n\nA team member will reach out to you shortly. You can also browse our listings at www.livarex.com.ng`
      )
      await notifyAdminOfEscalation(phone, name, msgText)
      return
    }

    // ── First greeting ────────────────────────────────────────────────────
    if (
      session.stage === "greeting" ||
      GREETING_KEYWORDS.some((kw) => msgText.toLowerCase() === kw)
    ) {
      saveSession(phone, { stage: "qualifying" })
      await sendButtons(
        phone,
        `Hello ${name}! 👋 Welcome to *Livarex Homes* — Nigeria's Verified Property Marketplace. 🏡\n\nI'm your personal property rep. What are you looking for today?`,
        [
          { id: "rent",    title: "🔑 Rent a Property" },
          { id: "buy",     title: "🏠 Buy a Property"  },
          { id: "invest",  title: "📈 Investment"      },
        ]
      )
      return
    }

    // ── AI reply ──────────────────────────────────────────────────────────
    saveSession(phone, { stage: "browsing" })
    const reply = await processMessage(phone, name, msgText)
    await sendText(phone, reply)

    // Schedule a follow-up if no response within 24h
    await scheduleFollowUp(phone, 24)

    // Offer next step every 6 turns
    const turns = (await import("./memory.js")).then(m => m.getConversationHistory(phone))
      .then(h => h.length).catch(() => 0)
    if ((await turns) > 0 && (await turns) % 6 === 0) {
      await sendButtons(
        phone,
        "Would you like to take the next step? 😊",
        [
          { id: "viewing",       title: "📅 Book a Viewing"  },
          { id: "agent_connect", title: "👤 Speak to Agent"  },
        ]
      )
    }
  } catch (err) {
    console.error(`❌ Error handling message from ${phone}:`, err)
    try {
      await sendText(
        phone,
        "Sorry, I ran into a small issue. Please try again or type *SPEAK TO AGENT* to reach our team. 🙏"
      )
    } catch { /* ignore send failure */ }
  }
}

function extractText(msg) {
  if (msg.type === "text") return msg.text?.body || ""
  if (msg.type === "interactive") {
    return msg.interactive?.button_reply?.title ||
           msg.interactive?.list_reply?.title || ""
  }
  return ""
}

async function notifyAdminOfEscalation(phone, name, lastMessage) {
  const adminPhone = process.env.ADMIN_PHONE_NUMBER
  if (!adminPhone) return
  try {
    const { sendText: send } = await import("./whatsapp.js")
    await send(
      adminPhone,
      `🚨 *Agent Request*\n\nClient: ${name}\nPhone: ${phone}\nMessage: "${lastMessage.slice(0, 100)}"\n\nPlease follow up immediately.`
    )
  } catch (e) {
    console.error("Admin escalation notify failed:", e.message)
  }
}

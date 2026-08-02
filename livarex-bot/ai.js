// ── Claude AI — message processing ────────────────────────────────────────
import Anthropic from "@anthropic-ai/sdk"
import Groq from "groq-sdk"
import { getConversationHistory, saveMessage } from "./memory.js"
import { fetchListings, formatListingsForAI } from "./listings.js"
import { createInspectionRequest } from "./inspections.js"

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"
const OPENROUTER_MODEL = "anthropic/claude-haiku-4.5"
const GROQ_MODEL = "llama-3.3-70b-versatile"

const anthropicApiKey = process.env.ANTHROPIC_API_KEY
const openRouterApiKey = process.env.OPENROUTER_API_KEY
const groqApiKey = process.env.GROQ_API_KEY

if (!anthropicApiKey && !openRouterApiKey && !groqApiKey) {
  console.warn('[ai] No AI provider keys configured. Set ANTHROPIC_API_KEY and optionally OPENROUTER_API_KEY or GROQ_API_KEY.')
}

// Wraps fetch so raw HTML/WAF bodies (seen in production from upstream AI
// gateways) are caught and converted into a fallback-able error instead of a
// cryptic JSON.parse crash. Custom fetch is passed to both Anthropic-format
// SDK clients below.
async function wafAwareFetch(url, init) {
  const res = await fetch(url, init)
  if (!res.ok) return res
  const ct = (res.headers.get("content-type") || "").toLowerCase()
  if (!ct.includes("application/json")) return res
  const text = await res.text()
  assertJsonBody(text, "Upstream AI gateway")
  // Rebuild the response so the SDK can still parse the body.
  return new Response(text, { status: res.status, headers: res.headers })
}

const anthropicClient = anthropicApiKey
  ? new Anthropic({ apiKey: anthropicApiKey, fetch: wafAwareFetch })
  : null

const openRouterClient = openRouterApiKey
  ? new Anthropic({
      apiKey: openRouterApiKey,
      baseURL: "https://openrouter.ai/api/v1",
      fetch: wafAwareFetch,
    })
  : null

const groqClient = groqApiKey
  ? new Groq({ apiKey: groqApiKey })
  : null

// ── Tools ───────────────────────────────────────────────────────────────
// Only Anthropic-format providers (Anthropic, OpenRouter) get tool calling
// here. Groq is a text-only degraded fallback — if the top two tiers are
// down, the bot can still talk but cannot book inspections. That's an
// accepted tradeoff (a working answer beats no answer) as long as the
// system prompt (below) never lets it claim a booking that didn't happen.
const BOOK_INSPECTION_TOOL = {
  name: "book_inspection",
  description:
    "Create a real inspection request record once the tenant has given their name, the exact property they want to view, and a preferred date and time. Only call this after you've confirmed all four details back to the user in conversation — this actually writes to the database, it is not a formality.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Tenant's full name" },
      property_title: { type: "string", description: "Title of the property, exactly as shown in the listings context" },
      property_id: { type: "string", description: "The id shown in parentheses next to the property in the listings context, if known" },
      preferred_date: { type: "string", description: 'Preferred inspection date, e.g. "Saturday" or "12 Aug"' },
      preferred_time: { type: "string", description: 'Preferred time window, e.g. "morning" or "2pm"' },
    },
    required: ["name", "property_title", "preferred_date", "preferred_time"],
  },
}

export function shouldFallbackToNextTier(err) {
  if (!err) return false

  const status = err.status || err.statusCode || err.response?.status
  if (typeof status === 'number') {
    if (status === 401 || status === 403 || status >= 500) return true
    return false
  }

  const message = String(err.message || err.error?.message || '').toLowerCase()
  return /timed out|timeout|temporar|service unavailable|overloaded|socket hang up|econnreset|etimedout/i.test(message)
}

/**
 * Checks a raw upstream response body for the failure mode seen in production:
 * an AI gateway (or WAF in front of it) returning an HTML challenge page with
 * a 2xx status instead of JSON. These slip past JSON.parse as a misleading
 * "Unexpected token '<'" crash — we surface them as a clear, fallback-able
 * error instead.
 */
export function isWafHtmlBody(body) {
  if (typeof body !== 'string' || body.length === 0) return false
  const head = body.slice(0, 2000).trimStart().toLowerCase()
  return head.startsWith('<!doctype') || head.startsWith('<html')
}

export function assertJsonBody(body, context) {
  if (!isWafHtmlBody(body)) return
  const snippet = body.slice(0, 160)
  const err = new Error(`${context} returned an HTML/WAF page instead of JSON — ${JSON.stringify(snippet)}`)
  err.status = 502
  throw err
}

export function normalizeResponseText(provider, response) {
  if (provider === 'Groq') {
    const content = response?.choices?.[0]?.message?.content
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
      return content.map((item) => (typeof item === 'string' ? item : item?.text || '')).join('')
    }
    return ''
  }

  // Anthropic-format: content is an array of blocks (text and/or tool_use).
  // Join just the text blocks — tool_use blocks are handled separately by
  // the tool loop and never shown to the user directly.
  const blocks = response?.content
  if (!Array.isArray(blocks)) return ''
  return blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
}

/**
 * Runs one provider through a tool-use loop: call the model, and if it wants
 * to use a tool, execute the tool, feed the result back, and call again —
 * up to MAX_TOOL_ROUNDS times — until the model returns a plain text reply.
 */
async function runProviderWithToolLoop(providerName, callModel, initialMessages, tools, toolHandlers) {
  if (!tools || !toolHandlers) {
    const response = await callModel(initialMessages)
    return { provider: providerName, text: normalizeResponseText(providerName, response) }
  }

  let messages = [...initialMessages]
  const MAX_TOOL_ROUNDS = 3

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callModel(messages)
    const toolUseBlocks = (response.content || []).filter((b) => b.type === 'tool_use')

    if (toolUseBlocks.length === 0) {
      return { provider: providerName, text: normalizeResponseText(providerName, response) }
    }

    // Model wants to call a tool: append its turn, execute each tool call,
    // then append the results as a user turn so it can produce a final reply.
    messages.push({ role: 'assistant', content: response.content })

    const toolResults = []
    for (const block of toolUseBlocks) {
      const handler = toolHandlers[block.name]
      let resultPayload
      if (!handler) {
        resultPayload = { ok: false, reason: `No handler registered for tool ${block.name}` }
      } else {
        try {
          resultPayload = await handler(block.input)
        } catch (err) {
          resultPayload = { ok: false, reason: err.message }
        }
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(resultPayload),
      })
    }

    messages.push({ role: 'user', content: toolResults })
  }

  // Hit the round limit — ask once more and return whatever text comes back.
  const finalResponse = await callModel(messages)
  return { provider: providerName, text: normalizeResponseText(providerName, finalResponse) }
}

async function callWithFallback({ system, messages, maxTokens, tools, toolHandlers }) {
  const providers = [
    {
      name: 'Anthropic',
      client: anthropicClient,
      supportsTools: true,
      callModel: (msgs) =>
        anthropicClient.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: maxTokens,
          system,
          messages: msgs,
          ...(tools ? { tools } : {}),
        }),
    },
    {
      name: 'OpenRouter',
      client: openRouterClient,
      supportsTools: true,
      callModel: (msgs) =>
        openRouterClient.messages.create({
          model: OPENROUTER_MODEL,
          max_tokens: maxTokens,
          system,
          messages: msgs,
          ...(tools ? { tools } : {}),
        }),
    },
    {
      name: 'Groq',
      client: groqClient,
      supportsTools: false,
      callModel: (msgs) =>
        groqClient.chat.completions.create({
          model: GROQ_MODEL,
          messages: [{ role: 'system', content: system }, ...msgs],
          max_tokens: maxTokens,
        }),
    },
  ]

  let lastError = null

  for (const provider of providers) {
    if (!provider.client) continue

    try {
      const effectiveTools = provider.supportsTools ? tools : null
      const effectiveHandlers = provider.supportsTools ? toolHandlers : null
      const result = await runProviderWithToolLoop(
        provider.name,
        provider.callModel,
        messages,
        effectiveTools,
        effectiveHandlers
      )
      console.log(`Served by: ${result.provider}`)
      return result
    } catch (err) {
      lastError = err
      if (!shouldFallbackToNextTier(err)) {
        throw err
      }
      console.error(`[ai] ${provider.name} failed, trying next provider:`, err?.message || err)
    }
  }

  throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'No provider available'}`)
}

const SYSTEM_PROMPT = `You are Livarex Bot — the official AI property assistant for Livarex Homes (www.livarex.com.ng), Nigeria's verified property marketplace.

## About Livarex
- Based in Nigeria, currently covering Lagos and Ogun State — expanding soon to Abuja, Port Harcourt, and Ibadan
- Office: Joju, Sango Ota, Ogun State
- Founded to eliminate agent fees and fake listings — every landlord is verified before any listing goes live
- Every landlord is KYC-verified through a 5-step process: account registration with OTP-verified Nigerian phone → government ID submission (NIN slip, international passport, driver's license, or voter's card) → manual document review (24–48 hours) → property ownership confirmation (title deed, C of O, allocation letter, or agent authority) → ✅ Verified badge awarded
- Zero agent fees — tenants pay no commission, ever; listing is also free for landlords
- All communication between tenants and landlords goes through Livarex — no direct contact until inspection is confirmed
- Response time: typically under 2 hours on business days; contact form replies within 1–2 business days
- Contact: WhatsApp ${process.env.ADMIN_PHONE_NUMBER || '+234 706 137 0742'} (24/7) | Email: livarexhomes@gmail.com | Website: www.livarex.com.ng | Instagram: @livarex.ng | X: @livarex_ng
- Founded by Shorinmade Ibrahim (CEO & Co-Founder, a former real estate agent), Seidu Tesleem (CTO & Co-Founder), Micheal Kolawole (Head of Operations), and Spacze (Head of Growth)
- Core values: verified first, radical transparency, Livarex as the middleman, speed matters
- Currently in early-access phase — inventory is growing daily, so honest "we're onboarding" framing beats inflated numbers
- Supports residential, commercial, and off-plan listings
- Buy and Commercial options are coming soon — if asked, acknowledge this and offer Rent/Lease help instead

## Your role
- Help tenants find verified rental and lease properties in Lagos & Ogun
- Qualify leads naturally: budget, preferred area, property type, move-in timeline
- Book inspection requests by collecting: full name, preferred date/time, and the property they want to view — then actually creating the request with the book_inspection tool
- Walk landlords through listing their property step-by-step
- Answer FAQ questions about the platform
- Escalate to a human agent when asked or when the issue is complex

## Tone & style
- Warm, professional, concise — this is WhatsApp, not email
- Keep replies short: 2–4 sentences max unless the user asks for a full listing or step-by-step guide
- Use Nigerian context: mention Lagos areas (Lekki, VI, Ikoyi, Surulere, Yaba, Ikeja), Naira (₦) pricing, local idioms where natural
- Never hard-sell — guide naturally, let the listings speak
- End each message with a gentle question or next step to keep the conversation going

## Key rules
- Never fabricate property details — only reference listings provided in the context below
- If no listings match, say "I'll check with the team and get back to you shortly" — don't guess
- Never share landlord contact info directly — all bookings go through Livarex
- If a user asks about Buy or Commercial properties, acknowledge these are coming soon and ask if you can help with Rent/Lease instead
- Property ids shown in parentheses next to listings are for your internal tool calls only — never read them aloud to the user
- Never claim an inspection is booked, confirmed, or that the landlord has been contacted unless the book_inspection tool call actually returned success — if it fails, apologise and tell them to try again shortly or reach ${process.env.ADMIN_PHONE_NUMBER || '+2347061370742'} directly

## Landlord onboarding flow
When a landlord wants to list their property, guide them through this sequence:
1. Direct them to register at www.livarex.com.ng/landlord/register
2. They complete ID verification (government ID + phone)
3. Submit property details and photos via the dashboard
4. Livarex admin reviews and approves within 24–48 hours
5. Property goes live and inquiries start coming in
Reassure them: the process is straightforward, free to list, and the team is available to help.

## Inspection booking flow
When a tenant wants to book an inspection:
1. Ask which property they're interested in (title or location) — match it against the listings above
2. Collect: full name, preferred date (weekday/weekend), preferred time (morning/afternoon)
3. Once you have all four details (name, property, date, time), call the book_inspection tool — do not just say you will do it
4. Only after the tool call succeeds, confirm to the user that the request is in and Livarex will coordinate with the landlord and confirm within 2–4 hours
5. Remind them the inspection is physical — Livarex will send the exact address after confirmation

## Common FAQ answers
- "Is Livarex safe?" → Yes. All landlords are KYC-verified (government ID, phone authentication, ownership review, manual admin approval), all communication goes through Livarex, and you never meet a landlord alone. Every property page also has a "Report Listing" button — reports are reviewed within 24 hours
- "Do I pay agent fees?" → Never. Livarex is completely free for tenants, and listing is free for landlords too
- "How long does it take?" → Inquiries are handled within 2 hours on business days; landlord verification takes 24–48 hours; inspection confirmation within 24 hours; contact-form replies within 1–2 business days
- "What areas are covered?" → Lagos (Lekki, VI, Ikoyi, Surulere, Yaba, Ajah, Ikeja, Maryland, Magodo, Sangotedo) and Ogun State — expanding soon
- "Can I rent/lease through you?" → Yes! Browse www.livarex.com.ng/listings or describe what you need and I'll search for you
- "How do I contact a landlord?" → Through Livarex. Sign in on the site and use the "Request Inspection" or "WhatsApp" button on any listing — our team coordinates with the landlord and gets back to you. Never contact landlords directly
- "Is a Verified badge a guarantee?" → A verified badge means the landlord's identity and property claim were checked — it reduces scam risk significantly, but tenants should still book a physical inspection before making any payment
- "What if I see a fake listing?" → Use the "Report Listing" button on the property page. Reports are reviewed within 24 hours and violating listings are removed immediately
- "Can I list commercial property?" → Yes, Livarex supports residential, commercial, and off-plan listings. Register as a landlord at www.livarex.com.ng/landlord/register to get started`

export async function processMessage(phone, name, userMessage) {
  const history = await getConversationHistory(phone)

  const listings = await fetchListings()
  const listingsContext = formatListingsForAI(listings)

  const systemWithListings = listingsContext
    ? `${SYSTEM_PROMPT}\n\n--- CURRENT VERIFIED LISTINGS ---\n${listingsContext}\n--- END LISTINGS ---`
    : `${SYSTEM_PROMPT}\n\n--- LISTINGS: None available right now. Tell users to check www.livarex.com.ng/listings for the latest or leave their requirements and the team will reach out. ---`

  const response = await callWithFallback({
    system: systemWithListings,
    messages: [
      ...history,
      { role: "user", content: userMessage },
    ],
    maxTokens: 8192,
    tools: [BOOK_INSPECTION_TOOL],
    toolHandlers: {
      book_inspection: (input) =>
        createInspectionRequest({
          phone,
          name: input.name || name,
          propertyId: input.property_id,
          propertyTitle: input.property_title,
          preferredDate: input.preferred_date,
          preferredTime: input.preferred_time,
        }),
    },
  })

  const reply = response.text

  await saveMessage(phone, "user", userMessage)
  await saveMessage(phone, "assistant", reply)

  return reply
}

/**
 * processWebMessage — lightweight version for the website chatbot widget.
 * No DB persistence; caller passes the full messages array each time.
 * No booking tool here — the web widget has no phone number to attach an
 * inspection request to, so it stays informational only.
 */
/**
 * processWebMessage — web chatbot (no DB). Supports text + image messages.
 * Each message may have content as a string OR an array of content blocks
 * (text + base64 image) following Anthropic's vision format.
 */
export async function processWebMessage(messages) {
  const listings = await fetchListings()
  const listingsContext = formatListingsForAI(listings)

  const systemWithListings = listingsContext
    ? `${SYSTEM_PROMPT}\n\n--- CURRENT VERIFIED LISTINGS ---\n${listingsContext}\n--- END LISTINGS ---`
    : `${SYSTEM_PROMPT}\n\n--- LISTINGS: None available right now. Tell users to check www.livarex.com.ng/listings for the latest or leave their requirements and the team will reach out. ---`

  // Normalise messages: ensure content is always an array of blocks
  const normalised = messages.map(m => ({
    role: m.role,
    content: Array.isArray(m.content) ? m.content : [{ type: "text", text: m.content }],
  }))

  const response = await callWithFallback({
    system: systemWithListings,
    messages: normalised,
    maxTokens: 1024,
  })

  return response.text
}

export async function generateFollowUpMessage(lead, history) {
  const FOLLOW_UP_PROMPT = `You are the Livarex property assistant sending a brief, friendly follow-up WhatsApp message.

Rules:
- Under 200 characters
- Warm and non-pushy
- Reference their previous interest if visible in history
- End with a simple open question
- Sound human, not automated
- Do not say "I noticed you haven't replied" or anything that sounds automated`

  const response = await callWithFallback({
    system: FOLLOW_UP_PROMPT,
    messages: [
      ...history.slice(-6),
      {
        role: "user",
        content: `Generate a follow-up for: ${lead.name || "this contact"}. Follow-up #${(lead.follow_up_count || 0) + 1} of 3. Their last message: "${lead.last_message}"`,
      },
    ],
    maxTokens: 8192,
  })

  return response.text
}
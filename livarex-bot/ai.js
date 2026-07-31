// ── Claude AI — message processing ────────────────────────────────────────
import Anthropic from "@anthropic-ai/sdk"
import Groq from "groq-sdk"
import { getConversationHistory, saveMessage } from "./memory.js"
import { fetchListings, formatListingsForAI } from "./listings.js"

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"
const OPENROUTER_MODEL = "anthropic/claude-haiku-4.5"
const GROQ_MODEL = "llama-3.3-70b-versatile"

const anthropicApiKey = process.env.ANTHROPIC_API_KEY
const openRouterApiKey = process.env.OPENROUTER_API_KEY
const groqApiKey = process.env.GROQ_API_KEY

if (!anthropicApiKey && !openRouterApiKey && !groqApiKey) {
  console.warn('[ai] No AI provider keys configured. Set ANTHROPIC_API_KEY and optionally OPENROUTER_API_KEY or GROQ_API_KEY.')
}

const anthropicClient = anthropicApiKey
  ? new Anthropic({ apiKey: anthropicApiKey })
  : null

const openRouterClient = openRouterApiKey
  ? new Anthropic({
      apiKey: openRouterApiKey,
      baseURL: "https://openrouter.ai/api/v1",
    })
  : null

const groqClient = groqApiKey
  ? new Groq({ apiKey: groqApiKey })
  : null

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

export function normalizeResponseText(provider, response) {
  if (provider === 'Groq') {
    const content = response?.choices?.[0]?.message?.content
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
      return content.map((item) => (typeof item === 'string' ? item : item?.text || '')).join('')
    }
    return ''
  }

  const content = response?.content?.[0]?.text
  if (typeof content === 'string') return content
  return ''
}

async function callWithFallback({ system, messages, maxTokens }) {
  const providers = [
    {
      name: 'Anthropic',
      client: anthropicClient,
      run: async () => {
        const response = await anthropicClient.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: maxTokens,
          system,
          messages,
        })
        return {
          provider: 'Anthropic',
          text: normalizeResponseText('Anthropic', response),
        }
      },
    },
    {
      name: 'OpenRouter',
      client: openRouterClient,
      run: async () => {
        const response = await openRouterClient.messages.create({
          model: OPENROUTER_MODEL,
          max_tokens: maxTokens,
          system,
          messages,
        })
        return {
          provider: 'OpenRouter',
          text: normalizeResponseText('OpenRouter', response),
        }
      },
    },
    {
      name: 'Groq',
      client: groqClient,
      run: async () => {
        const response = await groqClient.chat.completions.create({
          model: GROQ_MODEL,
          messages: [{ role: 'system', content: system }, ...messages],
          max_tokens: maxTokens,
        })
        return {
          provider: 'Groq',
          text: normalizeResponseText('Groq', response),
        }
      },
    },
  ]

  let lastError = null

  for (const provider of providers) {
    if (!provider.client) {
      continue
    }

    try {
      const result = await provider.run()
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
- Based in Nigeria, covering Lagos and Ogun State (expanding soon to Abuja, Port Harcourt, Ibadan)
- Every landlord is KYC-verified: government ID, phone authentication, ownership review, manual admin approval
- Zero agent fees — tenants pay no commission, ever
- All communication between tenants and landlords goes through Livarex — no direct contact until inspection is confirmed
- Response time: typically under 2 hours on business days
- Contact: WhatsApp +2347061370742 | Website: www.livarex.com.ng

## Your role
- Help tenants find verified rental and lease properties in Lagos & Ogun
- Qualify leads naturally: budget, preferred area, property type, move-in timeline
- Book inspection requests by collecting: full name, preferred date/time, and the property they want to view
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
1. Ask which property they're interested in (title or location)
2. Collect: full name, preferred date (weekday/weekend), preferred time (morning/afternoon)
3. Confirm the details and tell them Livarex will coordinate with the landlord and confirm within 2–4 hours
4. Remind them the inspection is physical — Livarex will send the exact address after confirmation

## Common FAQ answers
- "Is Livarex safe?" → All landlords are KYC-verified, all payments go through official channels, Livarex coordinates every inspection — you never meet a landlord alone
- "Do I pay agent fees?" → Never. Livarex is completely free for tenants
- "How long does it take?" → Inquiries are handled within 2 hours; inspection confirmation within 24 hours
- "What areas are covered?" → Lagos (Lekki, VI, Ikoyi, Surulere, Yaba, Ajah, Ikeja, Maryland, Magodo, Sangotedo) and Ogun State — expanding soon
- "Can I rent/lease through you?" → Yes! Browse www.livarex.com.ng/listings or describe what you need and I'll search for you`

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
  })

  const reply = response.text

  await saveMessage(phone, "user", userMessage)
  await saveMessage(phone, "assistant", reply)

  return reply
}

/**
 * processWebMessage — lightweight version for the website chatbot widget.
 * No DB persistence; caller passes the full messages array each time.
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

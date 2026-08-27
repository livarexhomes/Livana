// ── Livarex WhatsApp Bot — Entry Point ─────────────────────────────────────
import express from "express"
import { timingSafeEqual } from "node:crypto"
import { verifyWebhook, handleWebhook } from "./webhook.js"
import {
  handleInspectionEvent,
  handleBotInspectionEvent,
  handleNewSignupEvent,
  handleKYCEvent,
} from "./notifications.js"
import { startFollowUpScheduler } from "./followUp.js"
import { processWebMessage } from "./ai.js"

const CHAT_API_SECRET      = process.env.CHAT_API_SECRET || ""
const CHAT_ALLOWED_ORIGINS = (process.env.CHAT_ALLOWED_ORIGINS || "https://www.livarex.com.ng,https://livarex.com.ng")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
const CHAT_RATE_LIMIT      = Number(process.env.CHAT_RATE_LIMIT || 20)        // requests
const CHAT_RATE_WINDOW_MS  = Number(process.env.CHAT_RATE_WINDOW_MS || 60_000) // per minute
const CHAT_MAX_MESSAGES    = 50
const CHAT_MAX_BODY_BYTES  = 32 * 1024
const SUPABASE_URL         = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_PHONE          = process.env.ADMIN_PHONE_NUMBER

// ── Boot validation ────────────────────────────────────────────────────────
const bootWarnings = []
if (!ADMIN_PHONE) bootWarnings.push("ADMIN_PHONE_NUMBER is not set — admin alerts will be silently dropped")
if (!CHAT_API_SECRET) bootWarnings.push("CHAT_API_SECRET is not set — /api/chat will reject all requests (recommended)")
if (bootWarnings.length) for (const w of bootWarnings) console.warn(`[boot] ${w}`)

const app = express()
app.use(express.json({ limit: "1mb" }))

// ── WhatsApp Cloud API webhook ──────────────────────────────────────────────
app.get("/webhook", verifyWebhook)
app.post("/webhook", handleWebhook)

// ── Supabase Database Webhook events ───────────────────────────────────────
// Set these as webhooks in Supabase → Database → Webhooks
//   /events/inspection     → table: enquiries,               events: UPDATE
//   /events/bot-inspection → table: bot_inspection_requests, events: UPDATE
//   /events/signup         → table: tenants,                 events: INSERT
//   /events/kyc            → table: landlords,               events: INSERT | UPDATE (status=pending)
app.post("/events/inspection",     handleInspectionEvent)
app.post("/events/bot-inspection", handleBotInspectionEvent)
app.post("/events/signup",         handleNewSignupEvent)
app.post("/events/kyc",            handleKYCEvent)

// ── Health check ───────────────────────────────────────────────────────────
app.get("/", (_, res) =>
  res.json({ status: "ok", service: "Livarex WhatsApp Bot 🏡", time: new Date().toISOString() })
)

// ── Web Chat API (used by livarex.com.ng chatbot widget) ───────────────────
const chatBuckets = new Map() // ip -> { count, resetAt }

function chatRateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || "unknown"
  const now = Date.now()
  const bucket = chatBuckets.get(ip)
  if (!bucket || bucket.resetAt <= now) {
    chatBuckets.set(ip, { count: 1, resetAt: now + CHAT_RATE_WINDOW_MS })
  } else {
    bucket.count += 1
    if (bucket.count > CHAT_RATE_LIMIT) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000))
      return res.status(429).json({ error: "Too many requests" })
    }
  }
  next()
}

function chatAuth(req, res, next) {
  if (!CHAT_API_SECRET) return res.status(503).json({ error: "Chat API not configured" })
  const provided = String(req.headers["x-chat-secret"] || "")
  const a = Buffer.from(provided)
  const b = Buffer.from(CHAT_API_SECRET)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  next()
}

function chatCors(req, res, next) {
  const origin = req.headers.origin
  if (origin && CHAT_ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Vary", "Origin")
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Chat-Secret")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  if (req.method === "OPTIONS") return res.sendStatus(204)
  next()
}

app.post("/api/chat", chatCors, chatAuth, chatRateLimit, async (req, res) => {
  try {
    const body = req.body
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "JSON body required" })
    }
    const { messages } = body
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array required" })
    }
    if (messages.length > CHAT_MAX_MESSAGES) {
      return res.status(400).json({ error: `Too many messages (max ${CHAT_MAX_MESSAGES})` })
    }
    const bodyBytes = Buffer.byteLength(JSON.stringify(body), "utf8")
    if (bodyBytes > CHAT_MAX_BODY_BYTES) {
      return res.status(413).json({ error: "Request body too large" })
    }
    const reply = await processWebMessage(messages)
    res.json({ reply })
  } catch (err) {
    console.error("Chat API error:", err?.message || err)
    if (err?.message?.includes("All AI providers failed") || err?.message?.includes("No provider available")) {
      return res.status(500).json({
        error: "AI service not configured. Please set ANTHROPIC_API_KEY and optionally OPENROUTER_API_KEY or GROQ_API_KEY.",
      })
    }
    if (err?.message) {
      return res.status(500).json({ error: err.message })
    }
    res.status(500).json({ error: "Something went wrong. Please try again." })
  }
})

export { app, chatBuckets, chatAuth, chatRateLimit, chatCors, CHAT_API_SECRET, CHAT_ALLOWED_ORIGINS, CHAT_MAX_MESSAGES, CHAT_MAX_BODY_BYTES }

// ── Start server (skipped when this module is imported in tests) ───────────
if (process.env.NODE_ENV !== "test" && import.meta.url === `file://${process.argv[1]}`) {
  const followUpTimer = startFollowUpScheduler()

  const PORT = process.env.PORT || 3000
  const server = app.listen(PORT, () => console.log(`🏡 Livarex Bot listening on port ${PORT}`))

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  function shutdown(signal) {
    console.log(`[shutdown] ${signal} received, closing server…`)
    if (followUpTimer) clearInterval(followUpTimer)
    server.close((err) => {
      if (err) {
        console.error("[shutdown] server.close error:", err)
        process.exit(1)
      }
      process.exit(0)
    })
    // Hard exit if close hangs (e.g. a long AI request).
    setTimeout(() => {
      console.warn("[shutdown] forcing exit after 10s")
      process.exit(1)
    }, 10_000).unref()
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"))
  process.on("SIGINT",  () => shutdown("SIGINT"))
}

// ── Livarex WhatsApp Bot — Entry Point ─────────────────────────────────────
import express from "express"
import { verifyWebhook, handleWebhook } from "./webhook.js"
import {
  handleInspectionEvent,
  handleNewSignupEvent,
  handleKYCEvent,
} from "./notifications.js"
import { startFollowUpScheduler } from "./followUp.js"
import { processWebMessage } from "./ai.js"

const app = express()
app.use(express.json())

// ── WhatsApp Cloud API webhook ──────────────────────────────────────────────
app.get("/webhook", verifyWebhook)
app.post("/webhook", handleWebhook)

// ── Supabase Database Webhook events ───────────────────────────────────────
// Set these as webhooks in Supabase → Database → Webhooks
//   /events/inspection  → table: enquiries, events: UPDATE
//   /events/signup      → table: tenants,   events: INSERT
//   /events/kyc         → table: landlords,  events: INSERT | UPDATE (status=pending)
app.post("/events/inspection", handleInspectionEvent)
app.post("/events/signup",     handleNewSignupEvent)
app.post("/events/kyc",        handleKYCEvent)

// ── Health check ───────────────────────────────────────────────────────────
app.get("/", (_, res) =>
  res.json({ status: "ok", service: "Livarex WhatsApp Bot 🏡", time: new Date().toISOString() })
)

// ── Web Chat API (used by livarex.com.ng chatbot widget) ───────────────────
app.use((req, res, next) => {
  if (req.path === "/api/chat") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    if (req.method === "OPTIONS") return res.sendStatus(200)
  }
  next()
})

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array required" })
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

// ── Start ───────────────────────────────────────────────────────────────────
startFollowUpScheduler()

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🏡 Livarex Bot listening on port ${PORT}`))

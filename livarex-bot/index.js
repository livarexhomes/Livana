// ── Livarex WhatsApp Bot — Entry Point ─────────────────────────────────────
import express from "express"
import { verifyWebhook, handleWebhook } from "./webhook.js"
import {
  handleInspectionEvent,
  handleNewSignupEvent,
  handleKYCEvent,
} from "./notifications.js"
import { startFollowUpScheduler } from "./followUp.js"

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

// ── Start ───────────────────────────────────────────────────────────────────
startFollowUpScheduler()

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🏡 Livarex Bot listening on port ${PORT}`))

// ── Notifications — inspection updates + admin alerts ─────────────────────
//
// These endpoints are called by Supabase Database Webhooks.
//
// HOW TO SET UP IN SUPABASE (Database → Webhooks → Create a new hook):
//
//   1. Inspection request updates
//      Table: enquiries | Event: UPDATE
//      URL: https://your-bot-url.com/events/inspection
//      HTTP Method: POST
//
//   2. New tenant signup
//      Table: tenants | Event: INSERT
//      URL: https://your-bot-url.com/events/signup
//      HTTP Method: POST
//
//   3. Landlord KYC submission
//      Table: landlords | Event: INSERT | UPDATE (filter: status = 'pending')
//      URL: https://your-bot-url.com/events/kyc
//      HTTP Method: POST
//
// Supabase sends: { type, table, schema, record, old_record }

import { sendText } from "./whatsapp.js"

const ADMIN_PHONE = process.env.ADMIN_PHONE_NUMBER
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET  // optional extra security

function verifySecret(req) {
  if (!WEBHOOK_SECRET) return true
  return req.headers["x-webhook-secret"] === WEBHOOK_SECRET
}

// ── 1. Inspection / Enquiry status update → notify tenant ─────────────────
export async function handleInspectionEvent(req, res) {
  res.sendStatus(200)
  if (!verifySecret(req)) return

  try {
    const { type, record, old_record } = req.body || {}
    if (!record) return

    // Only act on status changes
    if (type !== "UPDATE") return
    if (old_record?.status === record.status) return

    // We need the tenant's phone. Fetch from tenants table.
    const tenantPhone = await fetchTenantPhone(record.tenant_id)
    if (!tenantPhone) {
      console.log("No phone for tenant:", record.tenant_id)
      return
    }

    const propertyTitle = record.property_title || "your enquiry"
    const newStatus     = record.status

    const messages = {
      replied: `✅ *Update from Livarex!*\n\nThe landlord has replied to your enquiry for *${propertyTitle}*.\n\nLog in to www.livarex.com.ng to see their response. 🏡`,
      closed:  `📋 *Enquiry Closed*\n\nYour enquiry for *${propertyTitle}* has been closed.\n\nHave questions? Visit www.livarex.com.ng or reply here.`,
      approved:`🎉 *Inspection Approved!*\n\nYour inspection request for *${propertyTitle}* has been *approved*!\n\nThe landlord will be in touch to confirm the date. 🏡`,
      rejected:`❌ *Inspection Update*\n\nUnfortunately, your inspection request for *${propertyTitle}* could not be confirmed at this time.\n\nWe have other great options — visit www.livarex.com.ng to explore.`,
    }

    const msg = messages[newStatus]
    if (!msg) return  // no message for this status

    await sendText(tenantPhone, msg)
    console.log(`📤 Inspection update (${newStatus}) sent to ${tenantPhone}`)
  } catch (err) {
    console.error("handleInspectionEvent error:", err.message)
  }
}

// ── 2. New tenant signup → admin alert ────────────────────────────────────
export async function handleNewSignupEvent(req, res) {
  res.sendStatus(200)
  if (!verifySecret(req)) return

  try {
    const { type, record } = req.body || {}
    if (type !== "INSERT" || !record) return
    if (!ADMIN_PHONE) return

    const name  = record.full_name || "Unknown"
    const email = record.email || record.phone || "—"
    const time  = new Date(record.created_at).toLocaleString("en-NG", {
      timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short",
    })

    await sendText(
      ADMIN_PHONE,
      `🆕 *New Tenant Signup*\n\nName: ${name}\nContact: ${email}\nTime: ${time}\n\nView in admin: www.livarex.com.ng/admin/users`
    )
    console.log(`📤 New signup alert sent for ${name}`)
  } catch (err) {
    console.error("handleNewSignupEvent error:", err.message)
  }
}

// ── 3. Landlord KYC submission → admin alert ──────────────────────────────
export async function handleKYCEvent(req, res) {
  res.sendStatus(200)
  if (!verifySecret(req)) return

  try {
    const { type, record, old_record } = req.body || {}
    if (!record) return

    const isNew       = type === "INSERT"
    const isSubmitted = type === "UPDATE" &&
      old_record?.status !== "pending" &&
      record.status === "pending"

    if (!isNew && !isSubmitted) return
    if (!ADMIN_PHONE) return

    const name     = record.full_name || "Unknown Landlord"
    const city     = record.city || "—"
    const whatsapp = record.whatsapp || record.phone || "—"
    const time     = new Date(record.created_at || Date.now()).toLocaleString("en-NG", {
      timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short",
    })

    const label = isNew ? "New Landlord Registered" : "KYC Submitted — Review Required"
    const emoji = isNew ? "🏘️" : "📋"

    await sendText(
      ADMIN_PHONE,
      `${emoji} *${label}*\n\nName: ${name}\nCity: ${city}\nWhatsApp: ${whatsapp}\nTime: ${time}\n\nReview KYC: www.livarex.com.ng/admin/kyc`
    )
    console.log(`📤 KYC alert sent for ${name} (${isNew ? "new" : "submitted"})`)
  } catch (err) {
    console.error("handleKYCEvent error:", err.message)
  }
}

// ── Internal: fetch tenant phone from Supabase ─────────────────────────────
async function fetchTenantPhone(tenantId) {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY || !tenantId) return null

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tenants?id=eq.${tenantId}&select=phone,email&limit=1`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.[0]?.phone || null
  } catch {
    return null
  }
}

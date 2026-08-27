// ── Lead tracking (Supabase + in-memory fallback) ─────────────────────────
//
// Run this SQL once in Supabase (SQL Editor):
//
//   create table if not exists bot_leads (
//     phone text primary key,
//     name text,
//     last_message text,
//     last_message_at timestamptz default now(),
//     follow_up_count int default 0,
//     follow_up_due_at timestamptz,
//     follow_up_sent_at timestamptz,
//     created_at timestamptz default now()
//   );

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const useSupabase          = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY)
const leadsStore           = new Map()  // fallback

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.method === "POST" ? "resolution=merge-duplicates,return=minimal" : "return=representation",
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export async function upsertLead(phone, name, message) {
  const record = {
    phone,
    name: name || null,
    last_message: message.slice(0, 500),
    last_message_at: new Date().toISOString(),
  }

  if (useSupabase) {
    try {
      await sbFetch("/bot_leads", {
        method: "POST",
        body: JSON.stringify(record),
      })
      return
    } catch (err) {
      console.error("upsertLead failed:", err.message)
    }
  }

  leadsStore.set(phone, { ...(leadsStore.get(phone) || {}), ...record })
}

export async function scheduleFollowUp(phone, delayHours = 24) {
  const dueAt = new Date(Date.now() + delayHours * 3600 * 1000).toISOString()

  if (useSupabase) {
    try {
      // PATCH so we don't clobber name / last_message on the lead row.
      await sbFetch(`/bot_leads?phone=eq.${encodeURIComponent(phone)}`, {
        method: "PATCH",
        body: JSON.stringify({ follow_up_due_at: dueAt }),
        headers: { Prefer: "return=minimal" },
      })
      return
    } catch (err) { console.error("scheduleFollowUp failed:", err.message) }
  }

  const lead = leadsStore.get(phone) || { phone }
  leadsStore.set(phone, { ...lead, follow_up_due_at: dueAt })
}

export async function isFollowUpScheduled(phone) {
  if (useSupabase) {
    try {
      const rows = await sbFetch(
        `/bot_leads?phone=eq.${encodeURIComponent(phone)}&select=follow_up_sent_at&limit=1`,
        { method: "GET" }
      )
      const sentAt = rows?.[0]?.follow_up_sent_at
      return !!sentAt
    } catch (err) {
      console.error("isFollowUpScheduled failed:", err.message)
      return false
    }
  }
  const lead = leadsStore.get(phone)
  return !!(lead && lead.follow_up_sent_at)
}

export async function getLeadsDueForFollowUp() {
  const now = new Date().toISOString()

  if (useSupabase) {
    try {
      const rows = await sbFetch(
        `/bot_leads?follow_up_due_at=lte.${now}&follow_up_sent_at=is.null&limit=50`,
        { method: "GET" }
      )
      return rows || []
    } catch (err) {
      console.error("getLeadsDueForFollowUp failed:", err.message)
    }
  }

  return [...leadsStore.values()].filter(
    (l) => l.follow_up_due_at && new Date(l.follow_up_due_at) <= new Date() && !l.follow_up_sent_at
  )
}

export async function markFollowUpSent(phone) {
  const now = new Date().toISOString()
  const lead = useSupabase ? null : (leadsStore.get(phone) || { phone })

  if (useSupabase) {
    try {
      // Use an RPC to atomically increment follow_up_count
      await sbFetch("/rpc/increment_follow_up_count", {
        method: "POST",
        body: JSON.stringify({ p_phone: phone }),
        headers: { Prefer: "return=minimal" },
      }).catch(() => null)  // fallback: increment separately below

      await sbFetch(`/bot_leads?phone=eq.${encodeURIComponent(phone)}`, {
        method: "PATCH",
        body: JSON.stringify({
          follow_up_sent_at: now,
          follow_up_due_at: null,
        }),
        headers: { Prefer: "return=minimal" },
      })
      return
    } catch (err) { console.error("markFollowUpSent failed:", err.message) }
  }

  leadsStore.set(phone, {
    ...lead,
    follow_up_sent_at: now,
    follow_up_due_at: null,
    follow_up_count: (lead.follow_up_count || 0) + 1,
  })
}

// ── Bot-sourced inspection requests (decoupled from tenant-auth enquiries) ──
//
// WhatsApp leads are just phone numbers — they never sign up on the website,
// so they have no `tenants` row and no Supabase Auth account. The website's
// `enquiries` table requires tenant_id -> tenants.user_id, so bot leads can't
// write there directly. This table is the bot's own record of what tenants
// asked for; admin reviews it and manually converts worthwhile leads into a
// real `enquiries` row (or builds a dedicated admin action for that later).
//
// Run this SQL once in Supabase (SQL Editor):
//
//   create table if not exists bot_inspection_requests (
//     id uuid primary key default gen_random_uuid(),
//     phone text not null,
//     name text not null,
//     property_id uuid references properties(id),
//     property_title text,
//     preferred_date text,
//     preferred_time text,
//     status text not null default 'pending' check (status in ('pending','contacted','confirmed','rejected')),
//     created_at timestamptz default now()
//   );
//   create index if not exists bot_inspection_requests_phone_idx on bot_inspection_requests (phone, created_at);
//   create index if not exists bot_inspection_requests_status_idx on bot_inspection_requests (status);

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_PHONE          = process.env.ADMIN_PHONE_NUMBER

/**
 * Creates a real row in bot_inspection_requests. This is the function the AI's
 * book_inspection tool calls — if this doesn't succeed, the AI must not tell
 * the user their inspection is booked.
 */
export async function createInspectionRequest({ phone, name, propertyId, propertyTitle, preferredDate, preferredTime }) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn("[inspections] Supabase not configured — cannot persist inspection request")
    return { ok: false, reason: "Supabase not configured" }
  }

  if (!phone || !name) {
    return { ok: false, reason: "Missing required phone or name" }
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bot_inspection_requests`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        phone,
        name,
        property_id: propertyId || null,
        property_title: propertyTitle || null,
        preferred_date: preferredDate || null,
        preferred_time: preferredTime || null,
        status: "pending",
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("[inspections] Supabase insert failed:", res.status, errText)
      return { ok: false, reason: `Supabase ${res.status}` }
    }

    const rows = await res.json()
    const row = rows?.[0]
    console.log(`✅ Inspection request created: ${row?.id} (${name}, ${propertyTitle || "unspecified property"})`)

    // Fire-and-forget admin alert — don't block the tenant's reply on this
    notifyAdminOfNewRequest(row).catch((err) =>
      console.error("[inspections] admin notify failed:", err.message)
    )

    return { ok: true, id: row?.id }
  } catch (err) {
    console.error("[inspections] createInspectionRequest error:", err.message)
    return { ok: false, reason: err.message }
  }
}

async function notifyAdminOfNewRequest(row) {
  if (!ADMIN_PHONE || !row) return
  const { sendText } = await import("./whatsapp.js")
  await sendText(
    ADMIN_PHONE,
    `🔔 *New Inspection Request*\n\nName: ${row.name}\nPhone: ${row.phone}\nProperty: ${row.property_title || "Unspecified"}\nPreferred: ${row.preferred_date || "—"} ${row.preferred_time || ""}\n\nReview in admin: www.livarex.com.ng/admin/inspections`
  )
}
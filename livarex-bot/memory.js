// ── Conversation memory (Supabase + in-memory fallback) ───────────────────
//
// Run this SQL once in Supabase:
//
//   create table bot_messages (
//     id uuid primary key default gen_random_uuid(),
//     phone text not null,
//     role text not null check (role in ('user','assistant')),
//     content text not null,
//     created_at timestamptz default now()
//   );
//   create index on bot_messages (phone, created_at);

const SUPABASE_URL      = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const MAX_HISTORY       = 20
const useSupabase       = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY)
const memoryStore       = new Map()

async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      ...(options.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export async function getConversationHistory(phone) {
  if (useSupabase) {
    try {
      const rows = await supabaseFetch(
        `/bot_messages?phone=eq.${encodeURIComponent(phone)}&order=created_at.asc&limit=${MAX_HISTORY}`,
        { method: "GET", headers: { Prefer: "return=representation" } }
      )
      return (rows || []).map((r) => ({ role: r.role, content: r.content }))
    } catch (err) {
      console.error("Supabase load failed, using memory:", err.message)
    }
  }
  return (memoryStore.get(phone) || []).slice(-MAX_HISTORY)
}

export async function saveMessage(phone, role, content) {
  if (useSupabase) {
    try {
      await supabaseFetch("/bot_messages", {
        method: "POST",
        body: JSON.stringify({ phone, role, content }),
      })
      return
    } catch (err) {
      console.error("Supabase save failed, using memory:", err.message)
    }
  }
  if (!memoryStore.has(phone)) memoryStore.set(phone, [])
  const history = memoryStore.get(phone)
  history.push({ role, content })
  if (history.length > MAX_HISTORY) memoryStore.set(phone, history.slice(-MAX_HISTORY))
}

export async function clearHistory(phone) {
  if (useSupabase) {
    try {
      await supabaseFetch(
        `/bot_messages?phone=eq.${encodeURIComponent(phone)}`,
        { method: "DELETE" }
      )
      return
    } catch (err) { console.error("Supabase clear failed:", err.message) }
  }
  memoryStore.delete(phone)
}

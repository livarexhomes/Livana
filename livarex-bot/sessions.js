// ── In-memory session store ────────────────────────────────────────────────
// Tracks per-conversation state (stage, agent requested, etc.)
// For production scale: replace with Redis

const sessions = new Map()

const DEFAULT_SESSION = () => ({
  name: null,
  stage: "greeting",      // greeting | qualifying | browsing
  lastSeen: Date.now(),
  agentRequested: false,
  lead: {
    budget: null,
    location: null,
    propertyType: null,  // buy | rent | invest
    timeline: null,
  },
})

export function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, DEFAULT_SESSION())
  }
  const s = sessions.get(phone)
  s.lastSeen = Date.now()
  return s
}

export function saveSession(phone, updates) {
  const s = getSession(phone)
  Object.assign(s, updates)
  sessions.set(phone, s)
}

export function getAllSessions() {
  return sessions
}

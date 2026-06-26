// ── In-memory session store ────────────────────────────────────────────────
// For production: replace with Redis or a DB (e.g. Supabase)

const sessions = new Map();

const DEFAULT_SESSION = () => ({
  name: null,
  stage: "greeting",       // greeting | qualifying | browsing | follow_up
  history: [],             // Claude conversation history
  lead: {
    budget: null,
    location: null,
    propertyType: null,
    timeline: null,
  },
  lastSeen: Date.now(),
  followUpSent: false,
  agentRequested: false,
});

export function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, DEFAULT_SESSION());
  }
  const session = sessions.get(phone);
  session.lastSeen = Date.now();
  return session;
}

export function saveSession(phone, updates) {
  const session = getSession(phone);
  Object.assign(session, updates);
  sessions.set(phone, session);
}

export function addToHistory(phone, role, content) {
  const session = getSession(phone);
  session.history.push({ role, content });
  // Keep last 20 messages to control token usage
  if (session.history.length > 20) {
    session.history = session.history.slice(-20);
  }
  sessions.set(phone, session);
}

export function getAllSessions() {
  return sessions;
}

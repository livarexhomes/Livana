// ── Core message handling logic ────────────────────────────────────────────
import { sendText, sendButtons, markRead } from "./whatsapp.js";
import { askClaude } from "./ai.js";
import { getSession, saveSession, addToHistory } from "./sessions.js";
import { fetchListings, formatListingsForAI } from "./listings.js";

const AGENT_KEYWORDS = ["agent", "human", "speak to", "call me", "call back", "SPEAK TO AGENT"];
const GREETING_KEYWORDS = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "start"];

export async function handleIncomingMessage(phone, contactName, msg) {
  try {
    // Mark as read
    if (msg.id) await markRead(msg.id);

    const session = getSession(phone);
    if (contactName && !session.name) {
      saveSession(phone, { name: contactName });
    }

    const name = session.name || contactName || "there";
    const msgText = extractText(msg).trim();

    if (!msgText) return; // ignore non-text (audio, stickers, etc.)

    console.log(`📩 [${phone}] ${name}: ${msgText}`);

    // ── Handle agent escalation ──────────────────────────────────────────
    if (AGENT_KEYWORDS.some((kw) => msgText.toLowerCase().includes(kw.toLowerCase()))) {
      saveSession(phone, { agentRequested: true });
      await sendText(phone,
        `Got it, ${name}! 🙋 I'm connecting you with one of our Livarex agents right away.\n\n` +
        `A team member will reach out to you within minutes.\n\n` +
        `In the meantime, browse our listings at www.livarex.com.org`
      );
      // TODO: notify your team here (email/Slack webhook)
      await notifyAgent(phone, name, session);
      return;
    }

    // ── First-time greeting ──────────────────────────────────────────────
    if (session.stage === "greeting" || GREETING_KEYWORDS.some((kw) => msgText.toLowerCase() === kw)) {
      saveSession(phone, { stage: "qualifying" });
      await sendButtons(
        phone,
        `Hello ${name}! 👋 Welcome to *Livarex Homes* — Where Luxury Meets Home. 🏡\n\n` +
        `I'm your personal real estate rep. I can help you find the perfect property, ` +
        `answer questions, or connect you with our team.\n\nWhat are you looking for today?`,
        [
          { id: "buy", title: "🏠 Buy a Property" },
          { id: "rent", title: "🔑 Rent a Property" },
          { id: "invest", title: "📈 Investment Property" },
        ]
      );
      return;
    }

    // ── Fetch listings context ───────────────────────────────────────────
    const listings = await fetchListings();
    const listingsContext = formatListingsForAI(listings);

    // ── Build AI history ─────────────────────────────────────────────────
    addToHistory(phone, "user", msgText);

    const reply = await askClaude(
      msgText,
      session.history.slice(0, -1), // exclude last (already added above)
      listingsContext
    );

    addToHistory(phone, "assistant", reply);
    saveSession(phone, { stage: "browsing", lastSeen: Date.now() });

    await sendText(phone, reply);

    // After AI reply, offer human escalation if in browsing for 3+ turns
    const turns = session.history.length;
    if (turns > 0 && turns % 6 === 0) {
      await sendButtons(phone,
        "Would you like to take the next step? 😊",
        [
          { id: "viewing", title: "📅 Book a Viewing" },
          { id: "agent_connect", title: "👤 Speak to Agent" },
        ]
      );
    }
  } catch (err) {
    console.error(`Error handling message from ${phone}:`, err);
    await sendText(phone,
      "Sorry, I ran into a small issue. Please try again or type *SPEAK TO AGENT* to reach our team directly. 🙏"
    );
  }
}

function extractText(msg) {
  if (msg.type === "text") return msg.text?.body || "";
  if (msg.type === "interactive") {
    return msg.interactive?.button_reply?.title ||
           msg.interactive?.list_reply?.title || "";
  }
  return "";
}

async function notifyAgent(phone, name, session) {
  const AGENT_WEBHOOK = process.env.AGENT_NOTIFY_WEBHOOK;
  if (!AGENT_WEBHOOK) return;
  try {
    await fetch(AGENT_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        name,
        lead: session.lead,
        message: "Client requested agent connection via Livarex WhatsApp bot",
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error("Agent notify failed:", e.message);
  }
}

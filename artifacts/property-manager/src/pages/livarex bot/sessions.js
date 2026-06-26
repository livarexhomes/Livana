// ── Automated follow-up system ─────────────────────────────────────────────
import { sendButtons } from "./whatsapp.js";
import { getAllSessions, saveSession } from "./sessions.js";

const FOLLOW_UP_AFTER_MS = 24 * 60 * 60 * 1000;  // 24 hours
const SECOND_FOLLOW_UP_MS = 72 * 60 * 60 * 1000; // 72 hours

export async function sendFollowUps() {
  const now = Date.now();
  const sessions = getAllSessions();

  for (const [phone, session] of sessions.entries()) {
    // Skip if: agent already requested, or follow-up sent, or still active
    if (session.agentRequested) continue;
    if (session.stage === "greeting") continue;

    const idle = now - session.lastSeen;

    // First follow-up: 24h after last message
    if (!session.followUpSent && idle >= FOLLOW_UP_AFTER_MS) {
      const name = session.name || "there";
      try {
        await sendButtons(
          phone,
          `Hi ${name}! 👋 It's your Livarex Rep checking in.\n\n` +
          `We have some exciting new properties available. Still searching for your perfect home? 🏡`,
          [
            { id: "yes_still_looking", title: "Yes, still looking!" },
            { id: "agent_follow", title: "Connect me to agent" },
          ]
        );
        saveSession(phone, { followUpSent: true, followUpSentAt: now });
        console.log(`📤 Follow-up sent to ${phone}`);
      } catch (e) {
        console.error(`Follow-up failed for ${phone}:`, e.message);
      }
    }

    // Second follow-up: 72h if no response after first
    if (
      session.followUpSent &&
      !session.secondFollowUpSent &&
      session.followUpSentAt &&
      now - session.followUpSentAt >= SECOND_FOLLOW_UP_MS
    ) {
      const name = session.name || "there";
      try {
        await sendButtons(
          phone,
          `Hi ${name}, this is your last check-in from Livarex Homes. 🏠\n\n` +
          `If you're still in the market, we'd love to help you find the right property. ` +
          `Our team is ready when you are!`,
          [
            { id: "restart", title: "I'm ready to look!" },
            { id: "agent_final", title: "Speak to agent" },
          ]
        );
        saveSession(phone, { secondFollowUpSent: true });
        console.log(`📤 Second follow-up sent to ${phone}`);
      } catch (e) {
        console.error(`Second follow-up failed for ${phone}:`, e.message);
      }
    }
  }
}

import { getLeadsDueForFollowUp, markFollowUpSent, scheduleFollowUp } from "./leads.js";
import { sendWhatsAppMessage } from "./whatsapp.js";
import { getConversationHistory, saveMessage } from "./memory.js";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FOLLOW_UP_SYSTEM = `You are the Livarex Real Estate Rep sending a friendly follow-up WhatsApp message to a prospective client who hasn't replied in a while.

Rules:
- Keep it under 200 characters
- Be warm and non-pushy
- Reference their previous interest if visible in the conversation history
- End with a simple open question
- Don't say "I noticed you haven't replied" — just check in naturally
- Sound human, not automated`;

export function startFollowUpScheduler() {
  // Run every 30 minutes
  setInterval(runFollowUps, 30 * 60 * 1000);

  // Also run once on startup (after 10s delay)
  setTimeout(runFollowUps, 10_000);

  console.log("⏰ Follow-up scheduler started (runs every 30 min)");
}

async function runFollowUps() {
  const due = await getLeadsDueForFollowUp();
  if (!due.length) return;

  console.log(`📬 Processing ${due.length} follow-up(s)...`);

  for (const lead of due) {
    try {
      const history = await getConversationHistory(lead.phone);
      const message = await generateFollowUp(lead, history);

      await sendWhatsAppMessage(lead.phone, message);
      await saveMessage(lead.phone, "assistant", message);
      await markFollowUpSent(lead.phone);

      console.log(`📤 Follow-up sent to ${lead.name} (${lead.phone})`);
    } catch (err) {
      console.error(`❌ Follow-up failed for ${lead.phone}:`, err.message);
    }
  }
}

async function generateFollowUp(lead, history) {
  const contextMessages = history.slice(-6); // Last 3 exchanges

  const prompt = `Generate a follow-up message for: ${lead.name}
Follow-up number: ${lead.followUpCount + 1} of 3
Their last message was: "${lead.lastMessage}"
Last contact: ${lead.lastMessageAt}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 150,
    system: FOLLOW_UP_SYSTEM,
    messages: [
      ...contextMessages,
      { role: "user", content: prompt },
    ],
  });

  return response.content[0].text;
}

// Manually trigger a follow-up for a specific lead (useful for admin use)
export async function triggerFollowUp(phone, delayHours = 24) {
  await scheduleFollowUp(phone, delayHours);
  console.log(`📅 Follow-up scheduled for ${phone} in ${delayHours}h`);
}

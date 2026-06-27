// ── Automated follow-up scheduler ─────────────────────────────────────────
import { getLeadsDueForFollowUp, markFollowUpSent } from "./leads.js"
import { generateFollowUpMessage } from "./ai.js"
import { getConversationHistory, saveMessage } from "./memory.js"
import { sendText } from "./whatsapp.js"

const MAX_FOLLOW_UPS = 3

export function startFollowUpScheduler() {
  // Run every 30 minutes
  setInterval(runFollowUps, 30 * 60 * 1000)
  // Also run once after 15 seconds on startup
  setTimeout(runFollowUps, 15_000)
  console.log("⏰ Follow-up scheduler started (runs every 30 min)")
}

async function runFollowUps() {
  let due
  try {
    due = await getLeadsDueForFollowUp()
  } catch (err) {
    console.error("Error fetching follow-up leads:", err.message)
    return
  }

  if (!due.length) return
  console.log(`📬 Processing ${due.length} follow-up(s)…`)

  for (const lead of due) {
    const followUpCount = lead.follow_up_count || 0
    if (followUpCount >= MAX_FOLLOW_UPS) {
      await markFollowUpSent(lead.phone)  // clear without sending
      continue
    }

    try {
      const history = await getConversationHistory(lead.phone)
      const message = await generateFollowUpMessage(lead, history)

      await sendText(lead.phone, message)
      await saveMessage(lead.phone, "assistant", message)
      await markFollowUpSent(lead.phone)

      console.log(`📤 Follow-up #${followUpCount + 1} sent to ${lead.name || lead.phone}`)
    } catch (err) {
      console.error(`❌ Follow-up failed for ${lead.phone}:`, err.message)
    }
  }
}

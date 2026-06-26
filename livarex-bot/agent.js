import { processMessage } from "./agent.js";
import { sendWhatsAppMessage } from "./whatsapp.js";
import { upsertLead } from "./leads.js";

// Verify webhook with Meta
export function verifyWebhook(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

// Handle incoming messages
export async function handleWebhook(req, res) {
  // Always respond 200 immediately to Meta
  res.sendStatus(200);

  const body = req.body;
  if (body.object !== "whatsapp_business_account") return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value?.messages?.length) continue;

      for (const message of value.messages) {
        if (message.type !== "text") continue;

        const phone = message.from;
        const text = message.text.body;
        const contact = value.contacts?.[0];
        const name = contact?.profile?.name || "there";

        console.log(`📨 Message from ${name} (${phone}): ${text}`);

        try {
          // Track lead
          await upsertLead(phone, name, text);

          // Generate AI reply
          const reply = await processMessage(phone, name, text);

          // Send reply
          await sendWhatsAppMessage(phone, reply);
        } catch (err) {
          console.error(`❌ Error handling message from ${phone}:`, err.message);
        }
      }
    }
  }
}

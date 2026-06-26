// ── WhatsApp Cloud API helpers ─────────────────────────────────────────────
const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WA_API_URL = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

async function sendToWhatsApp(payload) {
  const res = await fetch(WA_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    console.error("❌ WhatsApp API error:", JSON.stringify(err));
    throw new Error(`WhatsApp API error: ${res.status}`);
  }
  return res.json();
}

export async function sendText(phone, text) {
  return sendToWhatsApp({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    type: "text",
    text: { body: text },
  });
}

export async function sendButtons(phone, bodyText, buttons) {
  const safeButtons = buttons.slice(0, 3).map((btn) => ({
    type: "reply",
    reply: { id: btn.id, title: btn.title.slice(0, 20) },
  }));
  return sendToWhatsApp({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: { buttons: safeButtons },
    },
  });
}

export async function markRead(messageId) {
  return sendToWhatsApp({
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  });
}

export async function sendWhatsAppMessage(phone, text) {
  return sendText(phone, text);
}

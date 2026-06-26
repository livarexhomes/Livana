// ── WhatsApp Cloud API sender ──────────────────────────────────────────────
const BASE_URL = "https://graph.facebook.com/v19.0";
const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WA_ACCESS_TOKEN;

async function waPost(endpoint, body) {
  const res = await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) console.error("WhatsApp API error:", JSON.stringify(json));
  return json;
}

export async function sendText(to, text) {
  return waPost("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  });
}

export async function sendButtons(to, body, buttons) {
  // buttons: [{ id: "btn_1", title: "3 Bedrooms" }]
  return waPost("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

export async function sendList(to, headerText, bodyText, buttonLabel, sections) {
  return waPost("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: headerText },
      body: { text: bodyText },
      action: { button: buttonLabel, sections },
    },
  });
}

export async function markRead(messageId) {
  return waPost("/messages", {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  });
}

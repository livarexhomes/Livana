const WA_URL = () =>
  `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`

const WA_TOKEN = () => process.env.WHATSAPP_TOKEN

async function waPost(payload: object) {
  const res = await fetch(WA_URL(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WA_TOKEN()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!res.ok) console.error('❌ WhatsApp API error:', JSON.stringify(json))
  return json
}

export async function sendText(phone: string, text: string) {
  return waPost({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'text',
    text: { body: text },
  })
}

export interface ButtonOption {
  id: string
  title: string
}

export async function sendButtons(phone: string, bodyText: string, buttons: ButtonOption[]) {
  const safeButtons = buttons.slice(0, 3).map((b) => ({
    type: 'reply',
    reply: { id: b.id, title: b.title.slice(0, 20) },
  }))
  return waPost({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: { buttons: safeButtons },
    },
  })
}

export interface ListRow {
  id: string
  title: string
  description?: string
}

export interface ListSection {
  title: string
  rows: ListRow[]
}

export async function sendList(
  phone: string,
  headerText: string,
  bodyText: string,
  buttonLabel: string,
  sections: ListSection[],
) {
  return waPost({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: headerText },
      body: { text: bodyText },
      action: { button: buttonLabel, sections },
    },
  })
}

export async function markRead(messageId: string) {
  return waPost({
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  })
}

export function isConfigured() {
  return !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TOKEN)
}

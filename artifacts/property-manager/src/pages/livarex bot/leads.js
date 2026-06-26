import express from "express";
import { handleIncomingMessage } from "./messageHandler.js";
import { sendFollowUps } from "./followUp.js";

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "livarex_verify_token";

// ── Webhook verification (Meta setup) ──────────────────────────────────────
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified by Meta");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ── Incoming messages ──────────────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  const body = req.body;

  if (body.object !== "whatsapp_business_account") return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value?.messages?.length) continue;

      for (const msg of value.messages) {
        const phone = msg.from;
        const contact = value.contacts?.[0]?.profile?.name || "there";
        await handleIncomingMessage(phone, contact, msg);
      }
    }
  }
});

// ── Health check ───────────────────────────────────────────────────────────
app.get("/", (_, res) => res.json({ status: "Livarex Bot running 🏡" }));

// ── Scheduled follow-ups (every hour) ─────────────────────────────────────
setInterval(sendFollowUps, 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🏡 Livarex Bot listening on port ${PORT}`));

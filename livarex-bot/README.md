# Livarex WhatsApp Bot 🏡

Nigeria's verified property marketplace — WhatsApp AI bot powered by Claude.

## What it does

| Feature | Description |
|---|---|
| 🤖 AI property rep | Answers tenant inquiries using Claude, with live property listings from Supabase |
| 📋 Inspection updates | Sends tenants a WhatsApp message when their enquiry status changes |
| 🚨 Admin alerts | Notifies admin via WhatsApp on new signups and KYC submissions |
| ⏰ Follow-ups | Auto follow-up messages after 24h / 48h / 72h of inactivity |
| 🙋 Agent escalation | Transfers to human agent and alerts admin when user asks |

---

## Setup

### Step 1 — Meta WhatsApp Cloud API

1. Go to [developers.facebook.com](https://developers.facebook.com) → Create App → Business
2. Add **WhatsApp** product
3. Under WhatsApp → API Setup, note your **Phone Number ID** and **Access Token**
4. Create a webhook:
   - URL: `https://your-bot-url.com/webhook`
   - Verify token: match `WHATSAPP_VERIFY_TOKEN` in your `.env`
   - Subscribe to: **messages**

### Step 2 — Anthropic API Key

Get from [console.anthropic.com](https://console.anthropic.com).

### Step 3 — Configure environment

```bash
cp .env.example .env
# Fill in all values
```

### Step 4 — Supabase database tables

Run this SQL once in your Supabase project (SQL Editor):

```sql
-- Bot conversation history
create table if not exists bot_messages (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);
create index if not exists bot_messages_phone_idx on bot_messages (phone, created_at);

-- Lead tracking
create table if not exists bot_leads (
  phone text primary key,
  name text,
  last_message text,
  last_message_at timestamptz default now(),
  follow_up_count int default 0,
  follow_up_due_at timestamptz,
  follow_up_sent_at timestamptz,
  created_at timestamptz default now()
);
```

### Step 5 — Supabase Database Webhooks

In Supabase → Database → Webhooks → Create webhook:

| Webhook | Table | Events | URL |
|---|---|---|---|
| Inspection updates | `enquiries` | UPDATE | `https://your-bot.com/events/inspection` |
| New tenant signup | `tenants` | INSERT | `https://your-bot.com/events/signup` |
| Landlord KYC | `landlords` | INSERT, UPDATE | `https://your-bot.com/events/kyc` |

Add HTTP header `x-webhook-secret: your_secret` (match `WEBHOOK_SECRET` in `.env`).

### Step 6 — Install and run

```bash
cd livarex-bot
npm install
npm start
```

### Step 7 — Deploy

The bot needs a **persistent server** (not Vercel serverless — it needs to stay running for the follow-up scheduler).

Recommended: **Railway**, **Render**, or **Fly.io**

```bash
# Railway
npm install -g @railway/cli
railway login
railway init
railway up
```

Set all `.env` values in the Railway dashboard.

---

## Architecture

```
WhatsApp User
    │
    ▼
Meta Webhook → /webhook (Express)
                    │
              webhook.js ──→ ai.js (Claude)
                    │              │
              sessions.js    listings.js (Supabase)
              leads.js       memory.js (Supabase)
                    │
              followUp.js (scheduler)

Supabase Events
    │
    ├── /events/inspection → notifications.js → sendText() to tenant
    ├── /events/signup     → notifications.js → sendText() to admin
    └── /events/kyc        → notifications.js → sendText() to admin
```

## File structure

| File | Purpose |
|---|---|
| `index.js` | Express server, routes, startup |
| `whatsapp.js` | WhatsApp Cloud API helpers (sendText, sendButtons) |
| `ai.js` | Claude AI — processMessage, generateFollowUpMessage |
| `memory.js` | Conversation history (Supabase + in-memory fallback) |
| `listings.js` | Property listings from Supabase |
| `sessions.js` | In-memory per-user session state |
| `leads.js` | Lead tracking (Supabase + in-memory fallback) |
| `webhook.js` | WhatsApp message routing + greeting/escalation logic |
| `followUp.js` | Scheduled follow-up messages |
| `notifications.js` | Inspection updates + admin alerts via Supabase webhooks |

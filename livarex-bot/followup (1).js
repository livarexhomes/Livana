import fs from "fs/promises";
import path from "path";

const LEADS_FILE = "./data/leads.json";

async function readLeads() {
  try {
    const data = await fs.readFile(LEADS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeLeads(leads) {
  await fs.mkdir("./data", { recursive: true });
  await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2));
}

export async function upsertLead(phone, name, lastMessage) {
  const leads = await readLeads();
  const now = new Date().toISOString();

  if (!leads[phone]) {
    // New lead
    leads[phone] = {
      phone,
      name,
      firstContactAt: now,
      lastMessageAt: now,
      messageCount: 1,
      lastMessage,
      status: "new", // new | warm | qualified | viewing_scheduled | converted | cold
      followUpCount: 0,
      nextFollowUpAt: null,
      notes: [],
    };
    console.log(`🆕 New lead: ${name} (${phone})`);
  } else {
    // Returning lead
    leads[phone].lastMessageAt = now;
    leads[phone].messageCount++;
    leads[phone].lastMessage = lastMessage;
    // Reset follow-up since they responded
    leads[phone].nextFollowUpAt = null;
    leads[phone].followUpCount = 0;
    if (leads[phone].status === "cold") {
      leads[phone].status = "warm";
    }
  }

  await writeLeads(leads);
  return leads[phone];
}

export async function getAllLeads() {
  return readLeads();
}

export async function updateLeadStatus(phone, status) {
  const leads = await readLeads();
  if (leads[phone]) {
    leads[phone].status = status;
    await writeLeads(leads);
  }
}

export async function scheduleFollowUp(phone, delayHours = 24) {
  const leads = await readLeads();
  if (leads[phone]) {
    const followUpTime = new Date(Date.now() + delayHours * 60 * 60 * 1000);
    leads[phone].nextFollowUpAt = followUpTime.toISOString();
    await writeLeads(leads);
  }
}

export async function getLeadsDueForFollowUp() {
  const leads = await readLeads();
  const now = new Date();

  return Object.values(leads).filter((lead) => {
    if (!lead.nextFollowUpAt) return false;
    if (lead.followUpCount >= 3) return false; // Max 3 follow-ups
    return new Date(lead.nextFollowUpAt) <= now;
  });
}

export async function markFollowUpSent(phone) {
  const leads = await readLeads();
  if (leads[phone]) {
    leads[phone].followUpCount++;
    // Schedule next follow-up if under limit
    if (leads[phone].followUpCount < 3) {
      const nextDelay = [48, 72][leads[phone].followUpCount - 1] || 72;
      const next = new Date(Date.now() + nextDelay * 60 * 60 * 1000);
      leads[phone].nextFollowUpAt = next.toISOString();
    } else {
      leads[phone].nextFollowUpAt = null;
      leads[phone].status = "cold";
    }
    await writeLeads(leads);
  }
}

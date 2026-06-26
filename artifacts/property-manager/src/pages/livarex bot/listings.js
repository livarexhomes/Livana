import fs from "fs/promises";

const MEMORY_DIR = "./data/conversations";
const MAX_HISTORY = 20; // Keep last 20 messages per contact

async function getFilePath(phone) {
  await fs.mkdir(MEMORY_DIR, { recursive: true });
  return `${MEMORY_DIR}/${phone}.json`;
}

export async function getConversationHistory(phone) {
  try {
    const file = await getFilePath(phone);
    const data = await fs.readFile(file, "utf-8");
    const history = JSON.parse(data);
    // Return last N messages for context window efficiency
    return history.slice(-MAX_HISTORY);
  } catch {
    return [];
  }
}

export async function saveMessage(phone, role, content) {
  const file = await getFilePath(phone);
  let history = [];

  try {
    const data = await fs.readFile(file, "utf-8");
    history = JSON.parse(data);
  } catch {
    // New conversation
  }

  history.push({ role, content, timestamp: new Date().toISOString() });

  // Trim old messages (keep last 50 in storage)
  if (history.length > 50) {
    history = history.slice(-50);
  }

  await fs.writeFile(file, JSON.stringify(history, null, 2));
}

export async function clearConversation(phone) {
  const file = await getFilePath(phone);
  await fs.writeFile(file, JSON.stringify([]));
}

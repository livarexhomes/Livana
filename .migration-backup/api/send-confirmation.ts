import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { email, fullName } = req.body as { email?: string; fullName?: string };

  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    res.status(503).json({ detail: "Auth service not configured" });
    return;
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: users, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    res.status(500).json({ error: listErr.message });
    return;
  }

  const user = users.users.find((u) => u.email === email);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (updateErr) {
    res.status(500).json({ error: updateErr.message });
    return;
  }

  res.json({ ok: true });
}

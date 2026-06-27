import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../lib/logger";

const router = Router();

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

router.post("/send-confirmation", async (req, res) => {
  const { email, fullName } = req.body as { email?: string; fullName?: string };

  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  try {
    const admin = getAdminClient();

    const { data: users, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) {
      logger.error({ err: listErr }, "Failed to list users");
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
      logger.error({ err: updateErr }, "Failed to confirm user email");
      res.status(500).json({ error: updateErr.message });
      return;
    }

    logger.info({ userId: user.id, email }, "User email auto-confirmed");
    res.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    logger.error({ err }, "send-confirmation error");
    res.status(503).json({ detail: msg });
  }
});

router.post("/delete-user", async (req, res) => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const { user_id } = req.body as { user_id?: string };

  if (!user_id) {
    res.status(400).json({ error: "user_id is required" });
    return;
  }

  if (!token) {
    res.status(401).json({ error: "Authorization token required" });
    return;
  }

  try {
    const admin = getAdminClient();

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const meta = user.app_metadata ?? {};
    const isAdmin =
      meta.role === "admin" ||
      (Array.isArray(meta.roles) && meta.roles.includes("admin"));

    if (!isAdmin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const { error: deleteErr } = await admin.auth.admin.deleteUser(user_id);
    if (deleteErr) {
      logger.error({ err: deleteErr, user_id }, "Failed to delete user");
      res.status(500).json({ error: deleteErr.message });
      return;
    }

    logger.info({ user_id }, "User deleted by admin");
    res.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    logger.error({ err }, "delete-user error");
    res.status(503).json({ error: msg });
  }
});

export default router;

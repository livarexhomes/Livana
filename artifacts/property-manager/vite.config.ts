import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import http from "http";
import { pathToFileURL } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const apiHandlerFiles: Record<string, string> = {
  chat: "chat.js",
  "create-chat-ticket": "create-chat-ticket.js",
  "get-chat-messages": "get-chat-messages.js",
  "send-chat-message": "send-chat-message.js",
  "clear-chat-messages": "clear-chat-messages.js",
  "landlord-register": "landlord-register.js",
  "manage-support-agent": "manage-support-agent.js",
  "notify-signup": "notify-signup.js",
  "register-support-agent": "register-support-agent.js",
  "send-confirmation": "send-confirmation.js",
  "send-otp": "send-otp.js",
  "send-password-reset": "send-password-reset.js",
  "send-support-notification": "send-support-notification.js",
  "support-presence": "support-presence.js",
  "verify-otp": "verify-otp.js",
  "verify-reset": "verify-reset.js",
  "whatsapp/notify-inspection": "whatsapp/notify-inspection.js",
};

function readApiRoute(req: any): string {
  const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
  return pathname.replace(/^\/api\/+/, "").replace(/^\/+/, "").replace(/\/+$/, "") || "chat";
}

// Serve the same handlers locally that Vercel serves through api/[[...path]].js.
// This keeps support presence, registration, and email tests from becoming
// misleading local 404s while preserving the bot's separate port.
function localApiMiddleware() {
  return {
    name: "local-api-middleware",
    async configureServer(server: any) {
      server.middlewares.use("/api", async (req: any, res: any, next: any) => {
        const route = readApiRoute(req);
        if (route === "chat") return next();

        const file = apiHandlerFiles[route];
        if (!file) return next();

        try {
          const modulePath = path.resolve(import.meta.dirname, "../../server/api-handlers", file);
          const mod = await import(pathToFileURL(modulePath).href);
          const handler = mod.default ?? mod.handler ?? mod;
          if (typeof handler !== "function") {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "No handler exported" }));
            return;
          }
          await handler(req, res);
        } catch (error) {
          console.error(`[local-api] ${route} failed:`, error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: String(error) }));
          }
        }
      });
    },
  };
}

// Direct middleware proxy for /api/chat → localhost:3001
// Avoids http-proxy library quirks that break under Replit's TLS reverse-proxy
function chatApiMiddleware() {
  return {
    name: "chat-api-middleware",
    configureServer(server: any) {
      server.middlewares.use("/api/chat", (req: any, res: any) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => {
          const body = Buffer.concat(chunks);
          const forward = http.request(
            { hostname: "127.0.0.1", port: 3001, path: "/api/chat", method: "POST",
              headers: { "Content-Type": "application/json", "Content-Length": body.length } },
            (upstream) => {
              const parts: Buffer[] = [];
              upstream.on("data", (c: Buffer) => parts.push(c));
              upstream.on("end", () => {
                res.setHeader("Content-Type", "application/json");
                res.writeHead(upstream.statusCode ?? 200);
                res.end(Buffer.concat(parts));
              });
            }
          );
          forward.on("error", (err: Error) => {
            res.writeHead(502);
            res.end(JSON.stringify({ error: `Bot unavailable: ${err.message}` }));
          });
          forward.end(body);
        });
      });
    },
  };
}

const rawPort = process.env.PORT ?? "3000";
const port = Number(rawPort);
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig(async ({ isSsrBuild }) => ({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    localApiMiddleware(),
    chatApiMiddleware(),
    ...(!isSsrBuild && process.env.NODE_ENV !== "production"
      ? [
          runtimeErrorOverlay(),
          ...(process.env.REPL_ID !== undefined
            ? [
                await import("@replit/vite-plugin-cartographer").then((m) =>
                  m.cartographer({
                    root: path.resolve(import.meta.dirname, ".."),
                  }),
                ),
                await import("@replit/vite-plugin-dev-banner").then((m) =>
                  m.devBanner(),
                ),
              ]
            : []),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: isSsrBuild
      ? path.resolve(import.meta.dirname, "dist/server")
      : path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: false,
    // Split heavy third-party libraries into their own cacheable chunks so no
    // single bundle (entry or route) exceeds the 500 kB warning threshold and
    // the browser can cache vendor code independently of app changes.
    rollupOptions: isSsrBuild
      ? undefined
      : {
          output: {
            manualChunks(id) {
              if (!id.includes("node_modules")) return undefined
              if (id.includes("@supabase") || id.includes("supabase")) return "supabase"
              if (id.includes("recharts") || id.includes("d3-")) return "recharts"
              if (id.includes("@react-google-maps") || id.includes("google-maps")) return "maps"
              if (id.includes("react-leaflet") || id.includes("leaflet")) return "maps"
              if (id.includes("framer-motion")) return "framer-motion"
              if (id.includes("lucide-react")) return "icons"
              if (
                id.includes("react") ||
                id.includes("react-dom") ||
                id.includes("scheduler") ||
                id.includes("wouter")
              ) {
                return "react"
              }
              return undefined
            },
          },
        },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
}));

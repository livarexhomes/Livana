import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import http from "http";
import fs from "fs";
import { pathToFileURL } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// ---------------------------------------------------------------------------
// Sitemap generator plugin
// Reads src/data/locations.json and rewrites public/sitemap.xml so the file
// always reflects the canonical list of /properties-in/* slugs.
// ---------------------------------------------------------------------------
interface LocationEntry {
  slug: string;
  priority: number;
  changefreq: string;
}

function generateSitemapPlugin() {
  const writesitemap = () => {
    const root = path.resolve(import.meta.dirname);
    const locationsPath = path.join(root, "src", "data", "locations.json");
    const sitemapPath = path.join(root, "public", "sitemap.xml");

    const locations: LocationEntry[] = JSON.parse(fs.readFileSync(locationsPath, "utf-8"));
    const today = new Date().toISOString().slice(0, 10);
    const base = "https://livarex.com.ng";

    const locationEntries = locations
      .map(
        ({ slug, priority, changefreq }) => `  <url>
    <loc>${base}/properties-in/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`
      )
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Core pages -->
  <url>
    <loc>${base}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${base}/listings</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${base}/listings?type=rent</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${base}/listings?type=lease</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Location landing pages — auto-generated from src/data/locations.json -->
${locationEntries}

  <!-- Informational pages -->
  <url>
    <loc>${base}/how-we-verify</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${base}/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${base}/contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>

  <!-- Legal pages -->
  <url>
    <loc>${base}/privacy-policy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${base}/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${base}/cookie-policy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
`;

    fs.writeFileSync(sitemapPath, xml, "utf-8");
    console.log(`[sitemap] Wrote ${locations.length} location entries → public/sitemap.xml`);
  };

  return {
    name: "generate-sitemap",
    buildStart() {
      writesitemap();
    },
    configureServer() {
      writesitemap();
    },
  };
}

const apiHandlerFiles: Record<string, string> = {
  chat: "chat.js",
  "create-chat-ticket": "create-chat-ticket.js",
  "get-chat-messages": "get-chat-messages.js",
  "send-chat-message": "send-chat-message.js",
  "clear-chat-messages": "clear-chat-messages.js",
  "clear-all-chats": "clear-all-chats.js",
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
  "delete-user": "delete-user.js",
  "notify-kyc-reset": "notify-kyc-reset.js",
  "notify-admin-login": "notify-admin-login.js",
  "update-landlord-status": "update-landlord-status.js",
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
// Gracefully falls back to a built-in reply when the bot server is unavailable.
function chatApiMiddleware() {
  const FALLBACK_REPLY = {
    reply: "Hi! I can help you find verified rentals, explain the platform, or guide you through listing a property. Tell me what you need and I'll help from there.",
    fallback: true,
  };
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
              headers: { "Content-Type": "application/json", "Content-Length": body.length },
              timeout: 8000 },
            (upstream) => {
              const parts: Buffer[] = [];
              upstream.on("data", (c: Buffer) => parts.push(c));
              upstream.on("end", () => {
                res.setHeader("Content-Type", "application/json");
                const raw = Buffer.concat(parts).toString();
                // If the bot server returns an error or "not configured", fall back gracefully
                try {
                  const data = JSON.parse(raw);
                  const isError = data?.error || data?.message?.toLowerCase?.()?.includes("not configured");
                  if (isError) {
                    res.writeHead(200);
                    res.end(JSON.stringify(FALLBACK_REPLY));
                  } else {
                    res.writeHead(upstream.statusCode ?? 200);
                    res.end(raw);
                  }
                } catch {
                  // Non-JSON response from upstream — fall back
                  res.writeHead(200);
                  res.end(JSON.stringify(FALLBACK_REPLY));
                }
              });
            }
          );
          forward.on("timeout", () => {
            forward.destroy();
            res.writeHead(200);
            res.end(JSON.stringify(FALLBACK_REPLY));
          });
          forward.on("error", (err: Error) => {
            // Bot server not reachable — return built-in fallback instead of error
            res.setHeader("Content-Type", "application/json");
            res.writeHead(200);
            res.end(JSON.stringify(FALLBACK_REPLY));
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

// Launch mode: on Vercel production deploys (VERCEL_ENV=production) show the
// "Launching Soon" page for all routes; preview/dev show the real application
// so the preview URL acts as a live demo.
//
// Manual launch switch — deliberately NOT controlled by a timer:
// Set LAUNCH_MODE=disabled in the Vercel Production environment variables
// to flip production from "Launching Soon" to the real application.
// Remove the variable to return to "Launching Soon" (fully reversible).
const launchMode = process.env.VERCEL_ENV === "production" && process.env.LAUNCH_MODE !== "disabled";

export default defineConfig(async ({ isSsrBuild }) => ({
  base: basePath,
  define: {
    __LAUNCH_MODE__: JSON.stringify(launchMode),
  },
  plugins: [
    react(),
    tailwindcss(),
    generateSitemapPlugin(),
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
  envDir: path.resolve(import.meta.dirname, "../../"),
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

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import http from "http";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

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

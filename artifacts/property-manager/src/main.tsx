import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root")!;

/*
 * The production HTML is statically prerendered from a separate SSR route
 * renderer, while the browser app uses lazy route modules. Those two trees
 * cannot be hydrated reliably: React may see the prerendered page on the
 * server but the lazy Suspense fallback on the first client render.
 *
 * Mounting the app consistently lets React replace the prerendered shell
 * without producing hydration error #418. The prerendered markup is still
 * available to crawlers and while the JavaScript bundle loads.
 */
createRoot(rootEl).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);

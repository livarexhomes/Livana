import { createRoot, hydrateRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root")!;
const app = (
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

if (rootEl.innerHTML.trim()) {
  hydrateRoot(rootEl, app);
} else {
  createRoot(rootEl).render(app);
}

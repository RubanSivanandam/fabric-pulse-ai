import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./index.css";

// Ignore noisy extension errors (e.g., mcafee, chrome extensions)
window.addEventListener("error", (ev) => {
  const msg = ev.message || "";
  if (typeof msg === "string" && (msg.includes("chrome-extension://") || msg.includes("mcafee") || msg.includes("moz-extension://"))) {
    console.warn("[Global] Ignored extension error:", msg);
    ev.preventDefault?.();
    return;
  }
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ErrorBoundary>
);
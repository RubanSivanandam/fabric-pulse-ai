import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./index.css";

// Ignore noisy extension errors (e.g., mcafee)
window.addEventListener("error", (ev) => {
  const msg = ev.message || "";
  if (typeof msg === "string" && (msg.includes("chrome-extension://") || msg.includes("mcafee"))) {
    console.warn("[Global] Ignored extension error:", msg);
    ev.preventDefault?.();
  }
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

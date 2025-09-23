// RTMSBot.jsx
// Full, unabridged refactor including all earlier logic, API mappings, persistence, accessibility,
// animations, and the specific fixes you requested for visibility and horizontal scrolling.
// - Keeps all previous features (chips mapped to endpoints, API caller with AbortController,
//   placeholder bot response, retry/copy, localStorage persistence, framer-motion transitions).
// - Adds fixes: Bubble overflow-x: auto, MetaRow flex-wrap + overflow-x: auto, Card overflow-x: hidden
// - New: Added word-by-word typing animation for bot responses to make it feel more responsive.
//   After receiving the full API response, the placeholder is replaced with an empty string,
//   then words are appended one by one with a short delay (adjustable via TYPING_DELAY).
// - Fix for streaming: For the ultra_chatbot endpoint (used for general queries like "hi"), implement
//   true streaming using fetch and ReadableStream to append response chunks incrementally in real-time.
//   This makes the AI feel faster and more responsive by populating the UI as the response generates,
//   instead of waiting for the full response. Assumes the backend supports streaming (e.g., text/plain chunks).
//   For other endpoints, keep the existing full-response + typing animation.

// Dependencies:
//   styled-components, framer-motion, lucide-react
// (Removed axios; using native fetch for both regular and streaming requests)
//
// Install if needed:
//   npm i styled-components framer-motion lucide-react
//
// Drop-in replacement for your previous RTMSBot.jsx.

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import styled, { css } from "styled-components";
import {
  Send,
  X,
  Bot,
  BarChart3,
  FileText,
  TrendingUp,
  Download,
  AlertTriangle,
  RefreshCw,
  Copy,
  Trash2,
} from "lucide-react";

/* =======================================================================
   STYLED COMPONENTS (CSS-IN-JS)
   ======================================================================= */

/* Floating bot icon wrapper (reduced in size ~13%) */
const FloatingIconWrapper = styled(motion.button)`
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 9999;
  width: 95px;       /* Reduced ~13% from typical 110px */
  height: 112px;     /* preserve aspect ratio */
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
  -webkit-tap-highlight-color: transparent;
  @media (max-width: 600px) {
    width: 76px;
    height: 90px;
    bottom: 18px;
    right: 18px;
  }
`;

/* decorative pulsing circle behind icon */
const PulsingCircle = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(59,130,246,0.22), rgba(147,51,234,0.12));
  filter: blur(4px);
`;

/* icon image inside wrapper (keeps aspect ratio) */
const IconImage = styled.img`
  width: 70%;
  height: 70%;
  object-fit: contain;
  pointer-events: none;
`;

/* overlay behind the modal/card */
const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(6px);
`;

/* main chat card */
const Card = styled(motion.div)`
  width: min(1200px, 92vw);
  height: min(820px, 88vh);
  max-width: 1500px;
  max-height: 900px;
  border-radius: 16px;
  overflow: hidden;
  overflow-x: hidden; /* Prevent horizontal scroll on the card itself */
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,245,253,0.92));
  box-shadow: 0 30px 80px rgba(24, 10, 50, 0.35);
  position: relative;
  display: flex;
  flex-direction: column;

  @media (max-width: 600px) {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }
`;

/* header (header is sticky to keep clear/close visible) */
const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  background: transparent;
  position: sticky;
  top: 0;
  z-index: 30;
  backdrop-filter: blur(6px);
`;

const Title = styled.div`
  display:flex;
  align-items:center;
  gap:12px;
  font-weight:700;
  font-size:18px;
  color: #1f1b2e;
`;

/* small, accessible icon-button */
const IconButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  display: inline-flex;
  align-items:center;
  justify-content:center;
  transition: background .12s;
  &:hover { background: rgba(0,0,0,0.04); }
  &:focus { outline: 2px solid rgba(59,130,246,0.25); }
`;

/* content layout (chips, history, input) */
const Content = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0; /* enable children to overflow properly */
`;

/* body area */
const Body = styled.div`
  padding: 18px;
  display:flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  flex: 1;
`;

/* chips (quick suggestion buttons) layout */
const ChipsWrapper = styled.div`
  display:flex;
  gap:8px;
  flex-wrap:wrap;
`;

/* chat history area (scrollable vertically) */
const History = styled.div`
  background: transparent;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 8px;
  margin-top: 6px;
`;

/* message bubble with fixes for overflow & contrast */
const Bubble = styled.div`
  max-width: 86%;
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  line-height: 1.4;
  box-shadow: 0 6px 18px rgba(31,23,40,0.06);
  word-wrap: break-word;
  overflow-x: auto; /* allow horizontal scroll inside bubble for long text/JSON */
  -webkit-overflow-scrolling: touch;

  ${(p) =>
    p.isUser
      ? css`
          margin-left: auto;
          background: linear-gradient(180deg,#4f46e5,#3b82f6);
          color: white;
        `
      : css`
          background: white;
          border: 1px solid rgba(16,24,40,0.04);
          color: #1f1b2e;
        `}
`;

/* metadata row inside a bubble */
const MetaRow = styled.div`
  font-size: 11px;
  opacity: 0.8;
  margin-top: 8px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  flex-wrap: wrap;   /* avoid clipping of icons/timestamps */
  gap: 6px;
  overflow-x: auto;  /* allow horizontal scroll if icons overflow */
`;

/* input area sticky to bottom */
const InputArea = styled.form`
  display:flex;
  align-items:center;
  gap:8px;
  padding: 12px 16px;
  border-top: 1px solid rgba(0,0,0,0.06);
  background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.98));
  position: sticky;
  bottom: 0;
  z-index: 25;
`;

/* text input textarea */
const TextInput = styled.textarea`
  resize: none;
  flex: 1;
  min-height: 44px;
  max-height: 140px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(16,24,40,0.06);
  font-size: 14px;
  line-height: 1.3;
  &:disabled { opacity: 0.7; cursor: not-allowed; }
`;

/* send button style (disabled state) */
const SendButton = styled.button`
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:44px;
  min-height:44px;
  padding:8px;
  border-radius:10px;
  border:none;
  cursor: pointer;
  background: ${(p) => (p.disabled ? "rgba(16,24,40,0.06)" : "linear-gradient(180deg,#6d28d9,#3b82f6)")};
  color: ${p => (p.disabled ? "#8892a6" : "white")};
  &:focus { outline: 2px solid rgba(59,130,246,0.2); }
`;

/* small spinner for send button */
const Spinner = styled.div`
  width:18px;
  height:18px;
  border-radius:50%;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  animation: spin 1s linear infinite;
  @keyframes spin { to { transform: rotate(360deg);} }
`;

/* helper/secondary text */
const Helper = styled.div`
  font-size:12px;
  color:#6b7280;
  margin-top:6px;
`;

/* visually-hidden element for accessibility */
const VisuallyHidden = styled.span`
  position:absolute;
  width:1px;
  height:1px;
  padding:0;
  margin:-1px;
  overflow:hidden;
  clip:rect(0,0,0,0);
  border:0;
`;

/* small responsive config */
const responsive = {
  chipFontSize: "13px",
};

/* =======================================================================
   SUBCOMPONENTS (ChatHeader, ChatHistory, SuggestionChips)
   ======================================================================= */

const ChatHeader = ({ onClose, onClear }) => {
  return (
    <Header role="banner">
      <Title aria-live="polite">
        <Bot className="w-5 h-5" aria-hidden="true" />
        RTMS AI Assistant
      </Title>

      <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#6b7280" }}>
        {/* Clear */}
        <IconButton
          aria-label="Clear conversation"
          title="Clear conversation"
          onClick={onClear}
        >
          <Trash2 size={18} />
        </IconButton>

        {/* Close */}
        <IconButton aria-label="Close chat" title="Close" onClick={onClose}>
          <X size={18} />
          <VisuallyHidden>Close chat</VisuallyHidden>
        </IconButton>
      </div>
    </Header>
  );
};

const ChatHistory = React.forwardRef(({ messages, onCopy, onRetry }, ref) => {
  return (
    <History ref={ref} role="log" aria-live="polite" aria-relevant="additions text">
      {messages.length === 0 && (
        <div style={{ textAlign: "center", padding: 28 }}>
          <Bot size={48} style={{ color: "#6d28d9", opacity: 0.88 }} />
          <h3 style={{ marginTop: 12, marginBottom: 6 }}>Ask our AI anything</h3>
          <p style={{ color: "#6b7280", margin: 0 }}>
            Suggestions below — or type your question. Responses appear here.
          </p>
        </div>
      )}

      {messages.map((m) => (
        <div key={m.id} style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ alignSelf: m.type === "user" ? "flex-end" : "flex-start", display: "flex", gap: 8 }}>
            <Bubble isUser={m.type === "user"}>
              {m.type !== "user" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <Bot size={14} style={{ color: "#4f46e5" }} />
                  <strong style={{ fontSize: 13, color: "#221f2f" }}>RTMS AI</strong>
                </div>
              )}

              <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.content}</div>

              <MetaRow>
                <div>{new Date(m.timestamp).toLocaleTimeString()}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <IconButton aria-label={`Copy message`} title="Copy" onClick={() => onCopy(m.content)}>
                    <Copy size={14} />
                  </IconButton>
                  {m.error && (
                    <IconButton aria-label="Retry" title="Retry" onClick={() => onRetry(m)}>
                      <RefreshCw size={14} />
                    </IconButton>
                  )}
                </div>
              </MetaRow>
            </Bubble>
          </div>
        </div>
      ))}

      {/* anchor for scroll */}
      <div style={{ height: 6 }} />
    </History>
  );
});

const SuggestionChips = ({ suggestions, onSelect }) => {
  return (
    <ChipsWrapper aria-label="Quick suggestions">
      {suggestions.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s)}
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid rgba(59,130,246,0.16)",
            background: "white",
            cursor: "pointer",
            fontSize: responsive.chipFontSize,
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
            color: "#1f1b2e",
            boxShadow: "0 4px 12px rgba(59,130,246,0.1)",
            transition: "background 0.12s, box-shadow 0.12s", 
          }}
          aria-pressed="false"
        >
          {s.icon}
          <span>{s.text}</span>
        </button>
      ))}
    </ChipsWrapper>
  );
};

/* =======================================================================
   MAIN COMPONENT - RTMSBot
   ======================================================================= */

const RTMSBot = () => {
  /* Component state */
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]); // {id, type: 'user'|'bot', content, timestamp, error}
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const historyRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null); // AbortController for api calls
  const typingRef = useRef(null); // To store typing interval for cleanup

  /* Suggestions mapping to actual backend endpoints */
  const suggestions = useMemo(
    () => [
      { id: "summarize", text: "Summarize efficiency for last 2 months", icon: <BarChart3 size={14} />, endpoint: "/api/ai/summarize" },
      { id: "suggest_ops", text: "Suggest corrective actions for low performing lines", icon: <TrendingUp size={14} />, endpoint: "/api/ai/suggest_ops" },
      { id: "predict_eff", text: "Predict efficiency for lines", icon: <FileText size={14} />, endpoint: "/api/ai/predict_efficiency" },
      { id: "ultra_chat", text: "Ultra Chat Bot", icon: <Download size={14} />, endpoint: "/api/ai/ultra_chatbot" },
    ],
    []
  );

  /* Load messages from localStorage on mount */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("rtms_messages_v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        // Convert timestamp strings back into Date objects for display
        setMessages(parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })));
      }
    } catch (e) {
      console.warn("Failed to restore chat history:", e);
    }
  }, []);

  /* Persist messages to localStorage whenever they change */
  useEffect(() => {
    try {
      localStorage.setItem("rtms_messages_v2", JSON.stringify(messages));
    } catch (e) {
      // ignore persistence errors
    }
  }, [messages]);

  /* Auto scroll to bottom whenever messages change or card opens */
  useEffect(() => {
    if (historyRef.current) {
      try {
        historyRef.current.scrollTop = historyRef.current.scrollHeight;
      } catch (e) {
        // ignore scroll errors
      }
    }
  }, [messages, isOpen]);

  /* Focus the input when opening */
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 120);
    }
  }, [isOpen]);

  /* Cleanup typing interval on unmount */
  useEffect(() => {
    return () => {
      if (typingRef.current) {
        clearInterval(typingRef.current);
      }
    };
  }, []);

  /* Generic POST using fetch (replaces axios). Normalizes errors. */
  const apiPost = useCallback(async (url, body = {}) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || 'Network error');
      }
      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      throw err;
    }
  }, []);

  /* Streaming POST using fetch and ReadableStream. Calls onChunk with each new chunk. */
  const streamPost = useCallback(async (url, body = {}, onChunk) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Network error');
      }
      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        onChunk(chunk);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      throw err;
    }
  }, []);

  /* sendMessage: central handler for sending user prompts and handling responses from endpoints.
     Accepts options: { endpoint, payload } */
  const sendMessage = useCallback(async (text, options = {}) => {
    const { endpoint = null, payload = null } = options;
    const trimmed = String(text || "").trim();
    if (!trimmed) return;
    // Prevent concurrent sends
    if (isLoading) return;

    const idBase = Date.now().toString();
    const userMsg = { id: idBase + "_u", type: "user", content: trimmed, timestamp: new Date(), error: false };
    const botPlaceholder = { id: idBase + "_b", type: "bot", content: "⏳ Thinking...", timestamp: new Date(), error: false };

    // Append user and placeholder bot messages
    setMessages((prev) => [...prev, userMsg, botPlaceholder]);
    setInputValue("");
    setIsLoading(true);

    try {
      let data = null;
      let answer = '';

      if (endpoint) {
        /* Map known endpoints to payloads and parsing logic */
        if (endpoint.endsWith("/summarize")) {
          const body = payload ?? { text: trimmed, length: "short" };
          data = await apiPost(endpoint, body);
          answer = data?.summary || data?.answer || (typeof data === "string" ? data : JSON.stringify(data));
          animateResponse(botPlaceholder.id, String(answer));
        } else if (endpoint.endsWith("/suggest_ops")) {
          const body = payload ?? { context: "", query: trimmed };
          data = await apiPost(endpoint, body);
          // Backend may return an array of suggestions or a textual summary
          const suggestionsList = data?.suggestions || data?.ops || [];
          if (Array.isArray(suggestionsList) && suggestionsList.length > 0) {
            answer = suggestionsList.map((s, idx) => `${idx + 1}. ${s.title || s.label || s}`).join("\n\n");
          } else {
            answer = data?.message || data?.result || JSON.stringify(data);
          }
          animateResponse(botPlaceholder.id, String(answer));
        } else if (endpoint.endsWith("/predict_efficiency") || endpoint.includes("predict_efficiency")) {
          const body = payload ?? {};
          data = await apiPost(endpoint, body);
          // Expecting predictions_by_line or similar structure
          if (data?.predictions_by_line) {
            answer = Object.entries(data.predictions_by_line).map(([line, pred]) => `${line}: ${pred.prediction || JSON.stringify(pred)}`).join("\n");
          } else {
            answer = data?.summary || data?.result || JSON.stringify(data);
          }
          animateResponse(botPlaceholder.id, `Predictions:\n${answer}`);
        } else if (endpoint.endsWith("/ultra_chatbot") || endpoint.includes("/ultra_chatbot") || endpoint.includes("ultra_chat")) {
          // Ultra chatbot: use streaming for incremental updates
          const body = payload ?? { query: trimmed, context_months: 2 };
          // Replace placeholder with empty content
          setMessages((prev) => prev.map((m) => m.id === botPlaceholder.id ? { ...m, content: "" } : m));
          await streamPost(endpoint, body, (chunk) => {
            answer += chunk;
            setMessages((prev) => prev.map((m) => m.id === botPlaceholder.id ? { ...m, content: answer } : m));
          });
        } else {
          // Generic fallback: send text as-is
          data = await apiPost(endpoint, payload ?? { text: trimmed });
          answer = data?.answer || data?.result || (typeof data === "string" ? data : JSON.stringify(data).slice(0, 3000));
          animateResponse(botPlaceholder.id, String(answer));
        }
      } else {
        // Default to ultra_chatbot with streaming
        // Replace placeholder with empty content
        setMessages((prev) => prev.map((m) => m.id === botPlaceholder.id ? { ...m, content: "" } : m));
        await streamPost("/api/ai/ultra_chatbot", { query: trimmed }, (chunk) => {
          answer += chunk;
          setMessages((prev) => prev.map((m) => m.id === botPlaceholder.id ? { ...m, content: answer } : m));
        });
      }
    } catch (err) {
      console.error("API request failed:", err);
      setMessages((prev) => prev.map((m) => (m.id === botPlaceholder.id ? { ...m, content: "Sorry — there was an error processing your request.", error: true } : m)));
      // Simple user feedback; replace with your toast system if present
      try { alert(`AI request failed: ${err.message}`); } catch (e) {}
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [apiPost, streamPost, isLoading]);

  /* Helper to animate the response word by word (for non-streaming endpoints) */
  const animateResponse = (messageId, fullAnswer) => {
    // Clear existing typing interval if any
    if (typingRef.current) {
      clearInterval(typingRef.current);
    }

    // Reset content to empty
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: "" } : m))
    );

    // Split into words (preserving spaces and newlines roughly)
    const words = fullAnswer.split(/\s+/);
    let index = 0;

    typingRef.current = setInterval(() => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId) {
            const newContent = m.content + (m.content ? " " : "") + words[index];
            index++;
            if (index >= words.length) {
              clearInterval(typingRef.current);
              typingRef.current = null;
            }
            return { ...m, content: newContent };
          }
          return m;
        })
      );
    }, 10); // Adjust this delay (ms) for typing speed; lower = faster
  };

  /* UI form submit handler */
  const handleSubmit = useCallback((ev) => {
    ev.preventDefault();
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
  }, [inputValue, sendMessage]);

  /* Chip selection handler - maps to endpoints with suitable payloads */
  const handleChipSelect = async (chip) => {
    if (chip.id === "summarize") {
      // For summarize, we might want to let backend compute from DB; pass empty text to let it choose
      sendMessage(chip.text, { endpoint: chip.endpoint, payload: { text: "", length: "medium" }});
    } else if (chip.id === "suggest_ops") {
      sendMessage(chip.text, { endpoint: chip.endpoint, payload: { context: "", query: chip.text }});
    } else if (chip.id === "predict_eff") {
      sendMessage(chip.text, { endpoint: chip.endpoint, payload: {} });
    } else if (chip.id === "ultra_chat") {
      sendMessage("Start ultra chat", { endpoint: chip.endpoint, payload: { query: "Please provide an overview of current production efficiency" }});
    } else {
      // fallback: just send message
      sendMessage(chip.text);
    }
  };

  /* copy to clipboard */
  const handleCopy = (text) => {
    try {
      navigator.clipboard.writeText(text);
      // optional toast
    } catch (e) {
      console.warn("Copy failed", e);
    }
  };

  /* retry message on error */
  const handleRetry = (message) => {
    // Resend the same content through default mapping (ultra_chatbot)
    sendMessage(message.content);
  };

  /* clear conversation */
  const clearHistory = useCallback(() => {
    if (!confirm("Clear conversation history?")) return;
    setMessages([]);
    try { localStorage.removeItem("rtms_messages_v2"); } catch (e) {}
  }, []);

  /* keyboard handling - Enter to send (Shift+Enter for newline) */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && inputValue.trim()) {
        sendMessage(inputValue);
      }
    }
  };

  /* small utility to programmatically add demo content if needed (not used by default) */
  const addDemoLongMessage = useCallback(() => {
    const big = { id: `demo_${Date.now()}`, type: "bot", content: JSON.stringify({ long: "x".repeat(1200), nested: { arr: new Array(20).fill("long_text") } }, null, 2), timestamp: new Date() };
    setMessages((p) => [...p, big]);
  }, []);

  /* Renders portal into body */
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Floating Icon (reduced size) */}
      <Suspense fallback={null}>
        {!isOpen && (
          <FloatingIconWrapper
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            aria-label="Open RTMS AI chat"
            title="Open RTMS AI"
            onClick={() => setIsOpen(true)}
          >
            <PulsingCircle aria-hidden="true" />
            <div style={{ position: "relative", width: "72%", height: "72%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* Replace /robot.png with your bot icon path or inline SVG */}
              <IconImage src="/robot.png" alt="RTMS AI Bot" />
            </div>
          </FloatingIconWrapper>
        )}
      </Suspense>

      {/* Modal / Card */}
      <AnimatePresence>
        {isOpen && (
          <Overlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              // Avoid closing on overlay click to prevent accidental loss. Use header close.
              e.stopPropagation();
            }}
            aria-modal="true"
            role="dialog"
          >
            <Card
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              transition={{ duration: 0.18, type: "spring" }}
              role="document"
            >
              <Content>
                <ChatHeader onClose={() => setIsOpen(false)} onClear={clearHistory} />

                <Body>
                  {/* Suggestion chips */}
                  {/* <SuggestionChips suggestions={suggestions} onSelect={handleChipSelect} /> */}

                  {/* Chat history area (auto-scroll) */}
                  <ChatHistory
                    ref={historyRef}
                    messages={messages}
                    onCopy={handleCopy}
                    onRetry={handleRetry}
                  />
                </Body>

                {/* Input area - sticky */}
                <InputArea onSubmit={handleSubmit} aria-label="Send message">
                  <TextInput
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask me about production efficiency, summaries, predictions..."
                    aria-label="Chat input"
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    rows={1}
                    style={{ color: "#1f1b2e" }}
                  />
                  <SendButton
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    aria-label="Send message"
                  >
                    {isLoading ? <Spinner aria-hidden="true" /> : <Send size={18} />}
                  </SendButton>
                </InputArea>
              </Content>
            </Card>
          </Overlay>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
};

export default RTMSBot;
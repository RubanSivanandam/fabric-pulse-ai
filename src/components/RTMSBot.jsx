import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// 🔹 Floating Chatbot Icon (always bottom-right)
const ImageIcon = ({ isOpen, onClick }) => {
  if (isOpen) return null;
  return (
    <div
      onClick={onClick}
      style={{
        position: "fixed",   // ✅ force fixed, cannot be overridden
        bottom: "24px",
        right: "24px",
        zIndex: 10000,       // ✅ always on top
        width: "64px",
        height: "64px",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          border: "2px solid #3b82f6", // Tailwind primary blue
          backgroundColor: "#fff",
        }}
      >
        <img
          src="/Company_logo.png"
          alt="RTMS AI Assistant Icon"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      {/* ✅ Notification Pulse */}
      <div
        style={{
          position: "absolute",
          top: "-4px",
          right: "-4px",
          width: "16px",
          height: "16px",
          backgroundColor: "#22c55e", // Tailwind green
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            backgroundColor: "white",
            borderRadius: "50%",
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
    </div>
  );
};


// Simple Typing Animation
const TypingAnimation = () => (
  <div className="flex space-x-1 p-3">
    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
  </div>
);

// Message Bubble
const MessageBubble = ({ message }) => {
  const isUser = message.type === "user";

  return (
    <div
      className={cn("flex w-full mb-4", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 shadow-lg",
          isUser
            ? "bg-primary text-primary-foreground ml-12"
            : "bg-card border border-border mr-12"
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">RTMS AI</span>
          </div>
        )}

        <div className="text-sm leading-relaxed">{message.content}</div>

        {message.error && (
          <div className="flex items-center gap-2 mt-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <Button
              size="sm"
              variant="ghost"
              className="p-0 h-auto text-destructive hover:text-destructive"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </div>
        )}

        <div className="mt-2 text-xs opacity-60">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

// Suggestion Chips
const SuggestionChips = ({ suggestions, onSelect }) => (
  <div className="flex flex-wrap gap-2">
    {suggestions.map((suggestion) => (
      <Button
        key={suggestion.id}
        variant="outline"
        size="sm"
        className="h-auto py-2 px-3 text-xs hover:bg-primary/10 border-primary/20"
        onClick={() => onSelect(suggestion)}
      >
        <span className="mr-2">{suggestion.icon}</span>
        {suggestion.text}
      </Button>
    ))}
  </div>
);

// Main RTMS Bot
const RTMSBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const suggestions = useMemo(
    () => [
      {
        id: "1",
        text: "Summarize efficiency for last 2 months",
        icon: <BarChart3 className="w-3 h-3" />,
      },
      {
        id: "2",
        text: "Suggest corrective actions for low performing lines",
        icon: <TrendingUp className="w-3 h-3" />,
      },
      {
        id: "3",
        text: "Download production efficiency report as PDF",
        icon: <FileText className="w-3 h-3" />,
      },
      {
        id: "4",
        text: "Download flagged employees as CSV",
        icon: <Download className="w-3 h-3" />,
      },
    ],
    []
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Fake AI response
  const callAIAPI = async (query) => {
    return {
      answer: `Simulated response for: "${query}"`,
    };
  };

  const sendMessage = useCallback(
    async (content) => {
      if (!content.trim() || isLoading) return;

      const messageId = Date.now().toString();
      const userMessage = {
        id: messageId + "_user",
        type: "user",
        content: content.trim(),
        timestamp: new Date(),
      };
      const botMessage = {
        id: messageId + "_bot",
        type: "bot",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage, botMessage]);
      setInputValue("");
      setIsLoading(true);

      const response = await callAIAPI(content);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessage.id
            ? { ...msg, content: response.answer }
            : msg
        )
      );

      setIsLoading(false);
    },
    [isLoading]
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      sendMessage(inputValue);
    },
    [inputValue, sendMessage]
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Always show floating icon */}
      {!isOpen && <ImageIcon onClick={() => setIsOpen(true)} />}

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="w-[400px] h-[600px] shadow-2xl border-primary/20">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <Bot className="w-6 h-6 text-primary" />
                      RTMS AI BOT
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col p-0 h-full">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Bot className="w-12 h-12 mx-auto mb-4 text-primary" />
                          <h3 className="text-lg font-semibold mb-2">
                            Welcome to RTMS AI Assistant
                          </h3>
                          <p className="text-sm">
                            Ask me anything about production efficiency, analytics, or reports!
                          </p>
                        </div>
                      )}
                      {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-card border border-border rounded-2xl mr-12">
                            <TypingAnimation />
                          </div>
                        </div>
                      )}
                    </div>
                    <div ref={messagesEndRef} />
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-4 border-t border-border bg-card/50">
                    {messages.length === 0 && (
                      <SuggestionChips
                        suggestions={suggestions}
                        onSelect={(s) => sendMessage(s.text)}
                      />
                    )}
                    <form className="flex gap-2" onSubmit={handleSubmit}>
                      <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1"
                        disabled={isLoading}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!inputValue.trim() || isLoading}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
};

export default RTMSBot;

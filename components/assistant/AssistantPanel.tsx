"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const EXAMPLE_QUESTIONS = [
  "Why did Client X's bill increase in March?",
  "Show me all clients with variances over $10,000 this year",
  "Summarize this month's reconciliation for the executive team",
  "Which client had the most close changes recently?",
  "Are there any months where we significantly underbilled?",
];

// ── Render assistant message with simple markdown-like formatting ──────────────
function AssistantMessage({ content }: { content: string }) {
  // Render bold (**text**), tables, and bullet points
  const lines = content.split("\n");
  return (
    <div className="text-sm text-text-primary leading-relaxed space-y-1.5">
      {lines.map((line, i) => {
        // Table row
        if (line.startsWith("|")) {
          return (
            <div key={i} className="font-mono text-xs overflow-x-auto">
              {line}
            </div>
          );
        }
        // Heading (## or #)
        if (/^#{1,3}\s/.test(line)) {
          return (
            <p key={i} className="font-semibold text-text-primary mt-2">
              {line.replace(/^#+\s/, "")}
            </p>
          );
        }
        // Bullet point
        if (/^[-*•]\s/.test(line)) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-text-muted flex-shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: renderInline(line.replace(/^[-*•]\s/, "")) }} />
            </div>
          );
        }
        // Empty line
        if (!line.trim()) return <div key={i} className="h-1" />;
        // Normal paragraph
        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
        );
      })}
    </div>
  );
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="bg-surface-muted px-1 rounded text-xs font-mono">$1</code>');
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      const userMessage = text.trim();
      if (!userMessage || loading) return;

      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
      setLoading(true);

      // Add empty assistant message that will be filled by streaming
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      try {
        const response = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            history: messages, // send prior history for multi-turn
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error ?? "Request failed");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No response body");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last.role !== "assistant") return prev;
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + chunk },
            ];
          });
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev.slice(0, -1), // remove the empty assistant placeholder
          {
            role: "assistant",
            content: `Sorry, I ran into an error: ${err instanceof Error ? err.message : "unknown error"}. Please try again.`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleClear() {
    setMessages([]);
    setInput("");
  }

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          open
            ? "bg-text-secondary rotate-45 scale-90"
            : "bg-brand hover:bg-brand-dark hover:scale-105"
        }`}
        title={open ? "Close assistant" : "Ask Claude"}
      >
        {open ? (
          // × close icon
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
          </svg>
        ) : (
          // Sparkle / AI icon
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
          </svg>
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[400px] h-[580px] bg-white border border-surface-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand text-white flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
              </svg>
              <div>
                <p className="text-sm font-semibold leading-none">Claude Assistant</p>
                <p className="text-xs text-blue-200 mt-0.5">Ask anything about your billing data</p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="text-xs text-blue-200 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
              >
                Clear
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {messages.length === 0 ? (
              /* Empty state with example prompts */
              <div className="h-full flex flex-col justify-center">
                <div className="text-center mb-5">
                  <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-text-primary">Your billing intelligence</p>
                  <p className="text-xs text-text-muted mt-1">
                    Ask questions about clients, variances, and reconciliation
                  </p>
                </div>
                <div className="space-y-2">
                  {EXAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="w-full text-left text-xs text-text-secondary bg-surface-muted hover:bg-brand/5 hover:text-brand border border-surface-border hover:border-brand/30 rounded-lg px-3 py-2.5 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 bg-brand rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
                      </svg>
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
                      msg.role === "user"
                        ? "bg-brand text-white text-sm rounded-br-sm"
                        : "bg-surface-muted text-text-primary rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="text-sm">{msg.content}</p>
                    ) : msg.content === "" ? (
                      /* Typing indicator */
                      <div className="flex gap-1 py-1 px-1">
                        {[0, 1, 2].map((j) => (
                          <div
                            key={j}
                            className="w-2 h-2 bg-text-muted rounded-full animate-bounce"
                            style={{ animationDelay: `${j * 150}ms` }}
                          />
                        ))}
                      </div>
                    ) : (
                      <AssistantMessage content={msg.content} />
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-surface-border px-3 py-3 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                rows={1}
                placeholder="Ask about your billing data…"
                className="flex-1 resize-none text-sm border border-surface-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 max-h-28 overflow-y-auto"
                style={{ minHeight: "38px" }}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 112) + "px";
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="w-9 h-9 bg-brand text-white rounded-lg flex items-center justify-center hover:bg-brand-dark transition-colors disabled:opacity-40 flex-shrink-0"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-text-muted mt-1.5 text-center">
              Powered by Claude · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from "react";

type Props = { month: string };

export default function SendSummaryButton({ month }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [detail, setDetail] = useState("");

  async function send() {
    if (state === "sending") return;
    setState("sending");
    setDetail("");

    try {
      const res = await fetch("/api/notify/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setDetail(data.error || "Failed to send");
        setTimeout(() => setState("idle"), 4000);
      } else {
        setState("sent");
        setDetail(`Sent to ${data.recipients} team member${data.recipients !== 1 ? "s" : ""}`);
        setTimeout(() => setState("idle"), 5000);
      }
    } catch {
      setState("error");
      setDetail("Network error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={send}
        disabled={state === "sending"}
        className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-md border transition-colors disabled:opacity-60 ${
          state === "sent"
            ? "bg-positive-bg text-positive border-positive-border"
            : state === "error"
            ? "bg-negative-bg text-negative border-negative-border"
            : "bg-white text-text-secondary border-surface-border hover:bg-surface-muted"
        }`}
      >
        {state === "sending" ? (
          <>
            <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".3"/>
              <path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/>
            </svg>
            Sending…
          </>
        ) : state === "sent" ? (
          <>✓ Sent</>
        ) : state === "error" ? (
          <>✕ Failed</>
        ) : (
          <>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Send Summary
          </>
        )}
      </button>
      {detail && (
        <span className={`text-xs ${state === "error" ? "text-negative" : "text-positive"}`}>
          {detail}
        </span>
      )}
    </div>
  );
}

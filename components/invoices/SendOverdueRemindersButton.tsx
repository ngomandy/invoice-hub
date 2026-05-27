"use client";

import { useState } from "react";

type State = "idle" | "sending" | "sent" | "error";

export default function SendOverdueRemindersButton({ overdueCount }: { overdueCount: number }) {
  const [state, setState] = useState<State>("idle");

  if (overdueCount === 0) return null;

  async function handleClick() {
    setState("sending");
    try {
      const res = await fetch("/api/notify/invoices-overdue", { method: "POST" });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 5000);
  }

  const label =
    state === "sending" ? "Sending…" :
    state === "sent"    ? `✓ Sent to team` :
    state === "error"   ? "Failed — retry" :
    `Send Overdue Report (${overdueCount})`;

  return (
    <button
      onClick={handleClick}
      disabled={state === "sending"}
      className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-60 ${
        state === "sent"  ? "bg-positive/10 text-positive border border-positive/20" :
        state === "error" ? "bg-negative-bg text-negative border border-negative-border" :
        "bg-negative-bg text-negative border border-negative-border hover:opacity-80"
      }`}
    >
      {state === "idle" && (
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )}
      {label}
    </button>
  );
}

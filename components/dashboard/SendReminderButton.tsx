"use client";

import { useState } from "react";

type Props = {
  type:  "close" | "billed";
  month: string;
};

export default function SendReminderButton({ type, month }: Props) {
  const [state,  setState]  = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [detail, setDetail] = useState("");

  async function send() {
    if (state === "sending") return;
    setState("sending");
    setDetail("");

    try {
      const res  = await fetch("/api/notify/reminder", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type, month }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setDetail(data.error || "Failed");
        setTimeout(() => { setState("idle"); setDetail(""); }, 4000);
      } else {
        setState("sent");
        setDetail(`Sent to ${data.recipients}`);
        setTimeout(() => { setState("idle"); setDetail(""); }, 5000);
      }
    } catch {
      setState("error");
      setDetail("Network error");
      setTimeout(() => { setState("idle"); setDetail(""); }, 4000);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        onClick={send}
        disabled={state === "sending"}
        className={`text-xs font-medium px-2 py-0.5 rounded border transition-colors disabled:opacity-60 ${
          state === "sent"
            ? "bg-positive-bg text-positive border-positive-border"
            : state === "error"
            ? "bg-negative-bg text-negative border-negative-border"
            : type === "close"
            ? "bg-warning-bg text-warning border-warning-border hover:opacity-80"
            : "bg-negative-bg text-negative border-negative-border hover:opacity-80"
        }`}
      >
        {state === "sending" ? "Sending…" : state === "sent" ? "✓ Sent" : state === "error" ? "✕ Failed" : "Remind team"}
      </button>
      {detail && (
        <span className={`text-[11px] ${state === "error" ? "text-negative" : "text-positive"}`}>
          {detail}
        </span>
      )}
    </span>
  );
}

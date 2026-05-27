"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialName: string;
  email:       string;
};

export default function ProfileForm({ initialName, email }: Props) {
  const router = useRouter();
  const [name,    setName]    = useState(initialName);
  const [status,  setStatus]  = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const isDirty = name.trim() !== initialName;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty || !name.trim()) return;

    setStatus("saving");
    setMessage("");

    try {
      const res = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ full_name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to save");
      } else {
        setStatus("saved");
        setMessage("Changes saved");
        router.refresh();
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setMessage("Network error");
    }
  }

  return (
    <div className="bg-white border border-surface-border rounded-lg p-6 space-y-5">
      <h2 className="text-sm font-semibold text-text-primary">Account Details</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Display name */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5" htmlFor="full_name">
            Display Name
          </label>
          <input
            id="full_name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setStatus("idle"); setMessage(""); }}
            placeholder="Your name"
            className="w-full border border-surface-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full border border-surface-border rounded-md px-3 py-2 text-sm text-text-muted bg-surface-muted cursor-not-allowed"
          />
          <p className="text-xs text-text-muted mt-1">Email cannot be changed here.</p>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={!isDirty || status === "saving" || !name.trim()}
            className="text-sm font-medium bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {status === "saving" ? "Saving…" : "Save Changes"}
          </button>
          {message && (
            <p className={`text-xs ${status === "error" ? "text-negative" : "text-positive"}`}>
              {message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

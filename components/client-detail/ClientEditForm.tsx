"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  clientId:  string;
  initialName: string;
  isActive:  boolean;
};

export default function ClientEditForm({ clientId, initialName, isActive }: Props) {
  const router = useRouter();
  const [name,    setName]    = useState(initialName);
  const [active,  setActive]  = useState(isActive);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const nameChanged   = name.trim() !== initialName;
  const activeChanged = active !== isActive;
  const isDirty       = nameChanged || activeChanged;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty || saving) return;

    setSaving(true);
    setError("");
    setSuccess(false);

    const updates: Record<string, unknown> = {};
    if (nameChanged)   updates.name      = name.trim();
    if (activeChanged) updates.is_active = active;

    try {
      const res  = await fetch(`/api/clients/${clientId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
      } else {
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-surface-border rounded-lg p-6 space-y-5 max-w-lg">
      <h2 className="text-sm font-semibold text-text-primary">Client Details</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="client_name" className="block text-xs font-medium text-text-secondary mb-1.5">
            Client Name
          </label>
          <input
            id="client_name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); setSuccess(false); }}
            placeholder="Client name"
            className="w-full border border-surface-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between py-3 border-t border-surface-border">
          <div>
            <p className="text-sm font-medium text-text-primary">Active Status</p>
            <p className="text-xs text-text-muted mt-0.5">
              {active
                ? "Client appears in dashboard and reports"
                : "Client is archived and hidden from the dashboard"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            onClick={() => { setActive((v) => !v); setError(""); setSuccess(false); }}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand ${
              active ? "bg-brand" : "bg-surface-border"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                active ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Deactivation warning */}
        {!active && isActive && (
          <div className="flex items-start gap-2 bg-warning-bg border border-warning-border rounded-md p-3">
            <svg className="flex-shrink-0 text-warning mt-0.5" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-xs text-warning">
              Deactivating this client will remove them from the dashboard and bulk entry views. Their historical data will be preserved.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={!isDirty || saving || !name.trim()}
            className="text-sm font-medium bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => { setName(initialName); setActive(isActive); setError(""); setSuccess(false); }}
            disabled={!isDirty || saving}
            className="text-sm font-medium text-text-secondary border border-surface-border px-4 py-2 rounded-md hover:bg-surface-muted disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          {success && <p className="text-xs text-positive">Changes saved</p>}
          {error   && <p className="text-xs text-negative">{error}</p>}
        </div>
      </form>
    </div>
  );
}

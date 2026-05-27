"use client";

import { useState, useEffect, useRef } from "react";

type Note = {
  id:          string;
  client_id:   string;
  content:     string;
  created_by:  string;
  created_at:  string;
  author_name: string;
};

type Props = {
  clientId:      string;
  currentUserId: string;
};

export default function ClientNotes({ clientId, currentUserId }: Props) {
  const [notes,    setNotes]    = useState<Note[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [draft,    setDraft]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function loadNotes() {
    setLoading(true);
    const res = await fetch(`/api/notes?clientId=${clientId}`);
    if (res.ok) {
      const data = await res.json();
      setNotes(data);
    }
    setLoading(false);
  }

  useEffect(() => { loadNotes(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    setError("");

    const res = await fetch("/api/notes", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, content: draft.trim() }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save note");
      setSaving(false);
      return;
    }

    const newNote = await res.json();
    setNotes((prev) => [newNote, ...prev]);
    setDraft("");
    setSaving(false);
    textareaRef.current?.blur();
  }

  async function deleteNote(id: string) {
    const res = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  <  1) return "just now";
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  <  7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="bg-white border border-surface-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border">
        <h2 className="text-sm font-semibold text-text-primary">Internal Notes</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Team memos, context, and follow-ups for this client
        </p>
      </div>

      {/* Add note form */}
      <form onSubmit={addNote} className="px-5 pt-4 pb-3 border-b border-surface-border">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Add a note…"
          className="w-full border border-surface-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              addNote(e as unknown as React.FormEvent);
            }
          }}
        />
        {error && <p className="text-xs text-negative mt-1">{error}</p>}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-text-muted">⌘↵ to submit</span>
          <button
            type="submit"
            disabled={saving || !draft.trim()}
            className="text-xs bg-brand text-white px-3 py-1.5 rounded-md hover:bg-brand-dark disabled:opacity-50 font-medium"
          >
            {saving ? "Saving…" : "Add Note"}
          </button>
        </div>
      </form>

      {/* Notes list */}
      <div className="divide-y divide-surface-border">
        {loading ? (
          <p className="text-sm text-text-muted text-center py-6">Loading…</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="px-5 py-3 group hover:bg-surface-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-text-primary whitespace-pre-wrap flex-1">
                  {note.content}
                </p>
                {note.created_by === currentUserId && (
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="flex-shrink-0 text-xs text-text-muted hover:text-negative opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                    title="Delete note"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-text-muted">
                <span className="font-medium">{note.author_name}</span>
                <span>·</span>
                <span title={new Date(note.created_at).toLocaleString()}>
                  {formatRelativeTime(note.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

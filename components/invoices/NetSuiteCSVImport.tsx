"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Client = { id: string; name: string };

type Props = { clients: Client[] };

type Result = {
  imported: number;
  skipped:  number;
  errors:   string[];
};

export default function NetSuiteCSVImport({ clients }: Props) {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file,     setFile]     = useState<File | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<Result | null>(null);
  const [error,    setError]    = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setError(""); }
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true); setError(""); setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const res  = await fetch("/api/invoices/import", { method: "POST", body: formData });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Import failed");
    } else {
      setResult(data);
      if (data.imported > 0) router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-surface-border rounded-lg p-8 text-center cursor-pointer hover:border-brand/50 hover:bg-brand/5 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFile}
        />
        <svg className="mx-auto mb-3 text-text-muted" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {file ? (
          <p className="text-sm font-medium text-text-primary">{file.name}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-text-primary">Click to select CSV file</p>
            <p className="text-xs text-text-muted mt-1">NetSuite invoice export (.csv)</p>
          </>
        )}
      </div>

      {/* Client list helper */}
      <details className="text-xs text-text-muted">
        <summary className="cursor-pointer hover:text-text-secondary">
          View {clients.length} recognised client name{clients.length !== 1 ? "s" : ""} for matching
        </summary>
        <div className="mt-2 p-3 bg-surface-muted rounded-md max-h-32 overflow-y-auto">
          {clients.map((c) => (
            <p key={c.id} className="font-mono">{c.name}</p>
          ))}
        </div>
      </details>

      {error  && <p className="text-sm text-negative">{error}</p>}

      {result && (
        <div className={`rounded-lg p-4 text-sm ${result.imported > 0 ? "bg-positive/10 border border-positive/20" : "bg-surface-muted border border-surface-border"}`}>
          <p className="font-semibold text-text-primary mb-1">
            Import complete — {result.imported} recorded, {result.skipped} skipped
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-text-muted text-xs">
              {result.errors.slice(0, 10).map((e, i) => <li key={i}>• {e}</li>)}
              {result.errors.length > 10 && <li>… and {result.errors.length - 10} more</li>}
            </ul>
          )}
          {result.imported > 0 && (
            <button
              onClick={() => router.push("/invoices")}
              className="mt-3 text-brand text-xs font-medium hover:underline"
            >
              View all invoices →
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="bg-brand text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-brand-dark disabled:opacity-50 transition-colors"
        >
          {loading ? "Importing…" : "Import CSV"}
        </button>
        {file && !loading && (
          <button
            onClick={() => { setFile(null); setResult(null); if (inputRef.current) inputRef.current.value = ""; }}
            className="text-sm text-text-muted hover:text-text-secondary"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

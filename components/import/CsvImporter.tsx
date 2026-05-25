"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

// ─── CSV parser (handles quoted fields, CRLF, commas inside quotes) ───────────
function parseCSVText(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        i++;
        let cell = "";
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') {
            cell += '"';
            i += 2;
          } else if (line[i] === '"') {
            i++;
            break;
          } else {
            cell += line[i++];
          }
        }
        cells.push(cell.trim());
        if (i < line.length && line[i] === ",") i++;
      } else {
        const end = line.indexOf(",", i);
        if (end === -1) {
          cells.push(line.slice(i).trim());
          break;
        } else {
          cells.push(line.slice(i, end).trim());
          i = end + 1;
        }
      }
    }
    rows.push(cells);
  }
  return rows;
}

// ─── Column name aliases ───────────────────────────────────────────────────────
const COLUMN_ALIASES: Record<string, string> = {
  client: "client_name",
  client_name: "client_name",
  "client name": "client_name",
  company: "client_name",
  "company name": "client_name",
  account: "client_name",
  month: "close_month",
  close_month: "close_month",
  "close month": "close_month",
  period: "close_month",
  date: "close_month",
  net_usage: "net_usage",
  "net usage": "net_usage",
  usage: "net_usage",
  "net usage ($)": "net_usage",
  "net_usage ($)": "net_usage",
  rollover_from_previous: "rollover_from_previous",
  "rollover from previous": "rollover_from_previous",
  rollover_from: "rollover_from_previous",
  "rollover from": "rollover_from_previous",
  "rollover (from)": "rollover_from_previous",
  rollover_to_next: "rollover_to_next",
  "rollover to next": "rollover_to_next",
  rollover_to: "rollover_to_next",
  "rollover to": "rollover_to_next",
  "rollover (to)": "rollover_to_next",
  discounts: "discounts",
  discount: "discounts",
  "discounts ($)": "discounts",
  billed_total: "billed_total",
  billed: "billed_total",
  "billed amount": "billed_total",
  "billed total": "billed_total",
  invoice_amount: "billed_total",
  "invoice amount": "billed_total",
  invoiced: "billed_total",
  "invoiced amount": "billed_total",
  "actual billed": "billed_total",
};

function normalizeColumn(header: string): string {
  return COLUMN_ALIASES[header.toLowerCase().trim()] ?? header.toLowerCase().trim();
}

// ─── Month parsing ─────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
];
const MONTH_SHORT = [
  "jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec",
];

function parseMonth(raw: string): string | null {
  raw = raw.trim();
  if (!raw) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.substring(0, 7) + "-01";
  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(raw)) return raw + "-01";
  // YYYY/MM
  if (/^\d{4}\/\d{2}$/.test(raw)) return raw.replace("/", "-") + "-01";
  // MM/YYYY
  if (/^\d{1,2}\/\d{4}$/.test(raw)) {
    const [m, y] = raw.split("/");
    return `${y}-${m.padStart(2, "0")}-01`;
  }
  // MM/DD/YYYY or MM-DD-YYYY
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(raw)) {
    const parts = raw.split(/[\/\-]/);
    return `${parts[2]}-${parts[0].padStart(2, "0")}-01`;
  }
  // "January 2024" or "Jan 2024"
  const lower = raw.toLowerCase();
  const yearMatch = raw.match(/\d{4}/);
  if (yearMatch) {
    for (let i = 0; i < MONTH_NAMES.length; i++) {
      if (lower.includes(MONTH_NAMES[i]) || lower.includes(MONTH_SHORT[i])) {
        return `${yearMatch[0]}-${String(i + 1).padStart(2, "0")}-01`;
      }
    }
  }
  return null;
}

function formatMonthDisplay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function parseNum(raw: string | undefined): number | null {
  if (raw === undefined || raw === "" || raw === null) return null;
  const cleaned = raw.replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ParsedRow = {
  rowNum: number; // 1-based CSV line number
  client_name: string;
  close_month: string | null;
  net_usage: number | null;
  rollover_from_previous: number | null;
  rollover_to_next: number | null;
  discounts: number | null;
  billed_total: number | null;
  errors: string[];
  warnings: string[];
};

type ImportResult = {
  closes: number;
  billed: number;
  clients_created: number;
  errors: string[];
};

type Step = "upload" | "preview" | "importing" | "done";

// ─── Sample CSV ───────────────────────────────────────────────────────────────
const SAMPLE_CSV = [
  "client_name,close_month,net_usage,rollover_from_previous,rollover_to_next,discounts,billed_total",
  "Acme Corp,2024-01,10000,500,200,100,10350",
  "Beta Ltd,2024-01,8500,0,0,250,8500",
  "Gamma Inc,January 2024,12000,1000,0,0,13250",
  "Delta Co,2024-01,,,,,9800",
].join("\n");

// ─── Component ────────────────────────────────────────────────────────────────
export default function CsvImporter() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState("");

  // ── File processing ──────────────────────────────────────────────────────
  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Please upload a .csv file");
      return;
    }
    setParseError("");
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = parseAndValidate(text);
        if (parsed.length === 0) {
          setParseError("The file is empty or has no data rows after the header.");
          return;
        }
        setRows(parsed);
        setStep("preview");
      } catch {
        setParseError("Could not parse the file. Make sure it is a valid CSV.");
      }
    };
    reader.readAsText(file);
  }

  function parseAndValidate(text: string): ParsedRow[] {
    const rawRows = parseCSVText(text);
    if (rawRows.length < 2) return [];

    const headers = rawRows[0].map(normalizeColumn);
    const dataRows = rawRows.slice(1);

    return dataRows.map((cells, i) => {
      const raw: Record<string, string> = {};
      headers.forEach((h, j) => {
        raw[h] = cells[j] ?? "";
      });

      const errors: string[] = [];
      const warnings: string[] = [];

      const client_name = (raw["client_name"] ?? "").trim();
      if (!client_name) errors.push("Client name is required");

      const rawMonth = raw["close_month"] ?? "";
      const close_month = parseMonth(rawMonth);
      if (!rawMonth.trim()) {
        errors.push("Month is required");
      } else if (!close_month) {
        errors.push(`Cannot parse month: "${rawMonth}"`);
      }

      const net_usage = parseNum(raw["net_usage"]);
      const rollover_from_previous = parseNum(raw["rollover_from_previous"]);
      const rollover_to_next = parseNum(raw["rollover_to_next"]);
      const discounts = parseNum(raw["discounts"]);
      const billed_total = parseNum(raw["billed_total"]);

      const hasClose =
        net_usage !== null ||
        rollover_from_previous !== null ||
        rollover_to_next !== null ||
        discounts !== null;
      const hasBilled = billed_total !== null;

      if (!hasClose && !hasBilled) {
        warnings.push("No numeric data — row will be skipped");
      }

      return {
        rowNum: i + 2,
        client_name,
        close_month,
        net_usage,
        rollover_from_previous,
        rollover_to_next,
        discounts,
        billed_total,
        errors,
        warnings,
      };
    });
  }

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  // ── Import ───────────────────────────────────────────────────────────────
  async function handleImport() {
    const validRows = rows.filter(
      (r) => r.errors.length === 0 && r.close_month && r.client_name &&
        (r.net_usage !== null || r.rollover_from_previous !== null ||
         r.rollover_to_next !== null || r.discounts !== null || r.billed_total !== null)
    );
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });
      const data = await res.json();
      setResult(data);
      setStep("done");
    } catch {
      setResult({ closes: 0, billed: 0, clients_created: 0, errors: ["Network error — please try again"] });
      setStep("done");
    } finally {
      setImporting(false);
    }
  }

  // ── Sample download ──────────────────────────────────────────────────────
  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoice-hub-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Computed ─────────────────────────────────────────────────────────────
  const errorRows = rows.filter((r) => r.errors.length > 0);
  const warnRows = rows.filter((r) => r.errors.length === 0 && r.warnings.length > 0);
  const validRows = rows.filter(
    (r) => r.errors.length === 0 &&
      (r.net_usage !== null || r.rollover_from_previous !== null ||
       r.rollover_to_next !== null || r.discounts !== null || r.billed_total !== null)
  );

  // ── Render ────────────────────────────────────────────────────────────────

  // Step: Upload
  if (step === "upload") {
    return (
      <div className="max-w-2xl">
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-brand bg-brand/5"
              : "border-surface-border hover:border-brand/50 hover:bg-surface-muted"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
            }}
          />
          <div className="flex justify-center mb-4">
            <svg
              width="40"
              height="40"
              fill="none"
              viewBox="0 0 24 24"
              stroke={isDragging ? "#2563eb" : "#9ca3af"}
              strokeWidth="1.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">
            Drop your CSV here, or click to browse
          </p>
          <p className="text-xs text-text-muted">.csv files only</p>
        </div>

        {parseError && (
          <p className="mt-3 text-sm text-negative bg-negative-bg border border-negative-border rounded px-3 py-2">
            {parseError}
          </p>
        )}

        {/* Format guide */}
        <div className="mt-6 bg-white border border-surface-border rounded-lg p-5">
          <p className="text-sm font-semibold text-text-primary mb-3">Expected columns</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left pb-2 pr-4 text-text-muted font-medium">Column name</th>
                  <th className="text-left pb-2 pr-4 text-text-muted font-medium">Required</th>
                  <th className="text-left pb-2 text-text-muted font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {[
                  ["client_name", "Yes", "Also accepts: client, company, account"],
                  ["close_month", "Yes", "YYYY-MM, MM/YYYY, or \"January 2024\""],
                  ["net_usage", "No", "Numeric — omit or leave blank to skip close"],
                  ["rollover_from_previous", "No", "Numeric"],
                  ["rollover_to_next", "No", "Numeric"],
                  ["discounts", "No", "Numeric"],
                  ["billed_total", "No", "Also accepts: billed, invoice_amount"],
                ].map(([col, req, note]) => (
                  <tr key={col}>
                    <td className="py-2 pr-4 font-mono text-text-primary">{col}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        req === "Yes"
                          ? "bg-negative-bg text-negative border border-negative-border"
                          : "bg-surface-muted text-text-muted"
                      }`}>
                        {req}
                      </span>
                    </td>
                    <td className="py-2 text-text-muted">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-surface-border flex items-center justify-between">
            <p className="text-xs text-text-muted">
              New clients in the CSV are created automatically.
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); downloadSample(); }}
              className="text-xs font-medium text-brand hover:text-brand-dark transition-colors flex items-center gap-1"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download sample CSV
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step: Preview
  if (step === "preview") {
    return (
      <div>
        {/* Summary bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="bg-white border border-surface-border rounded-lg px-4 py-3 flex items-center gap-2">
            <span className="text-xs text-text-muted">File</span>
            <span className="text-sm font-medium text-text-primary truncate max-w-[180px]">{fileName}</span>
          </div>
          <div className="bg-white border border-surface-border rounded-lg px-4 py-3 flex items-center gap-2">
            <span className="text-xs text-text-muted">Total rows</span>
            <span className="text-sm font-bold text-text-primary">{rows.length}</span>
          </div>
          <div className={`rounded-lg px-4 py-3 flex items-center gap-2 ${
            validRows.length > 0
              ? "bg-positive-bg border border-positive-border"
              : "bg-surface-muted border border-surface-border"
          }`}>
            <span className="text-xs text-text-muted">Ready to import</span>
            <span className="text-sm font-bold text-positive">{validRows.length}</span>
          </div>
          {errorRows.length > 0 && (
            <div className="bg-negative-bg border border-negative-border rounded-lg px-4 py-3 flex items-center gap-2">
              <span className="text-xs text-text-muted">Errors</span>
              <span className="text-sm font-bold text-negative">{errorRows.length}</span>
            </div>
          )}
          {warnRows.length > 0 && (
            <div className="bg-warning-bg border border-warning-border rounded-lg px-4 py-3 flex items-center gap-2">
              <span className="text-xs text-text-muted">Warnings</span>
              <span className="text-sm font-bold text-warning">{warnRows.length}</span>
            </div>
          )}
        </div>

        {/* Preview table */}
        <div className="bg-white border border-surface-border rounded-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface-muted border-b border-surface-border">
                <tr>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium">#</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium">Client</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium">Month</th>
                  <th className="text-right px-3 py-2.5 text-text-muted font-medium">Net Usage</th>
                  <th className="text-right px-3 py-2.5 text-text-muted font-medium">Roll. From</th>
                  <th className="text-right px-3 py-2.5 text-text-muted font-medium">Roll. To</th>
                  <th className="text-right px-3 py-2.5 text-text-muted font-medium">Discounts</th>
                  <th className="text-right px-3 py-2.5 text-text-muted font-medium">Billed</th>
                  <th className="text-left px-3 py-2.5 text-text-muted font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {rows.map((row) => {
                  const hasErrors = row.errors.length > 0;
                  const hasWarnings = row.warnings.length > 0;
                  return (
                    <tr
                      key={row.rowNum}
                      className={hasErrors ? "bg-negative-bg/30" : hasWarnings ? "bg-warning-bg/30" : ""}
                    >
                      <td className="px-3 py-2.5 text-text-muted">{row.rowNum}</td>
                      <td className="px-3 py-2.5 font-medium text-text-primary max-w-[140px] truncate">
                        {row.client_name || <span className="text-negative italic">missing</span>}
                      </td>
                      <td className="px-3 py-2.5 text-text-secondary">
                        {row.close_month
                          ? formatMonthDisplay(row.close_month)
                          : <span className="text-negative italic">invalid</span>}
                      </td>
                      {([
                        row.net_usage,
                        row.rollover_from_previous,
                        row.rollover_to_next,
                        row.discounts,
                        row.billed_total,
                      ] as (number | null)[]).map((val, j) => (
                        <td key={j} className="px-3 py-2.5 text-right font-mono text-text-secondary">
                          {val !== null ? formatCurrency(val) : <span className="text-text-muted">—</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2.5">
                        {hasErrors ? (
                          <div>
                            {row.errors.map((e, i) => (
                              <p key={i} className="text-negative flex items-start gap-1">
                                <span>✕</span> {e}
                              </p>
                            ))}
                          </div>
                        ) : hasWarnings ? (
                          <div>
                            {row.warnings.map((w, i) => (
                              <p key={i} className="text-warning flex items-start gap-1">
                                <span>⚠</span> {w}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-positive flex items-center gap-1">
                            <span>✓</span> Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleImport}
            disabled={validRows.length === 0 || importing}
            className="bg-brand text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {importing ? "Importing…" : `Import ${validRows.length} row${validRows.length !== 1 ? "s" : ""}`}
          </button>
          <button
            onClick={() => { setStep("upload"); setRows([]); setFileName(""); }}
            className="text-sm font-medium text-text-secondary px-4 py-2 rounded-md hover:bg-surface-muted transition-colors"
          >
            ← Choose different file
          </button>
          {errorRows.length > 0 && (
            <p className="text-xs text-text-muted ml-2">
              {errorRows.length} row{errorRows.length !== 1 ? "s" : ""} with errors will be skipped.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Step: Importing
  if (step === "importing") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-text-primary">Importing data…</p>
        <p className="text-xs text-text-muted mt-1">This may take a moment for large files</p>
      </div>
    );
  }

  // Step: Done
  if (step === "done" && result) {
    const totalImported = result.closes + result.billed;
    const success = totalImported > 0;
    return (
      <div className="max-w-lg">
        <div className={`rounded-lg p-6 mb-6 border ${
          success
            ? "bg-positive-bg border-positive-border"
            : "bg-warning-bg border-warning-border"
        }`}>
          <p className={`text-base font-semibold mb-4 ${success ? "text-positive" : "text-warning"}`}>
            {success ? "Import complete" : "Import finished with issues"}
          </p>
          <div className="space-y-2">
            {result.closes > 0 && (
              <p className="text-sm text-text-primary">
                ✓ <span className="font-semibold">{result.closes}</span> revenue close{result.closes !== 1 ? "s" : ""} saved
              </p>
            )}
            {result.billed > 0 && (
              <p className="text-sm text-text-primary">
                ✓ <span className="font-semibold">{result.billed}</span> billed amount{result.billed !== 1 ? "s" : ""} saved
              </p>
            )}
            {result.clients_created > 0 && (
              <p className="text-sm text-text-primary">
                ✓ <span className="font-semibold">{result.clients_created}</span> new client{result.clients_created !== 1 ? "s" : ""} created
              </p>
            )}
            {totalImported === 0 && (
              <p className="text-sm text-text-secondary">No records were imported.</p>
            )}
          </div>
        </div>

        {result.errors.length > 0 && (
          <div className="bg-white border border-negative-border rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-negative mb-2">
              {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}
            </p>
            <ul className="space-y-1">
              {result.errors.map((e, i) => (
                <li key={i} className="text-xs text-text-secondary">
                  • {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-brand text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-brand-dark transition-colors"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => { setStep("upload"); setRows([]); setFileName(""); setResult(null); }}
            className="text-sm font-medium text-text-secondary px-4 py-2 rounded-md hover:bg-surface-muted transition-colors"
          >
            Import another file
          </button>
        </div>
      </div>
    );
  }

  return null;
}

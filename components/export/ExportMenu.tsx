"use client";

import { useState, useRef, useEffect } from "react";
import type { ExportRow } from "@/lib/export";

type ExportMenuProps = {
  rows: ExportRow[];
  filename: string;   // without extension
  title: string;      // e.g. "Acme Corp — 2024"
  subtitle?: string;  // e.g. "Generated May 25, 2026"
};

type Format = "csv" | "excel" | "pdf" | "json";

const OPTIONS: { id: Format; label: string; ext: string; desc: string; color: string }[] = [
  {
    id: "csv",
    label: "CSV",
    ext: ".csv",
    desc: "Opens in any spreadsheet app",
    color: "text-positive",
  },
  {
    id: "excel",
    label: "Excel",
    ext: ".xlsx",
    desc: "Microsoft Excel with column widths",
    color: "text-brand",
  },
  {
    id: "pdf",
    label: "PDF",
    ext: ".pdf",
    desc: "Formatted report, ready to share",
    color: "text-negative",
  },
  {
    id: "json",
    label: "JSON",
    ext: ".json",
    desc: "Raw data for developers / backups",
    color: "text-warning",
  },
];

export default function ExportMenu({ rows, filename, title, subtitle }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<Format | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleExport(format: Format) {
    if (rows.length === 0) return;
    setLoading(format);
    setOpen(false);
    try {
      if (format === "csv") {
        const { downloadCSV } = await import("@/lib/export");
        downloadCSV(rows, `${filename}.csv`);
      } else if (format === "excel") {
        const { downloadExcel } = await import("@/lib/export");
        await downloadExcel(rows, `${filename}.xlsx`, title);
      } else if (format === "pdf") {
        const { downloadPDF } = await import("@/lib/export");
        await downloadPDF(rows, `${filename}.pdf`, title, subtitle ?? "");
      } else if (format === "json") {
        const { downloadJSON } = await import("@/lib/export");
        downloadJSON(rows, `${filename}.json`);
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        disabled={!!loading || rows.length === 0}
        className="inline-flex items-center gap-2 bg-white border border-surface-border text-text-secondary text-sm font-medium px-4 py-2 rounded-md hover:bg-surface-muted transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
            Exporting…
          </>
        ) : (
          <>
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export
            <svg
              width="12"
              height="12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-surface-border rounded-lg shadow-lg z-20 py-1.5 overflow-hidden">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2">
            Download as
          </p>
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleExport(opt.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-muted transition-colors text-left"
            >
              <span
                className={`text-xs font-bold font-mono w-10 text-center bg-surface-muted rounded px-1 py-0.5 ${opt.color}`}
              >
                {opt.ext}
              </span>
              <div>
                <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                <p className="text-xs text-text-muted">{opt.desc}</p>
              </div>
            </button>
          ))}
          <div className="border-t border-surface-border mt-1 pt-1">
            <p className="text-xs text-text-muted px-3 py-1.5">
              {rows.length} row{rows.length !== 1 ? "s" : ""} will be exported
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared types ─────────────────────────────────────────────────────────────
export type ExportRow = Record<string, string | number | null>;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── CSV ──────────────────────────────────────────────────────────────────────
export function downloadCSV(rows: ExportRow[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);

  function escape(val: string | number | null): string {
    if (val === null || val === undefined) return "";
    const s = String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  }

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h] ?? null)).join(",")),
  ];

  // UTF-8 BOM so Excel opens it correctly without asking about encoding
  const blob = new Blob(["﻿" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, filename);
}

// ─── Excel (.xlsx) ───────────────────────────────────────────────────────────
export async function downloadExcel(
  rows: ExportRow[],
  filename: string,
  sheetName = "Report"
): Promise<void> {
  if (rows.length === 0) return;
  const XLSX = await import("xlsx");
  const headers = Object.keys(rows[0]);

  // Build worksheet with actual numbers where possible
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-fit column widths
  ws["!cols"] = headers.map((h) => ({
    wch: Math.max(
      h.length + 2,
      ...rows.map((r) => String(r[h] ?? "").length),
      8
    ),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31)); // Excel limit
  XLSX.writeFile(wb, filename);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────
export async function downloadPDF(
  rows: ExportRow[],
  filename: string,
  title: string,
  subtitle = ""
): Promise<void> {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const isLandscape = headers.length > 5;

  // Dynamic imports — only loaded when user clicks Export PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { default: jsPDF } = await import("jspdf") as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { default: autoTable } = await import("jspdf-autotable") as any;

  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
  });
  const pageW = doc.internal.pageSize.width;

  // ── Branding header ──
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235); // brand blue
  doc.text("Invoice Hub", 14, 16);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 20, 20);
  doc.text(title, 14, 25);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text(subtitle, 14, 31);
  }

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(14, subtitle ? 35 : 29, pageW - 14, subtitle ? 35 : 29);

  // ── Table ──
  const bodyRows = rows.map((r) =>
    headers.map((h) => {
      const val = r[h];
      if (val === null || val === undefined) return "—";
      return String(val);
    })
  );

  autoTable(doc, {
    head: [headers],
    body: bodyRows,
    startY: subtitle ? 39 : 33,
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      font: "helvetica",
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    tableLineColor: [229, 231, 235],
    tableLineWidth: 0.1,
    margin: { left: 14, right: 14 },
    didDrawPage: (data: { pageNumber: number }) => {
      // Page footer
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(160, 160, 160);
      const generated = `Generated ${new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`;
      doc.text(generated, 14, doc.internal.pageSize.height - 7);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageW - 14,
        doc.internal.pageSize.height - 7,
        { align: "right" }
      );
    },
  });

  doc.save(filename);
}

// ─── JSON ─────────────────────────────────────────────────────────────────────
export function downloadJSON(rows: ExportRow[], filename: string): void {
  const blob = new Blob([JSON.stringify(rows, null, 2)], {
    type: "application/json",
  });
  triggerDownload(blob, filename);
}

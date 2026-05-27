import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Map NetSuite status strings to our status values
function mapStatus(raw: string): "draft" | "sent" | "viewed" | "paid" {
  const s = raw.toLowerCase().trim();
  if (s.includes("paid") || s.includes("closed")) return "paid";
  if (s.includes("draft") || s.includes("pending approval")) return "draft";
  return "sent"; // Open, Overdue, Partially Paid → sent
}

// Normalise a header string to a canonical key
function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_-]+/g, "_").trim();
}

// Parse a date in MM/DD/YYYY or YYYY-MM-DD or DD/MM/YYYY into YYYY-MM-DD
function parseDate(raw: string): string | null {
  if (!raw) return null;
  raw = raw.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // MM/DD/YYYY
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  // DD/MM/YYYY  (ambiguous — try if month > 12)
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy && parseInt(dmy[1]) > 12) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  return null;
}

// Simple CSV parser that handles quoted fields
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        cells.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    rows.push(cells.map((c) => c.trim()));
  }
  return rows;
}

// POST /api/invoices/import — accepts multipart form with a CSV file
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const fileField = formData.get("file");
  if (!fileField || typeof fileField === "string") {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const csvText = await (fileField as Blob).text();
  const rows    = parseCSV(csvText);

  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 });
  }

  // Build header map
  const rawHeaders = rows[0];
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, i) => { headerMap[normaliseHeader(h)] = i; });

  // Column aliases
  const col = (aliases: string[]): number => {
    for (const a of aliases) {
      const n = normaliseHeader(a);
      if (headerMap[n] !== undefined) return headerMap[n];
    }
    return -1;
  };

  const idxInternalId  = col(["internal_id", "internalid", "id"]);
  const idxNumber      = col(["document_number", "number", "invoice_number", "invoice_#", "invoice_no"]);
  const idxName        = col(["name", "customer", "client", "client_name", "customer_name"]);
  const idxDate        = col(["date", "issue_date", "transaction_date"]);
  const idxDueDate     = col(["due_date", "duedate"]);
  const idxAmount      = col(["amount", "total", "amount_remaining", "balance"]);
  const idxStatus      = col(["status"]);
  const idxMemo        = col(["memo", "notes", "note", "description"]);

  if (idxNumber === -1) {
    return NextResponse.json({ error: "CSV must include an invoice number column (Document Number, Number, Invoice #)" }, { status: 400 });
  }
  if (idxName === -1) {
    return NextResponse.json({ error: "CSV must include a client/customer name column" }, { status: 400 });
  }
  if (idxAmount === -1) {
    return NextResponse.json({ error: "CSV must include an amount column (Amount, Total, Balance)" }, { status: 400 });
  }

  // Load existing clients for matching
  const { data: clients } = await supabase.from("clients").select("id, name").eq("is_active", true);
  const clientMap = new Map<string, string>();
  (clients ?? []).forEach((c) => clientMap.set(c.name.toLowerCase().trim(), c.id));

  // Load existing invoice numbers to avoid duplicates
  const { data: existingInvoices } = await supabase.from("invoices").select("invoice_number");
  const existingNumbers = new Set((existingInvoices ?? []).map((i) => i.invoice_number));

  const dataRows = rows.slice(1);
  const imported: string[] = [];
  const errors:   string[] = [];

  const today = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2; // 1-indexed, +1 for header

    const invoiceNumber = row[idxNumber]?.trim();
    const clientRaw     = row[idxName]?.trim();
    const amountRaw     = row[idxAmount]?.trim().replace(/[$,]/g, "");

    if (!invoiceNumber) { errors.push(`Row ${rowNum}: missing invoice number — skipped`); continue; }
    if (!clientRaw)     { errors.push(`Row ${rowNum}: missing client name — skipped`); continue; }

    // Duplicate check
    if (existingNumbers.has(invoiceNumber)) {
      errors.push(`Row ${rowNum}: ${invoiceNumber} already exists — skipped`);
      continue;
    }

    // Client match (case-insensitive)
    const clientId = clientMap.get(clientRaw.toLowerCase());
    if (!clientId) {
      errors.push(`Row ${rowNum}: client "${clientRaw}" not found — skipped`);
      continue;
    }

    const amount = parseFloat(amountRaw || "0");
    if (isNaN(amount) || amount < 0) {
      errors.push(`Row ${rowNum}: invalid amount "${amountRaw}" — skipped`);
      continue;
    }

    const issueDate   = (idxDate    >= 0 ? parseDate(row[idxDate])    : null)    ?? today;
    const dueDate     = (idxDueDate >= 0 ? parseDate(row[idxDueDate]) : null)    ?? today;
    const status      = (idxStatus  >= 0 ? mapStatus(row[idxStatus])  : "sent")  as "draft" | "sent" | "viewed" | "paid";
    const netsuiteId  = idxInternalId >= 0 ? (row[idxInternalId]?.trim() || null) : null;
    const notes       = idxMemo       >= 0 ? (row[idxMemo]?.trim()      || null) : null;

    // Insert invoice
    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        invoice_seq:    0, // CSV imports don't use the auto-sequence
        client_id:      clientId,
        status,
        issue_date:     issueDate,
        due_date:       dueDate,
        subtotal:       amount,
        tax_amount:     0,
        total:          amount,
        notes,
        netsuite_id:    netsuiteId,
        source:         "csv_import",
        created_by:     user.id,
        sent_at:        ["sent", "viewed", "paid"].includes(status) ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (invErr || !inv) {
      errors.push(`Row ${rowNum}: ${invoiceNumber} — ${invErr?.message ?? "insert failed"}`);
      continue;
    }

    // Insert single line item
    await supabase.from("invoice_line_items").insert({
      invoice_id:  inv.id,
      description: `NetSuite Invoice ${invoiceNumber}`,
      quantity:    1,
      unit_price:  amount,
      tax_rate:    0,
      sort_order:  0,
    });

    existingNumbers.add(invoiceNumber); // prevent double-import within same file
    imported.push(invoiceNumber);
  }

  return NextResponse.json({
    imported: imported.length,
    skipped:  dataRows.length - imported.length,
    errors,
  });
}

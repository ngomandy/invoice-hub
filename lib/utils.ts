export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatMonth(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatMonthShort(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function formatMonthAbbr(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short" });
}

export function toFirstOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function getCurrentMonthStr(): string {
  const now = new Date();
  return toFirstOfMonth(now.getFullYear(), now.getMonth() + 1);
}

export function getMonthsForYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => toFirstOfMonth(year, i + 1));
}

export function calcVariance(billed: number, close: number): number {
  return billed - close;
}

export function formatVariance(variance: number): string {
  const abs = Math.abs(variance);
  const formatted = formatCurrency(abs);
  if (variance > 0) return `+${formatted}`;
  if (variance < 0) return `-${formatted}`;
  return "On target";
}

export function getYearsFromData(items: { close_month: string }[]): number[] {
  const years = new Set(
    items.map((c) => parseInt(c.close_month.substring(0, 4)))
  );
  const currentYear = new Date().getFullYear();
  years.add(currentYear);
  return Array.from(years).sort((a, b) => b - a);
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

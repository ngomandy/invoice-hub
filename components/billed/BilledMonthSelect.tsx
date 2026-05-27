"use client";

import { useRouter } from "next/navigation";
import { formatMonth } from "@/lib/utils";

type Props = {
  options:       string[];
  selectedMonth: string;
};

export default function BilledMonthSelect({ options, selectedMonth }: Props) {
  const router = useRouter();

  return (
    <select
      value={selectedMonth}
      onChange={(e) => router.push(`/billed?month=${e.target.value}`)}
      className="text-sm border border-surface-border rounded-md px-3 py-2 bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
    >
      {options.map((m) => (
        <option key={m} value={m}>{formatMonth(m)}</option>
      ))}
    </select>
  );
}

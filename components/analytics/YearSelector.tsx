"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Props = {
  years: number[];
  selectedYear: number;
};

export default function YearSelector({ years, selectedYear }: Props) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  function navigate(year: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", year);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      {years.map((y) => (
        <button
          key={y}
          onClick={() => navigate(String(y))}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            y === selectedYear
              ? "bg-brand text-white"
              : "bg-white border border-surface-border text-text-secondary hover:bg-surface-muted"
          }`}
        >
          {y}
        </button>
      ))}
    </div>
  );
}

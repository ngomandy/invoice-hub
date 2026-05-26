"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatMonth } from "@/lib/utils";

type Props = {
  months: string[];
  clients: { id: string; name: string }[];
  selectedMonth: string;
  excludedIds: string[];
};

export default function DashboardFilters({
  months,
  clients,
  selectedMonth,
  excludedIds,
}: Props) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the checkbox dropdown when clicking outside
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function navigate(month: string, excluded: string[]) {
    const params = new URLSearchParams();
    params.set("month", month);
    if (excluded.length > 0) params.set("exclude", excluded.join(","));
    router.push(`/dashboard?${params.toString()}`);
  }

  function onMonthChange(e: React.ChangeEvent<HTMLSelectElement>) {
    navigate(e.target.value, excludedIds);
  }

  function toggleClient(id: string) {
    const next = excludedIds.includes(id)
      ? excludedIds.filter((x) => x !== id)
      : [...excludedIds, id];
    navigate(selectedMonth, next);
  }

  function clearExclusions() {
    navigate(selectedMonth, []);
    setDropdownOpen(false);
  }

  const excludedCount = excludedIds.length;
  const buttonLabel =
    excludedCount === 0
      ? "All clients"
      : `${excludedCount} client${excludedCount > 1 ? "s" : ""} excluded`;

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-white border border-surface-border rounded-lg">
      {/* ── Month selector ── */}
      <div className="flex items-center gap-2.5">
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
          Month
        </label>
        <select
          value={selectedMonth}
          onChange={onMonthChange}
          className="border border-surface-border rounded-md px-3 py-2 text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {formatMonth(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="w-px h-5 bg-surface-border" />

      {/* ── Client exclusion dropdown ── */}
      <div className="flex items-center gap-2.5" ref={dropdownRef}>
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
          Show
        </label>
        <div className="relative">
          {/* Trigger button */}
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className={`flex items-center gap-2 border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand transition-colors ${
              excludedCount > 0
                ? "border-brand text-brand font-medium"
                : "border-surface-border text-text-primary hover:border-brand/40"
            }`}
          >
            {excludedCount > 0 && (
              <span className="w-4 h-4 bg-brand text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                {excludedCount}
              </span>
            )}
            <span>{buttonLabel}</span>
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown panel */}
          {dropdownOpen && (
            <div className="absolute top-full mt-1.5 left-0 z-30 bg-white border border-surface-border rounded-lg shadow-lg min-w-[220px] py-1">
              <div className="px-3 py-2 border-b border-surface-border">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Tick to exclude a client
                </p>
              </div>

              <div className="max-h-56 overflow-y-auto">
                {clients.map((client) => {
                  const isExcluded = excludedIds.includes(client.id);
                  return (
                    <label
                      key={client.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-muted cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isExcluded}
                        onChange={() => toggleClient(client.id)}
                        className="w-4 h-4 rounded border-surface-border accent-brand cursor-pointer"
                      />
                      <span
                        className={`text-sm ${
                          isExcluded
                            ? "text-text-muted line-through"
                            : "text-text-primary"
                        }`}
                      >
                        {client.name}
                      </span>
                    </label>
                  );
                })}
              </div>

              {excludedCount > 0 && (
                <div className="border-t border-surface-border px-3 py-2">
                  <button
                    onClick={clearExclusions}
                    className="text-xs text-brand hover:text-brand-dark font-medium transition-colors"
                  >
                    ✕ Clear exclusions
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active filter summary */}
      {excludedCount > 0 && (
        <p className="text-xs text-text-muted ml-auto">
          Showing {clients.length - excludedCount} of {clients.length} clients
        </p>
      )}
    </div>
  );
}

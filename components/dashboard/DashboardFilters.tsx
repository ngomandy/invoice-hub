"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatMonth } from "@/lib/utils";

export type FilterState = {
  month: string;
  excludedIds: string[];
  status: string;
  variance: string;
  billed: string;
};

type Props = {
  months: string[];
  clients: { id: string; name: string }[];
  filters: FilterState;
};

const STATUS_OPTIONS = [
  { value: "all",       label: "All statuses" },
  { value: "submitted", label: "Close submitted" },
  { value: "awaiting",  label: "Awaiting close" },
];

const VARIANCE_OPTIONS = [
  { value: "all",          label: "Any variance" },
  { value: "has-variance", label: "Has variance" },
  { value: "overbilled",   label: "Overbilled only" },
  { value: "underbilled",  label: "Underbilled only" },
  { value: "on-target",    label: "On target only" },
];

const BILLED_OPTIONS = [
  { value: "all",     label: "All billed states" },
  { value: "entered", label: "Billed entered" },
  { value: "missing", label: "Missing billed" },
];

export default function DashboardFilters({ months, clients, filters }: Props) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the client-exclusion dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function navigate(next: Partial<FilterState>) {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    params.set("month", merged.month);
    if (merged.excludedIds.length > 0)   params.set("exclude",  merged.excludedIds.join(","));
    if (merged.status   !== "all")       params.set("status",   merged.status);
    if (merged.variance !== "all")       params.set("variance", merged.variance);
    if (merged.billed   !== "all")       params.set("billed",   merged.billed);
    router.push(`/dashboard?${params.toString()}`);
  }

  function resetAll() {
    router.push("/dashboard");
    setDropdownOpen(false);
  }

  // Count active non-month filters
  const { excludedIds, status, variance, billed } = filters;
  const activeCount =
    (excludedIds.length > 0 ? 1 : 0) +
    (status   !== "all" ? 1 : 0) +
    (variance !== "all" ? 1 : 0) +
    (billed   !== "all" ? 1 : 0);

  const clientButtonLabel =
    excludedIds.length === 0
      ? "All clients"
      : `${excludedIds.length} excluded`;

  return (
    <div className="mb-6 bg-white border border-surface-border rounded-lg overflow-hidden">
      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">

        {/* ── Month ── */}
        <FilterGroup label="Month">
          <select
            value={filters.month}
            onChange={(e) => navigate({ month: e.target.value })}
            className={selectCls}
          >
            {months.map((m) => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>
        </FilterGroup>

        <Divider />

        {/* ── Close status ── */}
        <FilterGroup label="Close">
          <select
            value={filters.status}
            onChange={(e) => navigate({ status: e.target.value })}
            className={selectCls + (status !== "all" ? " border-brand text-brand font-medium" : "")}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FilterGroup>

        <Divider />

        {/* ── Variance ── */}
        <FilterGroup label="Variance">
          <select
            value={filters.variance}
            onChange={(e) => navigate({ variance: e.target.value })}
            className={selectCls + (variance !== "all" ? " border-brand text-brand font-medium" : "")}
          >
            {VARIANCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FilterGroup>

        <Divider />

        {/* ── Billed entry ── */}
        <FilterGroup label="Billed">
          <select
            value={filters.billed}
            onChange={(e) => navigate({ billed: e.target.value })}
            className={selectCls + (billed !== "all" ? " border-brand text-brand font-medium" : "")}
          >
            {BILLED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FilterGroup>

        <Divider />

        {/* ── Client exclusion checkbox dropdown ── */}
        <FilterGroup label="Clients" ref={dropdownRef}>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className={`flex items-center gap-2 border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand transition-colors ${
                excludedIds.length > 0
                  ? "border-brand text-brand font-medium"
                  : "border-surface-border text-text-primary hover:border-brand/40"
              }`}
            >
              {excludedIds.length > 0 && (
                <span className="w-4 h-4 bg-brand text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                  {excludedIds.length}
                </span>
              )}
              <span>{clientButtonLabel}</span>
              <svg
                width="13" height="13" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth="2"
                className={`transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute top-full mt-1.5 left-0 z-30 bg-white border border-surface-border rounded-lg shadow-lg min-w-[220px] py-1">
                <div className="px-3 py-2 border-b border-surface-border">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Tick to exclude
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
                          onChange={() =>
                            navigate({
                              excludedIds: isExcluded
                                ? excludedIds.filter((x) => x !== client.id)
                                : [...excludedIds, client.id],
                            })
                          }
                          className="w-4 h-4 rounded border-surface-border accent-brand cursor-pointer"
                        />
                        <span className={`text-sm ${isExcluded ? "text-text-muted line-through" : "text-text-primary"}`}>
                          {client.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {excludedIds.length > 0 && (
                  <div className="border-t border-surface-border px-3 py-2">
                    <button
                      onClick={() => { navigate({ excludedIds: [] }); setDropdownOpen(false); }}
                      className="text-xs text-brand hover:text-brand-dark font-medium transition-colors"
                    >
                      ✕ Clear exclusions
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </FilterGroup>

        {/* ── Reset all ── */}
        {activeCount > 0 && (
          <>
            <Divider />
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-xs font-medium text-negative hover:text-negative/80 transition-colors ml-auto"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reset all filters
            </button>
          </>
        )}
      </div>

      {/* Active filter summary bar */}
      {activeCount > 0 && (
        <div className="px-4 py-2 border-t border-surface-border bg-brand/5 flex flex-wrap gap-2">
          {status !== "all" && (
            <ActiveChip label={STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status} onRemove={() => navigate({ status: "all" })} />
          )}
          {variance !== "all" && (
            <ActiveChip label={VARIANCE_OPTIONS.find((o) => o.value === variance)?.label ?? variance} onRemove={() => navigate({ variance: "all" })} />
          )}
          {billed !== "all" && (
            <ActiveChip label={BILLED_OPTIONS.find((o) => o.value === billed)?.label ?? billed} onRemove={() => navigate({ billed: "all" })} />
          )}
          {excludedIds.length > 0 && (
            <ActiveChip
              label={`${excludedIds.length} client${excludedIds.length > 1 ? "s" : ""} excluded`}
              onRemove={() => navigate({ excludedIds: [] })}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Small shared sub-components ───────────────────────────────────────────────

const selectCls =
  "border border-surface-border rounded-md px-3 py-2 text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer transition-colors";

function Divider() {
  return <div className="w-px h-5 bg-surface-border flex-shrink-0" />;
}

const FilterGroup = ({ label, children, ref }: {
  label: string;
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}) => (
  <div className="flex items-center gap-2" ref={ref}>
    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
      {label}
    </span>
    {children}
  </div>
);

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-brand/10 text-brand text-xs font-medium px-2.5 py-1 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-brand-dark transition-colors leading-none">
        ✕
      </button>
    </span>
  );
}

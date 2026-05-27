"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SidebarProps = {
  clients:          { id: string; name: string }[];
  pendingApprovals: number;
};

export default function Sidebar({ clients, pendingApprovals }: SidebarProps) {
  const pathname    = usePathname();
  const router      = useRouter();
  const [search, setSearch] = useState("");

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function NavLink({
    href,
    icon,
    label,
    badge,
    exact = false,
  }: {
    href:    string;
    icon:    React.ReactNode;
    label:   string;
    badge?:  number;
    exact?:  boolean;
  }) {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        href={href}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium mb-1 transition-colors ${
          active
            ? "bg-brand/10 text-brand"
            : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"
        }`}
      >
        {icon}
        <span className="flex-1">{label}</span>
        {badge != null && badge > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-warning text-white text-[10px] font-bold leading-none">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-white border-r border-surface-border flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand rounded flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-text-primary">Invoice Hub</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <NavLink
          href="/dashboard"
          exact
          label="Dashboard"
          icon={
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />

        <NavLink
          href="/analytics"
          exact
          label="Analytics"
          icon={
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />

        <NavLink
          href="/approvals"
          exact
          label="Approvals"
          badge={pendingApprovals}
          icon={
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <NavLink
          href="/billed"
          exact
          label="Bulk Billed"
          icon={
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />

        <NavLink
          href="/architecture"
          exact
          label="Architecture"
          icon={
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          }
        />

        <NavLink
          href="/import"
          exact
          label="Import CSV"
          icon={
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          }
        />

        {clients.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider px-3 mb-2">
              Clients
            </p>
            {/* Search input — visible when there are 5+ clients */}
            {clients.length >= 5 && (
              <div className="px-3 mb-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search clients…"
                  className="w-full text-xs border border-surface-border rounded px-2 py-1.5 bg-surface-muted placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            )}
            {clients
              .filter((c) =>
                search.trim() === "" ||
                c.name.toLowerCase().includes(search.toLowerCase())
              )
              .map((client) => {
              const isActive = pathname.startsWith(`/clients/${client.id}`);
              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className={`flex items-center px-3 py-2 rounded-md text-sm mb-0.5 transition-colors truncate ${
                    isActive
                      ? "bg-brand/10 text-brand font-medium"
                      : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"
                  }`}
                >
                  {client.name}
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-4">
          <Link
            href="/clients/new"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-text-muted hover:bg-surface-muted hover:text-text-primary transition-colors"
          >
            + Add Client
          </Link>
        </div>
      </nav>

      {/* Footer — profile + sign out */}
      <div className="p-3 border-t border-surface-border space-y-1">
        <NavLink
          href="/profile"
          exact
          label="Profile"
          icon={
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <button
          onClick={handleSignOut}
          className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-negative hover:bg-negative-bg rounded-md transition-colors"
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

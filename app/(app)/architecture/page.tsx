import ArchitectureNav from "@/components/architecture/ArchitectureNav";

// ─── Reusable layout helpers ──────────────────────────────────────────────────

function Section({ id, title, subtitle, children }: {
  id: string; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-14 mb-16">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-text-primary">{title}</h2>
        {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-surface-border rounded-lg ${className}`}>
      {children}
    </div>
  );
}

function Badge({ label, color = "brand" }: { label: string; color?: "brand" | "positive" | "warning" | "neutral" | "purple" | "teal" }) {
  const cls = {
    brand:    "bg-brand/10 text-brand border-brand/20",
    positive: "bg-positive-bg text-positive border-positive-border",
    warning:  "bg-warning-bg text-warning border-warning-border",
    neutral:  "bg-surface-muted text-text-secondary border-surface-border",
    purple:   "bg-purple-50 text-purple-700 border-purple-200",
    teal:     "bg-teal-50 text-teal-700 border-teal-200",
  }[color];
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, mono = false, muted = false }: { children: React.ReactNode; mono?: boolean; muted?: boolean }) {
  return (
    <td className={`px-4 py-2.5 text-sm border-t border-surface-border align-top ${mono ? "font-mono text-xs" : ""} ${muted ? "text-text-muted" : "text-text-primary"}`}>
      {children}
    </td>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const TECH_STACK = [
  { category: "Framework",    items: [{ name: "Next.js 14.2", note: "App Router, RSC, SSR" }, { name: "React 18", note: "Server & Client Components" }, { name: "TypeScript", note: "Strict mode" }] },
  { category: "Styling",      items: [{ name: "Tailwind CSS", note: "Custom design tokens" }] },
  { category: "Database",     items: [{ name: "Supabase", note: "PostgreSQL + PostgREST" }, { name: "Row-Level Security", note: "Per-table auth policies" }] },
  { category: "Auth",         items: [{ name: "Supabase Auth", note: "Email / password" }, { name: "@supabase/ssr", note: "Cookie-based SSR sessions" }] },
  { category: "Email",        items: [{ name: "Resend", note: "Transactional email" }, { name: "React Email", note: "JSX email templates" }] },
  { category: "AI",           items: [{ name: "Anthropic Claude", note: "claude-sonnet-4-6, streaming" }] },
  { category: "Deployment",   items: [{ name: "Vercel", note: "Serverless + Edge functions" }, { name: "GitHub", note: "Version control" }] },
];

const DB_TABLES = [
  {
    name: "profiles",
    desc: "One row per authenticated user, synced from auth.users",
    columns: [
      { name: "id",         type: "uuid",        pk: true,  notes: "References auth.users(id)" },
      { name: "email",      type: "text",        pk: false, notes: "NOT NULL" },
      { name: "full_name",  type: "text",        pk: false, notes: "Nullable" },
      { name: "created_at", type: "timestamptz", pk: false, notes: "DEFAULT now()" },
    ],
  },
  {
    name: "clients",
    desc: "Billing clients tracked in the system",
    columns: [
      { name: "id",         type: "uuid",        pk: true,  notes: "gen_random_uuid()" },
      { name: "name",       type: "text",        pk: false, notes: "NOT NULL" },
      { name: "is_active",  type: "boolean",     pk: false, notes: "DEFAULT true — soft archive" },
      { name: "created_by", type: "uuid",        pk: false, notes: "References auth.users(id)" },
      { name: "created_at", type: "timestamptz", pk: false, notes: "DEFAULT now()" },
    ],
  },
  {
    name: "revenue_closes",
    desc: "Monthly revenue close submissions per client. Versioned — only is_current=true is shown",
    columns: [
      { name: "id",                    type: "uuid",        pk: true,  notes: "gen_random_uuid()" },
      { name: "client_id",             type: "uuid",        pk: false, notes: "FK → clients" },
      { name: "close_month",           type: "date",        pk: false, notes: "Always 1st of month (YYYY-MM-01)" },
      { name: "version",               type: "integer",     pk: false, notes: "Increments on each edit" },
      { name: "is_current",            type: "boolean",     pk: false, notes: "true = latest version" },
      { name: "net_usage",             type: "numeric",     pk: false, notes: "" },
      { name: "rollover_from_previous",type: "numeric",     pk: false, notes: "" },
      { name: "rollover_to_next",      type: "numeric",     pk: false, notes: "" },
      { name: "discounts",             type: "numeric",     pk: false, notes: "" },
      { name: "expected_total",        type: "numeric",     pk: false, notes: "GENERATED: net_usage + rollover_from – rollover_to – discounts" },
      { name: "approval_status",       type: "text",        pk: false, notes: "submitted | under_review | approved | rejected" },
      { name: "reviewed_by",           type: "uuid",        pk: false, notes: "FK → auth.users" },
      { name: "reviewed_at",           type: "timestamptz", pk: false, notes: "" },
      { name: "rejection_reason",      type: "text",        pk: false, notes: "" },
      { name: "submitted_by",          type: "uuid",        pk: false, notes: "FK → auth.users" },
      { name: "submitted_at",          type: "timestamptz", pk: false, notes: "" },
      { name: "notes",                 type: "text",        pk: false, notes: "" },
    ],
  },
  {
    name: "close_changes",
    desc: "Immutable audit log of every edit made to a revenue close",
    columns: [
      { name: "id",           type: "uuid",        pk: true,  notes: "" },
      { name: "client_id",    type: "uuid",        pk: false, notes: "FK → clients" },
      { name: "close_month",  type: "date",        pk: false, notes: "" },
      { name: "changed_by",   type: "uuid",        pk: false, notes: "FK → auth.users" },
      { name: "changed_at",   type: "timestamptz", pk: false, notes: "" },
      { name: "reason",       type: "text",        pk: false, notes: "" },
      { name: "before_*",     type: "numeric",     pk: false, notes: "Snapshot of all numeric fields before the change" },
      { name: "after_*",      type: "numeric",     pk: false, notes: "Snapshot of all numeric fields after the change" },
    ],
  },
  {
    name: "billed_amounts",
    desc: "Actual billed amounts entered after invoices are sent. One row per client per month.",
    columns: [
      { name: "id",              type: "uuid",        pk: true,  notes: "UNIQUE(client_id, close_month)" },
      { name: "client_id",       type: "uuid",        pk: false, notes: "FK → clients" },
      { name: "close_month",     type: "date",        pk: false, notes: "" },
      { name: "billed_total",    type: "numeric",     pk: false, notes: "NOT NULL" },
      { name: "variance_reason", type: "text",        pk: false, notes: "Required when |variance| > $500" },
      { name: "entered_by",      type: "uuid",        pk: false, notes: "FK → auth.users" },
      { name: "entered_at",      type: "timestamptz", pk: false, notes: "" },
      { name: "updated_at",      type: "timestamptz", pk: false, notes: "" },
    ],
  },
  {
    name: "client_notes",
    desc: "Internal team notes attached to a client. Deletable by author only.",
    columns: [
      { name: "id",         type: "uuid",        pk: true,  notes: "" },
      { name: "client_id",  type: "uuid",        pk: false, notes: "FK → clients ON DELETE CASCADE" },
      { name: "content",    type: "text",        pk: false, notes: "NOT NULL" },
      { name: "created_by", type: "uuid",        pk: false, notes: "FK → auth.users" },
      { name: "created_at", type: "timestamptz", pk: false, notes: "DEFAULT now()" },
    ],
  },
];

const API_ROUTES = [
  { method: "GET",   path: "/api/clients",              auth: true,  desc: "List all active clients" },
  { method: "POST",  path: "/api/clients",              auth: true,  desc: "Create a new client" },
  { method: "GET",   path: "/api/clients/[clientId]",   auth: true,  desc: "Get a single client" },
  { method: "PATCH", path: "/api/clients/[clientId]",   auth: true,  desc: "Update client name or is_active" },
  { method: "GET",   path: "/api/closes",               auth: true,  desc: "Get closes for a client (query: clientId, year?)" },
  { method: "POST",  path: "/api/closes",               auth: true,  desc: "Create or update a revenue close (versioned)" },
  { method: "POST",  path: "/api/closes/approve",       auth: true,  desc: "Approval action: review | approve | reject" },
  { method: "GET",   path: "/api/billed",               auth: true,  desc: "Get billed amounts for a client" },
  { method: "POST",  path: "/api/billed",               auth: true,  desc: "Upsert billed amount; returns 422 if variance > $500 without reason" },
  { method: "GET",   path: "/api/notes",                auth: true,  desc: "Get all notes for a client" },
  { method: "POST",  path: "/api/notes",                auth: true,  desc: "Create a client note" },
  { method: "DELETE",path: "/api/notes",                auth: true,  desc: "Delete own note (created_by = user.id enforced)" },
  { method: "GET",   path: "/api/profile",              auth: true,  desc: "Get current user's profile" },
  { method: "PATCH", path: "/api/profile",              auth: true,  desc: "Update full_name" },
  { method: "POST",  path: "/api/notify",               auth: true,  desc: "Send change-alert email to team" },
  { method: "POST",  path: "/api/notify/summary",       auth: true,  desc: "Send monthly reconciliation summary email" },
  { method: "POST",  path: "/api/notify/reminder",      auth: true,  desc: "Send missing close or billed reminder to team" },
  { method: "POST",  path: "/api/import",               auth: true,  desc: "Bulk import CSV rows (clients + closes + billed)" },
  { method: "POST",  path: "/api/assistant",            auth: true,  desc: "Streaming Claude AI assistant with live billing context" },
];

const APP_PAGES = [
  { path: "/dashboard",                     type: "Server",  desc: "Main view: all clients, filters, KPI cards, health badges, sparklines, alerts" },
  { path: "/analytics",                     type: "Server",  desc: "Year selector, variance charts (SVG), revenue forecast table, client YTD chart" },
  { path: "/approvals",                     type: "Server",  desc: "Pending closes awaiting review — Start Review / Approve / Reject workflow" },
  { path: "/billed",                        type: "Server",  desc: "Bulk billed entry for all clients in a month with inline variance reason flow" },
  { path: "/import",                        type: "Server",  desc: "CSV drag-drop bulk importer for closes and billed amounts" },
  { path: "/clients/new",                   type: "Server",  desc: "Create a new client" },
  { path: "/clients/[clientId]",            type: "Server",  desc: "Client detail: year table, month rows, prior-year comparison, notes, summary stats" },
  { path: "/clients/[clientId]/close",      type: "Server",  desc: "Revenue close form with live expected-total preview" },
  { path: "/clients/[clientId]/edit",       type: "Server",  desc: "Edit client name and active status" },
  { path: "/clients/[clientId]/history",    type: "Server",  desc: "Audit log of all close changes with diff view" },
  { path: "/profile",                       type: "Server",  desc: "Edit display name; view account email" },
  { path: "/architecture",                  type: "Server",  desc: "This page — living documentation of the full system" },
  { path: "/login",                         type: "Server",  desc: "Supabase email/password sign-in" },
];

const COMPONENTS = [
  {
    dir: "dashboard/",
    items: [
      { name: "DashboardTable",    client: false, desc: "Client rows with variance, status, health badge, sparkline" },
      { name: "DashboardFilters",  client: true,  desc: "Month selector + client exclusion + status/variance/billed filters" },
      { name: "DashboardAlerts",   client: false, desc: "Smart banners for missing closes/billed with Remind-team button" },
      { name: "StatCards",         client: false, desc: "4 KPI cards: Expected, Billed, Net Variance, Completion %" },
      { name: "HealthBadge",       client: false, desc: "Colored badge: healthy / fair / at-risk / new" },
      { name: "Sparkline",         client: false, desc: "Pure SVG 6-month variance mini bar chart" },
      { name: "SendSummaryButton", client: true,  desc: "One-click monthly summary email to whole team" },
      { name: "SendReminderButton",client: true,  desc: "Fires missing-close or missing-billed reminder email" },
    ],
  },
  {
    dir: "client-detail/",
    items: [
      { name: "YearTable",          client: false, desc: "Month grid for a year; optional prior-year comparison column" },
      { name: "MonthRow",           client: true,  desc: "Inline close editing, variance 422 flow, full approval workflow" },
      { name: "ClientSummaryStats", client: false, desc: "Year stats: Expected, Billed, Net Variance, Completion %" },
      { name: "ClientNotes",        client: true,  desc: "Self-loading notes with add/delete; ⌘↵ to submit" },
      { name: "ClientEditForm",     client: true,  desc: "Edit client name + active toggle with confirmation" },
    ],
  },
  {
    dir: "analytics/",
    items: [
      { name: "MonthlyVarianceChart", client: false, desc: "SVG bar chart of variance by month (red = over, green = under)" },
      { name: "ClientVarianceChart",  client: false, desc: "SVG horizontal diverging bar chart of per-client YTD variance" },
      { name: "ForecastTable",        client: false, desc: "3-month trailing avg forecast with ↑ Growing / → Stable / ↓ Declining" },
      { name: "YearSelector",         client: true,  desc: "Pill-button year picker that pushes ?year=YYYY" },
    ],
  },
  {
    dir: "approvals/",
    items: [
      { name: "ApprovalRow", client: true, desc: "Start Review / Approve / Reject with rejection textarea; router.refresh() on action" },
    ],
  },
  {
    dir: "billed/",
    items: [
      { name: "BulkBilledTable",   client: true,  desc: "Per-row inline edit; 422 variance reason flow matching MonthRow" },
      { name: "BilledMonthSelect", client: true,  desc: "Month dropdown — extracted client component to avoid server-component onChange error" },
    ],
  },
  {
    dir: "layout/",
    items: [
      { name: "Sidebar", client: true, desc: "Fixed nav with client search, pending approvals badge, profile + sign-out footer" },
    ],
  },
  {
    dir: "assistant/",
    items: [
      { name: "AssistantPanel", client: true, desc: "Floating Claude AI chat with streaming, live billing context, markdown rendering" },
    ],
  },
  {
    dir: "profile/ & export/ & close-form/ & import/ & history/",
    items: [
      { name: "ProfileForm",   client: true,  desc: "Edit display name with optimistic PATCH and success feedback" },
      { name: "ExportMenu",    client: true,  desc: "CSV / Excel / PDF / JSON export with print-friendly PDF layout" },
      { name: "CloseForm",     client: true,  desc: "Revenue close submission with live expected-total preview" },
      { name: "CsvImporter",   client: true,  desc: "Drag-drop CSV upload with preview and bulk /api/import call" },
      { name: "ChangeList",    client: false, desc: "Timeline of close edits with DiffTable showing before/after values" },
    ],
  },
];

const FEATURES = [
  { n:  1, feature: "Revenue Close Submission",      area: "Core",       desc: "Versioned close form: net usage, rollovers, discounts → computed expected total. Full audit trail." },
  { n:  2, feature: "Dashboard with Filters",        area: "Core",       desc: "Month selector, client exclusion, status/variance/billed filters. Export to CSV/Excel/PDF/JSON." },
  { n:  3, feature: "Change History & Audit Log",    area: "Core",       desc: "Immutable close_changes table. DiffTable component with before/after field comparison." },
  { n:  4, feature: "CSV Bulk Import",               area: "Core",       desc: "Drag-drop CSV upload for closes and billed amounts. Creates missing clients automatically." },
  { n:  5, feature: "AI Assistant",                  area: "AI",         desc: "Floating Claude chat with streaming. System prompt injected with live DB context: closes, billed, variances, changes." },
  { n:  6, feature: "Variance Commentary",           area: "Workflow",   desc: "Inline 422 flow: if |billed − expected| > $500 the UI prompts for a variance reason before saving." },
  { n:  7, feature: "Approval Workflow",             area: "Workflow",   desc: "submitted → under_review → approved / rejected. Full reviewer audit (reviewed_by, reviewed_at, rejection_reason)." },
  { n:  8, feature: "Analytics Page",                area: "Insights",   desc: "Year-level SVG charts: monthly variance bars + per-client YTD diverging bars. Revenue forecast table." },
  { n:  9, feature: "Dashboard Alerts",              area: "Insights",   desc: "Smart banners: missing closes shown after 25th, missing billed shown after 5th of next month." },
  { n: 10, feature: "Revenue Forecast",              area: "Insights",   desc: "3-month trailing average per client. Trend: ↑ Growing (>5%) / → Stable / ↓ Declining (<−5%)." },
  { n: 11, feature: "Month-over-Month Comparison",   area: "Insights",   desc: "Optional prior-year column in client detail showing YoY % change per month." },
  { n: 12, feature: "Client Health Scores",          area: "Insights",   desc: "6-month health grade per client: healthy / fair / at-risk / new based on close completeness + avg variance ratio." },
  { n: 13, feature: "Dashboard Sparklines",          area: "Insights",   desc: "Pure SVG 6-month variance mini bar chart per client row. Red = overbilled, green = underbilled." },
  { n: 14, feature: "KPI Stat Cards",                area: "Insights",   desc: "4 summary cards at dashboard top: Expected Close, Billed Amount, Net Variance, Completion %." },
  { n: 15, feature: "Client Summary Stats",          area: "Insights",   desc: "Per-year stats strip on each client page: totals, net variance, avg variance %, completion." },
  { n: 16, feature: "Monthly Summary Email",         area: "Email",      desc: "React Email template with metrics, top variances, missing clients. Sent to whole team via Resend." },
  { n: 17, feature: "Reminder Emails",               area: "Email",      desc: "One-click reminders for missing closes or billed amounts. Targeted HTML email with client list." },
  { n: 18, feature: "Change Alert Emails",           area: "Email",      desc: "Automatic email when a close is edited. Diff of changed fields sent to team." },
  { n: 19, feature: "Bulk Billed Entry",             area: "Operations", desc: "Single page to enter all clients' billed amounts for a month. Progress bar. Inline variance flow." },
  { n: 20, feature: "Pending Approvals Page",        area: "Operations", desc: "Dedicated view of all closes in submitted/under_review state. Badge count in sidebar." },
  { n: 21, feature: "Client Notes",                  area: "Operations", desc: "Internal notes per client. Author-only delete. ⌘↵ shortcut. Relative timestamps." },
  { n: 22, feature: "Client Edit & Archive",         area: "Operations", desc: "Edit client name. Toggle is_active to archive (hidden from dashboard; data preserved)." },
  { n: 23, feature: "User Profile",                  area: "Account",    desc: "Edit display name. Email is read-only (managed by Supabase Auth)." },
  { n: 24, feature: "Sidebar Client Search",         area: "UX",         desc: "Appears when 5+ clients are present. Instant local filter of the sidebar list." },
  { n: 25, feature: "Architecture Page",             area: "Docs",       desc: "This page. Living documentation of the full stack, schema, API, and feature set." },
];

const AREA_COLORS: Record<string, "brand" | "positive" | "warning" | "neutral" | "purple" | "teal"> = {
  Core:       "brand",
  AI:         "purple",
  Workflow:   "warning",
  Insights:   "teal",
  Email:      "positive",
  Operations: "neutral",
  Account:    "neutral",
  UX:         "neutral",
  Docs:       "neutral",
};

const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-positive-bg text-positive border-positive-border",
  POST:   "bg-brand/10 text-brand border-brand/20",
  PATCH:  "bg-warning-bg text-warning border-warning-border",
  DELETE: "bg-negative-bg text-negative border-negative-border",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArchitecturePage() {
  return (
    <div>
      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-text-primary">Architecture</h1>
        <p className="text-sm text-text-muted mt-1">
          Full-stack reference — schema, API, components, features, and data flow
        </p>
      </div>

      {/* Sticky section tabs */}
      <ArchitectureNav />

      {/* ── Overview ─────────────────────────────────────────────────────────── */}
      <Section id="overview" title="Tech Stack" subtitle="Libraries, services, and infrastructure powering the app">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TECH_STACK.map((group) => (
            <Card key={group.category} className="p-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">{group.category}</p>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">{item.name}</span>
                    <span className="text-xs text-text-muted">{item.note}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Deployment topology */}
        <Card className="mt-4 p-5">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Deployment Topology</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <div className="bg-surface-muted rounded px-3 py-2 text-center">
              <p className="font-semibold text-text-primary">Browser</p>
              <p className="text-xs text-text-muted mt-0.5">React Client Components</p>
            </div>
            <span className="text-text-muted">⟷</span>
            <div className="bg-brand/10 rounded px-3 py-2 text-center">
              <p className="font-semibold text-brand">Vercel Edge</p>
              <p className="text-xs text-text-muted mt-0.5">Middleware · Auth redirect</p>
            </div>
            <span className="text-text-muted">⟷</span>
            <div className="bg-brand/10 rounded px-3 py-2 text-center">
              <p className="font-semibold text-brand">Vercel Serverless</p>
              <p className="text-xs text-text-muted mt-0.5">Server Components · API Routes</p>
            </div>
            <span className="text-text-muted">⟷</span>
            <div className="bg-surface-muted rounded px-3 py-2 text-center">
              <p className="font-semibold text-text-primary">Supabase</p>
              <p className="text-xs text-text-muted mt-0.5">PostgreSQL · PostgREST · Auth</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="bg-surface-muted rounded px-3 py-2 text-center">
              <p className="font-semibold text-text-primary">Resend</p>
              <p className="text-xs text-text-muted mt-0.5">Transactional email</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded px-3 py-2 text-center">
              <p className="font-semibold text-purple-700">Anthropic API</p>
              <p className="text-xs text-text-muted mt-0.5">Streaming AI assistant</p>
            </div>
            <div className="bg-surface-muted rounded px-3 py-2 text-center">
              <p className="font-semibold text-text-primary">GitHub</p>
              <p className="text-xs text-text-muted mt-0.5">Source + CI trigger</p>
            </div>
          </div>
        </Card>
      </Section>

      {/* ── Database ─────────────────────────────────────────────────────────── */}
      <Section id="database" title="Database Schema" subtitle="6 PostgreSQL tables — all with Row-Level Security">
        <div className="space-y-4">
          {DB_TABLES.map((table) => (
            <Card key={table.name}>
              <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm font-semibold text-text-primary">{table.name}</span>
                  <span className="ml-3 text-xs text-text-muted">{table.desc}</span>
                </div>
                <Badge label="RLS" color="positive" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-muted">
                    <tr>
                      <Th>Column</Th>
                      <Th>Type</Th>
                      <Th>Notes</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.columns.map((col) => (
                      <tr key={col.name}>
                        <Td mono>
                          <span className={col.pk ? "text-brand font-semibold" : ""}>{col.name}</span>
                          {col.pk && <span className="ml-1.5 text-[10px] bg-brand/10 text-brand px-1 rounded">PK</span>}
                        </Td>
                        <Td mono muted>{col.type}</Td>
                        <Td muted>{col.notes}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* ── API ──────────────────────────────────────────────────────────────── */}
      <Section id="api" title="API Routes" subtitle={`${API_ROUTES.length} endpoints — all require authentication`}>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-muted">
                <tr>
                  <Th>Method</Th>
                  <Th>Path</Th>
                  <Th>Description</Th>
                </tr>
              </thead>
              <tbody>
                {API_ROUTES.map((r, i) => (
                  <tr key={i}>
                    <Td>
                      <span className={`inline-flex text-[11px] font-bold px-1.5 py-0.5 rounded border ${METHOD_COLORS[r.method] ?? "bg-surface-muted text-text-muted border-surface-border"}`}>
                        {r.method}
                      </span>
                    </Td>
                    <Td mono>{r.path}</Td>
                    <Td muted>{r.desc}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      {/* ── Pages ────────────────────────────────────────────────────────────── */}
      <Section id="pages" title="Pages & Routes" subtitle={`${APP_PAGES.length} routes — all server-rendered, protected by middleware`}>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-muted">
                <tr>
                  <Th>Route</Th>
                  <Th>Type</Th>
                  <Th>Description</Th>
                </tr>
              </thead>
              <tbody>
                {APP_PAGES.map((p, i) => (
                  <tr key={i}>
                    <Td mono>{p.path}</Td>
                    <Td>
                      <Badge label={p.type} color="neutral" />
                    </Td>
                    <Td muted>{p.desc}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      {/* ── Components ───────────────────────────────────────────────────────── */}
      <Section id="components" title="Component Registry" subtitle="Server components render on Vercel. Client components hydrate in the browser.">
        <div className="space-y-4">
          {COMPONENTS.map((group) => (
            <Card key={group.dir}>
              <div className="px-4 py-2.5 border-b border-surface-border bg-surface-muted">
                <span className="font-mono text-xs font-semibold text-text-secondary">components/{group.dir}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <Th>Component</Th>
                      <Th>Render</Th>
                      <Th>Description</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((c) => (
                      <tr key={c.name}>
                        <Td mono>{c.name}</Td>
                        <Td>
                          <Badge
                            label={c.client ? "Client" : "Server"}
                            color={c.client ? "warning" : "positive"}
                          />
                        </Td>
                        <Td muted>{c.desc}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <Section id="features" title="Feature Log" subtitle={`${FEATURES.length} features shipped`}>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-muted">
                <tr>
                  <Th>#</Th>
                  <Th>Feature</Th>
                  <Th>Area</Th>
                  <Th>Description</Th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f) => (
                  <tr key={f.n}>
                    <Td muted>{f.n}</Td>
                    <Td><span className="font-medium">{f.feature}</span></Td>
                    <Td><Badge label={f.area} color={AREA_COLORS[f.area] ?? "neutral"} /></Td>
                    <Td muted>{f.desc}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      {/* ── Data Flow ────────────────────────────────────────────────────────── */}
      <Section id="dataflow" title="Key Data Flows" subtitle="How data moves through the system for the most important operations">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Card className="p-5">
            <p className="text-sm font-semibold text-text-primary mb-3">Revenue Close Submission</p>
            <ol className="space-y-2 text-xs text-text-secondary">
              {[
                "User fills CloseForm (net usage, rollovers, discounts)",
                "POST /api/closes → server validates, writes new version row",
                "Old row: is_current = false. New row: is_current = true",
                "close_changes row inserted (audit trail)",
                "POST /api/notify → Resend sends change-alert email to team",
                "approval_status resets to 'submitted'",
                "Dashboard refreshes via router.refresh()",
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand/10 text-brand text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-semibold text-text-primary mb-3">Billed Amount Entry (with Variance)</p>
            <ol className="space-y-2 text-xs text-text-secondary">
              {[
                "User clicks 'Enter' on MonthRow or BulkBilledTable",
                "Enters billed total → clicks Save",
                "POST /api/billed → server computes variance = billed − expected",
                "If |variance| > $500 and no reason → returns 422 requiresReason",
                "UI shows inline textarea for variance reason",
                "User submits reason → POST /api/billed again with variance_reason",
                "Row upserted in billed_amounts table",
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand/10 text-brand text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-semibold text-text-primary mb-3">AI Assistant Query</p>
            <ol className="space-y-2 text-xs text-text-secondary">
              {[
                "User types message in AssistantPanel floating chat",
                "POST /api/assistant with { message, history (last 10 turns) }",
                "Server fetches live context: all clients, closes, billed, changes",
                "System prompt built with real data: totals, variances, changes",
                "Request streamed to Anthropic claude-sonnet-4-6",
                "Response streamed back via ReadableStream",
                "AssistantPanel renders tokens as they arrive",
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-5">
            <p className="text-sm font-semibold text-text-primary mb-3">Authentication Flow</p>
            <ol className="space-y-2 text-xs text-text-secondary">
              {[
                "User submits email + password on /login",
                "Supabase Auth validates credentials, returns session JWT",
                "@supabase/ssr stores session in HTTP-only cookie",
                "Next.js middleware (middleware.ts) runs on every request",
                "Middleware calls supabase.auth.getUser() — refreshes token if needed",
                "No valid session → 307 redirect to /login",
                "Valid session → request continues to page/API handler",
              ].map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-positive-bg text-positive text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Card>

        </div>
      </Section>
    </div>
  );
}

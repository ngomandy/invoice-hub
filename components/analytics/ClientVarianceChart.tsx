/**
 * ClientVarianceChart — Horizontal SVG bar chart showing net variance per client (YTD).
 * Red = overbilled (positive variance), Green = underbilled (negative).
 * Server component — no "use client" needed.
 */

type ClientBar = {
  id: string;
  name: string;
  netVariance: number;
  billedMonths: number;
};

type Props = {
  data: ClientBar[];
  maxRows?: number;
};

const W = 640;
const ROW_H = 32;
const LABEL_W = 140;
const BAR_AREA_W = W - LABEL_W - 80; // right 80px for value labels
const PADDING_TOP = 8;
const PADDING_BOTTOM = 8;

function formatShortAmount(n: number): string {
  const abs = Math.abs(n);
  const prefix = n >= 0 ? "+" : "-";
  if (abs >= 1_000_000) return `${prefix}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${prefix}$${(abs / 1_000).toFixed(1)}k`;
  return `${prefix}$${abs.toFixed(0)}`;
}

export default function ClientVarianceChart({ data, maxRows = 10 }: Props) {
  const rows = data
    .filter((d) => d.billedMonths > 0 && d.netVariance !== 0)
    .sort((a, b) => Math.abs(b.netVariance) - Math.abs(a.netVariance))
    .slice(0, maxRows);

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-text-muted">
        No variance data to display yet.
      </div>
    );
  }

  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.netVariance)), 1);
  const svgH = PADDING_TOP + rows.length * ROW_H + PADDING_BOTTOM;

  function barW(v: number): number {
    return (Math.abs(v) / maxAbs) * (BAR_AREA_W / 2);
  }

  const centerX = LABEL_W + BAR_AREA_W / 2;

  return (
    <svg
      viewBox={`0 0 ${W} ${svgH}`}
      width="100%"
      className="overflow-visible"
      aria-label="Client variance chart"
    >
      {rows.map((r, i) => {
        const y = PADDING_TOP + i * ROW_H;
        const midY = y + ROW_H / 2;
        const bw = barW(r.netVariance);
        const color = r.netVariance > 0 ? "#ef4444" : "#22c55e";
        const barX = r.netVariance >= 0 ? centerX : centerX - bw;

        return (
          <g key={r.id}>
            {/* Subtle row stripe */}
            {i % 2 === 0 && (
              <rect x={0} y={y} width={W} height={ROW_H} fill="#f8fafc" />
            )}

            {/* Client name label */}
            <text
              x={LABEL_W - 8}
              y={midY}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              fill="#475569"
              fontWeight={500}
            >
              {r.name.length > 18 ? r.name.slice(0, 17) + "…" : r.name}
            </text>

            {/* Centre line */}
            <line
              x1={centerX}
              x2={centerX}
              y1={y + 4}
              y2={y + ROW_H - 4}
              stroke="#e2e8f0"
              strokeWidth={1}
            />

            {/* Bar */}
            <rect
              x={barX}
              y={midY - 9}
              width={Math.max(bw, 3)}
              height={18}
              fill={color}
              opacity={0.82}
              rx={2}
            />

            {/* Value label */}
            <text
              x={r.netVariance >= 0 ? centerX + bw + 6 : centerX - bw - 6}
              y={midY}
              textAnchor={r.netVariance >= 0 ? "start" : "end"}
              dominantBaseline="middle"
              fontSize={10}
              fill={color}
              fontWeight={600}
            >
              {formatShortAmount(r.netVariance)}
            </text>
          </g>
        );
      })}

      {/* Centre axis */}
      <line
        x1={centerX}
        x2={centerX}
        y1={PADDING_TOP}
        y2={svgH - PADDING_BOTTOM}
        stroke="#94a3b8"
        strokeWidth={1}
      />
    </svg>
  );
}

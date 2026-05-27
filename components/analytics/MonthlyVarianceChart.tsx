/**
 * MonthlyVarianceChart — SVG bar chart showing net variance per month.
 * Green bars = underbilled (negative variance), Red bars = overbilled (positive).
 * Server component — no "use client" needed.
 */

import { formatMonth } from "@/lib/utils";

type MonthPoint = {
  month: string;       // "YYYY-MM-DD"
  variance: number;    // billed - expected (positive = overbilled)
  hasBilled: boolean;
};

type Props = {
  data: MonthPoint[];
  height?: number;
};

const W = 640;
const PADDING = { top: 24, right: 16, bottom: 48, left: 64 };

function formatShortAmount(n: number): string {
  const abs = Math.abs(n);
  const prefix = n >= 0 ? "" : "-";
  if (abs >= 1_000_000) return `${prefix}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${prefix}$${(abs / 1_000).toFixed(1)}k`;
  return `${prefix}$${abs.toFixed(0)}`;
}

export default function MonthlyVarianceChart({ data, height = 220 }: Props) {
  const plotPoints = data.filter((d) => d.hasBilled);

  if (plotPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-text-muted">
        No billed data yet for this period.
      </div>
    );
  }

  const innerW = W - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;

  const maxAbs = Math.max(...plotPoints.map((d) => Math.abs(d.variance)), 1);
  const yMax = maxAbs * 1.2; // 20% headroom

  // Y scale: variance → pixel from top of inner area
  function yPx(v: number): number {
    // Centre line at innerH / 2; positive goes up, negative goes down
    return innerH / 2 - (v / yMax) * (innerH / 2);
  }

  const barWidth = Math.max(8, Math.min(40, (innerW / plotPoints.length) * 0.6));
  const barSpacing = innerW / plotPoints.length;

  const zeroY = yPx(0);

  // Y-axis ticks
  const tickValues = [-yMax, -yMax / 2, 0, yMax / 2, yMax];

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      className="overflow-visible"
      aria-label="Monthly variance chart"
    >
      {/* Y-axis gridlines + labels */}
      {tickValues.map((v) => {
        const y = PADDING.top + yPx(v);
        return (
          <g key={v}>
            <line
              x1={PADDING.left}
              x2={W - PADDING.right}
              y1={y}
              y2={y}
              stroke={v === 0 ? "#94a3b8" : "#e2e8f0"}
              strokeWidth={v === 0 ? 1.5 : 1}
              strokeDasharray={v === 0 ? undefined : "4 3"}
            />
            <text
              x={PADDING.left - 6}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill="#94a3b8"
            >
              {formatShortAmount(v)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {plotPoints.map((d, i) => {
        const cx = PADDING.left + i * barSpacing + barSpacing / 2;
        const y0 = PADDING.top + zeroY;
        const y1 = PADDING.top + yPx(d.variance);
        const barY = Math.min(y0, y1);
        const barH = Math.max(Math.abs(y0 - y1), 2);
        const color = d.variance > 0 ? "#ef4444" : d.variance < 0 ? "#22c55e" : "#94a3b8";

        return (
          <g key={d.month}>
            <rect
              x={cx - barWidth / 2}
              y={barY}
              width={barWidth}
              height={barH}
              fill={color}
              opacity={0.85}
              rx={2}
            />
            {/* Value label on larger bars */}
            {Math.abs(d.variance) / yMax > 0.12 && (
              <text
                x={cx}
                y={d.variance >= 0 ? barY - 4 : barY + barH + 11}
                textAnchor="middle"
                fontSize={9}
                fill={color}
                fontWeight={500}
              >
                {formatShortAmount(d.variance)}
              </text>
            )}
            {/* X-axis label */}
            <text
              x={cx}
              y={height - PADDING.bottom + 14}
              textAnchor="middle"
              fontSize={10}
              fill="#94a3b8"
              transform={`rotate(-30, ${cx}, ${height - PADDING.bottom + 14})`}
            >
              {formatMonth(d.month).slice(0, 3)}
            </text>
          </g>
        );
      })}

      {/* Zero baseline (drawn on top) */}
      <line
        x1={PADDING.left}
        x2={W - PADDING.right}
        y1={PADDING.top + zeroY}
        y2={PADDING.top + zeroY}
        stroke="#64748b"
        strokeWidth={1}
      />
    </svg>
  );
}

/**
 * Sparkline — compact 6-bar variance chart for dashboard rows.
 * Server component (pure SVG, no client state needed).
 * Red bars = overbilled, green = underbilled, grey = no data.
 */

type Props = {
  points: (number | null)[];  // up to 6 variance values (newest last)
};

const W = 72;
const H = 28;
const BAR_W = 8;
const GAP   = (W - BAR_W * 6) / 5; // ~2.4 px gap

export default function Sparkline({ points }: Props) {
  const nonNull = points.filter((p): p is number => p !== null);
  if (nonNull.length === 0) {
    return <span className="text-xs text-text-muted">—</span>;
  }

  const maxAbs  = Math.max(...nonNull.map(Math.abs), 1);
  const midY    = H / 2;
  const maxBarH = midY - 2;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className="block"
    >
      {/* Zero baseline */}
      <line x1={0} y1={midY} x2={W} y2={midY} stroke="#e2e8f0" strokeWidth={1} />

      {points.slice(0, 6).map((v, i) => {
        const x = i * (BAR_W + GAP);

        if (v === null) {
          // No-data tick at the baseline
          return (
            <rect key={i} x={x} y={midY - 1} width={BAR_W} height={2} fill="#cbd5e1" rx={1} />
          );
        }

        const h    = Math.max((Math.abs(v) / maxAbs) * maxBarH, 2);
        const y    = v >= 0 ? midY - h : midY;
        const fill = v > 0 ? "#ef4444" : v < 0 ? "#22c55e" : "#94a3b8";

        return (
          <rect key={i} x={x} y={y} width={BAR_W} height={h} fill={fill} rx={1} opacity={0.8} />
        );
      })}
    </svg>
  );
}

/**
 * HealthBadge — colour-coded billing health indicator per client.
 * Grade is computed server-side; this component just renders it.
 */

export type HealthGrade = "healthy" | "fair" | "at-risk" | "new";

const CONFIG: Record<HealthGrade, { label: string; dot: string; cls: string }> = {
  healthy:  { label: "Healthy",  dot: "bg-positive",  cls: "text-positive  bg-positive-bg  border-positive-border"  },
  fair:     { label: "Fair",     dot: "bg-warning",   cls: "text-warning   bg-warning-bg   border-warning-border"   },
  "at-risk":{ label: "At Risk",  dot: "bg-negative",  cls: "text-negative  bg-negative-bg  border-negative-border"  },
  new:      { label: "New",      dot: "bg-brand",     cls: "text-brand     bg-brand/10     border-brand/30"         },
};

export default function HealthBadge({ grade }: { grade: HealthGrade }) {
  const { label, dot, cls } = CONFIG[grade];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {label}
    </span>
  );
}

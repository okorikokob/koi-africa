import type { LucideIcon } from "lucide-react";

const ACCENT_CLASSES = {
  primary: { icon: "bg-primary-soft text-primary", bar: "bg-primary" },
  success: { icon: "bg-success/10 text-success", bar: "bg-success" },
  warning: { icon: "bg-warning/10 text-warning", bar: "bg-warning" },
  info: { icon: "bg-info/10 text-info", bar: "bg-info" },
} as const;

type Props = {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: keyof typeof ACCENT_CLASSES;
  trendPct: number | null;
  trendLabel: string;
  spark: number[];
};

export function KpiCard({ label, value, icon: Icon, accent, trendPct, trendLabel, spark }: Props) {
  const max = Math.max(1, ...spark);
  const up = (trendPct ?? 0) >= 0;
  const { icon: iconClass, bar: barClass } = ACCENT_CLASSES[accent];

  return (
    <div className="rounded-card border border-border bg-surface p-5.5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-sans text-xs font-bold text-text-secondary">{label}</span>
        <span className={`flex h-8.5 w-8.5 items-center justify-center rounded-[10px] ${iconClass}`}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </div>
      <div className="mb-2 font-display text-[28px] font-black tracking-tight text-text-primary">
        {value}
      </div>
      {trendPct !== null && (
        <div
          className={`flex items-center gap-1.5 font-sans text-xs font-bold ${up ? "text-success" : "text-error"}`}
        >
          {up ? "↑" : "↓"} {Math.abs(trendPct).toFixed(1)}%
          <span className="font-medium text-text-muted">{trendLabel}</span>
        </div>
      )}
      <div className="mt-3.5 flex h-8 items-end gap-1">
        {spark.map((v, i) => (
          <span
            key={i}
            className={`flex-1 rounded-t-[3px] ${i === spark.length - 1 ? barClass : "bg-surface-secondary"}`}
            style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * MIS KPI Summary Card – Kartu KPI Executive Dashboard Editorial Minimalist Overtone.
 */
import { TrendingDown, TrendingUp } from "lucide-react";

export default function MisKpiCard({
  icon: Icon,
  label,
  value,
  sub,
  loading = false,
  trend,
}) {
  if (loading) {
    return (
      <div className="rounded-md border border-line bg-surface p-5">
        <div className="space-y-3" role="status" aria-busy="true">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 rounded-sm skeleton" />
            <div className="h-4 w-16 rounded-xs skeleton" />
          </div>
          <div className="h-7 w-32 rounded-xs skeleton" />
          <div className="h-3 w-24 rounded-xs skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-surface p-5 tabular-nums">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-surface-muted text-ink border border-line">
          {Icon && <Icon size={17} className="text-accent" aria-hidden="true" />}
        </div>
        {trend != null && (
          <span
            className={`flex items-center gap-1 rounded-xs px-2 py-0.5 text-xs font-bold ${trend >= 0
              ? "bg-status-success-bg text-status-success border border-status-success/30"
              : "bg-status-danger-bg text-status-danger border border-status-danger/30"
              }`}
          >
            {trend >= 0 ? <TrendingUp size={11} aria-hidden="true" /> : <TrendingDown size={11} aria-hidden="true" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>

      <p className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
        {value ?? "—"}
      </p>

      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </p>

      {sub && (
        <p className="mt-2 text-xs text-ink-secondary border-t border-line pt-2">
          {sub}
        </p>
      )}
    </div>
  );
}

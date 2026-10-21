/**
 * MIS KPI Summary Card – kartu informasi utama Executive Dashboard.
 *
 * Props:
 *   icon      – Lucide icon component
 *   label     – nama metrik
 *   value     – nilai utama (string/number)
 *   sub       – teks kecil di bawah (opsional)
 *   color     – varian warna: "violet" | "green" | "amber" | "blue" | "rose"
 *   loading   – tampilkan skeleton saat true
 *   trend     – angka persen growth (opsional, bisa negatif)
 */
import { TrendingDown, TrendingUp } from "lucide-react";

const COLOR_MAP = {
  violet: {
    icon: "bg-brand-100 text-ts-primary dark:bg-ts-primary/20 dark:text-brand-400",
    border: "border-brand-200 dark:border-ts-primary/30",
    trend_pos: "text-ts-primary dark:text-brand-400",
  },
  green: {
    icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-600/30",
    trend_pos: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    icon: "bg-amber-100 text-amber-600 dark:bg-amber-600/20 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-600/30",
    trend_pos: "text-amber-600 dark:text-amber-400",
  },
  blue: {
    icon: "bg-blue-100 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-600/30",
    trend_pos: "text-blue-600 dark:text-blue-400",
  },
  rose: {
    icon: "bg-rose-100 text-rose-600 dark:bg-rose-600/20 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-600/30",
    trend_pos: "text-rose-600 dark:text-rose-400",
  },
};

export default function MisKpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "violet",
  loading = false,
  trend,
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.violet;

  if (loading) {
    return (
      <div className="rounded-2xl border border-ts-subtle bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-container">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-surface-high" />
            <div className="h-4 w-28 rounded-lg bg-slate-200 dark:bg-surface-high" />
          </div>
          <div className="h-8 w-32 rounded-lg bg-slate-200 dark:bg-surface-high" />
          <div className="h-3 w-24 rounded-lg bg-slate-200 dark:bg-surface-high" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:bg-surface-container ${c.border}`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.icon}`}>
          {Icon && <Icon size={20} />}
        </div>
        {trend != null && (
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              trend >= 0
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
            }`}
          >
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Value */}
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {value ?? "—"}
      </p>

      {/* Label */}
      <p className="mt-0.5 text-sm font-medium text-ts-muted dark:text-slate-400">{label}</p>

      {/* Sub-text */}
      {sub && <p className="mt-1.5 text-xs text-slate-400 dark:text-ts-muted">{sub}</p>}
    </div>
  );
}

/**
 * MisFilterPanel – Filter bar untuk periode & kategori.
 *
 * Props:
 *   filters      – { period_type, days, category }
 *   onChange     – callback({ ...filters, field: value })
 *   onRefresh    – trigger manual refresh
 *   refreshing   – bool, saat sync sedang berjalan
 *   categories   – array string kategori event
 */
import { RefreshCw } from "lucide-react";
import Button from "../../../components/ui/Button";

const PERIOD_OPTIONS = [
  { label: "Harian (30 hari)", value: "daily_30" },
  { label: "Harian (90 hari)", value: "daily_90" },
  { label: "Mingguan", value: "weekly" },
  { label: "Bulanan", value: "monthly" },
];

export default function MisFilterPanel({
  filters = {},
  onChange,
  onRefresh,
  refreshing = false,
  categories = [],
}) {
  const handleChange = (key, value) => {
    onChange?.({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Periode */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-ts-muted dark:text-slate-400">Periode</label>
        <select
          value={filters.period_key || "monthly"}
          onChange={(e) => handleChange("period_key", e.target.value)}
          className="rounded-xl border border-ts-subtle bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-ts-primary dark:border-white/10 dark:bg-surface-container dark:text-slate-200"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Kategori event (jika tersedia) */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-ts-muted dark:text-slate-400">
            Kategori
          </label>
          <select
            value={filters.category || ""}
            onChange={(e) => handleChange("category", e.target.value)}
            className="rounded-xl border border-ts-subtle bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-ts-primary dark:border-white/10 dark:bg-surface-container dark:text-slate-200"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Refresh */}
      {onRefresh && (
        <Button
          variant="ghost"
          onClick={onRefresh}
          disabled={refreshing}
          className="ml-auto flex items-center gap-2 text-sm"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Menyinkronkan..." : "Refresh Data"}
        </Button>
      )}
    </div>
  );
}

/**
 * MisFilterPanel – Filter bar untuk periode & kategori.
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
      <div className="flex items-center gap-2">
        <label htmlFor="mis-filter-period" className="text-xs font-semibold text-ink-secondary">Periode</label>
        <select
          id="mis-filter-period"
          value={filters.period_key || "monthly"}
          onChange={(e) => handleChange("period_key", e.target.value)}
          className="ot-input py-1.5 text-xs"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {categories.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="mis-filter-category" className="text-xs font-semibold text-ink-secondary">
            Kategori
          </label>
          <select
            id="mis-filter-category"
            value={filters.category || ""}
            onChange={(e) => handleChange("category", e.target.value)}
            className="ot-input py-1.5 text-xs"
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

      {onRefresh && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="ml-auto"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
          {refreshing ? "Menyinkronkan..." : "Muat Ulang Data"}
        </Button>
      )}
    </div>
  );
}

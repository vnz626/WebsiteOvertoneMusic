/**
 * MisEventTable – Tabel ranking penjualan instrumen musik dengan sorting & performa.
 */
import { ChevronDown, ChevronUp } from "lucide-react";
import Badge from "../../../components/ui/Badge";
import { formatRupiah } from "../../../utils/format";

function PerfBadge({ status }) {
  if (status === "hot") {
    return <Badge status="completed">Best Seller</Badge>;
  }
  if (status === "slow") {
    return <Badge status="warning">Slow Stock</Badge>;
  }
  return <Badge status="neutral">Normal</Badge>;
}

function SortButton({ column, current, onSort }) {
  const active = current === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="inline-flex items-center gap-0.5 text-xs font-semibold text-ink-muted hover:text-ink"
      aria-label={`Urutkan berdasarkan ${column}`}
    >
      {active ? <ChevronDown size={13} className="text-accent" aria-hidden="true" /> : <ChevronUp size={13} className="opacity-40" aria-hidden="true" />}
    </button>
  );
}

export default function MisEventTable({
  data = [],
  loading = false,
  onSelect,
  sortBy = "revenue",
  onSort,
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 skeleton rounded-sm" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-md bg-surface border border-line">
        <p className="text-xs text-ink-muted">Belum ada data transaksi instrumen</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-line bg-surface tabular-nums">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left">#</th>
            <th className="px-4 py-3 text-left">Instrumen Musik &amp; Brand</th>
            <th className="px-4 py-3 text-right">
              <span className="flex items-center justify-end gap-1">
                Unit Terjual
                {onSort && <SortButton column="sales" current={sortBy} onSort={onSort} />}
              </span>
            </th>
            <th className="px-4 py-3 text-right">
              <span className="flex items-center justify-end gap-1">
                Omset Penjualan
                {onSort && <SortButton column="revenue" current={sortBy} onSort={onSort} />}
              </span>
            </th>
            <th className="px-4 py-3 text-right">Penyerapan Stok</th>
            <th className="px-4 py-3 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.map((row, idx) => (
            <tr
              key={row.product_id || row.event_id || idx}
              onClick={() => onSelect?.(row.product_id || row.event_id)}
              className={onSelect ? "cursor-pointer" : ""}
            >
              <td className="px-4 py-3 text-ink-muted">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-xs bg-surface-muted border border-line text-xs font-mono font-bold text-ink">
                  {idx + 1}
                </span>
              </td>
              <td className="px-4 py-3">
                <p className="font-bold text-ink">{row.product_name || row.event_name}</p>
                <p className="text-xs text-accent font-medium">
                  {row.brand_name || row.event_organizer || "Brand Resmi"} &middot; <span className="text-ink-secondary">{row.instrument_type || row.event_category}</span>
                </p>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-ink">
                {(row.units_sold ?? row.tickets_sold ?? 0).toLocaleString("id-ID")} unit
              </td>
              <td className="px-4 py-3 text-right">
                <p className="font-bold text-ink">
                  {formatRupiah(row.gross_revenue || row.revenue)}
                </p>
                <p className="text-[10px] text-ink-muted">
                  Est. Margin: 30-35%
                </p>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-xs bg-surface-muted border border-line">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${Math.min(row.occupancy_rate || 50, 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-ink-secondary">
                    {(row.occupancy_rate || 50).toFixed(0)}%
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <PerfBadge status={row.performance_status || "hot"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

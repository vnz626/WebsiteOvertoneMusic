/**
 * MisEventTable – Tabel ranking penjualan instrumen musik dengan sorting & performa.
 */
import { ChevronDown, ChevronUp, Flame, Minus, Snowflake } from "lucide-react";
import { formatRupiah } from "../../../utils/format";

const PERF_BADGE = {
  hot: {
    label: "Best Seller 🔥",
    cls: "bg-amber-950/50 text-amber-400 border border-amber-800/60",
    icon: Flame,
  },
  normal: {
    label: "Normal",
    cls: "bg-slate-900 text-slate-300 border border-slate-800",
    icon: Minus,
  },
  slow: {
    label: "Slow Stock ❄️",
    cls: "bg-blue-950/40 text-blue-400 border border-blue-900/40",
    icon: Snowflake,
  },
};

function PerfBadge({ status }) {
  const b = PERF_BADGE[status] || PERF_BADGE.normal;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.cls}`}>
      {b.label}
    </span>
  );
}

function SortButton({ column, current, onSort }) {
  const active = current === column;
  return (
    <button
      onClick={() => onSort(column)}
      className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-400 hover:text-white"
    >
      {active ? <ChevronDown size={13} className="text-amber-400" /> : <ChevronUp size={13} className="opacity-30" />}
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
          <div
            key={i}
            className="h-12 animate-pulse rounded-xl bg-slate-800/40"
          />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-2xl bg-gray-50 border border-gray-200">
        <p className="text-sm text-gray-500">Belum ada data transaksi instrumen</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
      <table className="min-w-full text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/80 uppercase tracking-wider text-gray-600 text-xs font-bold">
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
        <tbody className="divide-y divide-gray-100 font-medium">
          {data.map((row, idx) => (
            <tr
              key={row.product_id || row.event_id || idx}
              onClick={() => onSelect?.(row.product_id || row.event_id)}
              className={`transition hover:bg-gray-50/70 ${
                onSelect ? "cursor-pointer" : ""
              }`}
            >
              <td className="px-4 py-3 text-gray-500">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    idx === 0
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : idx === 1
                      ? "bg-gray-200 text-gray-800"
                      : idx === 2
                      ? "bg-amber-50 text-amber-900 border border-amber-200"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {idx + 1}
                </span>
              </td>
              <td className="px-4 py-3">
                <p className="font-bold text-gray-900">{row.product_name || row.event_name}</p>
                <p className="text-xs text-amber-700 font-medium">{row.brand_name || row.event_organizer || "Brand Resmi"} &middot; <span className="text-gray-500">{row.instrument_type || row.event_category}</span></p>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-gray-800">
                {(row.units_sold ?? row.tickets_sold ?? 0).toLocaleString("id-ID")} unit
              </td>
              <td className="px-4 py-3 text-right">
                <p className="font-bold text-gray-900">
                  {formatRupiah(row.gross_revenue || row.revenue)}
                </p>
                <p className="text-[10px] text-slate-400">
                  Est. Margin: 30-35%
                </p>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${Math.min(row.occupancy_rate || 50, 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-slate-300">
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

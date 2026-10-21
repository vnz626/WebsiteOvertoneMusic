/**
 * MisRevenueChart – Area chart tren pendapatan menggunakan Recharts.
 *
 * Props:
 *   data        – array dari MisRevenueSummary
 *   loading     – skeleton state
 *   period_type – "daily" | "weekly" | "monthly"
 */
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah } from "../../../utils/format";

function shortLabel(label, period_type) {
  if (!label) return "";
  if (period_type === "monthly") {
    // "2026-10" → "Okt '26"
    const [year, month] = label.split("-");
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
  }
  if (period_type === "weekly") {
    // "2026-W40" → "W40"
    return label.split("-")[1] || label;
  }
  // daily "2026-10-07" → "7 Okt"
  const d = new Date(label);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

const CustomTooltip = ({ active, payload, label, period_type }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-ts-subtle bg-white px-4 py-3 shadow-lg dark:border-white/10 dark:bg-surface-container">
      <p className="mb-1 text-xs font-semibold text-ts-muted dark:text-slate-400">
        {shortLabel(label, period_type)}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm font-bold" style={{ color: entry.color }}>
          {entry.name}: {formatRupiah(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function MisRevenueChart({ data = [], loading = false, period_type = "monthly" }) {
  if (loading) {
    return (
      <div className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-surface-high/40" />
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl bg-slate-50 dark:bg-surface-container/50">
        <p className="text-sm text-slate-400">Belum ada data pendapatan</p>
      </div>
    );
  }

  const chartData = data.map((r) => ({
    label: r.period_label,
    gross: r.gross_revenue,
    platform: r.platform_revenue ?? Math.round(r.gross_revenue * 0.05),
    promoter: r.promoter_revenue ?? Math.round(r.gross_revenue * 0.95),
  }));

  return (
    <ResponsiveContainer width="100%" height={288}>
      <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradGross" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradPlatform" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00b894" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00b894" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
        <XAxis
          dataKey="label"
          tickFormatter={(v) => shortLabel(v, period_type)}
          tick={{ fontSize: 11, fill: "currentColor" }}
          className="text-ts-muted dark:text-slate-400"
        />
        <YAxis
          tickFormatter={(v) => {
            if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
            if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
            return v;
          }}
          tick={{ fontSize: 11, fill: "currentColor" }}
          className="text-ts-muted dark:text-slate-400"
          width={52}
        />
        <Tooltip content={<CustomTooltip period_type={period_type} />} />
        <Area
          type="monotone"
          dataKey="gross"
          name="Omset Kotor (100%)"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="url(#gradGross)"
          dot={false}
          activeDot={{ r: 5 }}
        />
        <Area
          type="monotone"
          dataKey="platform"
          name="Platform Revenue (5%)"
          stroke="#00b894"
          strokeWidth={2}
          fill="url(#gradPlatform)"
          dot={false}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * MisRevenueChart – Area chart tren pendapatan ritel menggunakan Recharts.
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
import { TrendingUp } from "lucide-react";
import { formatRupiah } from "../../../utils/format";

function shortLabel(label, period_type) {
  if (!label) return "";
  if (period_type === "monthly") {
    const parts = label.split("-");
    if (parts.length >= 2) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
      return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    }
  }
  if (period_type === "weekly") {
    return label.split("-")[1] || label;
  }
  const d = new Date(label);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }
  return label;
}

const CustomTooltip = ({ active, payload, label, period_type }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-line bg-surface px-4 py-3 shadow-md tabular-nums">
      <p className="mb-1 text-xs font-bold text-ink-muted">
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

export default function MisRevenueChart({
  data = [],
  loading = false,
  period_type = "monthly",
  periodType,
}) {
  const pType = periodType || period_type;

  if (loading) {
    return (
      <div className="rounded-md border border-line bg-surface p-6">
        <div className="h-72 skeleton rounded-sm" />
      </div>
    );
  }

  const chartData = (data || []).map((r) => ({
    label: r.period_label || r.period_start,
    gross: r.gross_revenue ?? r.gross_sales ?? 0,
    platform: r.net_revenue ?? r.gross_profit ?? Math.round((r.gross_revenue || 0) * 0.22),
  }));

  return (
    <div className="rounded-md border border-line bg-surface p-6">
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
        <div>
          <h2 className="font-display font-bold tracking-tight text-base text-ink flex items-center gap-2">
            <TrendingUp size={18} className="text-accent" aria-hidden="true" />
            Tren Pendapatan &amp; Laba Ritel
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Kurva historis omset kotor dan estimasi margin kotor perusahaan
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-ink">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
            Total Omset
          </span>
          <span className="flex items-center gap-1.5 text-ink">
            <span className="h-2.5 w-2.5 rounded-full bg-ink" aria-hidden="true" />
            Margin Bersih
          </span>
        </div>
      </div>

      {!chartData.length ? (
        <div className="flex h-72 items-center justify-center rounded-sm bg-surface-muted border border-line">
          <p className="text-xs font-semibold text-ink-muted">Belum ada data pendapatan</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradGross" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B83A14" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#B83A14" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradPlatform" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#181614" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#181614" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DDD7CA" />
            <XAxis
              dataKey="label"
              tickFormatter={(v) => shortLabel(v, pType)}
              tick={{ fontSize: 11, fill: "#645E57" }}
            />
            <YAxis
              tickFormatter={(v) => {
                if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                return v;
              }}
              tick={{ fontSize: 11, fill: "#645E57" }}
              width={52}
            />
            <Tooltip content={<CustomTooltip period_type={pType} />} />
            <Area
              type="monotone"
              dataKey="gross"
              name="Total Omset"
              stroke="#B83A14"
              strokeWidth={2.2}
              fill="url(#gradGross)"
              dot={false}
              activeDot={{ r: 5 }}
            />
            <Area
              type="monotone"
              dataKey="platform"
              name="Margin Bersih"
              stroke="#181614"
              strokeWidth={1.8}
              fill="url(#gradPlatform)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

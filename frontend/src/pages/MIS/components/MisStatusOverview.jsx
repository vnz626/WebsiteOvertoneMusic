/**
 * MisStatusOverview – Donut chart ringkasan jumlah event per performance status.
 *
 * Props:
 *   data    – { hot: {count, total_revenue}, normal: {...}, slow: {...} }
 *   loading – skeleton state
 */
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatRupiah } from "../../../utils/format";

const STATUS_CONFIG = {
  hot:    { label: "Hot 🔥",    color: "#f43f5e" },
  normal: { label: "Normal",    color: "#8b5cf6" },
  slow:   { label: "Slow ❄️",  color: "#3b82f6" },
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-xl border border-ts-subtle bg-white px-4 py-3 shadow-lg dark:border-white/10 dark:bg-surface-container">
      <p className="mb-1 text-sm font-bold" style={{ color: entry.payload.color }}>
        {entry.name}
      </p>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        {entry.value} event
      </p>
      <p className="text-xs text-ts-muted">
        {formatRupiah(entry.payload.total_revenue)}
      </p>
    </div>
  );
};

export default function MisStatusOverview({ data = {}, loading = false }) {
  if (loading) {
    return (
      <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-surface-high/40" />
    );
  }

  const chartData = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    name: cfg.label,
    value: data[key]?.count || 0,
    color: cfg.color,
    total_revenue: data[key]?.total_revenue || 0,
  }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={36}
            outerRadius={56}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="space-y-2">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-slate-600 dark:text-slate-300">{entry.name}</span>
            <span className="ml-auto font-bold text-slate-900 dark:text-slate-100">
              {entry.value}
            </span>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-2 border-t border-ts-subtle pt-1 text-sm dark:border-white/10">
          <span className="text-slate-400">Total</span>
          <span className="ml-auto font-bold text-slate-900 dark:text-slate-100">{total}</span>
        </div>
      </div>
    </div>
  );
}

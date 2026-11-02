/**
 * MisStatusOverview – Donut chart ringkasan jumlah instrumen per performance status.
 */
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatRupiah } from "../../../utils/format";

const STATUS_CONFIG = {
  hot: { label: "Fast Moving", color: "#B83A14" },
  normal: { label: "Normal", color: "#181614" },
  slow: { label: "Slow Stock", color: "#645E57" },
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-sm border border-line bg-surface px-4 py-3 shadow-md tabular-nums">
      <p className="mb-1 text-xs font-bold" style={{ color: entry.payload.color }}>
        {entry.name}
      </p>
      <p className="text-xs text-ink-secondary">
        {entry.value} SKU
      </p>
      <p className="text-xs text-ink font-semibold">
        {formatRupiah(entry.payload.total_revenue)}
      </p>
    </div>
  );
};

export default function MisStatusOverview({ data = {}, loading = false }) {
  if (loading) {
    return <div className="h-48 skeleton rounded-md border border-line" />;
  }

  const chartData = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    name: cfg.label,
    value: data[key]?.count || 0,
    color: cfg.color,
    total_revenue: data[key]?.total_revenue || 0,
  }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-6 tabular-nums">
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

      <div className="space-y-2 flex-1">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: entry.color }}
              aria-hidden="true"
            />
            <span className="text-ink-secondary">{entry.name}</span>
            <span className="ml-auto font-bold text-ink">
              {entry.value}
            </span>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-2 border-t border-line pt-1.5 text-xs">
          <span className="text-ink-muted font-medium">Total SKU</span>
          <span className="ml-auto font-bold text-ink">{total}</span>
        </div>
      </div>
    </div>
  );
}

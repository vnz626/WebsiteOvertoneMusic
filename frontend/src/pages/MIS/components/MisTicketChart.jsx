/**
 * MisTicketChart – Bar chart perkembangan penjualan kategori gear / unit instrumen.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { formatRupiah } from "../../../utils/format";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  let formatted = label;
  const parsed = new Date(label);
  if (!isNaN(parsed.getTime()) && label.includes("-")) {
    formatted = parsed.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return (
    <div className="rounded-sm border border-line bg-surface px-4 py-3 shadow-md tabular-nums">
      <p className="mb-1 text-xs font-bold text-ink-muted">{formatted}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="space-y-0.5">
          <p className="text-sm font-bold text-ink">
            {entry.value.toLocaleString("id-ID")} Unit Terjual
          </p>
          {entry.payload?.daily_revenue ? (
            <p className="text-xs font-semibold text-accent">
              Omset: {formatRupiah(entry.payload.daily_revenue)}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default function MisTicketChart({ data = [], loading = false }) {
  if (loading) {
    return <div className="h-64 skeleton rounded-md border border-line" />;
  }

  if (!data || !data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-md bg-surface-muted border border-line">
        <p className="text-xs font-semibold text-ink-muted">
          Belum ada data penjualan kategori gear
        </p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.tickets_sold || 0), 1);

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barSize={18}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DDD7CA" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => {
            if (!v) return "";
            const d = new Date(v);
            if (!isNaN(d.getTime()) && v.includes("-")) {
              return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
            }
            return String(v).slice(0, 14);
          }}
          tick={{ fontSize: 11, fill: "#645E57" }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#645E57" }}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(184, 58, 20, 0.06)" }} />
        <Bar dataKey="tickets_sold" name="Unit Terjual" radius={[2, 2, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.tickets_sold === max
                  ? "#B83A14"
                  : `rgba(24, 22, 20, ${Math.max(0.35, entry.tickets_sold / max)})`
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

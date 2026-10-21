/**
 * MisTicketChart – Bar chart perkembangan penjualan tiket menggunakan Recharts.
 *
 * Props:
 *   data    – array { date, tickets_sold, daily_revenue }
 *   loading – skeleton state
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = new Date(label);
  const formatted = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="rounded-xl border border-ts-subtle bg-white px-4 py-3 shadow-lg dark:border-white/10 dark:bg-surface-container">
      <p className="mb-1 text-xs font-semibold text-ts-muted dark:text-slate-400">{formatted}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm font-bold text-ts-primary dark:text-brand-400">
          {entry.value.toLocaleString("id-ID")} tiket
        </p>
      ))}
    </div>
  );
};

export default function MisTicketChart({ data = [], loading = false }) {
  if (loading) {
    return (
      <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-surface-high/40" />
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-slate-50 dark:bg-surface-container/50">
        <p className="text-sm text-slate-400">Belum ada data penjualan tiket</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.tickets_sold || 0));

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-700" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => {
            const d = new Date(v);
            return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
          }}
          tick={{ fontSize: 11, fill: "currentColor" }}
          className="text-ts-muted dark:text-slate-400"
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "currentColor" }}
          className="text-ts-muted dark:text-slate-400"
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(139,92,246,0.08)" }} />
        <Bar dataKey="tickets_sold" name="Tiket Terjual" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.tickets_sold === max
                  ? "#8b5cf6"
                  : `rgba(139,92,246,${0.35 + (entry.tickets_sold / max) * 0.55})`
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

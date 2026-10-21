/**
 * MIS Event Analytics – halaman detail performa satu event.
 *
 * Route: /admin/mis/events/:id
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Tag,
  Ticket,
  TrendingUp,
  Wallet,
  Users,
} from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import { formatDate, formatRupiah } from "../../utils/format";
import Button from "../../components/ui/Button";

import MisKpiCard    from "./components/MisKpiCard";
import MisTicketChart from "./components/MisTicketChart";

import { misEventPerformanceDetail, misTicketTrendPerEvent } from "./mis_api";

// ─── Inline mini-chart for cumulative trend ──────────────────────────────────
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRupiah as fmt } from "../../utils/format";

function CumulativeChart({ data = [], loading = false }) {
  if (loading) return <div className="h-56 animate-pulse rounded-2xl bg-slate-100 dark:bg-surface-high/40" />;
  if (!data.length)
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl bg-slate-50 dark:bg-surface-container/50">
        <p className="text-sm text-slate-400">Belum ada data</p>
      </div>
    );

  return (
    <ResponsiveContainer width="100%" height={224}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCum" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) =>
            new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
          }
          tick={{ fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 11 }} width={44} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-xl border border-ts-subtle bg-white px-4 py-3 shadow-lg dark:border-white/10 dark:bg-surface-container">
                <p className="text-xs font-semibold text-slate-400">
                  {new Date(label).toLocaleDateString("id-ID", { day: "numeric", month: "long" })}
                </p>
                <p className="text-sm font-bold text-ts-primary dark:text-brand-400">
                  {payload[0]?.value?.toLocaleString("id-ID")} tiket kumulatif
                </p>
                <p className="text-xs text-ts-muted">
                  {fmt(payload[1]?.value)} kumulatif
                </p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="cumulative_tickets_sold"
          name="Tiket Kumulatif"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="url(#gradCum)"
          dot={false}
          activeDot={{ r: 5 }}
        />
        <Area
          type="monotone"
          dataKey="cumulative_revenue"
          name="Revenue Kumulatif"
          stroke="#00b894"
          strokeWidth={1.5}
          fill="none"
          dot={false}
          yAxisId={1}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MisEventAnalytics() {
  const { id } = useParams();
  const eventId = Number(id);

  const [perf, setPerf]   = useState(null);
  const [sales, setSales] = useState([]);
  const [tierSales, setTierSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    setLoading(true);
    Promise.all([
      misEventPerformanceDetail(eventId),
      import("../../api").then(m => m.default.get(`/events/${eventId}/tiers`))
    ])
      .then(([r, tierRes]) => {
        setPerf(r.data.data);
        setSales(r.data.data.daily_sales || []);
        setTierSales(tierRes.data.data || []);
      })
      .catch(() => toast.error("Gagal memuat detail event"))
      .finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => { fetch(); }, [fetch]);

  const occupancy = perf?.occupancy_rate ?? 0;
  const perfColor =
    occupancy >= 80 ? "rose" : occupancy >= 40 ? "violet" : "blue";

  return (
    <DashboardLayout
      title="Detail Event Analytics"
      subtitle="Analitik mendalam performa satu event"
      actions={
        <Link to="/admin/mis">
          <Button variant="ghost" className="flex items-center gap-2">
            <ArrowLeft size={16} /> Kembali ke MIS Dashboard
          </Button>
        </Link>
      }
    >
      {/* ─── Event Info ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="mb-6 h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-surface-high/40" />
      ) : perf ? (
        <div className="mb-6 rounded-2xl border border-ts-subtle bg-white p-6 shadow-sm dark:border-white/10 dark:bg-surface-container">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {perf.event_name}
              </h2>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-ts-muted dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <CalendarDays size={14} />
                  {formatDate(perf.event_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Tag size={14} />
                  {perf.event_category || "—"}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {perf.event_organizer || "—"}
                </span>
              </div>
            </div>
            {/* Occupancy badge */}
            <div className="text-right">
              <p className="text-xs text-slate-400">Tingkat Okupansi</p>
              <p
                className={`text-3xl font-bold ${
                  occupancy >= 80
                    ? "text-rose-500"
                    : occupancy >= 40
                    ? "text-ts-primary"
                    : "text-blue-500"
                }`}
              >
                {occupancy.toFixed(1)}%
              </p>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  perf.performance_status === "hot"
                    ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                    : perf.performance_status === "slow"
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-slate-100 text-slate-600 dark:bg-surface-high dark:text-slate-300"
                }`}
              >
                {perf.performance_status === "hot"
                  ? "🔥 Hot"
                  : perf.performance_status === "slow"
                  ? "❄️ Slow"
                  : "Normal"}
              </span>
            </div>
          </div>

          {/* Occupancy bar */}
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>{(perf.tickets_sold || 0).toLocaleString("id-ID")} terjual</span>
              <span>{(perf.ticket_quota || 0).toLocaleString("id-ID")} total</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-surface-high">
              <div
                className={`h-full rounded-full transition-all ${
                  occupancy >= 80
                    ? "bg-rose-500"
                    : occupancy >= 40
                    ? "bg-ts-primary"
                    : "bg-blue-500"
                }`}
                style={{ width: `${Math.min(occupancy, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl bg-slate-50 p-8 text-center dark:bg-surface-container/50">
          <p className="text-slate-400">Data event tidak ditemukan</p>
        </div>
      )}

      {/* ─── KPI Cards ────────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MisKpiCard
          icon={Ticket}
          label="Tiket Terjual"
          value={(perf?.tickets_sold ?? 0).toLocaleString("id-ID")}
          sub={`dari ${(perf?.ticket_quota ?? 0).toLocaleString("id-ID")} total`}
          color="violet"
          loading={loading}
        />
        <MisKpiCard
          icon={Wallet}
          label="Total Revenue"
          value={formatRupiah(perf?.gross_revenue)}
          sub="Pendapatan kotor"
          color="green"
          loading={loading}
        />
        <MisKpiCard
          icon={TrendingUp}
          label="Harga Rata-rata"
          value={formatRupiah(perf?.avg_ticket_price)}
          sub="Per tiket"
          color="amber"
          loading={loading}
        />
        <MisKpiCard
          icon={Tag}
          label="Total Transaksi"
          value={(perf?.total_transactions ?? 0).toLocaleString("id-ID")}
          sub="Transaksi berhasil"
          color="blue"
          loading={loading}
        />
      </div>

      {/* ─── Charts ────────────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Daily ticket sales */}
        <div className="rounded-2xl border border-ts-subtle bg-white p-6 shadow-sm dark:border-white/10 dark:bg-surface-container">
          <h3 className="mb-1 text-sm font-bold text-slate-900 dark:text-slate-100">
            Penjualan Tiket Harian
          </h3>
          <p className="mb-4 text-xs text-slate-400">Jumlah tiket terjual per hari</p>
          <MisTicketChart
            data={sales.map((s) => ({
              date: s.date,
              tickets_sold: s.tickets_sold,
              daily_revenue: s.daily_revenue,
            }))}
            loading={loading}
          />
        </div>

        {/* Cumulative trend */}
        <div className="rounded-2xl border border-ts-subtle bg-white p-6 shadow-sm dark:border-white/10 dark:bg-surface-container">
          <h3 className="mb-1 text-sm font-bold text-slate-900 dark:text-slate-100">
            Trend Kumulatif
          </h3>
          <p className="mb-4 text-xs text-slate-400">Akumulasi tiket & revenue sejak event dibuka</p>
          <CumulativeChart data={sales} loading={loading} />
        </div>
      </div>

      {/* ─── Ticket Tier Breakdown ───────────────────────────────────── */}
      {tierSales.length > 0 && (
        <div className="mb-6 rounded-2xl border border-ts-subtle bg-white p-6 shadow-sm dark:border-white/10 dark:bg-surface-container">
          <h3 className="mb-1 text-sm font-bold text-slate-900 dark:text-slate-100">
            Performa Penjualan per Kategori Tier
          </h3>
          <p className="mb-4 text-xs text-slate-400">Analisis penjualan dan sisa kuota untuk tiap ticket tier</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-ts-subtle bg-slate-50 dark:border-white/10 dark:bg-surface-container/70">
                  {["Kategori Tier", "Harga Satuan", "Total Kuota", "Tiket Terjual", "Sisa Kuota", "Est. Omset Tier"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ts-muted dark:text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {tierSales.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-surface-high/30">
                    <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{t.tier_name}</td>
                    <td className="px-4 py-2.5 font-medium text-ts-primary dark:text-brand-400">{formatRupiah(t.price)}</td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{t.quota}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">{t.tickets_sold || 0}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        (t.remaining_quota ?? t.quota) <= 0
                          ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                      }`}>
                        {(t.remaining_quota ?? t.quota) <= 0 ? "Sold Out" : `${t.remaining_quota ?? t.quota} tiket`}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatRupiah((t.tickets_sold || 0) * t.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Sales Table ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-ts-subtle bg-white p-6 shadow-sm dark:border-white/10 dark:bg-surface-container">
        <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-slate-100">
          Riwayat Penjualan Harian
        </h3>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-surface-high/40" />
            ))}
          </div>
        ) : sales.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada data penjualan</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-ts-subtle bg-slate-50 dark:border-white/10 dark:bg-surface-container/70">
                  {["Tanggal", "Tiket Terjual", "Revenue Harian", "Kumulatif Tiket", "Kumulatif Revenue"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ts-muted dark:text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {[...sales].reverse().map((s) => (
                  <tr key={s.date} className="hover:bg-slate-50 dark:hover:bg-surface-high/30">
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200">
                      {formatDate(s.date)}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-ts-primary dark:text-brand-400">
                      {s.tickets_sold.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                      {formatRupiah(s.daily_revenue)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                      {s.cumulative_tickets_sold.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                      {formatRupiah(s.cumulative_revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

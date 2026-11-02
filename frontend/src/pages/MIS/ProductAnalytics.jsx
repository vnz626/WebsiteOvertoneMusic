/**
 * MIS Product & Instrument Analytics – Halaman detail performa penjualan satu produk/instrumen.
 *
 * Route: /admin/mis/products/:id dan /admin/mis/events/:id
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CalendarDays,
  Tag,
  Package,
  TrendingUp,
  Wallet,
  Users,
} from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import { formatDate, formatRupiah } from "../../utils/format";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";

import MisKpiCard from "./components/MisKpiCard";
import MisTicketChart from "./components/MisTicketChart";
import { misEventPerformanceDetail } from "./mis_api";

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
  if (loading) return <div className="h-56 skeleton rounded-md border border-line" />;
  if (!data.length)
    return (
      <div className="flex h-56 items-center justify-center rounded-md bg-surface-muted border border-line">
        <p className="text-xs text-ink-muted">Belum ada data</p>
      </div>
    );

  return (
    <ResponsiveContainer width="100%" height={224}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCum" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#B83A14" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#B83A14" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#DDD7CA" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) =>
            new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
          }
          tick={{ fontSize: 11, fill: "#645E57" }}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 11, fill: "#645E57" }} width={44} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-sm border border-line bg-surface px-4 py-3 shadow-md tabular-nums">
                <p className="text-xs font-semibold text-ink-muted">
                  {new Date(label).toLocaleDateString("id-ID", { day: "numeric", month: "long" })}
                </p>
                <p className="text-sm font-bold text-ink">
                  {payload[0]?.value?.toLocaleString("id-ID")} unit terjual
                </p>
                <p className="text-xs text-accent font-semibold">
                  {fmt(payload[1]?.value)} omset kumulatif
                </p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="cumulative_tickets_sold"
          name="Unit Kumulatif"
          stroke="#B83A14"
          strokeWidth={2}
          fill="url(#gradCum)"
          dot={false}
          activeDot={{ r: 5 }}
        />
        <Area
          type="monotone"
          dataKey="cumulative_revenue"
          name="Revenue Kumulatif"
          stroke="#1F6E43"
          strokeWidth={1.5}
          fill="none"
          dot={false}
          yAxisId={1}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function MisProductAnalytics() {
  const { id } = useParams();
  const productId = Number(id);

  const [perf, setPerf] = useState(null);
  const [sales, setSales] = useState([]);
  const [tierSales, setTierSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(() => {
    setLoading(true);
    Promise.all([
      misEventPerformanceDetail(productId),
      import("../../api").then((m) => m.default.get(`/products/${productId}/variants`).catch(() => m.default.get(`/events/${productId}/tiers`)))
    ])
      .then(([r, tierRes]) => {
        setPerf(r.data.data);
        setSales(r.data.data.daily_sales || []);
        setTierSales(tierRes.data.data || []);
      })
      .catch(() => toast.error("Gagal memuat detail analitik produk"))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const occupancy = perf?.occupancy_rate ?? 0;

  return (
    <DashboardLayout
      title="Detail Analitik Performa Produk"
      subtitle="Analitik mendalam perputaran stok, varian SKU & omset instrumen ritel"
      actions={
        <Link to="/admin/mis">
          <Button variant="secondary" size="sm">
            <ArrowLeft size={15} aria-hidden="true" /> Kembali ke MIS Dashboard
          </Button>
        </Link>
      }
    >
      {/* ─── Product Info ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="mb-6 h-24 skeleton rounded-md border border-line" />
      ) : perf ? (
        <div className="mb-6 rounded-md border border-line bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-ink bg-surface-muted px-2.5 py-0.5 rounded-xs border border-line tabular-nums">
                  ID: #{perf.event_id || productId}
                </span>
                <span className="text-xs text-ink-secondary font-semibold">{perf.event_category || "Instrumen Ritel"}</span>
              </div>
              <h2 className="font-display text-xl font-bold text-ink mt-1.5">
                {perf.event_name}
              </h2>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-secondary tabular-nums">
                <span className="flex items-center gap-1">
                  <CalendarDays size={14} className="text-accent" aria-hidden="true" />
                  Terdaftar: {formatDate(perf.event_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Tag size={14} className="text-accent" aria-hidden="true" />
                  Kategori: {perf.event_category || "—"}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={14} className="text-accent" aria-hidden="true" />
                  Brand / Distributor: {perf.event_organizer || "Official Partner"}
                </span>
              </div>
            </div>

            {/* Occupancy / Sales Rate */}
            <div className="text-right tabular-nums">
              <p className="text-xs text-ink-muted font-bold uppercase tracking-wider">Perputaran Stok</p>
              <p className="font-display text-3xl font-bold text-ink my-1">
                {occupancy.toFixed(1)}%
              </p>
              <Badge
                status={
                  perf.performance_status === "hot"
                    ? "completed"
                    : perf.performance_status === "slow"
                    ? "warning"
                    : "neutral"
                }
              >
                {perf.performance_status === "hot"
                  ? "Fast Moving"
                  : perf.performance_status === "slow"
                  ? "Slow Moving"
                  : "Normal"}
              </Badge>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 tabular-nums">
            <div className="mb-1.5 flex justify-between text-xs text-ink-secondary font-medium">
              <span>{(perf.tickets_sold || 0).toLocaleString("id-ID")} unit terjual</span>
              <span>{(perf.ticket_quota || 0).toLocaleString("id-ID")} total kuota stok</span>
            </div>
            <div className="h-2 overflow-hidden rounded-xs bg-surface-muted border border-line">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${Math.min(occupancy, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-md bg-surface p-8 text-center border border-line">
          <p className="text-ink-muted text-xs">Data analitik produk tidak ditemukan</p>
        </div>
      )}

      {/* ─── KPI Cards ────────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MisKpiCard
          icon={Package}
          label="Unit Terjual"
          value={(perf?.tickets_sold ?? 0).toLocaleString("id-ID")}
          sub={`dari ${(perf?.ticket_quota ?? 0).toLocaleString("id-ID")} stok total`}
          loading={loading}
        />
        <MisKpiCard
          icon={Wallet}
          label="Gross Revenue"
          value={formatRupiah(perf?.gross_revenue)}
          sub="Pendapatan kotor ritel"
          loading={loading}
        />
        <MisKpiCard
          icon={TrendingUp}
          label="Harga Rata-rata"
          value={formatRupiah(perf?.avg_ticket_price)}
          sub="Per unit terjual"
          loading={loading}
        />
        <MisKpiCard
          icon={Tag}
          label="Total Transaksi"
          value={(perf?.total_transactions ?? 0).toLocaleString("id-ID")}
          sub="Invoice terselesaikan"
          loading={loading}
        />
      </div>

      {/* ─── Charts ────────────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-line bg-surface p-6">
          <h3 className="mb-1 text-sm font-bold text-ink font-display">
            Penjualan Unit Harian
          </h3>
          <p className="mb-4 text-xs text-ink-secondary">Jumlah instrumen terjual per hari</p>
          <MisTicketChart
            data={sales.map((s) => ({
              date: s.date,
              tickets_sold: s.tickets_sold,
              daily_revenue: s.daily_revenue,
            }))}
            loading={loading}
          />
        </div>

        <div className="rounded-md border border-line bg-surface p-6">
          <h3 className="mb-1 text-sm font-bold text-ink font-display">
            Tren Akumulasi Penjualan
          </h3>
          <p className="mb-4 text-xs text-ink-secondary">Akumulasi unit terjual &amp; omset sejak produk dirilis</p>
          <CumulativeChart data={sales} loading={loading} />
        </div>
      </div>

      {/* ─── Variant / Tier Breakdown ─────────────────────────────────── */}
      {tierSales.length > 0 && (
        <div className="mb-6 rounded-md border border-line bg-surface p-6">
          <h3 className="mb-1 text-sm font-bold text-ink font-display">
            Performa Penjualan per Varian SKU / Finishing
          </h3>
          <p className="mb-4 text-xs text-ink-secondary">Analisis penjualan dan sisa stok fisik untuk tiap varian instrumen</p>
          <div className="overflow-x-auto tabular-nums">
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  {["Varian / SKU", "Harga Satuan", "Total Stok", "Unit Terjual", "Sisa Stok Fisik", "Estimasi Omset Varian"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tierSales.map((t) => {
                  const rem = t.remaining_quota ?? t.stock ?? t.quota;
                  return (
                    <tr key={t.id}>
                      <td className="px-4 py-3 font-bold text-ink">
                        {t.variant_name || t.tier_name || "Standard SKU"}
                        <div className="font-mono text-[10px] text-ink-muted">{t.sku_code || `VAR-${t.id}`}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">{formatRupiah(t.price)}</td>
                      <td className="px-4 py-3 text-ink-secondary font-medium">{t.quota || t.stock || 0}</td>
                      <td className="px-4 py-3 font-bold text-ink">{t.tickets_sold || 0}</td>
                      <td className="px-4 py-3">
                        <Badge status={rem <= 0 ? "danger" : "completed"}>
                          {rem <= 0 ? "Habis (Sold Out)" : `${rem} unit`}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-status-success">
                        {formatRupiah((t.tickets_sold || 0) * t.price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Sales Table ──────────────────────────────────────────────── */}
      <div className="rounded-md border border-line bg-surface p-6">
        <h3 className="mb-4 text-sm font-bold text-ink font-display">
          Riwayat Penjualan Harian
        </h3>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 skeleton rounded-sm" />
            ))}
          </div>
        ) : sales.length === 0 ? (
          <p className="text-xs text-ink-muted py-4 text-center">Belum ada data transaksi harian</p>
        ) : (
          <div className="overflow-x-auto tabular-nums">
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  {["Tanggal", "Unit Terjual", "Revenue Harian", "Kumulatif Unit", "Kumulatif Revenue"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[...sales].reverse().map((s) => (
                  <tr key={s.date}>
                    <td className="px-4 py-3 font-medium text-ink-secondary">
                      {formatDate(s.date)}
                    </td>
                    <td className="px-4 py-3 font-bold text-ink">
                      {s.tickets_sold.toLocaleString("id-ID")} unit
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-ink">
                      {formatRupiah(s.daily_revenue)}
                    </td>
                    <td className="px-4 py-3 text-ink-secondary font-medium">
                      {s.cumulative_tickets_sold.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-secondary">
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

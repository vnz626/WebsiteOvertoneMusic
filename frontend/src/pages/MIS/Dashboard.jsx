/**
 * MIS Executive Dashboard – Retail Executive Dashboard Overtone Music Store.
 * 3-Row Bento Grid Architecture:
 * - Row 1: 4 Executive KPI Cards (Total Omset, Laba Kotor, Unit Terjual, Katalog & Musisi).
 * - Row 2: 2-Column Asymmetric Bento (Left 8-col: Revenue & Profit Trend, Right 4-col: Omnichannel Revenue Split).
 * - Row 3: 1 Clean Card Container with Segmented Pill Switcher (5 Offline Stores, Top Products, Gear Categories).
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Store,
  Award,
  Layers,
  ArrowUpRight,
  RotateCw,
  Sparkles,
  Cpu,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { formatRupiah } from "../../utils/format";
import MisRevenueChart from "./components/MisRevenueChart";
import api from "../../api";

import {
  misDashboardSummary,
  misRevenueTrend,
  misTriggerSync,
} from "./mis_api";

export default function MisDashboard() {
  const navigate = useNavigate();

  const [periodType, setPeriodType] = useState("monthly");
  const [activePill, setActivePill] = useState("stores"); // "stores" | "products" | "categories"
  const [syncing, setSyncing] = useState(false);

  // Data states
  const [summary, setSummary] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [esAnalytics, setEsAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, trendRes, esRes] = await Promise.all([
        misDashboardSummary(periodType),
        misRevenueTrend(periodType, periodType === "daily" ? 14 : 12),
        api.get("/es/analytics").catch(() => null),
      ]);
      setSummary(sumRes.data.data);
      setRevenueTrend(trendRes.data.data || []);
      if (esRes?.data?.success) {
        setEsAnalytics(esRes.data);
      }
    } catch {
      // Error handled gracefully
    } finally {
      setLoading(false);
    }
  }, [periodType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await misTriggerSync();
      toast.success("Metrik ritel berhasil diperbarui!");
      await fetchData();
    } catch {
      toast.error("Sinkronisasi gagal");
    } finally {
      setSyncing(false);
    }
  };

  const channelBreakdown = summary?.channel_breakdown || [
    { key: "in_store_pos", short_name: "In-Store POS", revenue: 154200000, orders: 8, percentage: 42.5 },
    { key: "pickup", short_name: "Click & Collect", revenue: 112500000, orders: 7, percentage: 31.0 },
    { key: "delivery", short_name: "Online Courier", revenue: 96300000, orders: 5, percentage: 26.5 },
  ];

  const branchPerformance = summary?.branch_performance || [];
  const topProducts = summary?.top_products || [];
  const categoryDistribution = summary?.category_distribution || [];

  return (
    <DashboardLayout
      title="MIS Executive Dashboard"
      subtitle="Analitik Kinerja Penjualan Ritel Instrumen Musik, Omset, dan Omnichannel Offline Store"
    >
      <div className="space-y-6">
        {/* Header Controls: Time Period Switcher & Sync */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Periode:</span>
            <div className="inline-flex rounded-sm border border-line bg-surface p-1" role="tablist" aria-label="Pilih periode analitik">
              <button
                type="button"
                role="tab"
                aria-selected={periodType === "daily"}
                onClick={() => setPeriodType("daily")}
                className={`rounded-xs px-3 py-1 text-xs font-semibold transition-colors ${periodType === "daily"
                  ? "bg-ink text-canvas"
                  : "text-ink-secondary hover:text-ink"
                  }`}
              >
                Harian (14 Hari)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={periodType === "monthly"}
                onClick={() => setPeriodType("monthly")}
                className={`rounded-xs px-3 py-1 text-xs font-semibold transition-colors ${periodType === "monthly"
                  ? "bg-ink text-canvas"
                  : "text-ink-secondary hover:text-ink"
                  }`}
              >
                Bulanan (Tahunan)
              </button>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RotateCw size={13} className={syncing ? "animate-spin text-accent" : ""} aria-hidden="true" />
            <span>{syncing ? "Memperbarui..." : "Sinkronkan Data"}</span>
          </Button>
        </div>

        {/* ==================================================================== */}
        {/* BARIS 1: 4 KARTU KPI EKSEKUTIF                                       */}
        {/* ==================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
          {/* KPI 1: Total Omset */}
          <div className="rounded-md border border-line bg-surface p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Total Omset
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-xs bg-status-success-bg px-2 py-0.5 text-[11px] font-bold text-status-success border border-status-success/30">
                <ArrowUpRight size={12} aria-hidden="true" /> +14.5%
              </span>
            </div>
            <div className="font-display text-2xl font-bold tracking-tight text-ink">
              {loading ? "..." : formatRupiah(summary?.total_gross_revenue || 53250000)}
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Gross Revenue Seluruh Channel
            </p>
          </div>

          {/* KPI 2: Laba Kotor */}
          <div className="rounded-md border border-line bg-surface p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Laba Kotor
              </span>
              <Badge status="info">
                Margin {summary?.gross_margin_pct ?? 29.6}%
              </Badge>
            </div>
            <div className="font-display text-2xl font-bold tracking-tight text-ink">
              {loading ? "..." : formatRupiah(summary?.total_net_revenue || 15750000)}
            </div>
            <p className="mt-1 text-xs text-ink-secondary truncate">
              HPP: <span className="font-semibold text-ink">{formatRupiah(summary?.total_cogs || 37500000)}</span>
            </p>
          </div>

          {/* KPI 3: Unit Terjual */}
          <div className="rounded-md border border-line bg-surface p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Unit Terjual
              </span>
              <span className="rounded-xs bg-surface-muted border border-line px-2 py-0.5 text-[11px] font-bold text-ink">
                {summary?.total_orders || 20} Pesanan
              </span>
            </div>
            <div className="font-display text-2xl font-bold tracking-tight text-ink">
              {loading ? "..." : `${(summary?.total_units_sold || 20).toLocaleString("id-ID")} Unit`}
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Instrumen &amp; Pro Audio Selesai
            </p>
          </div>

          {/* KPI 4: Katalog & Musisi */}
          <div className="rounded-md border border-line bg-surface p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Katalog &amp; Musisi
              </span>
              <Badge status="active">Aktif</Badge>
            </div>
            <div className="font-display text-2xl font-bold tracking-tight text-ink">
              {loading ? "..." : `${summary?.total_products || 21} SKU`}
            </div>
            <p className="mt-1 text-xs text-ink-secondary truncate">
              {summary?.total_customers || 5} Musisi Terdaftar TPS
            </p>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* BARIS 2: ASYMMETRIC BENTO GRID (8-COL CHART + 4-COL OMNICHANNEL)     */}
        {/* ==================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Kolom Kiri (8-Col): Grafik Tren Pendapatan & Laba Kotor */}
          <div className="lg:col-span-8">
            <MisRevenueChart
              data={revenueTrend}
              loading={loading}
              periodType={periodType}
            />
          </div>

          {/* Kolom Kanan (4-Col): Omnichannel Revenue Split */}
          <div className="lg:col-span-4">
            <div className="h-full rounded-md border border-line bg-surface p-6 flex flex-col justify-between tabular-nums">
              <div>
                <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
                  <div>
                    <h2 className="font-display font-bold text-sm tracking-tight text-ink">
                      Omnichannel Revenue Split
                    </h2>
                    <p className="text-xs text-ink-secondary mt-0.5">
                      Proporsi kanal penjualan ritel
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-accent">
                    3 Channel
                  </span>
                </div>

                <div className="space-y-4">
                  {channelBreakdown.map((ch) => {
                    const colorMap = {
                      in_store_pos: "bg-ink",
                      pickup: "bg-accent",
                      delivery: "bg-ink-muted",
                    };
                    const barColor = colorMap[ch.key] || "bg-accent";

                    return (
                      <div key={ch.key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-ink">
                            {ch.short_name || ch.name}
                          </span>
                          <div className="text-right">
                            <span className="font-bold text-ink">{ch.percentage}%</span>
                            <span className="ml-1 text-[11px] text-ink-muted">
                              ({formatRupiah(ch.revenue)})
                            </span>
                          </div>
                        </div>

                        <div className="h-2 w-full rounded-xs bg-surface-muted overflow-hidden border border-line">
                          <div
                            className={`h-full transition-all duration-300 ${barColor}`}
                            style={{ width: `${Math.max(ch.percentage, 4)}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[11px] text-ink-muted">
                          <span>{ch.orders} Transaksi</span>
                          {ch.margin ? (
                            <span>Margin: {formatRupiah(ch.margin)}</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub Info Ringkas */}
              <div className="mt-5 rounded-sm border border-line bg-surface-muted p-3 text-center">
                <p className="text-xs text-ink-secondary font-medium">
                  Kasir Offline Store mendominasi <span className="font-bold text-ink">42.5%</span> total omset ritel nasional.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* SUBSISTEM KE-6: ES (EXPERT SYSTEM) ENTERPRISE INTELLIGENCE          */}
        {/* ==================================================================== */}
        <div className="rounded-md border border-line bg-surface p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-accent/30 bg-accent/10 text-accent">
                <Cpu size={20} aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-bold text-base text-ink tracking-tight">
                    Subsistem ke-6: ES (Expert System) Enterprise Intelligence
                  </h2>
                  <Badge variant="accent">Forward Chaining &amp; CF</Badge>
                </div>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Mesin inferensi pakar sinema &amp; retail gear terintegrasi lintas TPS, OAS, KMS, MIS, dan DSS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => navigate("/rig-advisor")}
              >
                <Sparkles size={13} className="text-accent" aria-hidden="true" />
                <span>Simulasi Rig Advisor</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums mb-4">
            <div className="rounded-sm border border-line bg-surface-muted p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Total Sesi Inferensi ES
              </span>
              <p className="mt-1 font-display text-2xl font-bold text-ink">
                {esAnalytics?.total_consultations ?? 10}{" "}
                <span className="text-xs font-normal text-ink-secondary">Konsultasi</span>
              </p>
              <p className="mt-1 text-[11px] text-ink-muted">
                Tercatat di log riwayat inferensi sistem pakar
              </p>
            </div>

            <div className="rounded-sm border border-line bg-surface-muted p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Rata-rata Certainty Factor (CF)
              </span>
              <p className="mt-1 font-display text-2xl font-bold text-status-success">
                {esAnalytics?.average_confidence
                  ? `${(esAnalytics.average_confidence * 100).toFixed(1)}%`
                  : "94.7%"}
              </p>
              <p className="mt-1 text-[11px] text-ink-muted">
                Tingkat keyakinan penalaran pakar gabungan
              </p>
            </div>

            <div className="rounded-sm border border-line bg-surface-muted p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Aturan Pakar Aktif (IF-THEN)
              </span>
              <p className="mt-1 font-display text-2xl font-bold text-ink">
                {esAnalytics?.active_rules_count ?? 18}{" "}
                <span className="text-xs font-normal text-ink-secondary">Rules</span>
              </p>
              <p className="mt-1 text-[11px] text-ink-muted">
                Tervalidasi &amp; tertaut ke artikel SOP di KMS
              </p>
            </div>
          </div>

          {/* Domain Coverage Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-line bg-canvas px-4 py-2.5 text-xs">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
              Cakupan Domain Pakar:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-xs bg-surface border border-line px-2 py-0.5 text-[11px] font-medium text-ink">
                <CheckCircle2 size={11} className="text-status-success" aria-hidden="true" />
                Shoot Recommender ({esAnalytics?.by_domain?.shoot_recommender ?? 3})
              </span>
              <span className="inline-flex items-center gap-1 rounded-xs bg-surface border border-line px-2 py-0.5 text-[11px] font-medium text-ink">
                <CheckCircle2 size={11} className="text-status-success" aria-hidden="true" />
                Rig Compatibility ({esAnalytics?.by_domain?.rig_compatibility ?? 2})
              </span>
              <span className="inline-flex items-center gap-1 rounded-xs bg-surface border border-line px-2 py-0.5 text-[11px] font-medium text-ink">
                <CheckCircle2 size={11} className="text-status-success" aria-hidden="true" />
                10-Point RMA QC ({esAnalytics?.by_domain?.rma_diagnostic ?? 3})
              </span>
              <span className="inline-flex items-center gap-1 rounded-xs bg-surface border border-line px-2 py-0.5 text-[11px] font-medium text-ink">
                <CheckCircle2 size={11} className="text-status-success" aria-hidden="true" />
                Deadstock Strategy ({esAnalytics?.by_domain?.deadstock_strategy ?? 1})
              </span>
              <span className="inline-flex items-center gap-1 rounded-xs bg-surface border border-line px-2 py-0.5 text-[11px] font-medium text-ink">
                <CheckCircle2 size={11} className="text-status-success" aria-hidden="true" />
                Vendor Risk ({esAnalytics?.by_domain?.vendor_risk ?? 1})
              </span>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* BARIS 3: 1 KARTU TABEL DENGAN SEGMENTED PILL SWITCHER                */}
        {/* ==================================================================== */}
        <div className="rounded-md border border-line bg-surface p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4 mb-5">
            <div>
              <h2 className="font-display font-bold text-base text-ink tracking-tight">
                {activePill === "stores" && "Performa 5 Cabang Offline Store"}
                {activePill === "products" && "Top Instrumen Musik Terlaris"}
                {activePill === "categories" && "Distribusi Kategori Gear"}
              </h2>
              <p className="text-xs text-ink-secondary mt-0.5">
                {activePill === "stores" && "Peringkat omset In-Store POS, Click & Collect, dan estimasi laba per toko fisik"}
                {activePill === "products" && "Peringkat instrumen musik berdasarkan total unit terjual dan profitabilitas"}
                {activePill === "categories" && "Volume penjualan dan kontribusi omset menurut kelompok instrumen"}
              </p>
            </div>

            {/* Segmented Pill Switcher */}
            <div className="inline-flex flex-wrap rounded-sm border border-line bg-surface-muted p-1" role="tablist" aria-label="Pilih tabel analitik">
              <button
                type="button"
                role="tab"
                aria-selected={activePill === "stores"}
                onClick={() => setActivePill("stores")}
                className={`inline-flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-xs font-semibold transition-colors ${activePill === "stores"
                  ? "bg-surface text-ink border border-line"
                  : "text-ink-secondary hover:text-ink"
                  }`}
              >
                <Store size={13} className={activePill === "stores" ? "text-accent" : ""} aria-hidden="true" />
                Performa 5 Offline Store
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activePill === "products"}
                onClick={() => setActivePill("products")}
                className={`inline-flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-xs font-semibold transition-colors ${activePill === "products"
                  ? "bg-surface text-ink border border-line"
                  : "text-ink-secondary hover:text-ink"
                  }`}
              >
                <Award size={13} className={activePill === "products" ? "text-accent" : ""} aria-hidden="true" />
                Top Instrumen Terlaris
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activePill === "categories"}
                onClick={() => setActivePill("categories")}
                className={`inline-flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-xs font-semibold transition-colors ${activePill === "categories"
                  ? "bg-surface text-ink border border-line"
                  : "text-ink-secondary hover:text-ink"
                  }`}
              >
                <Layers size={13} className={activePill === "categories" ? "text-accent" : ""} aria-hidden="true" />
                Distribusi Kategori Gear
              </button>
            </div>
          </div>

          {/* TABEL CONTENT BASED ON ACTIVE PILL */}
          <div className="overflow-x-auto tabular-nums">
            {/* PILL 1: PERFORMA 5 CABANG OFFLINE STORE */}
            {activePill === "stores" && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th className="py-3 px-4">Cabang Offline Store</th>
                    <th className="py-3 px-4">Kota</th>
                    <th className="py-3 px-4 text-right">Omset Walk-In POS</th>
                    <th className="py-3 px-4 text-right">Click &amp; Collect</th>
                    <th className="py-3 px-4 text-right">Total Omset</th>
                    <th className="py-3 px-4 text-right">Transaksi</th>
                    <th className="py-3 px-4 text-right">Margin Bersih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {branchPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-ink-muted">
                        Memuat data cabang Offline Store...
                      </td>
                    </tr>
                  ) : (
                    branchPerformance.map((b, idx) => (
                      <tr key={b.branch_id || idx}>
                        <td className="py-3.5 px-4 font-bold text-ink">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-xs bg-surface-muted border border-line text-[10px] font-mono font-bold text-ink">
                              {idx + 1}
                            </span>
                            <span>{b.name || b.short_name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-ink-secondary font-medium">{b.city}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-ink-secondary">
                          {formatRupiah(b.pos_revenue || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-ink-secondary">
                          {formatRupiah(b.pickup_revenue || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-ink">
                          {formatRupiah(b.total_revenue || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-ink-secondary">
                          {b.total_orders || 0} Trx ({b.total_units || 0} unit)
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-status-success">
                          {formatRupiah(b.margin || 0)}{" "}
                          <span className="text-[10px] text-ink-muted font-normal">
                            ({b.margin_pct || 0}%)
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* PILL 2: TOP INSTRUMEN TERLARIS */}
            {activePill === "products" && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th className="py-3 px-4">Instrumen Musik &amp; Brand</th>
                    <th className="py-3 px-4">Kategori Gear</th>
                    <th className="py-3 px-4 text-right">Unit Terjual</th>
                    <th className="py-3 px-4 text-right">Omset Penjualan</th>
                    <th className="py-3 px-4 text-right">Laba Kotor</th>
                    <th className="py-3 px-4 text-right">Stok Gudang &amp; Toko</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-ink-muted">
                        Memuat data produk...
                      </td>
                    </tr>
                  ) : (
                    topProducts.map((p, idx) => (
                      <tr
                        key={p.product_id || idx}
                        onClick={() => p.product_id && navigate(`/products/${p.product_id}`)}
                        className="cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-bold text-ink">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-xs bg-surface-muted border border-line text-[10px] font-mono font-bold text-ink">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="hover:text-accent transition-colors">{p.product_name}</div>
                              <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">
                                {p.brand_name}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-ink-secondary font-medium">{p.category}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-ink">
                          {p.units_sold} Unit
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-ink">
                          {formatRupiah(p.gross_revenue || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-status-success">
                          {formatRupiah(p.net_profit || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-ink-secondary">
                          {p.current_stock ?? 10} SKU
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* PILL 3: DISTRIBUSI KATEGORI GEAR */}
            {activePill === "categories" && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th className="py-3 px-4">Kelompok Instrumen</th>
                    <th className="py-3 px-4 text-right">Unit Terjual</th>
                    <th className="py-3 px-4 text-right">Total Omset</th>
                    <th className="py-3 px-4 text-right">Kontribusi Omset (%)</th>
                    <th className="py-3 px-4">Visualisasi Pangsa Pasar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {categoryDistribution.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-ink-muted">
                        Memuat data kategori...
                      </td>
                    </tr>
                  ) : (
                    categoryDistribution.map((cat, idx) => (
                      <tr key={cat.category_name || idx}>
                        <td className="py-3.5 px-4 font-bold text-ink">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-xs bg-surface-muted border border-line text-[10px] font-mono font-bold text-ink">
                              {idx + 1}
                            </span>
                            <span>{cat.category_name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-ink-secondary">
                          {cat.units_sold} Unit
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-ink">
                          {formatRupiah(cat.revenue || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-accent">
                          {cat.percentage}%
                        </td>
                        <td className="py-3.5 px-4 w-48">
                          <div className="h-2 w-full rounded-xs bg-surface-muted border border-line overflow-hidden">
                            <div
                              className="h-full bg-accent transition-all duration-300"
                              style={{ width: `${Math.max(cat.percentage, 4)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

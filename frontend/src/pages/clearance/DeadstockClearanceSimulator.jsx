import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Filter,
  Flame,
  Layers,
  Package,
  Percent,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Undo2,
  Zap,
} from "lucide-react";
import api from "../../api";
import { formatRupiah, formatDate, fileUrl } from "../../utils/format";

export default function DeadstockClearanceSimulator() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [items, setItems] = useState([]);
  const [kpis, setKpis] = useState({
    total_frozen_capital_deadstock: 0,
    total_frozen_capital_all: 0,
    total_deadstock_skus: 0,
    total_skus: 0,
    estimated_monthly_holding_cost_deadstock: 0,
    estimated_monthly_holding_cost_all: 0,
    active_clearance_count: 0,
  });
  const [agingDist, setAgingDist] = useState({});

  // Filter & Search
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'deadstock' | 'slow' | 'moderate' | 'fresh' | 'clearance'
  const [searchQuery, setSearchQuery] = useState("");

  // Simulator State
  const [selectedSku, setSelectedSku] = useState(null);
  const [discountPercent, setDiscountPercent] = useState(20);
  const [clearanceNote, setClearanceNote] = useState("Warehouse Clearance Sale");
  const [submitting, setSubmitting] = useState(false);

  // Load Aging Analysis Data
  function loadAgingData() {
    setLoading(true);
    setErrorMsg("");
    api
      .get("/clearance/aging-analysis")
      .then((res) => {
        const raw = res?.data || {};
        const d = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
        setItems(d);

        if (raw?.kpis) {
          setKpis({
            total_frozen_capital_deadstock: Number(raw.kpis?.total_frozen_capital_deadstock || 0),
            total_frozen_capital_all: Number(raw.kpis?.total_frozen_capital_all || 0),
            total_deadstock_skus: Number(raw.kpis?.total_deadstock_skus || 0),
            total_skus: Number(raw.kpis?.total_skus || 0),
            estimated_monthly_holding_cost_deadstock: Number(raw.kpis?.estimated_monthly_holding_cost_deadstock || 0),
            estimated_monthly_holding_cost_all: Number(raw.kpis?.estimated_monthly_holding_cost_all || 0),
            active_clearance_count: Number(raw.kpis?.active_clearance_count || 0),
          });
        }
        if (raw?.aging_distribution) {
          setAgingDist(raw.aging_distribution || {});
        }

        // Preselect the first deadstock item for simulation if available
        const firstDead = d.find((i) => i?.aging_bucket === "deadstock") || d[0] || null;
        if (!selectedSku && firstDead) {
          setSelectedSku(firstDead);
          if (firstDead.is_clearance_active && Number(firstDead.discount_percent || 0) > 0) {
            setDiscountPercent(Number(firstDead.discount_percent));
          }
        } else if (selectedSku) {
          const updatedSelected = d.find((i) => i?.variant_id === selectedSku.variant_id);
          if (updatedSelected) setSelectedSku(updatedSelected);
        }
      })
      .catch((err) => {
        console.error("Gagal memuat data aging:", err);
        const msg = err?.response?.data?.message || err?.message || "Gagal memuat analisis umur stok instrumen.";
        setErrorMsg(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAgingData();
  }, []);

  // Filtered Items (Guaranteed safe array)
  const filteredItems = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    let result = list;
    if (activeTab === "deadstock") {
      result = result.filter((i) => i?.aging_bucket === "deadstock");
    } else if (activeTab === "slow") {
      result = result.filter((i) => i?.aging_bucket === "slow");
    } else if (activeTab === "moderate") {
      result = result.filter((i) => i?.aging_bucket === "moderate");
    } else if (activeTab === "fresh") {
      result = result.filter((i) => i?.aging_bucket === "fresh");
    } else if (activeTab === "clearance") {
      result = result.filter((i) => Boolean(i?.is_clearance_active));
    }

    const q = (searchQuery || "").trim().toLowerCase();
    if (q) {
      result = result.filter(
        (i) =>
          (i?.sku_code || "").toLowerCase().includes(q) ||
          (i?.product_name || "").toLowerCase().includes(q) ||
          (i?.variant_name || "").toLowerCase().includes(q) ||
          (i?.brand_name || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, activeTab, searchQuery]);

  // Target Item for Simulation
  const targetItem = selectedSku || (filteredItems.length > 0 ? filteredItems[0] : null);

  // Real-time Simulation Calculations for Selected SKU
  const simulationResult = useMemo(() => {
    if (!targetItem) {
      return {
        simulatedPrice: 0,
        profitPerUnit: 0,
        marginPct: "0.0",
        marginNum: 0,
        projectedCash: 0,
        totalProjectedProfit: 0,
        guardrailStatus: "SAFE_PROFIT",
      };
    }
    const price = Number(targetItem?.price || 0);
    const cost = Number(targetItem?.cost_price || 0);
    const stock = Number(targetItem?.stock || 0);
    const disc = Number(discountPercent || 0);

    const simulatedPrice = Math.max(0, Math.round(price * (1 - disc / 100)));
    const profitPerUnit = simulatedPrice - cost;
    const marginNum = simulatedPrice > 0 ? (profitPerUnit / simulatedPrice) * 100 : 0;
    const marginPct = Number(marginNum || 0).toFixed(1);
    const projectedCash = simulatedPrice * stock;
    const totalProjectedProfit = profitPerUnit * stock;

    let guardrailStatus = "SAFE_PROFIT";
    if (simulatedPrice < cost) {
      guardrailStatus = "BELOW_COGS_DANGER";
    } else if (marginNum <= 5.0 || simulatedPrice <= cost * 1.05) {
      guardrailStatus = "BREAK_EVEN";
    }

    return {
      simulatedPrice,
      profitPerUnit,
      marginPct,
      marginNum,
      projectedCash,
      totalProjectedProfit,
      guardrailStatus,
    };
  }, [targetItem, discountPercent]);

  // Apply Clearance Price to Catalog
  function handleApplyClearance(variantIds, discount, note) {
    if (!variantIds || variantIds.length === 0) {
      toast.error("Pilih minimal 1 SKU instrumen.");
      return;
    }
    setSubmitting(true);
    api
      .post("/clearance/apply", {
        variant_ids: variantIds,
        discount_percent: discount,
        clearance_note: note,
      })
      .then((res) => {
        toast.success(res.data?.message || "Harga clearance berhasil diterapkan ke katalog!");
        loadAgingData();
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Gagal menerapkan diskon clearance.");
      })
      .finally(() => setSubmitting(false));
  }

  // Revoke Clearance Price (Back to Normal)
  function handleRevokeClearance(variantId) {
    setSubmitting(true);
    api
      .post(`/clearance/revoke/${variantId}`)
      .then((res) => {
        toast.success(res.data?.message || "Promo clearance dibatalkan. Harga kembali normal.");
        loadAgingData();
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Gagal membatalkan promo clearance.");
      })
      .finally(() => setSubmitting(false));
  }

  const getBucketBadge = (bucket, days) => {
    const d = Number(days || 0);
    switch (bucket) {
      case "deadstock":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700 border border-red-200">
            <Flame size={12} className="text-red-600" /> Deadstock ({d}h)
          </span>
        );
      case "slow":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
            <Clock size={12} className="text-amber-600" /> Slow-Moving ({d}h)
          </span>
        );
      case "moderate":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800 border border-blue-200">
            <TrendingUp size={12} className="text-blue-600" /> Moderate ({d}h)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
            <Sparkles size={12} className="text-emerald-600" /> Fresh ({d}h)
          </span>
        );
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-jakarta text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Deadstock Aging &amp; Clearance Simulator
            </h1>
            <span className="rounded-full bg-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              MIS × Finance × TPS
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Analisis umur mengendap inventaris instrumen musik dan simulator diskon cuci gudang anti-rugi
            dengan guardrail HPP yang langsung terhubung ke harga coret katalog publik.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAgingData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-gray-400" : "text-gray-600"} />
            Perbarui Data
          </button>
        </div>
      </div>

      {/* Error Banner If API fails */}
      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center justify-between gap-3 text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={loadAgingData}
            className="rounded-lg bg-red-600 px-3 py-1.5 font-bold text-white hover:bg-red-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Frozen Capital Deadstock */}
        <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50/50 via-white to-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">Frozen Capital (Deadstock)</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-gray-900 tracking-tight">
            {formatRupiah(kpis?.total_frozen_capital_deadstock || 0)}
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            Modal HPP tertahan pada instrumen &gt; 90 hari di gudang
          </p>
        </div>

        {/* KPI 2: Jumlah SKU Deadstock */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">SKU Deadstock (&gt;90 Hari)</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
              <Flame size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-gray-900 tracking-tight">
            {Number(kpis?.total_deadstock_skus || 0).toLocaleString("id-ID")}{" "}
            <span className="text-sm font-normal text-gray-500">
              / {Number(kpis?.total_skus || 0).toLocaleString("id-ID")} SKU
            </span>
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            Varian instrumen yang tidak berputar lebih dari 3 bulan
          </p>
        </div>

        {/* KPI 3: Estimasi Holding Cost Bulanan */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Holding Cost Bulanan</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <TrendingDown size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-gray-900 tracking-tight">
            {formatRupiah(kpis?.estimated_monthly_holding_cost_deadstock || 0)}
            <span className="text-xs font-normal text-gray-400"> /bln</span>
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            Beban sewa &amp; dehumidifier ruangan instrumen (1.5%/bln)
          </p>
        </div>

        {/* KPI 4: Promo Clearance Aktif */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/40 via-white to-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Clearance Aktif di Katalog</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Zap size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-gray-900 tracking-tight">
            {Number(kpis?.active_clearance_count || 0).toLocaleString("id-ID")}{" "}
            <span className="text-sm font-normal text-gray-500">SKU Tayang</span>
          </p>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">
            Ditampilkan dengan harga coret di etalase publik
          </p>
        </div>
      </div>

      {/* Simulator Interaktif & Margin Guardrail Panel */}
      {targetItem ? (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                  <Sliders size={12} /> Margin Guardrail Simulator
                </span>
                {getBucketBadge(targetItem?.aging_bucket, targetItem?.aging_days)}
              </div>
              <h2 className="mt-2 text-xl font-black text-gray-900">
                {targetItem?.product_name} — {targetItem?.variant_name}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5 font-mono">
                SKU: <span className="text-gray-800 font-semibold">{targetItem?.sku_code}</span> • Brand: {targetItem?.brand_name || "Official"} • Stok Gudang: <span className="font-bold text-gray-900">{Number(targetItem?.stock || 0).toLocaleString("id-ID")} unit</span>
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {targetItem?.is_clearance_active ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleRevokeClearance(targetItem.variant_id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition shadow-xs"
                >
                  <RotateCcw size={14} />
                  Kembalikan ke Harga Normal
                </button>
              ) : null}
              <button
                type="button"
                disabled={submitting || simulationResult?.guardrailStatus === "BELOW_COGS_DANGER"}
                onClick={() =>
                  handleApplyClearance([targetItem.variant_id], discountPercent, clearanceNote)
                }
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition shadow-sm ${
                  simulationResult?.guardrailStatus === "BELOW_COGS_DANGER"
                    ? "bg-gray-300 cursor-not-allowed text-gray-500"
                    : "bg-black hover:bg-gray-800"
                }`}
              >
                <Zap size={14} />
                Terapkan Harga Clearance ke Katalog
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
            {/* Left Column: Interactive Slider (Col 7) */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                    Geser Persentase Diskon Cuci Gudang
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-2xl font-black text-gray-900">{discountPercent}%</span>
                    <span className="text-xs text-gray-400">OFF</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-black transition"
                />

                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 font-medium">
                  <span>0% (Normal)</span>
                  <span className="text-emerald-600 font-semibold">15% - 25% (Rekomendasi Aman)</span>
                  <span className="text-amber-600 font-semibold">30% - 35% (Break-Even)</span>
                  <span className="text-red-500 font-semibold">50% Max</span>
                </div>
              </div>

              {/* Guardrail Warning Banner */}
              {simulationResult?.guardrailStatus === "BELOW_COGS_DANGER" && (
                <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-4 flex items-start gap-3 animate-pulse">
                  <ShieldAlert className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-900">
                      PERINGATAN BAHAYA: HARGA SETELAH DISKON DI BAWAH HPP (JUAL RUGI)!
                    </h4>
                    <p className="text-xs text-red-700 mt-1 leading-relaxed">
                      Harga simulasi <strong>{formatRupiah(simulationResult?.simulatedPrice || 0)}</strong> lebih rendah dari
                      harga modal HPP <strong>{formatRupiah(targetItem?.cost_price || 0)}</strong>. Perusahaan akan menderita
                      rugi kotor <strong>{formatRupiah(Math.abs(Number(simulationResult?.profitPerUnit || 0)))}</strong> per unit.
                      Batas diskon aman maksimal untuk SKU ini adalah{" "}
                      <strong>{Number(targetItem?.max_safe_discount_percent || 0).toFixed(1)}%</strong>.
                    </p>
                  </div>
                </div>
              )}

              {simulationResult?.guardrailStatus === "BREAK_EVEN" && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      STATUS BREAK-EVEN (FOKUS PENCAIRAN KAS CEPAT)
                    </h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Margin keuntungan tipis ({simulationResult?.marginPct}%). Diskon ini efektif mencairkan modal kas
                      yang mengendap tanpa mengalami kerugian kotor di bawah HPP.
                    </p>
                  </div>
                </div>
              )}

              {simulationResult?.guardrailStatus === "SAFE_PROFIT" && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">
                      STATUS GUARDRAIL: AMAN &amp; MENGUNTUNGKAN (SAFE PROFIT)
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Harga diskon masih memberikan laba bersih {simulationResult?.marginPct}% di atas HPP dan menutupi
                      beban holding cost gudang.
                    </p>
                  </div>
                </div>
              )}

              {/* Clearance Note Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Label / Catatan Promo Clearance di Etalase
                </label>
                <input
                  type="text"
                  value={clearanceNote}
                  onChange={(e) => setClearanceNote(e.target.value)}
                  placeholder="Contoh: Year-End Warehouse Clearance, Cuci Gudang Display Showroom"
                  className="w-full rounded-xl border border-gray-200 bg-[#F9FAFB] px-4 py-2.5 text-xs font-medium text-gray-900 outline-none focus:border-black focus:bg-white"
                />
              </div>
            </div>

            {/* Right Column: Real-Time Financial Metric Cards (Col 5) */}
            <div className="lg:col-span-5 bg-[#F9FAFB] rounded-2xl border border-gray-200 p-5 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-600 border-b border-gray-200 pb-2">
                Kalkulasi Finansial Real-Time (Per Unit &amp; Total Stok)
              </h3>

              <div className="space-y-3 text-xs">
                {/* Harga Normal vs Baru */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Harga Asli Normal:</span>
                  <span className="font-semibold line-through text-gray-400">
                    {formatRupiah(targetItem?.price || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="font-bold text-gray-900">Harga Jual Baru (Clearance):</span>
                  <span className="text-base font-black text-black">
                    {formatRupiah(simulationResult?.simulatedPrice || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Modal HPP (Cost Price):</span>
                  <span className="font-semibold text-gray-700">
                    {formatRupiah(targetItem?.cost_price || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Laba Bersih Per Unit:</span>
                  <span
                    className={`font-bold ${
                      Number(simulationResult?.profitPerUnit || 0) < 0
                        ? "text-red-600"
                        : Number(simulationResult?.profitPerUnit || 0) === 0
                        ? "text-amber-600"
                        : "text-emerald-700"
                    }`}
                  >
                    {formatRupiah(simulationResult?.profitPerUnit || 0)} ({simulationResult?.marginPct}%)
                  </span>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Stok Mengendap:</span>
                    <span className="font-bold text-gray-900">{Number(targetItem?.stock || 0).toLocaleString("id-ID")} unit</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Modal Tertahan (HPP):</span>
                    <span className="font-semibold text-gray-800">
                      {formatRupiah(targetItem?.frozen_capital || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                    <span className="font-bold text-gray-900">Proyeksi Pencairan Kas:</span>
                    <span className="text-sm font-black text-emerald-700">
                      {formatRupiah(simulationResult?.projectedCash || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : loading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 animate-pulse space-y-4">
          <div className="h-6 w-1/3 bg-gray-200 rounded-lg" />
          <div className="h-4 w-1/2 bg-gray-100 rounded-lg" />
          <div className="h-40 bg-gray-50 rounded-2xl" />
        </div>
      ) : null}

      {/* Inventory Aging Table & Filter Controls */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-gray-100 border border-gray-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === "all" ? "bg-white text-black shadow-xs font-bold" : "text-gray-600 hover:text-black"
              }`}
            >
              Semua ({Number(items?.length || 0).toLocaleString("id-ID")})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("deadstock")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                activeTab === "deadstock"
                  ? "bg-red-600 text-white shadow-xs font-bold"
                  : "text-red-700 hover:bg-red-50"
              }`}
            >
              <Flame size={12} /> Deadstock &gt;90h ({Number(agingDist?.deadstock?.count || 0).toLocaleString("id-ID")})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("slow")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === "slow" ? "bg-white text-black shadow-xs font-bold" : "text-gray-600 hover:text-black"
              }`}
            >
              Slow-Moving 61–90h ({Number(agingDist?.slow?.count || 0).toLocaleString("id-ID")})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("moderate")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === "moderate" ? "bg-white text-black shadow-xs font-bold" : "text-gray-600 hover:text-black"
              }`}
            >
              Moderate 31–60h ({Number(agingDist?.moderate?.count || 0).toLocaleString("id-ID")})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("clearance")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                activeTab === "clearance"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              <Zap size={12} /> Sedang Clearance ({Number(kpis?.active_clearance_count || 0).toLocaleString("id-ID")})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari SKU, nama produk..."
              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-1.5 text-xs outline-none focus:border-black"
            />
          </div>
        </div>

        {/* SKU Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#F9FAFB] border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-3.5 px-4">Instrumen &amp; Varian SKU</th>
                  <th className="py-3.5 px-4">Kategori Umur (Aging)</th>
                  <th className="py-3.5 px-4 text-center">Stok Fisik</th>
                  <th className="py-3.5 px-4">HPP (Modal)</th>
                  <th className="py-3.5 px-4">Harga Normal</th>
                  <th className="py-3.5 px-4">Status &amp; Harga Clearance</th>
                  <th className="py-3.5 px-4 text-right">Aksi Simulasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(Array.isArray(filteredItems) ? filteredItems : []).map((sku) => {
                  const isSelected = targetItem?.variant_id === sku.variant_id;
                  return (
                    <tr
                      key={sku.variant_id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        isSelected ? "bg-amber-50/30" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{sku?.product_name || "Produk"}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {sku?.variant_name} • <span className="font-mono text-gray-700">{sku?.sku_code}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getBucketBadge(sku?.aging_bucket, sku?.aging_days)}
                        <div className="text-[10px] text-gray-400 mt-1">
                          Masuk: {formatDate(sku?.stock_in_date)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-gray-900 text-sm">
                          {Number(sku?.stock || 0).toLocaleString("id-ID")}
                        </span>
                        <div className="text-[10px] text-gray-400">unit</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-gray-600">
                        {formatRupiah(sku?.cost_price || 0)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        {formatRupiah(sku?.price || 0)}
                      </td>

                      <td className="py-3.5 px-4">
                        {sku?.is_clearance_active ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                              CLEARANCE -{sku?.discount_percent}%
                            </span>
                            <div className="font-bold text-emerald-700 text-xs font-mono">
                              {formatRupiah(sku?.clearance_price || 0)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Harga Normal (Non-Promo)</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSku(sku);
                              if (Number(sku?.discount_percent || 0) > 0) {
                                setDiscountPercent(Number(sku.discount_percent));
                              }
                              window.scrollTo({ top: 150, behavior: "smooth" });
                            }}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition shadow-xs ${
                              isSelected
                                ? "bg-black text-white"
                                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            Pilih Simulasi
                          </button>
                          {sku?.is_clearance_active && (
                            <button
                              type="button"
                              onClick={() => handleRevokeClearance(sku.variant_id)}
                              className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 transition"
                              title="Batal Promo Clearance"
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredItems.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400 text-xs">
                      Tidak ada varian instrumen yang sesuai dengan filter atau kata kunci pencarian.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400 text-xs">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-gray-400" />
                        <span>Memuat data aging dan inventaris instrumen...</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

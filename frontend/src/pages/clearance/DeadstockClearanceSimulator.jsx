import React, { useState, useEffect, useMemo } from "react";
import {
  Flame,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  Percent,
  Clock,
  Tag,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  Package,
  ArrowUpRight,
  XCircle,
  Layers,
  Snowflake,
  Zap,
} from "lucide-react";
import api from "../../api";
import { formatRupiah } from "../../utils/format";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function DeadstockClearanceSimulator() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [esAdvisorData, setEsAdvisorData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedItem, setSelectedItem] = useState(null);
  const [discountInput, setDiscountInput] = useState(15);
  const [campaignTitle, setCampaignTitle] = useState(
    "Year-End Boutique Instrument Clearance"
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadAnalysisData();
  }, []);

  async function loadAnalysisData() {
    setLoading(true);
    try {
      const [analysisRes, esRes] = await Promise.allSettled([
        api.get("/clearance/aging-analysis"),
        api.get("/es/deadstock-advisor"),
      ]);

      const raw = (analysisRes.status === "fulfilled" ? analysisRes.value?.data : null) || {};
      if (esRes.status === "fulfilled" && esRes.value?.data?.recommendations) {
        setEsAdvisorData(esRes.value.data.recommendations);
      }
      const mappedItems = (raw.data || []).map((i) => {
        const sellingPrice = Number(i.price || 0);
        const costPrice = Number(i.cost_price || 0);
        const currentStock = Number(i.stock || 0);
        const agingStatus =
          i.aging_bucket === "deadstock"
            ? "DEADSTOCK"
            : i.aging_bucket === "slow"
            ? "SLOW_MOVING"
            : "FAST_MOVING";
        const maxSafe =
          i.max_safe_discount_percent !== undefined
            ? Number(i.max_safe_discount_percent)
            : sellingPrice > 0
            ? Number((((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1))
            : 25;
        return {
          ...i,
          selling_price: sellingPrice,
          cost_price: costPrice,
          current_stock: currentStock,
          aging_status: agingStatus,
          days_unsold: Number(i.aging_days || 0),
          has_active_clearance: Boolean(i.is_clearance_active),
          active_discount_percent: Number(i.discount_percent || 0),
          active_promo_price: Number(i.clearance_price || sellingPrice),
          max_safe_discount_percent: maxSafe,
          recommended_discount_percent:
            agingStatus === "DEADSTOCK" ? 20 : agingStatus === "SLOW_MOVING" ? 15 : 10,
          tied_up_capital: Number(i.frozen_capital || costPrice * currentStock),
          initial_margin_percent:
            sellingPrice > 0
              ? Number((((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1))
              : 0,
        };
      });

      const mappedSummary = {
        deadstock_count: Number(
          raw.kpis?.total_deadstock_skus ?? raw.aging_distribution?.deadstock?.count ?? 0
        ),
        slow_moving_count: Number(raw.aging_distribution?.slow?.count ?? 0),
        total_tied_up_capital: Number(
          raw.kpis?.total_frozen_capital_deadstock ||
            raw.kpis?.total_frozen_capital_all ||
            0
        ),
        potential_cash_recovery: Math.round(
          Number(raw.kpis?.total_frozen_capital_all || 0) * 1.18
        ),
        active_clearance_count: Number(raw.kpis?.active_clearance_count || 0),
      };

      setSummary(mappedSummary);
      setItems(mappedItems);

      if (!selectedItem && mappedItems.length > 0) {
        const firstDead =
          mappedItems.find((i) => i.aging_status === "DEADSTOCK") || mappedItems[0];
        handleSelectItemForSimulation(firstDead);
      } else if (selectedItem) {
        const updated = mappedItems.find(
          (i) => i.variant_id === selectedItem.variant_id
        );
        if (updated) handleSelectItemForSimulation(updated);
      }
    } catch (err) {
      console.error("Failed loading Deadstock Clearance Analysis:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectItemForSimulation(item) {
    setSelectedItem(item);
    setDiscountInput(
      item.active_discount_percent > 0
        ? item.active_discount_percent
        : item.recommended_discount_percent || 10
    );
    setFeedback(null);
  }

  const simMetrics = useMemo(() => {
    if (!selectedItem) return null;
    const normalPrice = selectedItem.selling_price;
    const cogs = selectedItem.cost_price;
    const stock = selectedItem.current_stock;
    const discPct = Number(discountInput) || 0;

    const promoPrice = Math.round(normalPrice * (1 - discPct / 100));
    const discountNominal = normalPrice - promoPrice;
    const netProfitPerUnit = promoPrice - cogs;
    const postPromoMarginPct =
      promoPrice > 0 ? Number(((netProfitPerUnit / promoPrice) * 100).toFixed(2)) : 0;

    const totalCashRecovery = promoPrice * stock;
    const totalNetProfitRecovery = netProfitPerUnit * stock;
    const isBelowCogs = promoPrice < cogs;
    const isWarningZone = !isBelowCogs && postPromoMarginPct < 5.0;

    return {
      normalPrice,
      cogs,
      stock,
      discPct,
      promoPrice,
      discountNominal,
      netProfitPerUnit,
      postPromoMarginPct,
      totalCashRecovery,
      totalNetProfitRecovery,
      isBelowCogs,
      isWarningZone,
    };
  }, [selectedItem, discountInput]);

  const esAdviceByVariant = useMemo(() => {
    const map = new Map();
    for (const r of esAdvisorData) {
      if (r.variant_id) map.set(r.variant_id, r);
      if (r.sku_code) map.set(r.sku_code, r);
    }
    return map;
  }, [esAdvisorData]);

  const selectedItemEsAdvice = useMemo(() => {
    if (!selectedItem) return null;
    return (
      esAdviceByVariant.get(selectedItem.variant_id) ||
      esAdviceByVariant.get(selectedItem.sku_code) ||
      null
    );
  }, [selectedItem, esAdviceByVariant]);

  async function handleApplyClearancePromo() {
    if (!selectedItem || !simMetrics) return;
    if (simMetrics.isBelowCogs) {
      setFeedback({
        type: "error",
        message:
          "DITOLAK SISTEM: Harga promo berada di bawah HPP/COGS! Silakan kurangi persentase diskon.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.post("/clearance/apply", {
        variant_ids: [selectedItem.variant_id],
        discount_percent: simMetrics.discPct,
        clearance_note: `${campaignTitle} (${selectedItem.aging_status} - ${selectedItem.days_unsold} hari)`,
      });

      setFeedback({
        type: "success",
        message: res.data.message || "Promo Clearance berhasil diaktifkan.",
      });
      await loadAnalysisData();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || "Gagal mengaktifkan promo clearance.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivatePromo(variantId) {
    setSubmitting(true);
    try {
      await api.post(`/clearance/revoke/${variantId}`);
      setFeedback({
        type: "success",
        message: "Promo clearance dihentikan & harga instrumen kembali normal.",
      });
      await loadAnalysisData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchQuery =
        (item.product_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.brand_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PROMO_ACTIVE" && item.has_active_clearance) ||
        item.aging_status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [items, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-ink border-t-transparent" />
          <p className="text-xs font-medium text-ink-muted">
            Menganalisis Umur Stok Gudang &amp; Mengkalkulasi Margin Guardrail...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="accent">Inventory Aging &amp; Margin Protection</Badge>
            <Badge variant="success">Anti-Loss COGS Guardrail Active</Badge>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Deadstock Clearance &amp; Margin Guardrail Simulator
          </h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-secondary sm:text-sm">
            Identifikasi instrumen mengendap (<i>Slow-Moving</i> &amp; <i>Deadstock</i>),
            simulasikan pencairan modal kas (<i>Working Capital Recovery</i>), dan terbitkan
            diskon Clearance yang dijamin{" "}
            <strong className="text-ink">100% aman di atas HPP/COGS</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={loadAnalysisData}>
            <RefreshCw size={14} aria-hidden="true" />
            Segarkan Analisis Umur Stok
          </Button>
        </div>
      </div>

      {/* 4 KARTU RINGKASAN EKSEKUTIF */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-status-danger">
                Deadstock (&gt;120 Hari)
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-status-danger/30 bg-status-danger/10 text-status-danger">
                <Flame size={16} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-ink tabular-nums">
              {summary.deadstock_count}{" "}
              <span className="text-xs font-normal text-ink-secondary">SKU Instrumen</span>
            </p>
            <p className="mt-1 text-[11px] text-ink-muted">
              Prioritas utama pencairan likuiditas kas
            </p>
          </div>

          <div className="rounded-md border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-status-warning">
                Slow-Moving (60–120 Hari)
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-status-warning/30 bg-status-warning/10 text-status-warning">
                <Clock size={16} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-ink tabular-nums">
              {summary.slow_moving_count}{" "}
              <span className="text-xs font-normal text-ink-secondary">SKU Instrumen</span>
            </p>
            <p className="mt-1 text-[11px] text-ink-muted">
              Perlu akselerasi promo bundel / diskon ringan
            </p>
          </div>

          <div className="rounded-md border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Modal Tertahan (Tied-Up Capital)
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-surface-muted text-ink">
                <DollarSign size={16} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 font-display text-xl font-bold text-ink tabular-nums">
              {formatRupiah(summary.total_tied_up_capital)}
            </p>
            <p className="mt-1 text-[11px] text-ink-muted">
              Akumulasi nilai HPP pada stok Dead &amp; Slow
            </p>
          </div>

          <div className="rounded-md border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-status-success">
                Potensi Pencairan Kas
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-status-success/30 bg-status-success/10 text-status-success">
                <Sparkles size={16} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 font-display text-xl font-bold text-status-success tabular-nums">
              {formatRupiah(summary.potential_cash_recovery)}
            </p>
            <p className="mt-1 text-[11px] text-ink-muted">
              Promo aktif saat ini:{" "}
              <b className="text-ink">{summary.active_clearance_count} SKU</b>
            </p>
          </div>
        </div>
      )}

      {/* PANEL UTAMA: SIMULATOR INTERAKTIF + DAFTAR SKU */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* KOLOM KIRI: MARGIN GUARDRAIL SIMULATOR PANEL (5 KOLOM) */}
        <div className="space-y-5 lg:col-span-5">
          {selectedItem && simMetrics ? (
            <div className="sticky top-20 space-y-5 rounded-md border border-line bg-surface p-5">
              {/* Header Instrumen Terpilih */}
              <div className="flex items-start justify-between border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  {selectedItem.image_url ? (
                    <img
                      src={selectedItem.image_url}
                      alt={selectedItem.product_name}
                      className="h-12 w-12 rounded-sm border border-line object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-line bg-surface-muted text-ink-muted">
                      <Package size={20} aria-hidden="true" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-xs bg-ink px-2 py-0.5 font-mono text-[10px] font-bold text-canvas">
                        {selectedItem.sku_code}
                      </span>
                      <Badge
                        variant={
                          selectedItem.aging_status === "DEADSTOCK"
                            ? "danger"
                            : selectedItem.aging_status === "SLOW_MOVING"
                            ? "warning"
                            : "success"
                        }
                      >
                        {selectedItem.aging_status} ({selectedItem.days_unsold} Hari)
                      </Badge>
                    </div>
                    <h2 className="mt-1 font-display text-sm font-bold text-ink">
                      {selectedItem.product_name}
                    </h2>
                    <p className="text-xs text-ink-secondary">
                      {selectedItem.variant_name} • Stok Gudang:{" "}
                      <b className="text-ink tabular-nums">
                        {selectedItem.current_stock} unit
                      </b>
                    </p>
                  </div>
                </div>
              </div>

              {/* Informasi Struktur Harga & Batas Aman HPP */}
              <div className="grid grid-cols-3 gap-2.5 text-center tabular-nums">
                <div className="rounded-sm border border-line bg-surface-muted/60 p-3">
                  <span className="text-[10px] font-bold uppercase text-ink-muted">
                    Harga Normal
                  </span>
                  <p className="mt-1 text-xs font-bold text-ink">
                    {formatRupiah(selectedItem.selling_price)}
                  </p>
                </div>

                <div className="rounded-sm border border-line bg-surface-muted/60 p-3">
                  <span className="text-[10px] font-bold uppercase text-ink-muted">
                    HPP / COGS
                  </span>
                  <p className="mt-1 text-xs font-bold text-status-danger">
                    {formatRupiah(selectedItem.cost_price)}
                  </p>
                </div>

                <div className="rounded-sm border border-status-success/30 bg-status-success/10 p-3">
                  <span className="text-[10px] font-bold uppercase text-status-success">
                    Max Diskon Aman
                  </span>
                  <p className="mt-1 text-xs font-bold text-status-success">
                    {selectedItem.max_safe_discount_percent}%
                  </p>
                </div>
              </div>

              {/* ES Deadstock Advisor Insight Card */}
              {selectedItemEsAdvice && (
                <div className="rounded-sm border border-accent/40 bg-accent/5 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-accent">
                      <Sparkles size={14} className="text-accent" />
                      <span>Saran Taktis ES Deadstock Advisor</span>
                    </div>
                    <Badge variant="accent">
                      CF: {Math.round((selectedItemEsAdvice.certainty_factor || 0.85) * 100)}%
                    </Badge>
                  </div>
                  <div className="text-[11px] leading-relaxed text-ink-secondary">
                    <p className="font-semibold text-ink">
                      Rekomendasi Tindakan:{" "}
                      <span className="font-mono text-accent">
                        {selectedItemEsAdvice.tactical_action?.replace(/_/g, " ") || "STRATEGY"}
                      </span>
                    </p>
                    <p className="mt-1 text-ink-secondary">
                      {selectedItemEsAdvice.advice}
                    </p>
                  </div>
                </div>
              )}

              {/* Slider Simulasi Diskon */}
              <div className="space-y-3 rounded-sm border border-line bg-canvas p-4">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="clearance-discount-slider"
                    className="text-xs font-bold text-ink"
                  >
                    Simulasi Persentase Diskon Clearance:
                  </label>
                  <span
                    className={`rounded-xs px-2.5 py-0.5 font-mono text-sm font-bold tabular-nums ${
                      simMetrics.isBelowCogs
                        ? "bg-status-danger text-white"
                        : simMetrics.isWarningZone
                        ? "bg-status-warning text-white"
                        : "bg-ink text-canvas"
                    }`}
                  >
                    {simMetrics.discPct}% OFF
                  </span>
                </div>

                <input
                  id="clearance-discount-slider"
                  type="range"
                  min="1"
                  max={Math.min(70, Math.round(selectedItem.max_safe_discount_percent + 15))}
                  step="0.5"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(Number(e.target.value))}
                  className="w-full cursor-pointer accent-accent"
                />

                {/* Tombol Cepat Rekomendasi */}
                <div className="flex flex-wrap items-center justify-between gap-1 pt-1 text-[11px] tabular-nums">
                  <button
                    type="button"
                    onClick={() =>
                      setDiscountInput(selectedItem.recommended_discount_percent || 10)
                    }
                    className="rounded-xs border border-line bg-surface px-2.5 py-1 font-semibold text-ink hover:border-line-strong"
                  >
                    Saran Sistem ({selectedItem.recommended_discount_percent || 10}%)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDiscountInput(
                        Math.max(
                          1,
                          Number((selectedItem.max_safe_discount_percent - 5).toFixed(1))
                        )
                      )
                    }
                    className="rounded-xs border border-line bg-surface px-2.5 py-1 font-semibold text-ink hover:border-line-strong"
                  >
                    Margin Tipis 5%
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountInput(selectedItem.max_safe_discount_percent)}
                    className="rounded-xs border border-status-warning/40 bg-status-warning/10 px-2.5 py-1 font-semibold text-status-warning hover:bg-status-warning/20"
                  >
                    Batas Impas HPP ({selectedItem.max_safe_discount_percent}%)
                  </button>
                </div>
              </div>

              {/* Indikator Margin Guardrail Live */}
              <div
                className={`rounded-sm border p-4 transition-all ${
                  simMetrics.isBelowCogs
                    ? "border-status-danger/40 bg-status-danger/10 text-status-danger"
                    : simMetrics.isWarningZone
                    ? "border-status-warning/40 bg-status-warning/10 text-status-warning"
                    : "border-status-success/40 bg-status-success/10 text-status-success"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {simMetrics.isBelowCogs ? (
                    <ShieldAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                  ) : simMetrics.isWarningZone ? (
                    <AlertTriangle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <ShieldCheck size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                  )}
                  <div className="space-y-1 text-xs">
                    <p className="font-bold uppercase tracking-wide">
                      {simMetrics.isBelowCogs
                        ? "MARGIN GUARDRAIL BLOCKED: RUGI DI BAWAH HPP!"
                        : simMetrics.isWarningZone
                        ? "PERINGATAN: MARGIN SANGAT TIPIS (< 5%)"
                        : "GUARDRAIL LOLOS: MARGIN POSITIF & AMAN"}
                    </p>
                    <p className="text-[11px] leading-relaxed text-ink-secondary">
                      {simMetrics.isBelowCogs
                        ? `Harga promo (${formatRupiah(
                            simMetrics.promoPrice
                          )}) lebih rendah dari HPP (${formatRupiah(
                            simMetrics.cogs
                          )}). Sistem mengunci tombol aktivasi agar toko tidak rugi.`
                        : `Harga promo menghasilkan laba bersih ${formatRupiah(
                            simMetrics.netProfitPerUnit
                          )} per unit (Margin pasca-diskon: ${simMetrics.postPromoMarginPct}%).`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rincian Hasil Simulasi Finansial */}
              <div className="space-y-2.5 border-t border-line pt-3 text-xs tabular-nums">
                <div className="flex justify-between">
                  <span className="text-ink-secondary">Harga Clearance Baru:</span>
                  <span className="font-display text-sm font-bold text-ink">
                    {formatRupiah(simMetrics.promoPrice)}{" "}
                    <span className="text-[11px] font-normal text-status-danger">
                      (-{formatRupiah(simMetrics.discountNominal)})
                    </span>
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-ink-secondary">Laba Bersih / Unit:</span>
                  <span
                    className={`font-bold ${
                      simMetrics.netProfitPerUnit >= 0
                        ? "text-status-success"
                        : "text-status-danger"
                    }`}
                  >
                    {formatRupiah(simMetrics.netProfitPerUnit)} ({simMetrics.postPromoMarginPct}%)
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-ink-secondary">
                    Total Kas Cair ({simMetrics.stock} unit terjual):
                  </span>
                  <span className="font-bold text-ink">
                    {formatRupiah(simMetrics.totalCashRecovery)}
                  </span>
                </div>

                <div className="pt-2">
                  <label
                    htmlFor="clearance-campaign-title"
                    className="block text-[11px] font-bold text-ink-secondary"
                  >
                    Judul Kampanye Promo
                  </label>
                  <input
                    id="clearance-campaign-title"
                    type="text"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    className="ot-input mt-1 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Feedback Message */}
              {feedback && (
                <div
                  className={`rounded-sm border p-3 text-xs font-bold ${
                    feedback.type === "success"
                      ? "border-status-success/30 bg-status-success/10 text-status-success"
                      : "border-status-danger/30 bg-status-danger/10 text-status-danger"
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              {/* Tombol Aktivasi / Nonaktifkan */}
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  variant="primary"
                  disabled={submitting || simMetrics.isBelowCogs}
                  onClick={handleApplyClearancePromo}
                  className="w-full"
                >
                  <Tag size={15} aria-hidden="true" />
                  {selectedItem.has_active_clearance
                    ? `Perbarui Promo Clearance (${simMetrics.discPct}% OFF)`
                    : `Aktifkan Promo Clearance (${simMetrics.discPct}% OFF)`}
                </Button>

                {selectedItem.has_active_clearance && (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={submitting}
                    onClick={() => handleDeactivatePromo(selectedItem.variant_id)}
                    className="w-full"
                  >
                    <XCircle size={14} aria-hidden="true" />
                    Hentikan Promo &amp; Kembalikan Harga Normal
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-line bg-surface p-8 text-center text-xs text-ink-muted">
              Pilih salah satu SKU instrumen di sebelah kanan untuk mensimulasikan diskon
              Clearance.
            </div>
          )}
        </div>

        {/* KOLOM KANAN: TABEL ANALISIS UMUR STOK (7 KOLOM) */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-md border border-line bg-surface">
            {/* Filter Bar */}
            <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  placeholder="Cari nama instrumen, SKU, atau brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Cari nama instrumen, SKU, atau brand"
                  className="w-full rounded-sm border border-line bg-canvas py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "ALL", label: "Semua" },
                  { id: "DEADSTOCK", label: "Deadstock (>120h)" },
                  { id: "SLOW_MOVING", label: "Slow (60-120h)" },
                  { id: "FAST_MOVING", label: "Fast (<60h)" },
                  { id: "PROMO_ACTIVE", label: "Promo Aktif" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className={`rounded-sm px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      statusFilter === f.id
                        ? "bg-ink text-canvas"
                        : "border border-line bg-surface-muted text-ink-secondary hover:border-line-strong hover:text-ink"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Daftar Instrumen */}
            <div className="divide-y divide-line">
              {filteredItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-muted">
                  Tidak ada SKU instrumen pada kategori filter ini.
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedItem?.variant_id === item.variant_id;
                  return (
                    <button
                      type="button"
                      key={item.variant_id}
                      onClick={() => handleSelectItemForSimulation(item)}
                      className={`w-full p-4 text-left transition-colors hover:bg-surface-muted/60 ${
                        isSelected ? "bg-accent-subtle/25 ring-1 ring-inset ring-accent" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.product_name}
                              className="h-11 w-11 rounded-sm border border-line object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-surface-muted text-ink-muted">
                              <Package size={18} aria-hidden="true" />
                            </div>
                          )}

                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-[11px] font-bold text-ink-secondary">
                                {item.sku_code}
                              </span>
                              <Badge
                                variant={
                                  item.aging_status === "DEADSTOCK"
                                    ? "danger"
                                    : item.aging_status === "SLOW_MOVING"
                                    ? "warning"
                                    : "success"
                                }
                              >
                                {item.aging_status === "DEADSTOCK" ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Snowflake size={11} aria-hidden="true" />
                                    DEADSTOCK • {item.days_unsold} Hari
                                  </span>
                                ) : item.aging_status === "SLOW_MOVING" ? (
                                  `SLOW MOVING • ${item.days_unsold} Hari`
                                ) : (
                                  <span className="inline-flex items-center gap-1">
                                    <Zap size={11} aria-hidden="true" />
                                    FAST MOVING • {item.days_unsold} Hari
                                  </span>
                                )}
                              </Badge>

                              {item.has_active_clearance && (
                                <Badge variant="accent">
                                  PROMO AKTIF -{item.active_discount_percent}%
                                </Badge>
                              )}

                              {(esAdviceByVariant.get(item.variant_id) || esAdviceByVariant.get(item.sku_code)) && (
                                <span className="inline-flex items-center gap-1 rounded-xs bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent border border-accent/20">
                                  <Sparkles size={10} aria-hidden="true" />
                                  ES: {(esAdviceByVariant.get(item.variant_id) || esAdviceByVariant.get(item.sku_code)).tactical_action?.replace(/_/g, " ")}
                                </span>
                              )}
                            </div>

                            <h3 className="mt-1 font-display text-sm font-bold text-ink">
                              {item.product_name}{" "}
                              <span className="font-sans font-normal text-ink-secondary">
                                ({item.variant_name})
                              </span>
                            </h3>

                            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-ink-muted tabular-nums">
                              <span>
                                Stok Gudang: <b className="text-ink">{item.current_stock} unit</b>
                              </span>
                              <span>•</span>
                              <span>
                                Modal Tertahan:{" "}
                                <b className="text-ink">
                                  {formatRupiah(item.tied_up_capital)}
                                </b>
                              </span>
                              <span>•</span>
                              <span>
                                Margin Awal:{" "}
                                <b className="text-status-success">
                                  {item.initial_margin_percent}%
                                </b>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-row items-center justify-between gap-3 border-t border-line pt-2 sm:flex-col sm:items-end sm:border-0 sm:pt-0 tabular-nums">
                          <div className="text-right">
                            {item.has_active_clearance ? (
                              <>
                                <span className="block text-[10px] text-ink-muted line-through">
                                  {formatRupiah(item.selling_price)}
                                </span>
                                <span className="font-display text-sm font-bold text-accent">
                                  {formatRupiah(item.active_promo_price)}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="block text-[10px] text-ink-muted">
                                  Harga Jual Normal
                                </span>
                                <span className="font-display text-sm font-bold text-ink">
                                  {formatRupiah(item.selling_price)}
                                </span>
                              </>
                            )}
                          </div>

                          <span className="inline-flex items-center gap-1 rounded-xs border border-line bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-ink">
                            Simulasikan <ArrowUpRight size={12} aria-hidden="true" />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

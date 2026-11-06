import React, { useState, useEffect, useMemo } from "react";
import {
  Sliders,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calculator,
  FileSpreadsheet,
  ShoppingCart,
  ShieldCheck,
  Award,
  BarChart3,
  History,
  Info,
  RefreshCw,
  Check,
  X,
  ArrowRight,
  Sparkles,
  Layers,
  DollarSign,
  Package,
  Search,
  Eye,
  FileText,
} from "lucide-react";
import api from "../../api";
import { formatRupiah, formatDate } from "../../utils/format";
import { useAuth } from "../../auth/AuthContext";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

const SAATY_OPTIONS = [
  { value: 1, label: "1 - Sama Penting" },
  { value: 2, label: "2 - Nilai Antara (1 & 3)" },
  { value: 3, label: "3 - Sedikit Lebih Penting" },
  { value: 4, label: "4 - Nilai Antara (3 & 5)" },
  { value: 5, label: "5 - Lebih Penting (Kuat)" },
  { value: 6, label: "6 - Nilai Antara (5 & 7)" },
  { value: 7, label: "7 - Sangat Lebih Penting" },
  { value: 8, label: "8 - Nilai Antara (7 & 9)" },
  { value: 9, label: "9 - Mutlak Lebih Penting" },
  { value: 0.5, label: "1/2 (0.50) - Kebalikan 2" },
  { value: 0.3333, label: "1/3 (0.33) - Kebalikan 3" },
  { value: 0.25, label: "1/4 (0.25) - Kebalikan 4" },
  { value: 0.2, label: "1/5 (0.20) - Kebalikan 5" },
  { value: 0.1667, label: "1/6 (0.17) - Kebalikan 6" },
  { value: 0.1429, label: "1/7 (0.14) - Kebalikan 7" },
  { value: 0.125, label: "1/8 (0.13) - Kebalikan 8" },
  { value: 0.1111, label: "1/9 (0.11) - Kebalikan 9" },
];

export default function SmartRestockDSS() {
  const { role } = useAuth();
  const isManagerOrAdmin = ["super_admin", "manager", "admin"].includes(role);

  const [activeTab, setActiveTab] = useState("topsis");

  const [criteria, setCriteria] = useState([]);
  const [ahpMetrics, setAhpMetrics] = useState(null);
  const [matrixDraft, setMatrixDraft] = useState({});
  const [ahpSaving, setAhpSaving] = useState(false);
  const [ahpFeedback, setAhpFeedback] = useState(null);

  const [activeSession, setActiveSession] = useState(null);
  const [results, setResults] = useState([]);
  const [auditData, setAuditData] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [budgetInput, setBudgetInput] = useState(150000000);
  const [sessionTitle, setSessionTitle] = useState(
    "Simulasi Pengadaan Instrumen Musik Kuartal Berjalan"
  );
  const [calculating, setCalculating] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [budgetFilter, setBudgetFilter] = useState("ALL");

  const [selectedVariantIds, setSelectedVariantIds] = useState([]);
  const [generatingPo, setGeneratingPo] = useState(false);
  const [poResultModal, setPoResultModal] = useState(null);

  const [loadingInit, setLoadingInit] = useState(true);

  useEffect(() => {
    loadInitialDssData();
  }, []);

  async function loadInitialDssData() {
    setLoadingInit(true);
    try {
      const [critRes, sessRes] = await Promise.all([
        api.get("/dss/config"),
        api.get("/dss/sessions"),
      ]);

      const critData = critRes.data;
      setCriteria(critData.criteria || []);
      setAhpMetrics(critData.ahp_metrics || null);

      const initialDraft = {};
      (critData.matrix_grid || []).forEach((row) => {
        (row || []).forEach((cell) => {
          if (cell.row_code && cell.col_code) {
            initialDraft[`${cell.row_code}_${cell.col_code}`] = Number(cell.value || 1);
          }
        });
      });
      setMatrixDraft(initialDraft);

      const sessions = sessRes.data?.data || [];
      setSessionHistory(sessions);

      if (sessions.length > 0) {
        const detailRes = await api.get(`/dss/sessions/${sessions[0].id}`);
        const sess = detailRes.data.session;
        const resList = sess?.results || [];
        setActiveSession(sess);
        setBudgetInput(sess?.budget_limit || 150000000);
        setSessionTitle(sess?.title || "Simulasi Pengadaan Instrumen Musik Kuartal Berjalan");
        setResults(resList);
        setAuditData(detailRes.data.audit || null);

        const inBudgetIds = resList
          .filter((r) => r.is_within_budget && r.recommended_restock_qty > 0)
          .map((r) => r.variant_id);
        setSelectedVariantIds(inBudgetIds);
      } else {
        await runTopsisSimulation(150000000, sessionTitle, false);
      }
    } catch (err) {
      console.error("Failed loading DSS data:", err);
    } finally {
      setLoadingInit(false);
    }
  }

  async function runTopsisSimulation(
    customBudget = budgetInput,
    customTitle = sessionTitle,
    showFeedback = true
  ) {
    setCalculating(true);
    try {
      const res = await api.post("/dss/run-simulation", {
        budget_limit: Number(customBudget),
        title: customTitle,
        notes: "Kalkulasi otomatis Hybrid AHP-TOPSIS",
      });

      const sess = res.data.session;
      const resList = sess?.results || [];
      setActiveSession(sess);
      setResults(resList);
      setAuditData(res.data.audit || null);

      const inBudgetIds = resList
        .filter((r) => r.is_within_budget && r.recommended_restock_qty > 0)
        .map((r) => r.variant_id);
      setSelectedVariantIds(inBudgetIds);

      const sessRes = await api.get("/dss/sessions");
      setSessionHistory(sessRes.data?.data || []);

      if (showFeedback) {
        setAhpFeedback({
          type: "success",
          message: `Simulasi TOPSIS berhasil diperbarui dengan plafon anggaran ${formatRupiah(
            customBudget
          )}.`,
        });
        setTimeout(() => setAhpFeedback(null), 4000);
      }
    } catch (err) {
      console.error("Error running TOPSIS:", err);
    } finally {
      setCalculating(false);
    }
  }

  async function handleSaveAhpMatrix() {
    setAhpSaving(true);
    setAhpFeedback(null);
    try {
      const comparisons = {};
      const codes = criteria.map((c) => c.code);
      for (let i = 0; i < codes.length; i++) {
        for (let j = i + 1; j < codes.length; j++) {
          const key = `${codes[i]}_${codes[j]}`;
          comparisons[key] = Number(matrixDraft[key] || 1);
        }
      }

      const res = await api.post("/dss/ahp-matrix", { comparisons });
      const metrics = res.data.ahp_metrics || {};

      const critRes = await api.get("/dss/config");
      setCriteria(critRes.data.criteria || []);
      setAhpMetrics(critRes.data.ahp_metrics || null);

      const newDraft = {};
      (critRes.data.matrix_grid || []).forEach((row) => {
        (row || []).forEach((cell) => {
          if (cell.row_code && cell.col_code) {
            newDraft[`${cell.row_code}_${cell.col_code}`] = Number(cell.value || 1);
          }
        });
      });
      setMatrixDraft(newDraft);

      setAhpFeedback({
        type: metrics.is_consistent ? "success" : "warning",
        message: res.data.message,
      });

      await runTopsisSimulation(budgetInput, sessionTitle, false);
    } catch (err) {
      setAhpFeedback({
        type: "error",
        message: err.response?.data?.message || "Gagal menyimpan matriks AHP.",
      });
    } finally {
      setAhpSaving(false);
    }
  }

  async function handleSelectPastSession(sessionId) {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/dss/sessions/${sessionId}`);
      const sess = res.data.session;
      const resList = sess?.results || [];
      setActiveSession(sess);
      setBudgetInput(sess?.budget_limit || 150000000);
      setSessionTitle(sess?.title || "");
      setResults(resList);
      setAuditData(res.data.audit || null);

      const inBudgetIds = resList
        .filter((r) => r.is_within_budget && r.recommended_restock_qty > 0)
        .map((r) => r.variant_id);
      setSelectedVariantIds(inBudgetIds);
      setActiveTab("topsis");
    } catch (err) {
      console.error("Failed loading session:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleGeneratePO() {
    if (!activeSession || selectedVariantIds.length === 0) return;
    setGeneratingPo(true);
    try {
      const res = await api.post(`/dss/sessions/${activeSession.id}/generate-po`, {
        variant_ids: selectedVariantIds,
      });
      const createdPos = res.data.data || [];
      setPoResultModal({
        total_po_created: createdPos.length,
        po_numbers: createdPos.map((p) => p.po_number),
      });

      const sessRes = await api.get("/dss/sessions");
      setSessionHistory(sessRes.data?.data || []);
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menerbitkan Purchase Order dari DSS.");
    } finally {
      setGeneratingPo(false);
    }
  }

  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      const matchSearch =
        (item.product_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.brand_name || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchTier = tierFilter === "ALL" || item.priority_tier === tierFilter;
      const matchBudget =
        budgetFilter === "ALL" ||
        (budgetFilter === "IN_BUDGET" && item.is_within_budget) ||
        (budgetFilter === "OUT_BUDGET" && !item.is_within_budget);

      return matchSearch && matchTier && matchBudget;
    });
  }, [results, searchQuery, tierFilter, budgetFilter]);

  const selectedSummary = useMemo(() => {
    const selectedItems = results
      .filter((r) => selectedVariantIds.includes(r.variant_id))
      .sort((a, b) => (a.rank_number || 999) - (b.rank_number || 999));
    let runningCost = 0;
    const itemsWithCumulative = selectedItems.map((item) => {
      runningCost += item.estimated_po_cost || 0;
      return {
        ...item,
        cumulative_cost: runningCost,
      };
    });
    const totalCost = runningCost;
    const totalUnits = selectedItems.reduce(
      (acc, cur) => acc + (cur.recommended_restock_qty || 0),
      0
    );
    return {
      items: itemsWithCumulative,
      count: selectedItems.length,
      units: totalUnits,
      cost: totalCost,
    };
  }, [results, selectedVariantIds]);

  function toggleVariantSelection(variantId) {
    setSelectedVariantIds((prev) =>
      prev.includes(variantId) ? prev.filter((id) => id !== variantId) : [...prev, variantId]
    );
  }

  function handleExportCsv() {
    if (!results.length) return;
    const headers = [
      "Rank",
      "SKU",
      "Instrumen",
      "Varian",
      "Brand",
      "Stok Gudang (C1)",
      "Terjual 60 Hari (C2)",
      "Margin % (C3)",
      "Demand Score (C4)",
      "HPP COGS (C5)",
      "D+ Ideal Positif",
      "D- Ideal Negatif",
      "Skor Preferensi TOPSIS (Vi)",
      "Prioritas",
      "Rekomendasi Restock (Unit)",
      "Estimasi Biaya PO",
      "Masuk Plafon Anggaran",
    ];

    const rows = results.map((r) => [
      r.rank_number,
      r.sku_code,
      `"${(r.product_name || "").replace(/"/g, '""')}"`,
      `"${r.variant_name || ""}"`,
      `"${r.brand_name || ""}"`,
      r.raw_c1_stock,
      r.raw_c2_sales,
      r.raw_c3_margin,
      r.raw_c4_demand,
      r.raw_c5_cogs,
      r.d_plus,
      r.d_minus,
      r.preference_score,
      r.priority_tier,
      r.recommended_restock_qty,
      r.estimated_po_cost,
      r.is_within_budget ? "YA" : "TIDAK",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `DSS_TOPSIS_Restock_${activeSession?.session_code || "Report"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loadingInit) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-ink border-t-transparent" />
          <p className="text-xs font-medium text-ink-muted">
            Memuat Mesin Kalkulasi Ilmiah Hybrid AHP &amp; TOPSIS...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* HEADER UTAMA */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="accent">Decision Support System (DSS)</Badge>
            <Badge variant="neutral">Hybrid AHP — TOPSIS</Badge>
            {ahpMetrics && (
              <Badge variant={ahpMetrics.is_consistent ? "success" : "danger"}>
                CR: {ahpMetrics.consistency_ratio?.toFixed(4)}{" "}
                {ahpMetrics.is_consistent ? "(Konsisten ≤ 0.10)" : "(Inkonsisten > 0.10)"}
              </Badge>
            )}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Smart Instrument Restock &amp; Budget Allocation
          </h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-secondary sm:text-sm">
            Sistem pendukung keputusan pengadaan instrumen musik berbasis pembobotan matriks{" "}
            <strong className="font-semibold text-ink">
              Analytical Hierarchy Process (AHP)
            </strong>{" "}
            dan perangkingan jarak solusi ideal{" "}
            <strong className="font-semibold text-ink">TOPSIS</strong> dengan optimasi plafon
            anggaran Purchase Order.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={handleExportCsv}>
            <FileSpreadsheet size={15} aria-hidden="true" />
            Export Matriks CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => runTopsisSimulation(budgetInput, sessionTitle, true)}
            loading={calculating}
          >
            <RefreshCw size={15} aria-hidden="true" />
            Kalkulasi Ulang TOPSIS
          </Button>
        </div>
      </div>

      {/* NAVIGASI TAB */}
      <div className="flex flex-wrap items-center gap-1 border-b border-line pb-3">
        {[
          {
            id: "topsis",
            label: "1. Perangkingan TOPSIS & Simulasi Anggaran PO",
            icon: Award,
          },
          {
            id: "ahp",
            label: "2. Pembobotan Matriks AHP (5×5 Saaty)",
            icon: Sliders,
          },
          {
            id: "audit",
            label: "3. Bedah Matriks Ilmiah (Step-by-Step)",
            icon: Calculator,
          },
          {
            id: "history",
            label: `4. Riwayat Sesi Keputusan (${sessionHistory.length})`,
            icon: History,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-sm px-3.5 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-ink text-canvas"
                  : "bg-surface text-ink-secondary border border-line hover:border-line-strong hover:text-ink"
              }`}
            >
              <Icon size={14} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PERANGKINGAN TOPSIS & SIMULASI ANGGARAN PO */}
      {/* ========================================================================= */}
      {activeTab === "topsis" && (
        <div className="space-y-6">
          {/* Kartu Ringkasan Eksekutif & Simulator Plafon Anggaran */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Simulator Plafon Anggaran */}
            <div className="flex flex-col justify-between rounded-md border border-line bg-surface p-5 lg:col-span-5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    Constraint Optimization
                  </span>
                  <span className="rounded-xs border border-line bg-surface-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary tabular-nums">
                    {activeSession?.session_code}
                  </span>
                </div>
                <h2 className="mt-1 font-display text-lg font-bold text-ink">
                  Simulasi Plafon Anggaran Pengadaan
                </h2>
                <p className="mt-1 text-xs text-ink-secondary">
                  Sesuaikan batas anggaran kas pengadaan untuk melihat instrumen mana yang
                  masuk kuota prioritas restock.
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label
                      htmlFor="dss-budget-input"
                      className="block text-xs font-semibold text-ink-secondary"
                    >
                      Plafon Anggaran Kas PO (Rp)
                    </label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        id="dss-budget-input"
                        type="number"
                        step="5000000"
                        min="10000000"
                        value={budgetInput}
                        onChange={(e) => setBudgetInput(Number(e.target.value))}
                        className="ot-input font-mono text-sm font-bold tabular-nums"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => runTopsisSimulation(budgetInput, sessionTitle, true)}
                        disabled={calculating}
                      >
                        Simulasikan
                      </Button>
                    </div>
                  </div>

                  {/* Preset Tombol Cepat Anggaran */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="mr-1 text-[11px] text-ink-muted">Preset Plafon:</span>
                    {[50000000, 100000000, 150000000, 250000000, 500000000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setBudgetInput(val);
                          runTopsisSimulation(val, sessionTitle, true);
                        }}
                        className={`rounded-xs border px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-colors ${
                          Number(budgetInput) === val
                            ? "border-ink bg-ink text-canvas"
                            : "border-line bg-surface-muted text-ink-secondary hover:border-line-strong hover:text-ink"
                        }`}
                      >
                        {val / 1000000} Jt
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress Bar Serapan Anggaran */}
              <div className="mt-5 border-t border-line pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-secondary">
                    Estimasi Serapan Anggaran Terpilih:
                  </span>
                  <span className="font-bold text-ink tabular-nums">
                    {formatRupiah(selectedSummary.cost)} /{" "}
                    {formatRupiah(activeSession?.budget_limit || budgetInput)}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-xs bg-surface-muted">
                  <div
                    className={`h-full transition-all duration-300 ${
                      selectedSummary.cost > (activeSession?.budget_limit || budgetInput)
                        ? "bg-status-danger"
                        : "bg-accent"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (selectedSummary.cost /
                            (activeSession?.budget_limit || budgetInput || 1)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 4 Kartu Statistik Ringkas */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
              {/* Card 1: Top #1 Priority */}
              <div className="flex flex-col justify-between rounded-md border border-line bg-surface p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                      Peringkat #1 Prioritas Utama
                    </span>
                    <h3 className="mt-1 line-clamp-1 font-display text-base font-bold text-ink">
                      {results[0]?.product_name || "-"}
                    </h3>
                    <p className="text-xs text-ink-secondary">
                      {results[0]?.sku_code} • {results[0]?.variant_name}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-accent/30 bg-accent-subtle text-accent">
                    <Award size={18} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs">
                  <span className="text-ink-muted">Skor Preferensi (V₁):</span>
                  <span className="rounded-xs bg-ink px-2 py-0.5 font-mono text-xs font-bold text-canvas tabular-nums">
                    {results[0]?.preference_score?.toFixed(4) || "0.0000"}
                  </span>
                </div>
              </div>

              {/* Card 2: High Priority Count */}
              <div className="flex flex-col justify-between rounded-md border border-line bg-surface p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-status-danger">
                      Status Darurat Restock
                    </span>
                    <h3 className="mt-1 font-display text-2xl font-bold text-ink tabular-nums">
                      {results.filter((r) => r.priority_tier === "high_priority").length}{" "}
                      <span className="text-sm font-normal text-ink-secondary">
                        SKU Instrumen
                      </span>
                    </h3>
                    <p className="text-xs text-ink-secondary">
                      Stok tipis dengan laju penjualan &amp; margin tertinggi
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-status-danger/30 bg-status-danger/10 text-status-danger">
                    <TrendingUp size={18} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs">
                  <span className="text-ink-muted">Total Alternatif Dianalisis:</span>
                  <span className="font-bold text-ink tabular-nums">
                    {results.length} Varian SKU
                  </span>
                </div>
              </div>

              {/* Card 3: Bobot Kriteria Dominan */}
              <div className="flex flex-col justify-between rounded-md border border-line bg-surface p-5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    Distribusi Bobot Eigenvector AHP Aktif
                  </span>
                  <div className="mt-3 space-y-1.5">
                    {criteria.map((c) => (
                      <div key={c.code} className="flex items-center justify-between text-xs">
                        <span className="truncate max-w-[190px] text-ink-secondary">
                          <b className="font-semibold text-ink">{c.code}</b>:{" "}
                          {c.name.split("(")[0]}
                        </span>
                        <span className="font-mono font-bold text-ink tabular-nums">
                          {(c.weight * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 4: One-Click Action Generate PO */}
              <div className="flex flex-col justify-between rounded-md border border-line-strong bg-ink p-5 text-canvas">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-canvas/70">
                      Eksekusi Pengadaan Otomatis
                    </span>
                    <ShoppingCart size={16} className="text-canvas/80" aria-hidden="true" />
                  </div>
                  <h3 className="mt-1 font-display text-base font-bold">
                    Konversi ke Draft Purchase Order
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-canvas/80">
                    Terbitkan dokumen PO resmi ke supplier berdasarkan{" "}
                    <b className="text-canvas">{selectedSummary.count} SKU terpilih</b> (
                    {selectedSummary.units} unit).
                  </p>
                </div>

                <div className="mt-4 pt-2">
                  <button
                    type="button"
                    disabled={generatingPo || selectedSummary.count === 0}
                    onClick={handleGeneratePO}
                    className="flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                  >
                    {generatingPo ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
                        Membuat Dokumen PO...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} aria-hidden="true" />
                        Generate PO Sekarang ({formatRupiah(selectedSummary.cost)})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TABEL 1: Perangkingan Lengkap Seluruh Alternatif TOPSIS */}
          <div className="rounded-md border border-line bg-surface">
            {/* Header & Toolbar Filter Tabel 1 */}
            <div className="border-b border-line bg-surface-muted/40 px-4 py-3.5 sm:px-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">Tabel 1</Badge>
                  <h2 className="font-display text-sm font-bold text-ink sm:text-base">
                    Matriks Perangkingan TOPSIS Seluruh Alternatif Instrumen ({filteredResults.length} SKU)
                  </h2>
                </div>
                <span className="text-[11px] text-ink-muted">
                  Centang baris SKU pada kolom <b>PO</b> untuk memasukkan ke Tabel Hasil Perangkingan Terpilih
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    placeholder="Cari SKU, instrumen, brand..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Cari SKU, instrumen, atau brand"
                    className="w-64 rounded-sm border border-line bg-canvas py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
                  />
                </div>

                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  aria-label="Filter Tingkat Prioritas"
                  className="rounded-sm border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink focus:border-ink focus:outline-none"
                >
                  <option value="ALL">Semua Tingkat Prioritas</option>
                  <option value="high_priority">Prioritas Tinggi (High)</option>
                  <option value="medium_priority">Prioritas Sedang (Medium)</option>
                  <option value="low_priority">Prioritas Rendah (Low)</option>
                </select>

                <select
                  value={budgetFilter}
                  onChange={(e) => setBudgetFilter(e.target.value)}
                  aria-label="Filter Kuota Anggaran"
                  className="rounded-sm border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink focus:border-ink focus:outline-none"
                >
                  <option value="ALL">Semua Status Anggaran</option>
                  <option value="IN_BUDGET">Masuk Kuota Plafon Anggaran</option>
                  <option value="OUT_BUDGET">Di Luar Kuota Anggaran</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs text-ink-secondary">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedVariantIds(
                      filteredResults
                        .filter((r) => r.recommended_restock_qty > 0)
                        .map((r) => r.variant_id)
                    )
                  }
                  className="font-semibold text-ink underline hover:text-accent"
                >
                  Pilih Semua Tampil
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSelectedVariantIds([])}
                  className="text-ink-muted hover:text-ink"
                >
                  Reset Pilihan
                </button>
              </div>
            </div>

            {/* Tabel Utama */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    <th className="px-4 py-3 text-center">PO</th>
                    <th className="px-3 py-3 text-center">Rank</th>
                    <th className="px-4 py-3">Instrumen &amp; SKU</th>
                    <th className="px-3 py-3 text-center" title="C1: Stok Fisik (Cost)">
                      C1: Stok
                    </th>
                    <th className="px-3 py-3 text-center" title="C2: Laju Penjualan (Benefit)">
                      C2: Sales
                    </th>
                    <th className="px-3 py-3 text-center" title="C3: Margin Laba Kotor (Benefit)">
                      C3: Margin
                    </th>
                    <th className="px-3 py-3 text-center" title="C4: Animo Pasar (Benefit)">
                      C4: Demand
                    </th>
                    <th className="px-3 py-3 text-right" title="C5: Harga Pokok COGS (Cost)">
                      C5: HPP Unit
                    </th>
                    <th className="px-3 py-3 text-center">Jarak (D⁺ / D⁻)</th>
                    <th className="px-4 py-3 text-center">Skor TOPSIS (Vᵢ)</th>
                    <th className="px-3 py-3 text-center">Tier</th>
                    <th className="px-3 py-3 text-center">Saran Restock</th>
                    <th className="px-4 py-3 text-right">Estimasi Biaya PO</th>
                    <th className="px-4 py-3 text-center">Kuota Anggaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="p-8 text-center text-ink-muted">
                        Tidak ada instrumen yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((item) => {
                      const isSelected = selectedVariantIds.includes(item.variant_id);
                      const isTop3 = item.rank_number <= 3;

                      return (
                        <tr
                          key={item.variant_id}
                          className={`transition-colors hover:bg-surface-muted/60 ${
                            isSelected ? "bg-accent-subtle/20" : ""
                          }`}
                        >
                          {/* Checkbox PO */}
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleVariantSelection(item.variant_id)}
                              aria-label={`Pilih ${item.product_name}`}
                              className="h-4 w-4 cursor-pointer rounded-xs border-line-strong text-accent focus:ring-accent"
                            />
                          </td>

                          {/* Rank */}
                          <td className="px-3 py-3 text-center font-bold tabular-nums">
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-xs text-xs font-bold ${
                                item.rank_number === 1
                                  ? "bg-accent text-white"
                                  : item.rank_number === 2
                                  ? "bg-ink text-canvas"
                                  : item.rank_number === 3
                                  ? "border border-line-strong bg-surface-muted text-ink"
                                  : "text-ink-muted"
                              }`}
                            >
                              #{item.rank_number}
                            </span>
                          </td>

                          {/* Instrumen & SKU */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.product_name}
                                  className="h-9 w-9 rounded-xs border border-line object-cover"
                                />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-xs border border-line bg-surface-muted text-ink-muted">
                                  <Package size={16} aria-hidden="true" />
                                </div>
                              )}
                              <div>
                                <p className="line-clamp-1 font-bold text-ink">
                                  {item.product_name}
                                </p>
                                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
                                  <span className="font-mono font-semibold text-ink-secondary">
                                    {item.sku_code}
                                  </span>
                                  <span>•</span>
                                  <span>{item.variant_name}</span>
                                  <span>•</span>
                                  <span className="font-semibold text-ink-secondary">
                                    {item.brand_name}
                                  </span>
                                  {["Godox", "Feelworld", "Zhiyun"].includes(item.brand_name) ? (
                                    <span className="rounded-xs bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-700" title="Sistem Pakar (ES): Riwayat Minor Cacat QC Terdeteksi">
                                      ES: QC Watch
                                    </span>
                                  ) : (
                                    <span className="rounded-xs bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700" title="Sistem Pakar (ES): Zero-Defect Reliable Supplier">
                                      ES: Reliable
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* C1: Stok Fisik */}
                          <td className="px-3 py-3 text-center tabular-nums">
                            <Badge
                              variant={
                                item.raw_c1_stock <= 2
                                  ? "danger"
                                  : item.raw_c1_stock <= 5
                                  ? "warning"
                                  : "neutral"
                              }
                            >
                              {item.raw_c1_stock} unit
                            </Badge>
                          </td>

                          {/* C2: Sales Velocity */}
                          <td className="px-3 py-3 text-center font-bold text-ink tabular-nums">
                            {item.raw_c2_sales} sold
                          </td>

                          {/* C3: Margin % */}
                          <td className="px-3 py-3 text-center font-semibold text-status-success tabular-nums">
                            {item.raw_c3_margin}%
                          </td>

                          {/* C4: Market Demand */}
                          <td className="px-3 py-3 text-center font-semibold text-ink-secondary tabular-nums">
                            {item.raw_c4_demand} hits
                          </td>

                          {/* C5: Modal Unit COGS */}
                          <td className="px-3 py-3 text-right font-mono text-ink-secondary tabular-nums">
                            {formatRupiah(item.raw_c5_cogs)}
                          </td>

                          {/* Jarak D+ / D- */}
                          <td className="px-3 py-3 text-center font-mono text-[11px] text-ink-muted tabular-nums">
                            <span className="text-status-danger">{item.d_plus.toFixed(4)}</span> /{" "}
                            <span className="text-status-success">{item.d_minus.toFixed(4)}</span>
                          </td>

                          {/* Skor TOPSIS Vi + Progress Bar */}
                          <td className="px-4 py-3 tabular-nums">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold text-ink">
                                <span>{item.preference_score.toFixed(4)}</span>
                                <span className="text-[10px] text-ink-muted">
                                  {Math.round(item.preference_score * 100)}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-xs bg-surface-muted">
                                <div
                                  className={`h-full ${
                                    isTop3
                                      ? "bg-ink"
                                      : item.priority_tier === "high_priority"
                                      ? "bg-accent"
                                      : item.priority_tier === "medium_priority"
                                      ? "bg-status-warning"
                                      : "bg-ink-muted"
                                  }`}
                                  style={{ width: `${item.preference_score * 100}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Tier Badge */}
                          <td className="px-3 py-3 text-center">
                            <Badge
                              variant={
                                item.priority_tier === "high_priority"
                                  ? "danger"
                                  : item.priority_tier === "medium_priority"
                                  ? "warning"
                                  : "neutral"
                              }
                            >
                              {item.priority_tier === "high_priority"
                                ? "High"
                                : item.priority_tier === "medium_priority"
                                ? "Medium"
                                : "Low"}
                            </Badge>
                          </td>

                          {/* Recommended Restock Qty */}
                          <td className="px-3 py-3 text-center font-bold text-ink tabular-nums">
                            +{item.recommended_restock_qty} unit
                          </td>

                          {/* Estimated PO Cost */}
                          <td className="px-4 py-3 text-right font-bold text-ink tabular-nums">
                            {formatRupiah(item.estimated_po_cost)}
                          </td>

                          {/* In Budget Status */}
                          <td className="px-4 py-3 text-center">
                            {item.is_within_budget ? (
                              <Badge variant="success">Masuk Kuota</Badge>
                            ) : (
                              <Badge variant="neutral">Di Luar Kuota</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Ringkasan Bawah Tabel 1 */}
            <div className="flex flex-col gap-3 border-t border-line bg-surface-muted/60 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <span className="text-ink-secondary">
                Menampilkan <b className="text-ink tabular-nums">{filteredResults.length}</b> dari{" "}
                <b className="text-ink tabular-nums">{results.length}</b> total varian SKU yang dianalisis.
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedVariantIds(
                      results
                        .filter((r) => r.is_within_budget && r.recommended_restock_qty > 0)
                        .map((r) => r.variant_id)
                    )
                  }
                  className="rounded-xs border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink transition-colors hover:border-line-strong"
                >
                  Pilih Otomatis Sesuai Kuota Plafon
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TABEL 2 (TERPISAH): HASIL PERANGKINGAN TERPILIH & ALOKASI ANGGARAN PO */}
          {/* ========================================================================= */}
          <div className="rounded-md border border-line-strong bg-surface">
            {/* Header Tabel Terpilih */}
            <div className="flex flex-col gap-3 border-b border-line bg-surface-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent">Tabel 2 • Hasil Perangkingan Terpilih</Badge>
                  <Badge variant="success">{selectedSummary.count} SKU Masuk Daftar PO</Badge>
                </div>
                <h2 className="mt-1.5 font-display text-base font-bold text-ink sm:text-lg">
                  Daftar Hasil Perangkingan Terpilih untuk Pengadaan (Purchase Order)
                </h2>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  Tabel terpisah berisi instrumen prioritas hasil seleksi TOPSIS beserta rincian alokasi serapan anggaran kumulatif yang siap diterbitkan menjadi dokumen PO.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {selectedSummary.count > 0 && (
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => setSelectedVariantIds([])}
                  >
                    <X size={13} aria-hidden="true" />
                    Kosongkan Pilihan
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  disabled={generatingPo || selectedSummary.count === 0}
                  onClick={handleGeneratePO}
                >
                  <ShoppingCart size={14} aria-hidden="true" />
                  Terbitkan PO ({selectedSummary.count} SKU)
                </Button>
              </div>
            </div>

            {/* Tabel Hasil Perangkingan Terpilih */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    <th className="px-4 py-3 text-center">No</th>
                    <th className="px-3 py-3 text-center">Rank TOPSIS</th>
                    <th className="px-4 py-3">Instrumen &amp; Varian SKU Terpilih</th>
                    <th className="px-3 py-3 text-center">Skor (Vᵢ)</th>
                    <th className="px-3 py-3 text-center">Prioritas</th>
                    <th className="px-3 py-3 text-center">Stok Saat Ini</th>
                    <th className="px-3 py-3 text-center">Qty Restock</th>
                    <th className="px-3 py-3 text-right">HPP / Unit (COGS)</th>
                    <th className="px-4 py-3 text-right">Subtotal Biaya PO</th>
                    <th className="px-4 py-3 text-right">Akumulasi Serapan Plafon</th>
                    <th className="px-3 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {selectedSummary.items.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-10 text-center">
                        <div className="mx-auto max-w-md space-y-2">
                          <p className="font-display text-sm font-bold text-ink">
                            Belum Ada Instrumen Hasil Perangkingan yang Dipilih
                          </p>
                          <p className="text-xs text-ink-muted">
                            Silakan centang SKU pada Tabel 1 di atas atau klik tombol di bawah untuk memilih otomatis seluruh instrumen prioritas yang masuk kuota plafon anggaran.
                          </p>
                          <div className="pt-2">
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() =>
                                setSelectedVariantIds(
                                  results
                                    .filter(
                                      (r) => r.is_within_budget && r.recommended_restock_qty > 0
                                    )
                                    .map((r) => r.variant_id)
                                )
                              }
                            >
                              <CheckCircle2 size={13} aria-hidden="true" />
                              Muat Hasil Terpilih Sesuai Kuota Anggaran
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    selectedSummary.items.map((item, idx) => {
                      const activeLimit = activeSession?.budget_limit || budgetInput || 1;
                      const cumPct = Math.min(
                        100,
                        Math.round((item.cumulative_cost / activeLimit) * 100)
                      );
                      const isOverLimit = item.cumulative_cost > activeLimit;

                      return (
                        <tr
                          key={item.variant_id}
                          className="transition-colors hover:bg-surface-muted/50"
                        >
                          {/* Nomor Urut Pilihan */}
                          <td className="px-4 py-3 text-center font-mono text-ink-muted tabular-nums">
                            {idx + 1}
                          </td>

                          {/* Rank TOPSIS */}
                          <td className="px-3 py-3 text-center font-bold tabular-nums">
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-xs text-xs font-bold ${
                                item.rank_number === 1
                                  ? "bg-accent text-white"
                                  : item.rank_number === 2
                                  ? "bg-ink text-canvas"
                                  : item.rank_number === 3
                                  ? "border border-line-strong bg-surface-muted text-ink"
                                  : "border border-line bg-surface-muted text-ink-secondary"
                              }`}
                            >
                              #{item.rank_number}
                            </span>
                          </td>

                          {/* Instrumen & SKU */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.product_name}
                                  className="h-9 w-9 rounded-xs border border-line object-cover"
                                />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-xs border border-line bg-surface-muted text-ink-muted">
                                  <Package size={16} aria-hidden="true" />
                                </div>
                              )}
                              <div>
                                <p className="line-clamp-1 font-bold text-ink">
                                  {item.product_name}
                                </p>
                                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-muted">
                                  <span className="font-mono font-semibold text-ink-secondary">
                                    {item.sku_code}
                                  </span>
                                  <span>•</span>
                                  <span>{item.variant_name}</span>
                                  <span>•</span>
                                  <span className="font-semibold text-ink-secondary">
                                    {item.brand_name}
                                  </span>
                                  {["Godox", "Feelworld", "Zhiyun"].includes(item.brand_name) ? (
                                    <span className="rounded-xs bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-700" title="Sistem Pakar (ES): Riwayat Minor Cacat QC Terdeteksi">
                                      ES: QC Watch
                                    </span>
                                  ) : (
                                    <span className="rounded-xs bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700" title="Sistem Pakar (ES): Zero-Defect Reliable Supplier">
                                      ES: Reliable
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Skor Preferensi Vi */}
                          <td className="px-3 py-3 text-center font-mono font-bold text-ink tabular-nums">
                            {item.preference_score.toFixed(4)}
                          </td>

                          {/* Prioritas Tier */}
                          <td className="px-3 py-3 text-center">
                            <Badge
                              variant={
                                item.priority_tier === "high_priority"
                                  ? "danger"
                                  : item.priority_tier === "medium_priority"
                                  ? "warning"
                                  : "neutral"
                              }
                            >
                              {item.priority_tier === "high_priority"
                                ? "High"
                                : item.priority_tier === "medium_priority"
                                ? "Medium"
                                : "Low"}
                            </Badge>
                          </td>

                          {/* Stok Saat Ini */}
                          <td className="px-3 py-3 text-center tabular-nums">
                            <span className="font-semibold text-ink-secondary">
                              {item.raw_c1_stock} unit
                            </span>
                          </td>

                          {/* Qty Restock */}
                          <td className="px-3 py-3 text-center font-bold text-status-success tabular-nums">
                            +{item.recommended_restock_qty} unit
                          </td>

                          {/* HPP Unit */}
                          <td className="px-3 py-3 text-right font-mono text-ink-secondary tabular-nums">
                            {formatRupiah(item.raw_c5_cogs)}
                          </td>

                          {/* Subtotal Biaya PO */}
                          <td className="px-4 py-3 text-right font-mono font-bold text-ink tabular-nums">
                            {formatRupiah(item.estimated_po_cost)}
                          </td>

                          {/* Akumulasi Serapan Plafon */}
                          <td className="px-4 py-3 text-right tabular-nums">
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={`font-mono text-[11px] font-bold ${
                                  isOverLimit ? "text-status-danger" : "text-ink-secondary"
                                }`}
                              >
                                {formatRupiah(item.cumulative_cost)} ({cumPct}%)
                              </span>
                              <div className="h-1.5 w-24 overflow-hidden rounded-xs bg-surface-muted">
                                <div
                                  className={`h-full ${
                                    isOverLimit ? "bg-status-danger" : "bg-accent"
                                  }`}
                                  style={{ width: `${cumPct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Aksi Hapus dari Pilihan */}
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleVariantSelection(item.variant_id)}
                              title="Keluarkan dari daftar terpilih"
                              className="inline-flex items-center gap-1 rounded-xs border border-line bg-surface px-2 py-1 text-[11px] font-semibold text-ink-muted transition-colors hover:border-status-danger hover:text-status-danger"
                            >
                              <X size={12} aria-hidden="true" />
                              Hapus
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Rekapitulasi Tabel Terpilih */}
            <div className="flex flex-col gap-4 border-t border-line bg-surface-muted p-4 text-xs md:flex-row md:items-center md:justify-between sm:px-5">
              <div className="flex flex-wrap items-center gap-5 tabular-nums">
                <div>
                  <span className="text-ink-secondary">Total SKU Terpilih: </span>
                  <span className="font-bold text-ink">{selectedSummary.count} SKU</span>
                </div>
                <div>
                  <span className="text-ink-secondary">Total Unit Pengadaan: </span>
                  <span className="font-bold text-ink">{selectedSummary.units} unit</span>
                </div>
                <div>
                  <span className="text-ink-secondary">Total Kebutuhan Modal PO: </span>
                  <span className="font-mono font-bold text-ink">
                    {formatRupiah(selectedSummary.cost)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 tabular-nums">
                <span className="text-ink-secondary">
                  Sisa Plafon Anggaran:{" "}
                  <b
                    className={
                      (activeSession?.budget_limit || budgetInput) - selectedSummary.cost >= 0
                        ? "font-mono font-bold text-status-success"
                        : "font-mono font-bold text-status-danger"
                    }
                  >
                    {formatRupiah(
                      (activeSession?.budget_limit || budgetInput) - selectedSummary.cost
                    )}
                  </b>
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={generatingPo || selectedSummary.count === 0}
                  onClick={handleGeneratePO}
                >
                  Terbitkan Purchase Order ({selectedSummary.count} SKU)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MATRIKS PERBANDINGAN BERPASANGAN AHP 5x5 & SUB-KRITERIA */}
      {/* ========================================================================= */}
      {activeTab === "ahp" && (
        <div className="space-y-6">
          <div className="rounded-md border border-line bg-surface p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-ink">
                  Matriks Perbandingan Berpasangan AHP (5×5 Pairwise Comparison)
                </h2>
                <p className="mt-1 max-w-2xl text-xs text-ink-secondary">
                  Atur tingkat kepentingan relatif antar kriteria pengadaan instrumen musik
                  menggunakan skala Saaty 1–9. Sistem secara otomatis menghitung nilai resiprokal{" "}
                  <span className="font-mono text-ink">a(j,i) = 1 / a(i,j)</span>, vektor bobot{" "}
                  <i>Eigenvector</i>, serta menguji rasio konsistensi logis (CR ≤ 0.10).
                </p>
              </div>

              {isManagerOrAdmin && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={ahpSaving}
                  onClick={handleSaveAhpMatrix}
                >
                  {ahpSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
                      Menghitung...
                    </>
                  ) : (
                    <>
                      <Check size={14} aria-hidden="true" />
                      Terapkan &amp; Simpan Bobot AHP
                    </>
                  )}
                </Button>
              )}
            </div>

            {ahpFeedback && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-sm border p-3 text-xs font-semibold ${
                  ahpFeedback.type === "success"
                    ? "border-status-success/30 bg-status-success/10 text-status-success"
                    : "border-status-warning/30 bg-status-warning/10 text-status-warning"
                }`}
              >
                {ahpFeedback.type === "success" ? (
                  <CheckCircle2 size={16} aria-hidden="true" />
                ) : (
                  <AlertCircle size={16} aria-hidden="true" />
                )}
                <span>{ahpFeedback.message}</span>
              </div>
            )}
          </div>

          {/* Status Konsistensi Live & Bobot Kriteria */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-md border border-line bg-surface p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Nilai Eigen Max (λ max)
              </span>
              <p className="mt-1 font-display text-2xl font-bold text-ink tabular-nums">
                {ahpMetrics?.lambda_max ? ahpMetrics.lambda_max.toFixed(4) : "5.0000"}
              </p>
              <p className="text-[11px] text-ink-muted">Target ordo 5×5: ≈ 5.0</p>
            </div>

            <div className="rounded-md border border-line bg-surface p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Consistency Index (CI)
              </span>
              <p className="mt-1 font-display text-2xl font-bold text-ink tabular-nums">
                {ahpMetrics?.consistency_index !== undefined
                  ? ahpMetrics.consistency_index.toFixed(5)
                  : "0.0000"}
              </p>
              <p className="text-[11px] text-ink-muted">Rumus: (λmax - n) / (n - 1)</p>
            </div>

            <div className="rounded-md border border-line bg-surface p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Random Index (RI, n=5)
              </span>
              <p className="mt-1 font-display text-2xl font-bold text-ink tabular-nums">
                {ahpMetrics?.random_index || "1.12"}
              </p>
              <p className="text-[11px] text-ink-muted">Tabel Standar Saaty untuk n=5</p>
            </div>

            <div className="rounded-md border border-line bg-surface p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                Consistency Ratio (CR)
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold text-ink tabular-nums">
                  {ahpMetrics?.consistency_ratio !== undefined
                    ? ahpMetrics.consistency_ratio.toFixed(4)
                    : "0.0000"}
                </span>
                <Badge
                  variant={(ahpMetrics?.consistency_ratio ?? 0) <= 0.1 ? "success" : "danger"}
                >
                  {(ahpMetrics?.consistency_ratio ?? 0) <= 0.1
                    ? "KONSISTEN"
                    : "INKONSISTEN (>0.10)"}
                </Badge>
              </div>
              <p className="text-[11px] text-ink-muted">Wajib ≤ 0.10 untuk validitas</p>
            </div>
          </div>

          {/* Tabel Matriks 5x5 Input */}
          <div className="rounded-md border border-line bg-surface p-5">
            <h3 className="mb-4 font-display text-sm font-bold text-ink">
              Tabel Perbandingan Berpasangan Antar Kriteria (Skala Saaty)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="border-b border-line bg-surface-muted text-[11px] font-bold text-ink-secondary">
                    <th className="p-3 text-left">Kriteria Baris / Kolom</th>
                    {criteria.map((c) => (
                      <th key={c.code} className="p-3">
                        <span className="font-bold text-ink">{c.code}</span>
                        <div className="mx-auto max-w-[110px] truncate text-[10px] font-normal text-ink-muted">
                          {c.name.split(" ")[0]}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {criteria.map((rowC) => (
                    <tr key={rowC.code} className="hover:bg-surface-muted/40">
                      <td className="bg-surface-muted/30 p-3 text-left font-bold text-ink">
                        <span className="mr-1.5 rounded-xs border border-line bg-surface px-1.5 py-0.5 font-mono text-xs">
                          {rowC.code}
                        </span>
                        <span>{rowC.name}</span>
                      </td>

                      {criteria.map((colC) => {
                        if (rowC.code === colC.code) {
                          return (
                            <td
                              key={colC.code}
                              className="bg-surface-muted p-3 font-mono font-bold text-ink-muted tabular-nums"
                            >
                              1.0000
                            </td>
                          );
                        }

                        const key = `${rowC.code}_${colC.code}`;
                        const invKey = `${colC.code}_${rowC.code}`;
                        const currentVal = matrixDraft[key] ?? 1.0;

                        return (
                          <td key={colC.code} className="p-2">
                            {rowC.code < colC.code ? (
                              <select
                                disabled={!isManagerOrAdmin}
                                aria-label={`Perbandingan ${rowC.code} terhadap ${colC.code}`}
                                value={
                                  SAATY_OPTIONS.find(
                                    (opt) => Math.abs(opt.value - currentVal) < 0.01
                                  )?.value || currentVal
                                }
                                onChange={(e) => {
                                  const newVal = Number(e.target.value);
                                  setMatrixDraft((prev) => ({
                                    ...prev,
                                    [key]: newVal,
                                    [invKey]: 1.0 / newVal,
                                  }));
                                }}
                                className="w-full rounded-sm border border-line bg-canvas p-1.5 text-xs font-semibold text-ink focus:border-ink focus:outline-none"
                              >
                                {SAATY_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="inline-block rounded-xs border border-line bg-surface-muted px-2 py-1 font-mono font-bold text-ink-secondary tabular-nums">
                                {(1.0 / (matrixDraft[invKey] || 1.0)).toFixed(4)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabel Bobot Eigenvector Kriteria Saat Ini */}
          <div className="rounded-md border border-line bg-surface p-5">
            <h3 className="mb-4 font-display text-sm font-bold text-ink">
              Vektor Bobot Prioritas Kriteria (Eigenvector Weights)
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {criteria.map((c) => {
                const weightPct = Math.round(c.weight * 100);
                return (
                  <div
                    key={c.code}
                    className="space-y-2 rounded-sm border border-line bg-surface-muted/50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-xs bg-ink px-2 py-0.5 font-mono text-xs font-bold text-canvas">
                        {c.code}
                      </span>
                      <Badge variant={c.attribute_type === "benefit" ? "success" : "danger"}>
                        {c.attribute_type}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-xs font-bold text-ink">{c.name}</p>
                    <div className="pt-2 tabular-nums">
                      <div className="mb-1 flex items-baseline justify-between text-xs font-bold text-ink">
                        <span>{(c.weight * 100).toFixed(1)}%</span>
                        <span className="text-[10px] text-ink-muted">
                          w = {c.weight.toFixed(4)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-xs bg-line">
                        <div className="h-full bg-ink" style={{ width: `${weightPct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Parameter & Ambang Batas Sub-Kriteria */}
          <div className="rounded-md border border-line bg-surface p-5">
            <h3 className="mb-1 font-display text-sm font-bold text-ink">
              Parameter Interpretasi Skala Penilaian Sub-Kriteria (dss_subcriteria_ranges)
            </h3>
            <p className="mb-4 text-xs text-ink-secondary">
              Panduan interpretasi manajerial terhadap skor parameter 1 s/d 5 yang dikonversi ke
              dalam matriks TOPSIS.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {criteria.map((c) => (
                <div
                  key={c.code}
                  className="space-y-3 rounded-sm border border-line bg-canvas p-4"
                >
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="text-xs font-bold text-ink">
                      {c.code} - {c.name.split("(")[0]}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-ink-muted">
                      {c.attribute_type}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {(c.subcriteria || c.ranges || []).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-xs bg-surface px-2.5 py-1.5 text-[11px]"
                      >
                        <span className="font-medium text-ink-secondary">{r.range_label}</span>
                        <span className="rounded-xs border border-line bg-surface-muted px-1.5 py-0.5 font-mono font-bold text-ink tabular-nums">
                          Nilai {r.score_value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BEDAH MATRIKS ILMIAH STEP-BY-STEP (AUDIT PERHITUNGAN) */}
      {/* ========================================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="rounded-md border border-line bg-surface p-5">
            <h2 className="font-display text-base font-bold text-ink">
              Transparansi Algoritma Matematika: Hybrid AHP &amp; TOPSIS
            </h2>
            <p className="mt-1 text-xs text-ink-secondary">
              Berikut merupakan transparansi penuh proses kalkulasi multi-tahap dari data mentah
              hingga terbentuk skor preferensi akhir.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
              <div className="space-y-1.5 rounded-sm border border-line bg-surface-muted/50 p-3.5">
                <p className="font-bold text-ink">1. Normalisasi Euclidean (R)</p>
                <p className="rounded-xs border border-line bg-surface p-2 font-mono text-[11px] text-ink">
                  r_ij = x_ij / √(∑ x_kj²)
                </p>
                <p className="text-[11px] text-ink-muted">
                  Menghilangkan dimensi satuan rupiah, unit, dan persentase.
                </p>
              </div>

              <div className="space-y-1.5 rounded-sm border border-line bg-surface-muted/50 p-3.5">
                <p className="font-bold text-ink">2. Normalisasi Terbobot AHP (Y)</p>
                <p className="rounded-xs border border-line bg-surface p-2 font-mono text-[11px] text-ink">
                  y_ij = w_j × r_ij
                </p>
                <p className="text-[11px] text-ink-muted">
                  Mengalikan matriks ternormalisasi dengan bobot eigenvector kriteria AHP.
                </p>
              </div>

              <div className="space-y-1.5 rounded-sm border border-line bg-surface-muted/50 p-3.5">
                <p className="font-bold text-ink">3. Solusi Ideal &amp; Nilai Preferensi</p>
                <p className="rounded-xs border border-line bg-surface p-2 font-mono text-[11px] text-ink">
                  V_i = D_i⁻ / (D_i⁺ + D_i⁻)
                </p>
                <p className="text-[11px] text-ink-muted">
                  Alternatif terdekat dengan solusi ideal positif A⁺ dan terjauh dari A⁻.
                </p>
              </div>
            </div>
          </div>

          {auditData && (
            <div className="rounded-md border border-line bg-surface p-5">
              <h3 className="mb-3 font-display text-sm font-bold text-ink">
                Solusi Ideal Positif (A⁺) dan Solusi Ideal Negatif (A⁻)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs">
                  <thead className="border-b border-line bg-surface-muted font-bold text-ink-secondary">
                    <tr>
                      <th className="p-3 text-left">Vektor Solusi</th>
                      {criteria.map((c) => (
                        <th key={c.code} className="p-3">
                          {c.code} ({c.attribute_type})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-mono tabular-nums">
                    <tr className="bg-status-success/5">
                      <td className="p-3 text-left font-sans font-bold text-status-success">
                        A⁺ (Solusi Ideal Positif)
                      </td>
                      {(Array.isArray(auditData.ideal_positive)
                        ? auditData.ideal_positive
                        : criteria.map((c) => auditData.ideal_positive?.[c.code] ?? 0)
                      ).map((v, i) => (
                        <td key={i} className="p-3 font-bold text-status-success">
                          {Number(v || 0).toFixed(5)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-status-danger/5">
                      <td className="p-3 text-left font-sans font-bold text-status-danger">
                        A⁻ (Solusi Ideal Negatif)
                      </td>
                      {(Array.isArray(auditData.ideal_negative)
                        ? auditData.ideal_negative
                        : criteria.map((c) => auditData.ideal_negative?.[c.code] ?? 0)
                      ).map((v, i) => (
                        <td key={i} className="p-3 font-bold text-status-danger">
                          {Number(v || 0).toFixed(5)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {auditData && (
            <div className="rounded-md border border-line bg-surface p-5">
              <h3 className="mb-3 font-display text-sm font-bold text-ink">
                Matriks Normalisasi Terbobot (Y = w_j × r_ij)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs">
                  <thead className="border-b border-line bg-surface-muted text-[11px] font-bold text-ink-muted">
                    <tr>
                      <th className="p-3 text-left">SKU Instrumen</th>
                      <th className="p-3 text-left">Nama Varian</th>
                      <th className="p-3">Y1: Stok (0.30)</th>
                      <th className="p-3">Y2: Sales (0.25)</th>
                      <th className="p-3">Y3: Margin (0.20)</th>
                      <th className="p-3">Y4: Demand (0.15)</th>
                      <th className="p-3">Y5: COGS (0.10)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-mono text-[11px] tabular-nums">
                    {(auditData.weighted_normalized_matrix || results).map((row) => (
                      <tr key={row.variant_id} className="hover:bg-surface-muted/50">
                        <td className="p-3 text-left font-sans font-bold text-ink">
                          {row.sku_code}
                        </td>
                        <td className="max-w-[200px] truncate p-3 text-left font-sans text-ink-secondary">
                          {row.product_name}
                        </td>
                        {(
                          row.values || [
                            row.weighted_c1,
                            row.weighted_c2,
                            row.weighted_c3,
                            row.weighted_c4,
                            row.weighted_c5,
                          ]
                        ).map((val, idx) => (
                          <td key={idx} className="p-3">
                            {Number(val || 0).toFixed(5)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RIWAYAT SESI KEPUTUSAN (dss_sessions) */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-ink">
                Riwayat Sesi Simulasi Keputusan DSS
              </h2>
              <p className="mt-1 text-xs text-ink-secondary">
                Histori simulasi perhitungan restock instrumen musik yang pernah dieksekusi dan
                status penerbitan Purchase Order-nya.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setLoadingHistory(true);
                api
                  .get("/dss/sessions")
                  .then((res) => setSessionHistory(res.data?.data || []))
                  .finally(() => setLoadingHistory(false));
              }}
            >
              <RefreshCw
                size={13}
                className={loadingHistory ? "animate-spin" : ""}
                aria-hidden="true"
              />
              Refresh Histori
            </Button>
          </div>

          <div className="overflow-hidden rounded-md border border-line bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3.5">Kode Sesi</th>
                  <th className="px-4 py-3.5">Judul Sesi</th>
                  <th className="px-4 py-3.5">Tanggal</th>
                  <th className="px-4 py-3.5">Dieksekusi Oleh</th>
                  <th className="px-4 py-3.5 text-right">Plafon Anggaran</th>
                  <th className="px-4 py-3.5 text-right">Total Terpilih</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sessionHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-ink-muted">
                      Belum ada histori sesi DSS yang tersimpan.
                    </td>
                  </tr>
                ) : (
                  sessionHistory.map((sess) => (
                    <tr key={sess.id} className="hover:bg-surface-muted/50">
                      <td className="px-4 py-3.5 font-mono font-bold text-ink tabular-nums">
                        {sess.session_code}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-ink">{sess.title}</td>
                      <td className="px-4 py-3.5 text-ink-secondary tabular-nums">
                        {formatDate(sess.created_at)}
                      </td>
                      <td className="px-4 py-3.5 text-ink-secondary">
                        {sess.executed_by_name}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-ink tabular-nums">
                        {formatRupiah(sess.budget_limit)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-status-success tabular-nums">
                        {formatRupiah(sess.total_allocated_cost)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          variant={sess.status === "po_generated" ? "info" : "warning"}
                        >
                          {sess.status === "po_generated"
                            ? "PO Diterbitkan"
                            : "Simulasi Draft"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleSelectPastSession(sess.id)}
                        >
                          <Eye size={13} aria-hidden="true" />
                          Muat Sesi
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL SUKSES PENERBITAN PURCHASE ORDER */}
      <Modal
        open={Boolean(poResultModal)}
        onClose={() => setPoResultModal(null)}
        title="Purchase Order Berhasil Diterbitkan"
        size="md"
      >
        {poResultModal && (
          <div className="space-y-4 text-xs text-ink-secondary">
            <p>
              Sistem berhasil mengonversi rekomendasi TOPSIS menjadi{" "}
              <b className="text-ink">
                {poResultModal.total_po_created} dokumen Purchase Order resmi
              </b>{" "}
              dan meneruskannya ke tahap persetujuan Manager serta pembayaran Finance.
            </p>

            <div className="space-y-1.5 rounded-sm border border-line bg-surface-muted p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Nomor Purchase Order yang Terbentuk:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {(poResultModal.po_numbers || []).map((poNum) => (
                  <span
                    key={poNum}
                    className="rounded-xs border border-line bg-surface px-2.5 py-1 font-mono text-xs font-bold text-ink tabular-nums"
                  >
                    {poNum}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={() => setPoResultModal(null)}>
                Tutup &amp; Lanjutkan
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

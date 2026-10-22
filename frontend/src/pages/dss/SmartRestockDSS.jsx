import { useEffect, useState, useMemo } from "react";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  Award,
  BarChart3,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  Cpu,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  HelpCircle,
  History,
  Info,
  Layers,
  Package,
  Play,
  RefreshCw,
  Scale,
  Search,
  Sliders,
  Sparkles,
  TrendingUp,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import Badge from "../../components/ui/Badge";
import { useAuth } from "../../auth/AuthContext";
import { formatRupiah, formatDate } from "../../utils/format";

const SAATY_OPTIONS = [
  { value: 1.0, label: "1 - Sama penting (Equal)" },
  { value: 2.0, label: "2 - Mendekati sedikit lebih penting" },
  { value: 3.0, label: "3 - Sedikit lebih penting (Moderate)" },
  { value: 4.0, label: "4 - Mendekati lebih penting" },
  { value: 5.0, label: "5 - Lebih penting (Strong)" },
  { value: 6.0, label: "6 - Mendekati sangat penting" },
  { value: 7.0, label: "7 - Sangat penting (Very Strong)" },
  { value: 8.0, label: "8 - Mendekati mutlak" },
  { value: 9.0, label: "9 - Mutlak lebih penting (Extreme)" },
  { value: 0.5, label: "1/2 - Mendekati sedikit kurang penting" },
  { value: 0.3333, label: "1/3 - Sedikit kurang penting" },
  { value: 0.25, label: "1/4 - Mendekati kurang penting" },
  { value: 0.2, label: "1/5 - Kurang penting" },
  { value: 0.1429, label: "1/7 - Sangat kurang penting" },
  { value: 0.1111, label: "1/9 - Mutlak kurang penting" },
];

export default function SmartRestockDSS() {
  const { role } = useAuth();
  const isManagerOrAdmin = ["manager", "super_admin", "admin"].includes(role);

  // Tabs: 'topsis' | 'ahp' | 'audit' | 'history'
  const [activeTab, setActiveTab] = useState("topsis");

  // State Data
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingSimulation, setLoadingSimulation] = useState(false);
  const [generatingPo, setGeneratingPo] = useState(false);
  const [criteria, setCriteria] = useState([]);
  const [ahpMetrics, setAhpMetrics] = useState(null);
  const [matrixGrid, setMatrixGrid] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Simulation Controls
  const [budgetInput, setBudgetInput] = useState(150000000);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [selectedVariants, setSelectedVariants] = useState(new Set());

  // AHP Matrix Editor State
  const [matrixDraft, setMatrixDraft] = useState({});
  const [ahpSaving, setAhpSaving] = useState(false);
  const [ahpFeedback, setAhpFeedback] = useState(null);

  // PO Success Modal State
  const [poResultModal, setPoResultModal] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  function showToast(text, type = "success") {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }

  // 1. Fetch Config (Criteria & Current AHP Matrix)
  function loadConfig() {
    setLoadingConfig(true);
    api
      .get("/dss/config")
      .then((res) => {
        const data = res.data;
        setCriteria(data.criteria || []);
        setAhpMetrics(data.ahp_metrics || null);
        setMatrixGrid(data.matrix_grid || []);

        // Initial draft values
        const draft = {};
        if (data.matrix_grid) {
          data.matrix_grid.forEach((row) => {
            row.forEach((cell) => {
              if (cell.row_code !== cell.col_code) {
                draft[`${cell.row_code}_${cell.col_code}`] = cell.value;
              }
            });
          });
        }
        setMatrixDraft(draft);
      })
      .catch((err) => {
        console.error("Gagal mengambil konfigurasi DSS:", err);
        showToast("Gagal memuat konfigurasi kriteria DSS", "error");
      })
      .finally(() => setLoadingConfig(false));
  }

  // 2. Load Latest Session / Specific Session
  function loadLatestSession() {
    setLoadingSimulation(true);
    api
      .get("/dss/sessions")
      .then((res) => {
        const list = res.data.data || [];
        setSessionHistory(list);
        if (list.length > 0) {
          // Ambil detail sesi paling baru
          return api.get(`/dss/sessions/${list[0].id}`);
        }
        return null;
      })
      .then((detailRes) => {
        if (detailRes && detailRes.data) {
          setActiveSession(detailRes.data.session);
          setAuditData(detailRes.data.audit);
          setBudgetInput(detailRes.data.session.budget_limit || 150000000);

          // Auto-select variants that are within budget
          const inBudgetIds = new Set(
            (detailRes.data.session.results || [])
              .filter((r) => r.is_within_budget)
              .map((r) => r.variant_id)
          );
          setSelectedVariants(inBudgetIds);
        }
      })
      .catch((err) => {
        console.error("Gagal memuat sesi DSS:", err);
      })
      .finally(() => setLoadingSimulation(false));
  }

  useEffect(() => {
    loadConfig();
    loadLatestSession();
  }, []);

  // 3. Jalankan Simulasi TOPSIS Baru
  function handleRunSimulation() {
    if (!budgetInput || budgetInput <= 0) {
      alert("Masukkan batas anggaran pengadaan yang valid");
      return;
    }

    setLoadingSimulation(true);
    api
      .post("/dss/run-simulation", {
        budget_limit: Number(budgetInput),
        title: `Simulasi Restock Instrumen - ${formatRupiah(budgetInput)}`,
      })
      .then((res) => {
        const sess = res.data.session;
        setActiveSession(sess);
        setAuditData(res.data.audit);
        showToast(res.data.message || "Simulasi TOPSIS berhasil dihitung!");

        // Update selected items
        const inBudgetIds = new Set(
          (sess.results || []).filter((r) => r.is_within_budget).map((r) => r.variant_id)
        );
        setSelectedVariants(inBudgetIds);

        // Refresh histori sesi
        api.get("/dss/sessions").then((r) => setSessionHistory(r.data.data || []));
      })
      .catch((err) => {
        console.error("Gagal menjalankan simulasi:", err);
        alert(err.response?.data?.message || "Gagal menjalankan simulasi TOPSIS");
      })
      .finally(() => setLoadingSimulation(false));
  }

  // 4. Update Matriks AHP
  function handleSaveAhpMatrix() {
    setAhpSaving(true);
    setAhpFeedback(null);

    api
      .post("/dss/ahp-matrix", {
        comparisons: matrixDraft,
      })
      .then((res) => {
        setAhpMetrics(res.data.ahp_metrics);
        setAhpFeedback({
          type: "success",
          message: res.data.message,
        });
        loadConfig(); // Refresh bobot
        showToast("Matriks AHP konsisten dan bobot kriteria telah diperbarui!");
      })
      .catch((err) => {
        const data = err.response?.data;
        if (data?.ahp_metrics) {
          setAhpMetrics(data.ahp_metrics);
        }
        setAhpFeedback({
          type: "warning",
          message: data?.message || "Matriks AHP tidak konsisten (CR > 0.10)",
        });
      })
      .finally(() => setAhpSaving(false));
  }

  // 5. Generate PO Otomatis dari Hasil DSS
  function handleGeneratePO() {
    if (!activeSession) return;
    const selectedCount = selectedVariants.size;
    if (selectedCount === 0) {
      alert("Pilih minimal 1 varian SKU instrumen untuk dibuatkan Purchase Order");
      return;
    }

    if (
      !confirm(
        `Terbitkan Purchase Order (PO) otomatis untuk ${selectedCount} varian instrumen pilihan?`
      )
    ) {
      return;
    }

    setGeneratingPo(true);
    api
      .post(`/dss/sessions/${activeSession.id}/generate-po`, {
        variant_ids: Array.from(selectedVariants),
      })
      .then((res) => {
        setPoResultModal(res.data);
        showToast(res.data.message || "Purchase Order berhasil diterbitkan!");

        // Refresh detail sesi untuk update status po_generated
        api.get(`/dss/sessions/${activeSession.id}`).then((r) => {
          setActiveSession(r.data.session);
        });
      })
      .catch((err) => {
        alert(err.response?.data?.message || "Gagal menerbitkan Purchase Order");
      })
      .finally(() => setGeneratingPo(false));
  }

  // Filtered Results
  const results = activeSession?.results || [];
  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      const matchSearch =
        item.sku_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.variant_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchTier = filterTier === "all" || item.priority_tier === filterTier;

      return matchSearch && matchTier;
    });
  }, [results, searchQuery, filterTier]);

  // Selected totals
  const selectedSummary = useMemo(() => {
    let cost = 0;
    let count = 0;
    results.forEach((item) => {
      if (selectedVariants.has(item.variant_id)) {
        cost += Number(item.estimated_po_cost || 0);
        count += 1;
      }
    });
    return { count, cost };
  }, [results, selectedVariants]);

  function toggleVariantSelection(varId) {
    setSelectedVariants((prev) => {
      const next = new Set(prev);
      if (next.has(varId)) {
        next.delete(varId);
      } else {
        next.add(varId);
      }
      return next;
    });
  }

  function selectAllInBudget() {
    const inBudget = new Set(
      results.filter((r) => r.is_within_budget).map((r) => r.variant_id)
    );
    setSelectedVariants(inBudget);
  }

  function clearAllSelection() {
    setSelectedVariants(new Set());
  }

  // Load Past Session
  function handleSelectPastSession(sessId) {
    setLoadingSimulation(true);
    api
      .get(`/dss/sessions/${sessId}`)
      .then((res) => {
        setActiveSession(res.data.session);
        setAuditData(res.data.audit);
        setBudgetInput(res.data.session.budget_limit || 150000000);
        const inBudgetIds = new Set(
          (res.data.session.results || [])
            .filter((r) => r.is_within_budget)
            .map((r) => r.variant_id)
        );
        setSelectedVariants(inBudgetIds);
        setActiveTab("topsis");
        showToast(`Memuat sesi histori: ${res.data.session.session_code}`);
      })
      .catch((err) => {
        alert("Gagal memuat sesi histori");
      })
      .finally(() => setLoadingSimulation(false));
  }

  // KPI Computations
  const totalSkuCount = results.length;
  const highPriorityCount = results.filter((r) => r.priority_tier === "high_priority").length;
  const crValue = ahpMetrics?.consistency_ratio ?? (activeSession?.consistency_ratio ?? 0.0);
  const isAHPValid = crValue <= 0.10;
  const allocatedCost = activeSession?.total_allocated_cost || 0;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/60 font-sans md:flex-row">
      <Sidebar />

      <main className="flex-1 p-5 md:p-8 lg:p-10">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Toast Notification */}
          {toastMessage && (
            <div
              className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-bold shadow-lg transition-all animate-fadeIn ${
                toastMessage.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {toastMessage.type === "error" ? (
                <AlertCircle size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              <span>{toastMessage.text}</span>
            </div>
          )}

          {/* Header Title Section */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white shadow-xs">
                  <Cpu size={19} />
                </span>
                <div>
                  <h1 className="font-jakarta text-2xl font-black tracking-tight text-gray-900">
                    Smart Restock Prioritization (DSS)
                  </h1>
                  <p className="text-xs font-medium text-gray-500">
                    Sistem Pendukung Keputusan Multi-Kriteria Pengadaan Instrumen Musik Menggunakan{" "}
                    <span className="font-semibold text-gray-800">Hybrid AHP &amp; TOPSIS</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  loadConfig();
                  loadLatestSession();
                  showToast("Data DSS berhasil diperbarui");
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
              >
                <RefreshCw size={13} className={loadingSimulation ? "animate-spin" : ""} />
                Sinkronisasi Data
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1 */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Total SKU Dianalisis
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                  <Package size={14} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-gray-900">
                {totalSkuCount}{" "}
                <span className="text-xs font-normal text-gray-500">Varian Instrumen</span>
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                Dari katalog aktif Swee Lee / Overtone
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  SKU Prioritas Utama
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <Sparkles size={14} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-rose-600">
                {highPriorityCount}{" "}
                <span className="text-xs font-normal text-gray-500">SKU Kritis</span>
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                Stok minim dengan sales velocity tinggi
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Konsistensi AHP
                </span>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                    isAHPValid ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                  }`}
                >
                  <Scale size={14} />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900">
                  CR {crValue !== null ? crValue.toFixed(4) : "0.0000"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isAHPValid
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {isAHPValid ? "VALID (CR ≤ 0.10)" : "INKONSISTEN"}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-gray-500">Bobot Eigenvector 5 Kriteria</p>
            </div>

            {/* Card 4 */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Alokasi Anggaran PO
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Coins size={14} />
                </span>
              </div>
              <p className="mt-2 text-xl font-black text-gray-900 truncate">
                {formatRupiah(allocatedCost)}
              </p>
              <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                <span>Kuota: {formatRupiah(activeSession?.budget_limit || budgetInput)}</span>
                <span className="font-bold text-gray-800">
                  {activeSession?.budget_limit
                    ? `${Math.round((allocatedCost / activeSession.budget_limit) * 100)}%`
                    : "0%"}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 pb-2">
            <button
              onClick={() => setActiveTab("topsis")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "topsis"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100 hover:text-black"
              }`}
            >
              <Award size={15} />
              Peringkat TOPSIS &amp; Simulasi PO
            </button>

            <button
              onClick={() => setActiveTab("ahp")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "ahp"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100 hover:text-black"
              }`}
            >
              <Scale size={15} />
              Matriks Berpasangan AHP 5×5
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "audit"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100 hover:text-black"
              }`}
            >
              <Calculator size={15} />
              Bedah Matriks Ilmiah (Audit Perhitungan)
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "history"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100 hover:text-black"
              }`}
            >
              <History size={15} />
              Riwayat Sesi DSS
              {sessionHistory.length > 0 && (
                <span className="rounded-full bg-gray-200 px-1.5 py-0.2 text-[10px] font-extrabold text-gray-800">
                  {sessionHistory.length}
                </span>
              )}
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: PERINGKAT TOPSIS & SIMULATOR ANGGARAN PO (UTAMA) */}
          {/* ========================================================================= */}
          {activeTab === "topsis" && (
            <div className="space-y-6">
              {/* Simulator Budget Bar */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-md">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                      Batas Anggaran Pengadaan (Purchase Order Budget Limit)
                    </label>
                    <div className="relative mt-1 flex items-center">
                      <span className="absolute left-3.5 text-xs font-bold text-gray-400">Rp</span>
                      <input
                        type="number"
                        step="5000000"
                        min="10000000"
                        value={budgetInput}
                        onChange={(e) => setBudgetInput(Number(e.target.value))}
                        className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 text-sm font-bold text-gray-900 focus:border-black focus:bg-white focus:outline-none focus:ring-1 focus:ring-black"
                        placeholder="150000000"
                      />
                    </div>
                  </div>

                  {/* Tombol Cepat Budget */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Pilihan Cepat Plafon Anggaran:
                    </span>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {[50000000, 150000000, 300000000, 500000000].map((bVal) => (
                        <button
                          key={bVal}
                          type="button"
                          onClick={() => setBudgetInput(bVal)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            budgetInput === bVal
                              ? "bg-gray-900 text-white font-bold"
                              : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {formatRupiah(bVal)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Run Simulation */}
                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={loadingSimulation}
                      onClick={handleRunSimulation}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-black px-6 text-xs font-bold text-white shadow-xs hover:bg-gray-800 disabled:opacity-50 transition"
                    >
                      {loadingSimulation ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Menghitung TOPSIS...
                        </>
                      ) : (
                        <>
                          <Play size={14} fill="white" /> Jalankan Analisis TOPSIS
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sesi info banner */}
                {activeSession && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-gray-900">Sesi Aktif:</span>
                      <span className="font-mono font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md">
                        {activeSession.session_code}
                      </span>
                      <span>• Dibuat oleh: <b>{activeSession.executed_by_name}</b></span>
                      <span>• {formatDate(activeSession.created_at)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Status Sesi:</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                          activeSession.status === "po_generated"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {activeSession.status === "po_generated"
                          ? "PO Telah Diterbitkan"
                          : "Simulasi Draft"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Table Toolbar & Filters */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-64 md:w-80">
                    <Search size={14} className="absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari SKU, Instrumen, atau Brand..."
                      className="h-9 w-full rounded-full border border-gray-200 bg-white pl-9 pr-4 text-xs font-medium text-gray-900 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-gray-500 ml-2">Tier:</span>
                    {["all", "high_priority", "medium_priority", "low_priority"].map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setFilterTier(tier)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                          filterTier === tier
                            ? "bg-gray-900 text-white"
                            : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {tier === "all"
                          ? "Semua"
                          : tier === "high_priority"
                          ? "High"
                          : tier === "medium_priority"
                          ? "Medium"
                          : "Low"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bulk Actions & Selection Counters */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllInBudget}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Pilih Sesuai Kuota Budget
                  </button>
                  <button
                    type="button"
                    onClick={clearAllSelection}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition"
                  >
                    Reset Pilihan
                  </button>

                  <button
                    type="button"
                    disabled={generatingPo || selectedSummary.count === 0}
                    onClick={handleGeneratePO}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs disabled:opacity-50 transition"
                  >
                    {generatingPo ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" /> Menerbitkan PO...
                      </>
                    ) : (
                      <>
                        <FileCheck size={14} /> Terbitkan PO ({selectedSummary.count} SKU)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Tabel TOPSIS Interaktif */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="w-12 px-4 py-3.5 text-center">Pilih</th>
                        <th className="w-14 px-3 py-3.5 text-center">Rank</th>
                        <th className="px-4 py-3.5">Instrumen &amp; Varian SKU</th>
                        <th className="px-3 py-3.5 text-center">
                          <span title="Remaining Stock di Gudang/Showroom (Cost: semakin sedikit semakin urgen)">
                            C1: Stok
                          </span>
                        </th>
                        <th className="px-3 py-3.5 text-center">
                          <span title="Unit Terjual Historis (Benefit: semakin laris semakin butuh restock)">
                            C2: Sales
                          </span>
                        </th>
                        <th className="px-3 py-3.5 text-center">
                          <span title="Gross Margin % (Benefit)">C3: Margin %</span>
                        </th>
                        <th className="px-3 py-3.5 text-center">
                          <span title="Market Demand / Wishlists + Orders (Benefit)">
                            C4: Demand
                          </span>
                        </th>
                        <th className="px-3 py-3.5 text-right">
                          <span title="Unit COGS / Harga Modal (Cost)">C5: Modal Unit</span>
                        </th>
                        <th className="px-3 py-3.5 text-center">Jarak D⁺ / D⁻</th>
                        <th className="w-36 px-4 py-3.5 text-center">Skor TOPSIS (Vᵢ)</th>
                        <th className="px-3 py-3.5 text-center">Prioritas</th>
                        <th className="px-3 py-3.5 text-center">Restock Qty</th>
                        <th className="px-4 py-3.5 text-right">Estimasi Modal PO</th>
                        <th className="px-4 py-3.5 text-center">Status Budget</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredResults.length === 0 ? (
                        <tr>
                          <td colSpan={14} className="p-8 text-center text-gray-400">
                            Tidak ada data instrumen yang cocok dengan filter atau simulasi belum
                            dijalankan.
                          </td>
                        </tr>
                      ) : (
                        filteredResults.map((item) => {
                          const isSelected = selectedVariants.has(item.variant_id);
                          const isTop3 = item.rank_number <= 3;

                          return (
                            <tr
                              key={item.variant_id}
                              className={`transition-colors ${
                                isSelected ? "bg-emerald-50/30" : "hover:bg-gray-50/50"
                              } ${item.is_within_budget ? "" : "opacity-80"}`}
                            >
                              {/* Checkbox */}
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleVariantSelection(item.variant_id)}
                                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                                />
                              </td>

                              {/* Rank */}
                              <td className="px-3 py-3 text-center font-black">
                                <span
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                                    item.rank_number === 1
                                      ? "bg-amber-400 text-gray-900 font-extrabold shadow-xs"
                                      : item.rank_number === 2
                                      ? "bg-gray-200 text-gray-800 font-bold"
                                      : item.rank_number === 3
                                      ? "bg-amber-200 text-amber-900 font-bold"
                                      : "text-gray-500"
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
                                      className="h-9 w-9 rounded-lg object-cover border border-gray-200"
                                    />
                                  ) : (
                                    <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                      <Package size={16} />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-gray-900 line-clamp-1">
                                      {item.product_name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                                      <span className="font-mono font-semibold text-gray-700">
                                        {item.sku_code}
                                      </span>
                                      <span>•</span>
                                      <span>{item.variant_name}</span>
                                      <span>•</span>
                                      <span className="text-gray-600 font-semibold">
                                        {item.brand_name}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* C1: Stok Fisik */}
                              <td className="px-3 py-3 text-center">
                                <span
                                  className={`inline-block rounded-md px-2 py-0.5 font-bold ${
                                    item.raw_c1_stock <= 2
                                      ? "bg-rose-100 text-rose-800"
                                      : item.raw_c1_stock <= 5
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {item.raw_c1_stock} unit
                                </span>
                              </td>

                              {/* C2: Sales Velocity */}
                              <td className="px-3 py-3 text-center font-bold text-gray-800">
                                {item.raw_c2_sales} sold
                              </td>

                              {/* C3: Margin % */}
                              <td className="px-3 py-3 text-center font-semibold text-emerald-700">
                                {item.raw_c3_margin}%
                              </td>

                              {/* C4: Market Demand */}
                              <td className="px-3 py-3 text-center font-semibold text-gray-700">
                                {item.raw_c4_demand} hits
                              </td>

                              {/* C5: Modal Unit COGS */}
                              <td className="px-3 py-3 text-right font-mono text-gray-700">
                                {formatRupiah(item.raw_c5_cogs)}
                              </td>

                              {/* Jarak D+ / D- */}
                              <td className="px-3 py-3 text-center font-mono text-[10px] text-gray-500">
                                <span className="text-rose-600">{item.d_plus.toFixed(4)}</span> /{" "}
                                <span className="text-emerald-600">{item.d_minus.toFixed(4)}</span>
                              </td>

                              {/* Skor TOPSIS Vi + Progress Bar */}
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs font-black text-gray-900">
                                    <span>{item.preference_score.toFixed(4)}</span>
                                    <span className="text-[10px] text-gray-400">
                                      {Math.round(item.preference_score * 100)}%
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        isTop3
                                          ? "bg-black"
                                          : item.priority_tier === "high_priority"
                                          ? "bg-rose-500"
                                          : item.priority_tier === "medium_priority"
                                          ? "bg-amber-500"
                                          : "bg-gray-400"
                                      }`}
                                      style={{ width: `${item.preference_score * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Tier Badge */}
                              <td className="px-3 py-3 text-center">
                                <span
                                  className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                                    item.priority_tier === "high_priority"
                                      ? "bg-rose-100 text-rose-700"
                                      : item.priority_tier === "medium_priority"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {item.priority_tier === "high_priority"
                                    ? "High"
                                    : item.priority_tier === "medium_priority"
                                    ? "Medium"
                                    : "Low"}
                                </span>
                              </td>

                              {/* Recommended Restock Qty */}
                              <td className="px-3 py-3 text-center font-black text-gray-900">
                                +{item.recommended_restock_qty} unit
                              </td>

                              {/* Estimated PO Cost */}
                              <td className="px-4 py-3 text-right font-black text-gray-900">
                                {formatRupiah(item.estimated_po_cost)}
                              </td>

                              {/* In Budget Status */}
                              <td className="px-4 py-3 text-center">
                                {item.is_within_budget ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                    <Check size={11} /> Masuk Kuota
                                  </span>
                                ) : (
                                  <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-extrabold text-gray-500">
                                    Di Luar Kuota
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Ringkasan Bawah Tabel */}
                <div className="border-t border-gray-200 bg-gray-50 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-gray-500">Terpilih untuk PO: </span>
                      <span className="font-black text-gray-900">{selectedSummary.count} SKU</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Kebutuhan Modal: </span>
                      <span className="font-black text-gray-900">
                        {formatRupiah(selectedSummary.cost)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">
                      Sisa Plafon Anggaran:{" "}
                      <b
                        className={
                          (activeSession?.budget_limit || budgetInput) - selectedSummary.cost >= 0
                            ? "text-emerald-700 font-bold"
                            : "text-rose-600 font-bold"
                        }
                      >
                        {formatRupiah(
                          (activeSession?.budget_limit || budgetInput) - selectedSummary.cost
                        )}
                      </b>
                    </span>
                    <button
                      type="button"
                      disabled={generatingPo || selectedSummary.count === 0}
                      onClick={handleGeneratePO}
                      className="rounded-xl bg-black px-5 py-2 font-bold text-white shadow-xs hover:bg-gray-800 disabled:opacity-50 transition"
                    >
                      Terbitkan Purchase Order ({selectedSummary.count} SKU)
                    </button>
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
              {/* Penjelasan Singkat */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900">
                      Matriks Perbandingan Berpasangan AHP (5×5 Pairwise Comparison)
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 max-w-2xl">
                      Atur tingkat kepentingan relatif antar kriteria pengadaan instrumen musik
                      menggunakan skala Saaty 1–9. Sistem secara otomatis menghitung nilai resiprokal{" "}
                      <span className="font-mono text-gray-800">a(j,i) = 1 / a(i,j)</span>, vektor bobot{" "}
                      <i>Eigenvector</i>, serta menguji rasio konsistensi logis (CR ≤ 0.10).
                    </p>
                  </div>

                  {isManagerOrAdmin && (
                    <button
                      type="button"
                      disabled={ahpSaving}
                      onClick={handleSaveAhpMatrix}
                      className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-gray-800 disabled:opacity-50 transition"
                    >
                      {ahpSaving ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Menghitung...
                        </>
                      ) : (
                        <>
                          <Check size={14} /> Terapkan &amp; Simpan Bobot AHP
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Feedback Banner */}
                {ahpFeedback && (
                  <div
                    className={`mt-4 rounded-xl p-3 text-xs font-bold flex items-center gap-2 ${
                      ahpFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {ahpFeedback.type === "success" ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                    <span>{ahpFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* Status Konsistensi Live & Bobot Kriteria */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Nilai Eigen Max (λ max)
                  </span>
                  <p className="mt-1 text-2xl font-black text-gray-900">
                    {ahpMetrics?.lambda_max ? ahpMetrics.lambda_max.toFixed(4) : "5.0000"}
                  </p>
                  <p className="text-[11px] text-gray-500">Target ordo 5x5: ≈ 5.0</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Consistency Index (CI)
                  </span>
                  <p className="mt-1 text-2xl font-black text-gray-900">
                    {ahpMetrics?.consistency_index !== undefined
                      ? ahpMetrics.consistency_index.toFixed(5)
                      : "0.0000"}
                  </p>
                  <p className="text-[11px] text-gray-500">Rumus: (λmax - n) / (n - 1)</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Random Index (RI, n=5)
                  </span>
                  <p className="mt-1 text-2xl font-black text-gray-900">
                    {ahpMetrics?.random_index || "1.12"}
                  </p>
                  <p className="text-[11px] text-gray-500">Tabel Standar Saaty untuk n=5</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Consistency Ratio (CR)
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-gray-900">
                      {ahpMetrics?.consistency_ratio !== undefined
                        ? ahpMetrics.consistency_ratio.toFixed(4)
                        : "0.0000"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        (ahpMetrics?.consistency_ratio ?? 0) <= 0.1
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {(ahpMetrics?.consistency_ratio ?? 0) <= 0.1
                        ? "KONSISTEN"
                        : "INKONSISTEN (>0.10)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">Wajib ≤ 0.10 untuk validitas</p>
                </div>
              </div>

              {/* Tabel Matriks 5x5 Input */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
                <h3 className="text-sm font-extrabold text-gray-900 mb-4">
                  Tabel Perbandingan Berpasangan Antar Kriteria (Skala Saaty)
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-extrabold text-gray-600">
                        <th className="p-3 text-left">Kriteria Baris / Kolom</th>
                        {criteria.map((c) => (
                          <th key={c.code} className="p-3">
                            <span className="font-bold">{c.code}</span>
                            <div className="text-[10px] font-normal text-gray-500 truncate max-w-[110px]">
                              {c.name.split(" ")[0]}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {criteria.map((rowC) => (
                        <tr key={rowC.code} className="hover:bg-gray-50/40">
                          <td className="p-3 text-left font-bold text-gray-900 bg-gray-50/30">
                            <span className="font-mono text-xs mr-1 bg-gray-200 px-1.5 py-0.5 rounded">
                              {rowC.code}
                            </span>
                            <span>{rowC.name}</span>
                          </td>

                          {criteria.map((colC) => {
                            if (rowC.code === colC.code) {
                              return (
                                <td
                                  key={colC.code}
                                  className="p-3 bg-gray-100 font-mono font-black text-gray-500"
                                >
                                  1.0000
                                </td>
                              );
                            }

                            // Jika baris < kolom, ini adalah sel input utama
                            const key = `${rowC.code}_${colC.code}`;
                            const invKey = `${colC.code}_${rowC.code}`;
                            const currentVal = matrixDraft[key] ?? 1.0;

                            return (
                              <td key={colC.code} className="p-2">
                                {rowC.code < colC.code ? (
                                  <select
                                    disabled={!isManagerOrAdmin}
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
                                    className="w-full rounded-lg border border-gray-300 bg-white p-1.5 text-xs font-semibold text-gray-900 focus:border-black focus:outline-none"
                                  >
                                    {SAATY_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="font-mono font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100">
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
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
                <h3 className="text-sm font-extrabold text-gray-900 mb-4">
                  Vektor Bobot Prioritas Kriteria (Eigenvector Weights)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {criteria.map((c) => {
                    const weightPct = Math.round(c.weight * 100);
                    return (
                      <div
                        key={c.code}
                        className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-black px-2 py-0.5 font-mono text-xs font-bold text-white">
                            {c.code}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              c.attribute_type === "benefit"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {c.attribute_type}
                          </span>
                        </div>
                        <p className="font-extrabold text-xs text-gray-900 line-clamp-2">
                          {c.name}
                        </p>
                        <div className="pt-2">
                          <div className="flex items-baseline justify-between text-xs font-black text-gray-900 mb-1">
                            <span>{(c.weight * 100).toFixed(1)}%</span>
                            <span className="text-[10px] text-gray-400">
                              w = {c.weight.toFixed(4)}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-black"
                              style={{ width: `${weightPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Parameter & Ambang Batas Sub-Kriteria */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
                <h3 className="text-sm font-extrabold text-gray-900 mb-3">
                  Parameter Interpretasi Skala Penilaian Sub-Kriteria (dss_subcriteria_ranges)
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Panduan interpretasi manajerial terhadap skor parameter 1 s/d 5 yang dikonversi
                  ke dalam matriks TOPSIS.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {criteria.map((c) => (
                    <div
                      key={c.code}
                      className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <span className="font-extrabold text-xs text-gray-900">
                          {c.code} - {c.name.split("(")[0]}
                        </span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                          {c.attribute_type}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {(c.ranges || []).map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-gray-50/80"
                          >
                            <span className="text-gray-700 font-medium">{r.range_label}</span>
                            <span className="rounded bg-gray-200 px-1.5 py-0.2 font-mono font-bold text-gray-800">
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
              {/* Formula & Teori Box */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
                <h2 className="text-base font-extrabold text-gray-900">
                  Transparansi Algoritma Matematika: Hybrid AHP &amp; TOPSIS
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Berikut merupakan transparansi penuh proses kalkulasi multi-tahap dari data mentah
                  hingga terbentuk skor preferensi akhir.
                </p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 space-y-1.5">
                    <p className="font-bold text-gray-900">1. Normalisasi Euclidean (R)</p>
                    <p className="font-mono text-[11px] text-gray-700 bg-white p-2 rounded border border-gray-200">
                      r_ij = x_ij / √(∑ x_kj²)
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Menghilangkan dimensi satuan rupiah, unit, dan persentase.
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 space-y-1.5">
                    <p className="font-bold text-gray-900">2. Normalisasi Terbobot AHP (Y)</p>
                    <p className="font-mono text-[11px] text-gray-700 bg-white p-2 rounded border border-gray-200">
                      y_ij = w_j × r_ij
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Mengalikan matriks ternormalisasi dengan bobot eigenvector kriteria AHP.
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3.5 space-y-1.5">
                    <p className="font-bold text-gray-900">3. Solusi Ideal &amp; Nilai Preferensi</p>
                    <p className="font-mono text-[11px] text-gray-700 bg-white p-2 rounded border border-gray-200">
                      V_i = D_i⁻ / (D_i⁺ + D_i⁻)
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Alternatif terdekat dengan solusi ideal positif A⁺ dan terjauh dari A⁻.
                    </p>
                  </div>
                </div>
              </div>

              {/* Solusi Ideal Positif A+ & Negatif A- */}
              {auditData && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
                  <h3 className="text-sm font-extrabold text-gray-900 mb-3">
                    Solusi Ideal Positif (A⁺) dan Solusi Ideal Negatif (A⁻)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs">
                      <thead className="border-b border-gray-200 bg-gray-50 font-bold text-gray-600">
                        <tr>
                          <th className="p-3 text-left">Vektor Solusi</th>
                          {criteria.map((c) => (
                            <th key={c.code} className="p-3">
                              {c.code} ({c.attribute_type})
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                        <tr className="bg-emerald-50/30">
                          <td className="p-3 text-left font-bold text-emerald-800">
                            A⁺ (Solusi Ideal Positif)
                          </td>
                          {auditData.ideal_positive.map((v, i) => (
                            <td key={i} className="p-3 font-bold text-emerald-700">
                              {v.toFixed(5)}
                            </td>
                          ))}
                        </tr>
                        <tr className="bg-rose-50/30">
                          <td className="p-3 text-left font-bold text-rose-800">
                            A⁻ (Solusi Ideal Negatif)
                          </td>
                          {auditData.ideal_negative.map((v, i) => (
                            <td key={i} className="p-3 font-bold text-rose-700">
                              {v.toFixed(5)}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Matriks Normalisasi Terbobot (Y) */}
              {auditData && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
                  <h3 className="text-sm font-extrabold text-gray-900 mb-3">
                    Matriks Normalisasi Terbobot (Y = w_j × r_ij)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs">
                      <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-500">
                        <tr>
                          <th className="p-3 text-left">SKU Instrumen</th>
                          <th className="p-3">Nama Varian</th>
                          <th className="p-3">Y1: Stok (0.30)</th>
                          <th className="p-3">Y2: Sales (0.25)</th>
                          <th className="p-3">Y3: Margin (0.20)</th>
                          <th className="p-3">Y4: Demand (0.15)</th>
                          <th className="p-3">Y5: COGS (0.10)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                        {auditData.weighted_normalized_matrix.map((row) => (
                          <tr key={row.variant_id} className="hover:bg-gray-50">
                            <td className="p-3 text-left font-bold text-gray-900 font-sans">
                              {row.sku_code}
                            </td>
                            <td className="p-3 text-left text-gray-600 font-sans truncate max-w-[200px]">
                              {row.product_name}
                            </td>
                            {row.values.map((val, idx) => (
                              <td key={idx} className="p-3">
                                {Number(val).toFixed(5)}
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
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900">
                      Riwayat Sesi Simulasi Keputusan DSS
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      Histori simulasi perhitungan restock instrumen musik yang pernah dieksekusi
                      dan status penerbitan Purchase Order-nya.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setLoadingHistory(true);
                      api
                        .get("/dss/sessions")
                        .then((res) => setSessionHistory(res.data.data || []))
                        .finally(() => setLoadingHistory(false));
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50"
                  >
                    <RefreshCw size={13} className={loadingHistory ? "animate-spin" : ""} />
                    Refresh Histori
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
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
                  <tbody className="divide-y divide-gray-100">
                    {sessionHistory.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-400">
                          Belum ada histori sesi DSS yang tersimpan.
                        </td>
                      </tr>
                    ) : (
                      sessionHistory.map((sess) => (
                        <tr key={sess.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3.5 font-mono font-bold text-gray-900">
                            {sess.session_code}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-gray-800">{sess.title}</td>
                          <td className="px-4 py-3.5 text-gray-500">
                            {formatDate(sess.created_at)}
                          </td>
                          <td className="px-4 py-3.5 text-gray-700">{sess.executed_by_name}</td>
                          <td className="px-4 py-3.5 text-right font-semibold text-gray-900">
                            {formatRupiah(sess.budget_limit)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-black text-emerald-700">
                            {formatRupiah(sess.total_allocated_cost)}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                                sess.status === "po_generated"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {sess.status === "po_generated"
                                ? "PO Diterbitkan"
                                : "Simulasi Draft"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleSelectPastSession(sess.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-800 shadow-2xs hover:bg-gray-100"
                            >
                              <Eye size={13} /> Muat Sesi
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL SUKSES PENERBITAN PURCHASE ORDER */}
          {/* ========================================================================= */}
          {poResultModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
              <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 size={18} />
                    </span>
                    <h3 className="font-jakarta text-lg font-black text-gray-900">
                      Purchase Order Berhasil Diterbitkan!
                    </h3>
                  </div>
                  <button
                    onClick={() => setPoResultModal(null)}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-black"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-gray-600">
                  <p>
                    Sistem berhasil mengonversi rekomendasi TOPSIS menjadi{" "}
                    <b>{poResultModal.total_po_created} dokumen Purchase Order resmi</b> dan
                    meneruskannya ke tahap persetujuan Manager serta pembayaran Finance.
                  </p>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Nomor Purchase Order yang Terbentuk:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(poResultModal.po_numbers || []).map((poNum) => (
                        <span
                          key={poNum}
                          className="font-mono font-bold text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-lg text-gray-900 shadow-2xs"
                        >
                          {poNum}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setPoResultModal(null)}
                    className="rounded-xl bg-black px-6 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition"
                  >
                    Tutup &amp; Lanjutkan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

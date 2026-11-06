import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import {
  BookOpen,
  Search,
  Plus,
  Filter,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Lock,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Tag,
  XCircle,
  RefreshCw,
  Cpu,
} from "lucide-react";
import api from "../../api";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { StatCard } from "../../components/ui/Card";
import { errorMessage, formatDate } from "../../utils/format";

function getDivisionLabel(targetRole) {
  if (targetRole === "warehouse_staff" || targetRole === "warehouse") return "Warehouse & Logistik";
  if (targetRole === "store_staff" || targetRole === "staff" || targetRole === "promoter") return "Offline Store";
  if (targetRole === "finance") return "Finance & P&L";
  if (targetRole === "manager") return "Retail Manager";
  if (targetRole === "all_internal") return "Semua Staf OAS";
  return "Publik / Musisi";
}

function renderPriorityBadge(priority) {
  if (priority === "critical") {
    return <Badge status="danger">Critical</Badge>;
  }
  if (priority === "mandatory") {
    return <Badge status="warning">Mandatory</Badge>;
  }
  return <Badge status="neutral">Standard</Badge>;
}

export default function AdminKmsManager() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeSection, setActiveSection] = useState(
    initialTab === "compliance" || initialTab === "categories" || initialTab === "es_rules"
      ? initialTab
      : "articles"
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && (tab === "articles" || tab === "categories" || tab === "compliance" || tab === "es_rules")) {
      setActiveSection(tab);
    }
  }, [searchParams]);

  const handleTabChange = (section) => {
    setActiveSection(section);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (section === "articles") {
        next.delete("tab");
      } else {
        next.set("tab", section);
      }
      return next;
    });
  };

  // ES Rules State (Subsistem ke-6: Expert System)
  const [esRules, setEsRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [rulesDomainFilter, setRulesDomainFilter] = useState("all");

  // Categories Master Data
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // Articles & SOPs
  const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(true);

  // Filter States for Articles
  const [scopeFilter, setScopeFilter] = useState("all"); // 'all' | 'customer' | 'internal'
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [previewArticle, setPreviewArticle] = useState(null);

  // Compliance Matrix State (Fitur 1.6)
  const [complianceData, setComplianceData] = useState(null);
  const [loadingCompliance, setLoadingCompliance] = useState(false);

  const loadCategories = useCallback(() => {
    setLoadingCats(true);
    api
      .get("/kms/categories")
      .then((r) => setCategories(r.data.data || []))
      .catch((e) => toast.error(errorMessage(e, "Gagal memuat kategori")))
      .finally(() => setLoadingCats(false));
  }, []);

  const loadArticles = useCallback(() => {
    setLoadingArticles(true);
    api
      .get("/kms/admin/articles")
      .then((r) => setArticles(r.data.data || []))
      .catch((e) => toast.error(errorMessage(e, "Gagal memuat artikel KMS")))
      .finally(() => setLoadingArticles(false));
  }, []);

  const loadCompliance = useCallback(() => {
    setLoadingCompliance(true);
    api
      .get("/kms/admin/kms/sop-compliance")
      .then((r) => setComplianceData(r.data.data || null))
      .catch((e) => toast.error(errorMessage(e, "Gagal memuat matriks kepatuhan SOP")))
      .finally(() => setLoadingCompliance(false));
  }, []);

  const loadEsRules = useCallback(() => {
    setLoadingRules(true);
    api
      .get("/es/rules")
      .then((r) => setEsRules(r.data.rules || []))
      .catch((e) => toast.error(errorMessage(e, "Gagal memuat aturan pakar ES")))
      .finally(() => setLoadingRules(false));
  }, []);

  useEffect(() => {
    loadCategories();
    loadArticles();
  }, [loadCategories, loadArticles]);

  useEffect(() => {
    if (activeSection === "compliance") {
      loadCompliance();
    } else if (activeSection === "es_rules") {
      loadEsRules();
    }
  }, [activeSection, loadCompliance, loadEsRules]);

  const handleToggleRule = async (rule) => {
    try {
      const res = await api.put(`/es/rules/${rule.id}`, {
        is_active: !rule.is_active,
      });
      if (res.data?.success) {
        toast.success(
          `Aturan ${rule.rule_code} berhasil ${!rule.is_active ? "diaktifkan" : "dinonaktifkan"}`
        );
        setEsRules((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, is_active: !rule.is_active } : r))
        );
      }
    } catch (e) {
      toast.error(errorMessage(e, "Gagal mengubah status aturan ES"));
    }
  };

  const confirm = useConfirm();

  async function handleDelete(id, title) {
    const ok = await confirm({
      title: "Hapus Dokumen KMS",
      message: `Hapus dokumen "${title}" secara permanen? Dokumen tidak dapat dipulihkan.`,
      confirmLabel: "Hapus Dokumen",
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/kms/admin/articles/${id}`);
      toast.success("Dokumen KMS berhasil dihapus");
      loadArticles();
    } catch (e) {
      toast.error(errorMessage(e, "Gagal menghapus dokumen"));
    }
  }

  const filteredArticles = useMemo(() => {
    let list = Array.isArray(articles) ? articles : [];

    if (scopeFilter === "customer") {
      list = list.filter((a) => a.audience_type === "customer");
    } else if (scopeFilter === "internal") {
      list = list.filter((a) => a.audience_type === "internal");
      if (divisionFilter !== "all") {
        list = list.filter((a) => a.target_role === divisionFilter);
      }
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          (a.title || "").toLowerCase().includes(q) ||
          (a.sop_code || "").toLowerCase().includes(q) ||
          (a.excerpt || "").toLowerCase().includes(q) ||
          (a.target_role || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [articles, scopeFilter, divisionFilter, searchQuery]);

  const metrics = useMemo(() => {
    const list = Array.isArray(articles) ? articles : [];
    return {
      total: list.length,
      customer: list.filter((a) => a.audience_type === "customer").length,
      internal: list.filter((a) => a.audience_type === "internal").length,
      critical: list.filter((a) => a.priority_level === "critical" || a.priority_level === "mandatory").length,
    };
  }, [articles]);

  const filteredEsRules = useMemo(() => {
    if (rulesDomainFilter === "all") return esRules;
    return esRules.filter((r) => r.domain === rulesDomainFilter);
  }, [esRules, rulesDomainFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-line pb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent block mb-1">
            Dual-Scope Knowledge Architecture
          </span>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-ink tracking-tight flex items-center gap-2.5">
            <BookOpen size={24} className="text-accent" aria-hidden="true" /> Knowledge Management System (KMS) &amp; SOP
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-secondary">
            Pusat kurasi Dual-Scope KMS: Panduan Publik Musisi (Customer Knowledge Base) &amp; Dokumen SOP Khusus Divisi Internal OAS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setEditingArticle(null);
              setShowForm(true);
            }}
          >
            <Plus size={15} aria-hidden="true" /> Buat Dokumen Baru
          </Button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Dokumen" value={metrics.total} />
        <StatCard label="Customer Guide (Publik)" value={metrics.customer} />
        <StatCard label="SOP Internal Staf (OAS)" value={metrics.internal} />
        <StatCard label="SOP Kritis / Mandatori" value={metrics.critical} />
      </div>

      {/* Navigation Sections (Articles/SOPs | Categories | Compliance) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3" role="tablist" aria-label="Navigasi modul KMS">
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "articles"}
          onClick={() => handleTabChange("articles")}
          className={`flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-semibold transition-colors tabular-nums ${
            activeSection === "articles"
              ? "bg-ink text-canvas"
              : "bg-surface border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
          }`}
        >
          <BookOpen size={14} aria-hidden="true" /> Dokumen &amp; SOP ({metrics.total})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "categories"}
          onClick={() => handleTabChange("categories")}
          className={`flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-semibold transition-colors tabular-nums ${
            activeSection === "categories"
              ? "bg-ink text-canvas"
              : "bg-surface border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
          }`}
        >
          <Tag size={14} aria-hidden="true" /> Kategori KMS ({categories.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "compliance"}
          onClick={() => handleTabChange("compliance")}
          className={`flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-semibold transition-colors ${
            activeSection === "compliance"
              ? "bg-ink text-canvas"
              : "bg-surface border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
          }`}
        >
          <ShieldCheck size={14} aria-hidden="true" /> Matriks Kepatuhan Staf (Compliance)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === "es_rules"}
          onClick={() => handleTabChange("es_rules")}
          className={`flex items-center gap-2 rounded-sm px-4 py-2 text-xs font-semibold transition-colors tabular-nums ${
            activeSection === "es_rules"
              ? "bg-ink text-canvas"
              : "bg-surface border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
          }`}
        >
          <Cpu size={14} className={activeSection === "es_rules" ? "text-accent" : ""} aria-hidden="true" />
          Basis Aturan Pakar (ES Rules) ({esRules.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: ARTICLES & SOPS (Dual-Scope Workspace)        */}
      {/* ======================================================== */}
      {activeSection === "articles" && (
        <div className="space-y-4">
          {/* 1. Tab Filter Utama (Semua, Customer, Internal SOP) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setScopeFilter("all")}
                className={`rounded-sm px-3.5 py-2 transition-colors tabular-nums ${
                  scopeFilter === "all"
                    ? "bg-ink text-canvas"
                    : "bg-surface border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                }`}
              >
                Semua Dokumen ({articles.length})
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter("customer")}
                className={`flex items-center gap-1.5 rounded-sm px-3.5 py-2 transition-colors tabular-nums ${
                  scopeFilter === "customer"
                    ? "bg-ink text-canvas"
                    : "bg-surface border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                }`}
              >
                <Globe size={13} aria-hidden="true" /> Panduan Pelanggan ({metrics.customer})
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter("internal")}
                className={`flex items-center gap-1.5 rounded-sm px-3.5 py-2 transition-colors tabular-nums ${
                  scopeFilter === "internal"
                    ? "bg-ink text-canvas"
                    : "bg-surface border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                }`}
              >
                <Lock size={13} aria-hidden="true" /> SOP Internal Staf ({metrics.internal})
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <label htmlFor="kms-admin-search" className="sr-only">Cari dokumen KMS</label>
              <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                id="kms-admin-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul, kode SOP, divisi..."
                className="ot-input pl-9"
              />
            </div>
          </div>

          {/* Sub-Filter Pills (Muncul saat memilih Tab SOP Internal Staf) */}
          {scopeFilter === "internal" && (
            <div className="flex flex-wrap items-center gap-1.5 bg-surface-muted p-3 rounded-sm border border-line">
              <span className="text-[11px] font-bold text-ink px-2 flex items-center gap-1">
                <Filter size={12} className="text-accent" aria-hidden="true" /> Filter Divisi:
              </span>
              {[
                { key: "all", label: "Semua Divisi" },
                { key: "all_internal", label: "SOP Umum Internal" },
                { key: "warehouse_staff", label: "Warehouse & Logistik" },
                { key: "store_staff", label: "Offline Store" },
                { key: "finance", label: "Finance & Accounting" },
                { key: "manager", label: "Retail General Manager" },
              ].map((div) => (
                <button
                  key={div.key}
                  type="button"
                  onClick={() => setDivisionFilter(div.key)}
                  className={`rounded-xs px-3 py-1 text-[11px] font-semibold transition-colors ${
                    divisionFilter === div.key
                      ? "bg-ink text-canvas"
                      : "bg-surface border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {div.label}
                </button>
              ))}
            </div>
          )}

          {/* Articles Table */}
          <div className="rounded-md border border-line bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th className="py-3.5 px-4">Lingkup &amp; Kode</th>
                    <th className="py-3.5 px-4">Judul Dokumen</th>
                    <th className="py-3.5 px-4">Target Role / Divisi</th>
                    <th className="py-3.5 px-4">Tingkat Urgensi</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Terakhir Diperbarui</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {loadingArticles ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-ink-muted">
                        Memuat data dokumen KMS...
                      </td>
                    </tr>
                  ) : filteredArticles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-ink-muted">
                        Tidak ada dokumen KMS yang sesuai dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    filteredArticles.map((a) => {
                      const isInternal = a.audience_type === "internal";
                      return (
                        <tr key={a.id}>
                          {/* Lingkup & Kode */}
                          <td className="py-3.5 px-4">
                            {isInternal ? (
                              <div className="space-y-1">
                                <Badge status="warning">SOP INTERNAL</Badge>
                                {a.sop_code && (
                                  <div className="font-mono text-xs font-bold text-ink tabular-nums">
                                    {a.sop_code}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Badge status="info">CUSTOMER GUIDE</Badge>
                            )}
                          </td>

                          {/* Judul & Excerpt */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-ink text-xs line-clamp-1">{a.title}</div>
                            <div className="text-[11px] text-ink-muted line-clamp-1 mt-0.5">
                              {a.excerpt || "Tidak ada ringkasan."}
                            </div>
                          </td>

                          {/* Target Role / Divisi */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex rounded-xs bg-surface-muted border border-line px-2 py-0.5 text-[11px] font-semibold text-ink-secondary">
                              {getDivisionLabel(a.target_role)}
                            </span>
                          </td>

                          {/* Priority Level */}
                          <td className="py-3.5 px-4">{renderPriorityBadge(a.priority_level)}</td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <Badge status={a.is_published ? "completed" : "neutral"}>
                              {a.is_published ? "Published" : "Draft"}
                            </Badge>
                          </td>

                          {/* Tanggal */}
                          <td className="py-3.5 px-4 text-[11px] text-ink-muted tabular-nums">
                            {formatDate(a.updated_at || a.created_at)}
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPreviewArticle(a)}
                                className="rounded-xs border border-line bg-surface p-1.5 text-ink-secondary hover:text-ink hover:border-line-strong transition-colors"
                                aria-label={`Pratinjau dokumen ${a.title}`}
                                title="Pratinjau Dokumen"
                              >
                                <Eye size={13} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingArticle(a);
                                  setShowForm(true);
                                }}
                                className="rounded-xs border border-line bg-surface p-1.5 text-ink-secondary hover:text-ink hover:border-line-strong transition-colors"
                                aria-label={`Edit dokumen ${a.title}`}
                                title="Edit Dokumen"
                              >
                                <Edit2 size={13} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(a.id, a.title)}
                                className="rounded-xs border border-status-danger/30 bg-status-danger-bg p-1.5 text-status-danger hover:opacity-80 transition-opacity"
                                aria-label={`Hapus dokumen ${a.title}`}
                                title="Hapus Dokumen"
                              >
                                <Trash2 size={13} aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: KATEGORI KMS                                  */}
      {/* ======================================================== */}
      {activeSection === "categories" && (
        <div className="rounded-md border border-line bg-surface p-6 space-y-4">
          <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wider">
            Daftar Kategori Pengetahuan KMS ({loadingCats ? "..." : categories.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((c) => (
              <div key={c.id} className="rounded-sm border border-line bg-surface-muted p-4 space-y-1">
                <div className="font-bold text-xs text-ink">{c.name}</div>
                <div className="font-mono text-[10px] text-ink-muted">slug: {c.slug}</div>
                <p className="text-[11px] text-ink-secondary mt-1">{c.description || "Tidak ada deskripsi."}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: COMPLIANCE MATRIX (Fitur 1.6)                 */}
      {/* ======================================================== */}
      {activeSection === "compliance" && (
        <div className="space-y-6">
          {loadingCompliance ? (
            <div className="py-20 text-center" role="status" aria-busy="true">
              <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-solid border-ink border-r-transparent" />
              <p className="mt-3 text-xs font-medium text-ink-secondary">Menganalisis matriks kepatuhan staf &amp; SOP...</p>
            </div>
          ) : !complianceData ? (
            <div className="rounded-md border border-dashed border-line-strong bg-surface p-12 text-center text-xs text-ink-muted">
              Data kepatuhan belum tersedia.
            </div>
          ) : (
            <>
              {/* 4 Summary KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Kepatuhan Perusahaan"
                  value={`${complianceData.summary?.overall_compliance_rate ?? 0}%`}
                  hint="Rata-rata pemahaman SOP seluruh staf"
                />
                <StatCard
                  label="Total Karyawan Internal"
                  value={complianceData.summary?.total_staff ?? 0}
                  hint="Personel aktif OAS"
                />
                <StatCard
                  label="Total Dokumen SOP"
                  value={complianceData.summary?.total_sops ?? 0}
                  hint="Prosedur operasional diterbitkan"
                />
                <StatCard
                  label="Checklist Selesai"
                  value={`${complianceData.summary?.total_acknowledged ?? 0} / ${complianceData.summary?.total_required ?? 0}`}
                  hint="Konfirmasi pemahaman database"
                />
              </div>

              {/* Tabel 1: Kepatuhan per Staf */}
              <div className="rounded-md border border-line bg-surface p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                  <div>
                    <h2 className="font-display text-sm font-bold text-ink">
                      Matriks Kepatuhan Membaca SOP per Personel
                    </h2>
                    <p className="text-[11px] text-ink-secondary">
                      Memantau apakah seluruh karyawan telah membaca versi SOP terkini sesuai divisinya.
                    </p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={loadCompliance}>
                    <RefreshCw size={13} aria-hidden="true" /> Muat Ulang Matriks
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr>
                        <th className="px-4 py-3">Nama Staf &amp; Email</th>
                        <th className="px-4 py-3">Peran / Divisi</th>
                        <th className="px-4 py-3">Cabang Offline Store</th>
                        <th className="px-4 py-3 text-center">Wajib / Selesai</th>
                        <th className="px-4 py-3 text-center">Tingkat Kepatuhan</th>
                        <th className="px-4 py-3">Status / Kendala Pembacaan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {(complianceData.staff_matrix || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-ink-muted">
                            Belum ada data staf internal OAS yang terdaftar.
                          </td>
                        </tr>
                      ) : (
                        complianceData.staff_matrix.map((s) => {
                          const rate = s.compliance_rate ?? 0;
                          return (
                            <tr key={s.staff_id}>
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-ink">{s.name}</div>
                                <div className="text-[11px] text-ink-muted font-mono">{s.email}</div>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="font-mono text-[11px] font-semibold text-ink bg-surface-muted border border-line px-2 py-0.5 rounded-xs">
                                  {s.role}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-ink-secondary">{s.branch_name || "Headquarters"}</td>
                              <td className="px-4 py-3.5 text-center font-bold text-ink tabular-nums">
                                {s.acknowledged_count ?? 0} / {s.required_count ?? 0}
                              </td>
                              <td className="px-4 py-3.5 text-center tabular-nums">
                                <Badge status={rate >= 100 ? "completed" : rate >= 50 ? "warning" : "danger"}>
                                  {rate}%
                                </Badge>
                              </td>
                              <td className="px-4 py-3.5 max-w-xs">
                                {rate >= 100 ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-status-success">
                                    <CheckCircle2 size={13} aria-hidden="true" /> Patuh Sempurna
                                  </span>
                                ) : (
                                  <div className="space-y-1 text-[11px]">
                                    {Array.isArray(s.outdated_sops) && s.outdated_sops.length > 0 && (
                                      <div className="text-status-warning font-semibold flex items-start gap-1">
                                        <AlertTriangle size={12} className="shrink-0 mt-0.5" aria-hidden="true" />
                                        <span>{s.outdated_sops.length} SOP versi baru belum dibaca ulang ({s.outdated_sops.map((o) => o.sop_code || o.title).join(", ")})</span>
                                      </div>
                                    )}
                                    {Array.isArray(s.missing_sops) && s.missing_sops.length > 0 && (
                                      <div className="text-status-danger font-semibold flex items-start gap-1">
                                        <XCircle size={12} className="shrink-0 mt-0.5" aria-hidden="true" />
                                        <span>{s.missing_sops.length} SOP belum pernah dibaca ({s.missing_sops.map((m) => m.sop_code || m.title).slice(0, 2).join(", ")})</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabel 2: Analisis per Dokumen SOP */}
              <div className="rounded-md border border-line bg-surface p-6 space-y-4">
                <div className="border-b border-line pb-3">
                  <h2 className="font-display text-sm font-bold text-ink">
                    Tingkat Pemahaman per Dokumen SOP Internal
                  </h2>
                  <p className="text-[11px] text-ink-secondary">
                    Evaluasi persentase personel yang telah mengonfirmasi pemahaman terhadap setiap instruksi kerja.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr>
                        <th className="px-4 py-3">Kode SOP &amp; Versi</th>
                        <th className="px-4 py-3">Judul Prosedur Operasional</th>
                        <th className="px-4 py-3">Divisi Sasaran</th>
                        <th className="px-4 py-3">Tingkat Prioritas</th>
                        <th className="px-4 py-3 text-center">Staf Paham / Wajib</th>
                        <th className="px-4 py-3 text-center">% Pemahaman</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {(complianceData.sop_matrix || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-ink-muted">
                            Belum ada dokumen SOP internal yang dipublikasikan.
                          </td>
                        </tr>
                      ) : (
                        complianceData.sop_matrix.map((sop) => {
                          const rate = sop.compliance_rate ?? 0;
                          return (
                            <tr key={sop.id}>
                              <td className="px-4 py-3.5 tabular-nums">
                                <span className="font-mono text-xs font-bold text-ink bg-surface-muted border border-line px-2 py-0.5 rounded-xs">
                                  {sop.sop_code || "SOP"}
                                </span>
                                <span className="ml-1.5 font-semibold text-[10px] text-ink-muted bg-surface-muted border border-line px-1.5 py-0.5 rounded-xs">
                                  v{sop.version}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-bold text-ink">{sop.title}</td>
                              <td className="px-4 py-3.5">
                                <span className="inline-flex rounded-xs bg-surface-muted border border-line px-2 py-0.5 text-[11px] font-semibold text-ink-secondary">
                                  {getDivisionLabel(sop.target_role)}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">{renderPriorityBadge(sop.priority_level)}</td>
                              <td className="px-4 py-3.5 text-center font-bold text-ink tabular-nums">
                                {sop.acknowledged_count ?? 0} / {sop.eligible_staff_count ?? 0}
                              </td>
                              <td className="px-4 py-3.5 text-center tabular-nums">
                                <Badge status={rate >= 100 ? "completed" : rate >= 50 ? "warning" : "danger"}>
                                  {rate}%
                                </Badge>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 4: BASIS ATURAN PAKAR (ES RULES - SUBSISTEM KE-6) */}
      {/* ======================================================== */}
      {activeSection === "es_rules" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-md border border-line bg-surface p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-ink tracking-tight">
                    Basis Pengetahuan &amp; Aturan Inferensi Pakar (ES Rules)
                  </h2>
                  <Badge variant="accent">Forward Chaining</Badge>
                </div>
                <p className="text-xs text-ink-secondary mt-1">
                  Aturan produksi IF-THEN berbasis kepastian (Certainty Factor Shortliffe) yang memandu rekomendasi gear, validasi rig, diagnosa RMA QC, strategi deadstock, dan risiko vendor.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={loadEsRules}
                  disabled={loadingRules}
                >
                  <RefreshCw size={13} className={loadingRules ? "animate-spin" : ""} aria-hidden="true" />
                  <span>{loadingRules ? "Memuat..." : "Segarkan Aturan"}</span>
                </Button>
              </div>
            </div>

            {/* Filter Domain */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[
                { id: "all", label: "Semua Domain" },
                { id: "shoot_recommender", label: "Shoot Recommender" },
                { id: "rig_compatibility", label: "Rig Compatibility" },
                { id: "rma_diagnostic", label: "10-Point RMA QC" },
                { id: "deadstock_strategy", label: "Deadstock Strategy" },
                { id: "vendor_risk", label: "Vendor Risk" },
              ].map((df) => (
                <button
                  key={df.id}
                  type="button"
                  onClick={() => setRulesDomainFilter(df.id)}
                  className={`rounded-xs px-3 py-1.5 text-xs font-semibold transition-colors ${
                    rulesDomainFilter === df.id
                      ? "bg-ink text-canvas"
                      : "bg-surface-muted border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {df.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabel Aturan Pakar */}
          <div className="rounded-md border border-line bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Daftar Aturan Pakar ({filteredEsRules.length} Rules)
              </span>
              <span className="text-[11px] text-ink-muted">
                Terhubung langsung ke SOP &amp; Modul KMS
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-line text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    <th className="py-3 px-4">Kode &amp; Domain</th>
                    <th className="py-3 px-4">Judul &amp; Penjelasan Teknis</th>
                    <th className="py-3 px-4">Premis IF (Syarat Fakta)</th>
                    <th className="py-3 px-4">Konklusi THEN &amp; Aksi</th>
                    <th className="py-3 px-4 text-center">Certainty Factor</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Kontrol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {loadingRules ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-ink-muted">
                        Memuat basis aturan sistem pakar...
                      </td>
                    </tr>
                  ) : filteredEsRules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-ink-muted">
                        Tidak ada aturan pakar pada domain ini.
                      </td>
                    </tr>
                  ) : (
                    filteredEsRules.map((rule) => {
                      const cfPercent = Math.round((rule.certainty_factor || 0) * 100);
                      return (
                        <tr key={rule.id} className="hover:bg-surface-muted/50 transition-colors">
                          <td className="py-3.5 px-4 align-top">
                            <span className="font-mono text-xs font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-xs block w-max">
                              {rule.rule_code}
                            </span>
                            <span className="text-[10px] text-ink-muted uppercase tracking-wider mt-1 block">
                              {rule.domain?.replace(/_/g, " ")}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 align-top max-w-xs">
                            <p className="font-bold text-ink">{rule.title}</p>
                            <p className="text-[11px] text-ink-secondary mt-1 leading-relaxed line-clamp-2">
                              {rule.explanation}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 align-top max-w-xs font-mono text-[10px]">
                            <div className="rounded-xs bg-canvas border border-line p-2 text-ink-secondary space-y-1">
                              {typeof rule.conditions_json === "object" ? (
                                Object.entries(rule.conditions_json || {}).map(([k, v]) => (
                                  <div key={k} className="truncate">
                                    <span className="text-accent font-semibold">{k}:</span>{" "}
                                    <span className="text-ink">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                                  </div>
                                ))
                              ) : (
                                <span>{String(rule.conditions_json)}</span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 align-top">
                            <Badge
                              variant={
                                rule.action_type?.includes("APPROVE") || rule.action_type?.includes("RECOMMEND")
                                  ? "success"
                                  : rule.action_type?.includes("FLAG") || rule.action_type?.includes("PENALIZE")
                                  ? "danger"
                                  : "accent"
                              }
                            >
                              {rule.action_type?.replace(/_/g, " ")}
                            </Badge>
                            <p className="text-[11px] font-semibold text-ink mt-1 truncate max-w-xs">
                              {rule.conclusion_verdict}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 align-top text-center">
                            <span className="font-mono font-bold text-xs text-ink">
                              {cfPercent}%
                            </span>
                            <span className="block text-[9px] text-ink-muted">
                              CF: {rule.certainty_factor}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 align-top text-center">
                            <Badge variant={rule.is_active ? "success" : "neutral"}>
                              {rule.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 align-top text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleRule(rule)}
                              className={`rounded-xs px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
                                rule.is_active
                                  ? "border-status-danger/30 bg-status-danger/10 text-status-danger hover:bg-status-danger/20"
                                  : "border-status-success/30 bg-status-success/10 text-status-success hover:bg-status-success/20"
                              }`}
                            >
                              {rule.is_active ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM TAMBAH / EDIT DOKUMEN KMS & SOP */}
      {showForm && (
        <ArticleFormModal
          categories={categories}
          initial={editingArticle}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadArticles();
          }}
        />
      )}

      {/* MODAL PRATINJAU DOKUMEN */}
      <Modal
        open={Boolean(previewArticle)}
        onClose={() => setPreviewArticle(null)}
        title={previewArticle?.title || "Pratinjau Dokumen"}
        description={previewArticle?.sop_code || "CUSTOMER GUIDE"}
        size="lg"
      >
        {previewArticle && (
          <div className="space-y-4 text-xs text-ink">
            {previewArticle.excerpt && (
              <div className="rounded-sm bg-surface-muted border border-line p-3.5 text-ink font-medium leading-relaxed">
                {previewArticle.excerpt}
              </div>
            )}
            <div className="whitespace-pre-wrap leading-relaxed text-sm text-ink max-w-[68ch]">
              {previewArticle.content}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Modal Form Tambah / Edit Dokumen KMS Dual-Scope ─────────────────────────

function ArticleFormModal({ categories, initial, onClose, onSaved }) {
  const isEdit = !!initial;

  const [audienceType, setAudienceType] = useState(initial?.audience_type || "internal");
  const [targetRole, setTargetRole] = useState(initial?.target_role || "all_internal");
  const [sopCode, setSopCode] = useState(initial?.sop_code || "");
  const [priorityLevel, setPriorityLevel] = useState(initial?.priority_level || "standard");

  const [title, setTitle] = useState(initial?.title || "");
  const [categoryId, setCategoryId] = useState(initial?.category_id || (categories[0]?.id || ""));
  const [excerpt, setExcerpt] = useState(initial?.excerpt || "");
  const [content, setContent] = useState(initial?.content || "");
  const [isPublished, setIsPublished] = useState(initial ? initial.is_published : true);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Judul dan isi konten dokumen wajib diisi!");
      return;
    }

    setSaving(true);
    const payload = {
      title: title.trim(),
      audience_type: audienceType,
      target_role: audienceType === "internal" ? targetRole : "public",
      sop_code: audienceType === "internal" ? (sopCode.trim() || null) : null,
      priority_level: priorityLevel,
      category_id: categoryId || null,
      excerpt: excerpt.trim(),
      content: content.trim(),
      is_published: Boolean(isPublished),
    };

    try {
      if (isEdit) {
        await api.put(`/kms/admin/articles/${initial.id}`, payload);
        toast.success("Dokumen KMS berhasil diperbarui!");
      } else {
        await api.post("/kms/admin/articles", payload);
        toast.success("Dokumen KMS baru berhasil diterbitkan!");
      }
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menyimpan dokumen"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={isEdit ? "Edit Dokumen KMS / SOP" : "Tambah Dokumen KMS / SOP Baru"}
      description="Pastikan lingkup audiens dan kode prosedur sesuai dengan standar operasional."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {isEdit && audienceType === "internal" && (
          <div className="rounded-sm bg-status-warning-bg border border-status-warning/30 p-3 text-status-warning text-xs flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" aria-hidden="true" />
            <span>
              Versi Dokumen Saat Ini: <strong>v{initial?.version || 1}</strong>. Mengubah isi materi akan menaikkan versi menjadi <strong>v{(initial?.version || 1) + 1}</strong> dan meminta staf membaca ulang.
            </span>
          </div>
        )}

        {/* 1. Pilihan Tipe Dokumen (Segmented Radio Card) */}
        <div>
          <span className="block text-xs font-semibold text-ink mb-1.5">
            Lingkup Target Dokumen (Dual-Scope):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Lingkup target dokumen">
            <label
              className={`flex items-start gap-3 rounded-sm border p-3.5 cursor-pointer transition-colors ${
                audienceType === "internal"
                  ? "border-ink bg-surface-muted"
                  : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <input
                type="radio"
                name="audience_type"
                value="internal"
                checked={audienceType === "internal"}
                onChange={() => setAudienceType("internal")}
                className="mt-0.5 h-4 w-4 accent-[#B83A14]"
              />
              <div>
                <div className="font-bold text-xs text-ink flex items-center gap-1">
                  <Lock size={13} className="text-accent" aria-hidden="true" /> Dokumen SOP Internal Staff
                </div>
                <p className="text-[11px] text-ink-secondary mt-0.5 leading-snug">
                  Prosedur operasional khusus pegawai OAS (Warehouse, Store, Finance, Manager).
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 rounded-sm border p-3.5 cursor-pointer transition-colors ${
                audienceType === "customer"
                  ? "border-ink bg-surface-muted"
                  : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <input
                type="radio"
                name="audience_type"
                value="customer"
                checked={audienceType === "customer"}
                onChange={() => setAudienceType("customer")}
                className="mt-0.5 h-4 w-4 accent-[#B83A14]"
              />
              <div>
                <div className="font-bold text-xs text-ink flex items-center gap-1">
                  <Globe size={13} className="text-accent" aria-hidden="true" /> Panduan Publik Pelanggan
                </div>
                <p className="text-[11px] text-ink-secondary mt-0.5 leading-snug">
                  Artikel tips gear, perawatan gitar, dan petunjuk belanja untuk musisi di katalog.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* 2. Conditional Input Khusus SOP Internal */}
        {audienceType === "internal" && (
          <div className="rounded-sm border border-line bg-surface-muted p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="kms-target-role" className="block text-[11px] font-semibold text-ink mb-1">
                  Target Divisi / Role Pegawai:
                </label>
                <select
                  id="kms-target-role"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="ot-input"
                >
                  <option value="all_internal">SOP Umum (Tampil di Semua Role Internal)</option>
                  <option value="warehouse_staff">SOP Khusus Warehouse &amp; Logistik</option>
                  <option value="store_staff">SOP Khusus Offline Store</option>
                  <option value="finance">SOP Khusus Finance &amp; Accounting</option>
                  <option value="manager">SOP Khusus Retail General Manager</option>
                </select>
              </div>

              <div>
                <label htmlFor="kms-sop-code" className="block text-[11px] font-semibold text-ink mb-1">
                  Kode Dokumen SOP:
                </label>
                <input
                  id="kms-sop-code"
                  type="text"
                  value={sopCode}
                  onChange={(e) => setSopCode(e.target.value)}
                  placeholder="SOP-WH-001"
                  className="ot-input font-mono uppercase tabular-nums"
                />
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-ink mb-1.5">
                Tingkat Kepentingan Dokumen:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: "standard", label: "Standard (Standar)" },
                  { key: "mandatory", label: "Mandatory (Wajib)" },
                  { key: "critical", label: "Critical (Kritis / Prioritas Utama)" },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPriorityLevel(p.key)}
                    className={`rounded-xs border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      priorityLevel === p.key
                        ? "border-ink bg-ink text-canvas"
                        : "border-line bg-surface text-ink-secondary hover:border-line-strong"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. Judul Dokumen */}
        <div>
          <label htmlFor="kms-doc-title" className="block text-xs font-semibold text-ink mb-1">
            Judul Dokumen / SOP <span className="text-accent">*</span>
          </label>
          <input
            id="kms-doc-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: SOP Prosedur Packing Kayu Berasuransi Instrumen"
            className="ot-input"
          />
        </div>

        {/* 4. Kategori & Status Publikasi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="kms-doc-category" className="block text-xs font-semibold text-ink mb-1">Kategori KMS</label>
            <select
              id="kms-doc-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="ot-input"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="kms-doc-status" className="block text-xs font-semibold text-ink mb-1">Status Publikasi</label>
            <select
              id="kms-doc-status"
              value={isPublished ? "published" : "draft"}
              onChange={(e) => setIsPublished(e.target.value === "published")}
              className="ot-input"
            >
              <option value="published">Published (Aktif &amp; Terbaca)</option>
              <option value="draft">Draft (Disembunyikan)</option>
            </select>
          </div>
        </div>

        {/* 5. Ringkasan Singkat (Excerpt) */}
        <div>
          <label htmlFor="kms-doc-excerpt" className="block text-xs font-semibold text-ink mb-1">Ringkasan Singkat</label>
          <input
            id="kms-doc-excerpt"
            type="text"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Penjelasan ringkas 1-2 kalimat untuk pratinjau kartu..."
            className="ot-input"
          />
        </div>

        {/* 6. Isi Konten Lengkap */}
        <div>
          <label htmlFor="kms-doc-content" className="block text-xs font-semibold text-ink mb-1">
            Isi Instruksi Kerja / Konten Lengkap <span className="text-accent">*</span>
          </label>
          <textarea
            id="kms-doc-content"
            rows={8}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tuliskan langkah-langkah, poin evaluasi, atau panduan kerja terperinci..."
            className="ot-input font-mono leading-relaxed"
          />
        </div>

        {/* Footer Form Action */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="primary" loading={saving} disabled={saving}>
            {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Terbitkan Dokumen"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

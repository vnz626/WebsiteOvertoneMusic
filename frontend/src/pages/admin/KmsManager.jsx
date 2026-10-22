import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
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
  ExternalLink,
  Eye,
  CheckCircle2,
  HelpCircle,
  Tag,
  Layers,
  Sparkles,
} from "lucide-react";
import api from "../../api";
import { errorMessage, formatDate } from "../../utils/format";

export default function AdminKmsManager() {
  const [activeSection, setActiveSection] = useState("articles"); // 'articles' | 'faqs' | 'categories'

  // Categories Master Data
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // Articles & SOPs
  const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(true);

  // Filter States for Articles
  const [scopeFilter, setScopeFilter] = useState("all"); // 'all' | 'customer' | 'internal'
  const [divisionFilter, setDivisionFilter] = useState("all"); // 'all' | 'all_internal' | 'warehouse_staff' | 'store_staff' | 'finance' | 'manager'
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [previewArticle, setPreviewArticle] = useState(null);

  // Load Categories
  const loadCategories = useCallback(() => {
    setLoadingCats(true);
    api
      .get("/kms/categories")
      .then((r) => setCategories(r.data.data || []))
      .catch((e) => toast.error(errorMessage(e, "Gagal memuat kategori")))
      .finally(() => setLoadingCats(false));
  }, []);

  // Load All Articles (Super Admin)
  const loadArticles = useCallback(() => {
    setLoadingArticles(true);
    api
      .get("/kms/admin/articles")
      .then((r) => setArticles(r.data.data || []))
      .catch((e) => toast.error(errorMessage(e, "Gagal memuat artikel KMS")))
      .finally(() => setLoadingArticles(false));
  }, []);

  useEffect(() => {
    loadCategories();
    loadArticles();
  }, [loadCategories, loadArticles]);

  // Delete Article
  async function handleDelete(id, title) {
    if (!window.confirm(`Hapus dokumen "${title}"?`)) return;
    try {
      await api.delete(`/kms/admin/articles/${id}`);
      toast.success("Dokumen KMS berhasil dihapus");
      loadArticles();
    } catch (e) {
      toast.error(errorMessage(e, "Gagal menghapus dokumen"));
    }
  }

  // Filtered Articles
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

  // KPI Metrics
  const metrics = useMemo(() => {
    const list = Array.isArray(articles) ? articles : [];
    return {
      total: list.length,
      customer: list.filter((a) => a.audience_type === "customer").length,
      internal: list.filter((a) => a.audience_type === "internal").length,
      critical: list.filter((a) => a.priority_level === "critical" || a.priority_level === "mandatory").length,
    };
  }, [articles]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-6 md:p-10 font-sans text-gray-900">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700">
                <BookOpen size={22} />
              </span>
              <h1 className="font-jakarta text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                Knowledge Management System (KMS) &amp; SOP
              </h1>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Pusat kurasi Dual-Scope KMS: Panduan Publik Musisi (Customer Knowledge Base) &amp; Dokumen SOP Khusus Divisi Internal OAS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingArticle(null);
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#111827] px-4 py-2.5 text-xs font-bold text-amber-200 shadow-sm hover:bg-black transition active:scale-95"
            >
              <Plus size={15} /> Buat Dokumen Baru
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Dokumen</span>
            <p className="mt-1 text-2xl font-black text-gray-900">{metrics.total}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Customer Guide (Publik)</span>
            <p className="mt-1 text-2xl font-black text-blue-900">{metrics.customer}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">SOP Internal Staf (OAS)</span>
            <p className="mt-1 text-2xl font-black text-amber-950">{metrics.internal}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">SOP Kritis / Mandatori</span>
            <p className="mt-1 text-2xl font-black text-red-800">{metrics.critical}</p>
          </div>
        </div>

        {/* Navigation Sections (Articles/SOPs | FAQs | Categories) */}
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveSection("articles")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeSection === "articles"
                ? "bg-[#111827] text-white"
                : "text-gray-600 hover:text-black hover:bg-gray-100"
            }`}
          >
            <BookOpen size={14} /> Dokumen &amp; SOP ({metrics.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("categories")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeSection === "categories"
                ? "bg-[#111827] text-white"
                : "text-gray-600 hover:text-black hover:bg-gray-100"
            }`}
          >
            <Tag size={14} /> Kategori KMS ({categories.length})
          </button>
        </div>

        {/* ======================================================== */}
        {/* SECTION 1: ARTICLES & SOPS (Dual-Scope Workspace)        */}
        {/* ======================================================== */}
        {activeSection === "articles" && (
          <div className="space-y-4">
            {/* 1. Tab Filter Utama (Semua, Customer, Internal SOP) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 rounded-2xl bg-gray-200/80 p-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setScopeFilter("all")}
                  className={`rounded-xl px-4 py-2 transition ${
                    scopeFilter === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-black"
                  }`}
                >
                  Semua Dokumen ({articles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScopeFilter("customer")}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
                    scopeFilter === "customer" ? "bg-white text-blue-900 shadow-xs" : "text-gray-600 hover:text-black"
                  }`}
                >
                  <Globe size={13} /> Panduan Pelanggan ({metrics.customer})
                </button>
                <button
                  type="button"
                  onClick={() => setScopeFilter("internal")}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 transition ${
                    scopeFilter === "internal" ? "bg-white text-amber-950 shadow-xs" : "text-gray-600 hover:text-black"
                  }`}
                >
                  <Lock size={13} /> SOP Internal Staf ({metrics.internal})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search size={14} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul, kode SOP, divisi..."
                  className="w-full rounded-2xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs text-gray-900 outline-none focus:border-amber-600 shadow-xs"
                />
              </div>
            </div>

            {/* Sub-Filter Pills (Muncul saat memilih Tab SOP Internal Staf) */}
            {scopeFilter === "internal" && (
              <div className="flex flex-wrap items-center gap-1.5 bg-[#F6F4EB] p-2.5 rounded-2xl border border-amber-200/60 animate-in fade-in">
                <span className="text-[11px] font-bold text-amber-900 px-2 flex items-center gap-1">
                  <Filter size={12} /> Filter Divisi:
                </span>
                {[
                  { key: "all", label: "Semua Divisi" },
                  { key: "all_internal", label: "SOP Umum Internal" },
                  { key: "warehouse_staff", label: "Warehouse & Logistik" },
                  { key: "store_staff", label: "Store & Showroom" },
                  { key: "finance", label: "Finance & Accounting" },
                  { key: "manager", label: "Retail General Manager" },
                ].map((div) => (
                  <button
                    key={div.key}
                    type="button"
                    onClick={() => setDivisionFilter(div.key)}
                    className={`rounded-xl px-3 py-1 text-[11px] font-bold transition ${
                      divisionFilter === div.key
                        ? "bg-[#111827] text-amber-200 shadow-xs"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {div.label}
                  </button>
                ))}
              </div>
            )}

            {/* Articles Table (Clean Light Mode Editorial) */}
            <div className="rounded-3xl border border-gray-200 bg-white shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="border-b border-gray-200 bg-[#FAF9F5] text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="py-3.5 px-5">Lingkup &amp; Kode</th>
                      <th className="py-3.5 px-4">Judul Dokumen</th>
                      <th className="py-3.5 px-4">Target Role / Divisi</th>
                      <th className="py-3.5 px-4">Tingkat Urgensi</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Terakhir Diperbarui</th>
                      <th className="py-3.5 px-5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loadingArticles ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400">
                          Memuat data dokumen KMS...
                        </td>
                      </tr>
                    ) : filteredArticles.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400">
                          Tidak ada dokumen KMS yang sesuai dengan kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      filteredArticles.map((a) => {
                        const isInternal = a.audience_type === "internal";
                        return (
                          <tr key={a.id} className="hover:bg-gray-50/70 transition-colors">
                            {/* Lingkup & Kode */}
                            <td className="py-3.5 px-5">
                              {isInternal ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 border border-amber-200">
                                    <Lock size={10} /> SOP INTERNAL
                                  </span>
                                  {a.sop_code && (
                                    <div className="font-mono text-xs font-bold text-gray-800">
                                      {a.sop_code}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-900 border border-blue-200">
                                  <Globe size={10} /> CUSTOMER GUIDE
                                </span>
                              )}
                            </td>

                            {/* Judul & Excerpt */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-gray-900 text-xs line-clamp-1">{a.title}</div>
                              <div className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                                {a.excerpt || "Tidak ada ringkasan."}
                              </div>
                            </td>

                            {/* Target Role / Divisi */}
                            <td className="py-3.5 px-4">
                              {a.target_role === "all_internal" ? (
                                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                                  Semua Staf OAS
                                </span>
                              ) : a.target_role === "warehouse_staff" ? (
                                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                                  Warehouse &amp; Logistik
                                </span>
                              ) : a.target_role === "store_staff" ? (
                                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-900 border border-blue-200">
                                  Store &amp; Showroom
                                </span>
                              ) : a.target_role === "finance" ? (
                                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-900 border border-emerald-200">
                                  Finance &amp; P&amp;L
                                </span>
                              ) : a.target_role === "manager" ? (
                                <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-900 border border-purple-200">
                                  Retail Manager
                                </span>
                              ) : (
                                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                                  Publik / Musisi
                                </span>
                              )}
                            </td>

                            {/* Priority Level */}
                            <td className="py-3.5 px-4">
                              {a.priority_level === "critical" ? (
                                <span className="rounded-md bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 w-fit">
                                  <AlertTriangle size={10} /> Critical
                                </span>
                              ) : a.priority_level === "mandatory" ? (
                                <span className="rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 w-fit">
                                  <ShieldCheck size={10} /> Mandatory
                                </span>
                              ) : (
                                <span className="rounded-md bg-gray-100 text-gray-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                                  Standard
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              {a.is_published ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                  <CheckCircle2 size={12} /> Published
                                </span>
                              ) : (
                                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                                  Draft
                                </span>
                              )}
                            </td>

                            {/* Tanggal */}
                            <td className="py-3.5 px-4 text-[11px] text-gray-500">
                              {formatDate(a.updated_at || a.created_at)}
                            </td>

                            {/* Aksi */}
                            <td className="py-3.5 px-5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewArticle(a)}
                                  className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:text-black hover:bg-gray-50 transition"
                                  title="Pratinjau Dokumen"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingArticle(a);
                                    setShowForm(true);
                                  }}
                                  className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:text-black hover:bg-gray-50 transition"
                                  title="Edit Dokumen"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(a.id, a.title)}
                                  className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 transition"
                                  title="Hapus Dokumen"
                                >
                                  <Trash2 size={13} />
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
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="font-jakarta text-sm font-extrabold text-gray-900">
              Daftar Kategori Pengetahuan KMS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((c) => (
                <div key={c.id} className="rounded-2xl border border-gray-200 bg-[#FAF9F5] p-4 space-y-1">
                  <div className="font-bold text-xs text-gray-900">{c.name}</div>
                  <div className="font-mono text-[10px] text-gray-400">slug: {c.slug}</div>
                  <p className="text-[11px] text-gray-500 mt-1">{c.description || "Tidak ada deskripsi."}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL FORM TAMBAH / EDIT DOKUMEN KMS & SOP               */}
        {/* ======================================================== */}
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

        {/* ======================================================== */}
        {/* MODAL PRATINJAU DOKUMEN                                  */}
        {/* ======================================================== */}
        {previewArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
              <div className="border-b border-gray-200 bg-[#FAF9F5] p-5 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-amber-800">
                    {previewArticle.sop_code || "CUSTOMER GUIDE"}
                  </span>
                  <h3 className="font-jakarta text-lg font-black text-gray-900 mt-1">
                    {previewArticle.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewArticle(null)}
                  className="rounded-full bg-white border border-gray-200 p-1.5 text-gray-500 hover:text-black"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-gray-800 bg-[#FCFBF8]">
                {previewArticle.excerpt && (
                  <div className="rounded-xl bg-amber-50 p-3 text-amber-950 font-medium">
                    {previewArticle.excerpt}
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed">{previewArticle.content}</div>
              </div>
            </div>
          </div>
        )}
      </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
        {/* Header Modal */}
        <div className="border-b border-gray-200 bg-[#FAF9F5] p-5 flex items-center justify-between">
          <h2 className="font-jakarta text-lg font-black text-gray-900">
            {isEdit ? "Edit Dokumen KMS / SOP" : "Tambah Dokumen KMS / SOP Baru"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white border border-gray-200 p-1.5 text-gray-500 hover:text-black"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* 1. Pilihan Tipe Dokumen (Segmented Radio Card) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Lingkup Target Dokumen (Dual-Scope):
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                  audienceType === "internal"
                    ? "border-amber-600 bg-amber-50/50 ring-1 ring-amber-600/30"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="audience_type"
                  value="internal"
                  checked={audienceType === "internal"}
                  onChange={() => setAudienceType("internal")}
                  className="mt-0.5 text-amber-700"
                />
                <div>
                  <div className="font-bold text-xs text-amber-950 flex items-center gap-1">
                    <Lock size={13} /> Dokumen SOP Internal Staff
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                    Prosedur operasional khusus pegawai OAS (Warehouse, Store, Finance, Manager).
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                  audienceType === "customer"
                    ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600/30"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="audience_type"
                  value="customer"
                  checked={audienceType === "customer"}
                  onChange={() => setAudienceType("customer")}
                  className="mt-0.5 text-blue-700"
                />
                <div>
                  <div className="font-bold text-xs text-blue-950 flex items-center gap-1">
                    <Globe size={13} /> Panduan Publik Pelanggan
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                    Artikel tips gear, perawatan gitar, dan petunjuk belanja untuk musisi di katalog.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 2. Conditional Input Khusus SOP Internal */}
          {audienceType === "internal" && (
            <div className="rounded-2xl border border-amber-200 bg-[#FAF8F2] p-4 space-y-3 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Target Divisi */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">
                    Target Divisi / Role Pegawai:
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-600 font-medium"
                  >
                    <option value="all_internal">SOP Umum (Tampil di Semua Role Internal)</option>
                    <option value="warehouse_staff">SOP Khusus Warehouse &amp; Logistik</option>
                    <option value="store_staff">SOP Khusus Store &amp; Showroom</option>
                    <option value="finance">SOP Khusus Finance &amp; Accounting</option>
                    <option value="manager">SOP Khusus Retail General Manager</option>
                  </select>
                </div>

                {/* Kode SOP */}
                <div>
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">
                    Kode Dokumen SOP:
                  </label>
                  <input
                    type="text"
                    value={sopCode}
                    onChange={(e) => setSopCode(e.target.value)}
                    placeholder="Contoh: SOP-WH-001"
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-mono uppercase text-gray-900 outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              {/* Tingkat Urgensi */}
              <div>
                <label className="block text-[11px] font-bold text-amber-950 mb-1">
                  Tingkat Kepentingan Dokumen:
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { key: "standard", label: "Standard (Standar)" },
                    { key: "mandatory", label: "Mandatory (Wajib)" },
                    { key: "critical", label: "Critical (Kritis / Prioritas Utama)" },
                  ].map((p) => (
                    <label
                      key={p.key}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 cursor-pointer text-xs font-semibold ${
                        priorityLevel === p.key
                          ? "border-amber-700 bg-amber-100 text-amber-900 font-bold"
                          : "border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="priority_level"
                        value={p.key}
                        checked={priorityLevel === p.key}
                        onChange={() => setPriorityLevel(p.key)}
                        className="hidden"
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. Judul Dokumen */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Judul Dokumen / SOP <span className="text-red-500">*</span>:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: SOP Prosedur Packing Kayu Berasuransi Instrumen"
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 outline-none focus:border-amber-600"
            />
          </div>

          {/* 4. Kategori & Status Publikasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Kategori KMS:</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-600"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Status Publikasi:</label>
              <select
                value={isPublished ? "published" : "draft"}
                onChange={(e) => setIsPublished(e.target.value === "published")}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-600"
              >
                <option value="published">Published (Aktif &amp; Terbaca)</option>
                <option value="draft">Draft (Disembunyikan)</option>
              </select>
            </div>
          </div>

          {/* 5. Ringkasan Singkat (Excerpt) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Ringkasan Singkat:</label>
            <input
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Penjelasan ringkas 1-2 kalimat untuk pratinjau kartu..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-600"
            />
          </div>

          {/* 6. Isi Konten Lengkap (Markdown Friendly) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Isi Instruksi Kerja / Konten Lengkap <span className="text-red-500">*</span>:
            </label>
            <textarea
              rows={8}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tuliskan langkah-langkah, poin evaluasi, atau panduan kerja terperinci..."
              className="w-full rounded-xl border border-gray-200 bg-white p-3.5 text-xs text-gray-900 outline-none focus:border-amber-600 font-mono leading-relaxed"
            />
          </div>

          {/* Footer Form Action */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#111827] px-5 py-2 text-xs font-bold text-amber-200 hover:bg-black transition shadow-xs disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Terbitkan Dokumen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

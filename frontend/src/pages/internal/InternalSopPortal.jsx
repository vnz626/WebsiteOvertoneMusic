import { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Search,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Printer,
  X,
  ArrowRight,
  CheckCircle2,
  FileText,
  Building2,
  Layers,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { formatDate } from "../../utils/format";

export default function InternalSopPortal() {
  const { user } = useAuth();
  const userRole = user?.role || "staff";

  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'division' | 'general' | 'critical'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSop, setSelectedSop] = useState(null);
  const [readAcks, setReadAcks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("overtone_sop_read_acks") || "{}");
    } catch {
      return {};
    }
  });

  function loadSops() {
    setLoading(true);
    api
      .get("/kms/internal-sops")
      .then((res) => {
        setSops(res?.data?.data || []);
      })
      .catch((err) => console.error("Error loading SOPs:", err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSops();
  }, []);

  function handleAcknowledge(sopCode) {
    const updated = { ...readAcks, [sopCode]: new Date().toISOString() };
    setReadAcks(updated);
    try {
      localStorage.setItem("overtone_sop_read_acks", JSON.stringify(updated));
    } catch {}
  }

  // Filtered SOPs
  const filteredSops = useMemo(() => {
    let list = Array.isArray(sops) ? sops : [];

    if (activeTab === "division") {
      list = list.filter((s) => s.target_role !== "all_internal" && s.target_role !== "all");
    } else if (activeTab === "general") {
      list = list.filter((s) => s.target_role === "all_internal" || s.target_role === "all");
    } else if (activeTab === "critical") {
      list = list.filter((s) => s.priority_level === "mandatory" || s.priority_level === "critical");
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          (s.title || "").toLowerCase().includes(q) ||
          (s.sop_code || "").toLowerCase().includes(q) ||
          (s.excerpt || "").toLowerCase().includes(q) ||
          (s.content || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [sops, activeTab, searchQuery]);

  function getRoleLabel(role) {
    if (role === "warehouse_staff" || role === "warehouse") return "Divisi Warehouse & Logistik";
    if (role === "store_staff" || role === "staff") return "Divisi Store & Showroom";
    if (role === "finance") return "Divisi Keuangan & Akuntansi";
    if (role === "manager") return "Divisi Retail General Manager";
    if (role === "super_admin" || role === "admin") return "Super Admin (Seluruh Divisi)";
    return "Staff Internal OAS";
  }

  function getDivisionBadge(targetRole) {
    if (targetRole === "warehouse_staff" || targetRole === "warehouse") {
      return (
        <span className="rounded-md bg-amber-900/10 text-amber-900 border border-amber-900/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
          SOP Khusus Warehouse
        </span>
      );
    }
    if (targetRole === "store_staff" || targetRole === "staff") {
      return (
        <span className="rounded-md bg-blue-900/10 text-blue-900 border border-blue-900/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
          SOP Khusus Showroom
        </span>
      );
    }
    if (targetRole === "finance") {
      return (
        <span className="rounded-md bg-emerald-900/10 text-emerald-900 border border-emerald-900/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
          SOP Khusus Finance
        </span>
      );
    }
    if (targetRole === "manager") {
      return (
        <span className="rounded-md bg-purple-900/10 text-purple-900 border border-purple-900/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
          SOP Khusus Manager
        </span>
      );
    }
    return (
      <span className="rounded-md bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
        SOP Umum Internal
      </span>
    );
  }

  function getPriorityBadge(priority) {
    if (priority === "critical") {
      return (
        <span className="rounded-md bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
          <AlertTriangle size={10} /> Critical
        </span>
      );
    }
    if (priority === "mandatory") {
      return (
        <span className="rounded-md bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
          <ShieldCheck size={10} /> Mandatory
        </span>
      );
    }
    return (
      <span className="rounded-md bg-gray-100 text-gray-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
        Standard
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-6 md:p-10 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700">
                <BookOpen size={22} />
              </span>
              <h1 className="font-jakarta text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                SOP &amp; Panduan Kerja Operasional (KMS)
              </h1>
              <span className="rounded-full bg-black px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-200">
                {getRoleLabel(userRole)}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 max-w-3xl">
              Portal dokumen resmi Standard Operating Procedure (SOP) internal OAS Overtone Music Store. Menampilkan panduan kerja baku yang wajib dipatuhi oleh seluruh personel sesuai divisi.
            </p>
          </div>

          <button
            type="button"
            onClick={loadSops}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition shrink-0"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh SOP
          </button>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-2xl bg-gray-200/70 p-1 text-xs font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-xl px-4 py-2 transition shrink-0 ${
                activeTab === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-black"
              }`}
            >
              Semua SOP Saya ({sops.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("division")}
              className={`rounded-xl px-4 py-2 transition shrink-0 ${
                activeTab === "division" ? "bg-white text-amber-900 shadow-xs" : "text-gray-600 hover:text-black"
              }`}
            >
              Khusus Divisi Saya
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`rounded-xl px-4 py-2 transition shrink-0 ${
                activeTab === "general" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-black"
              }`}
            >
              SOP Umum Perusahaan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("critical")}
              className={`rounded-xl px-4 py-2 transition shrink-0 ${
                activeTab === "critical" ? "bg-white text-red-700 shadow-xs" : "text-gray-600 hover:text-black"
              }`}
            >
              Wajib &amp; Kritis
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode SOP atau kata kunci..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-xs text-gray-900 outline-none transition focus:border-amber-600 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-black"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* SOP Cards Grid */}
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-gray-300" />
            Memuat dokumen SOP divisi...
          </div>
        ) : filteredSops.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center text-xs text-gray-400">
            <BookOpen size={32} className="mx-auto mb-2 text-gray-300" />
            Tidak ada dokumen SOP yang sesuai dengan filter atau kata kunci.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSops.map((sop) => {
              const hasRead = !!readAcks[sop.sop_code];
              return (
                <div
                  key={sop.id}
                  onClick={() => setSelectedSop(sop)}
                  className="group relative flex flex-col justify-between rounded-3xl border border-gray-200 bg-white p-6 shadow-xs hover:border-amber-600/60 hover:shadow-md transition cursor-pointer"
                >
                  <div>
                    {/* Badges Header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                        {sop.sop_code || "SOP"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {getDivisionBadge(sop.target_role)}
                        {getPriorityBadge(sop.priority_level)}
                      </div>
                    </div>

                    {/* Title & Excerpt */}
                    <h3 className="font-jakarta text-base font-bold text-gray-900 group-hover:text-amber-800 transition line-clamp-2">
                      {sop.title}
                    </h3>
                    <p className="mt-2 text-xs text-gray-500 leading-relaxed line-clamp-3">
                      {sop.excerpt || "Klik untuk membaca instruksi kerja lengkap dokumen SOP ini."}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-5 border-t border-gray-100 pt-3 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {hasRead ? (
                        <span className="flex items-center gap-1 font-semibold text-emerald-700">
                          <CheckCircle2 size={13} /> Sudah Dipahami
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock size={12} /> Belum Ditandai
                        </span>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 font-bold text-amber-800 group-hover:translate-x-1 transition">
                      Baca Dokumen <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CLEAN DOCUMENT READER MODAL */}
        {selectedSop && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
              {/* Modal Top Bar */}
              <div className="border-b border-gray-200 bg-[#FAF9F5] p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300">
                    {selectedSop.sop_code || "DOKUMEN SOP"}
                  </span>
                  {getDivisionBadge(selectedSop.target_role)}
                  {getPriorityBadge(selectedSop.priority_level)}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-black hover:bg-gray-50 transition"
                    title="Cetak Dokumen SOP"
                  >
                    <Printer size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSop(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-black hover:bg-gray-50 transition"
                    title="Tutup"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Document Header */}
              <div className="p-6 md:p-8 border-b border-gray-100 bg-white">
                <h2 className="font-jakarta text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                  {selectedSop.title}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>
                    Diterbitkan oleh: <strong className="text-gray-800">{selectedSop.author_name || "Overtone Management"}</strong>
                  </span>
                  <span>•</span>
                  <span>Diperbarui: {formatDate(selectedSop.updated_at || selectedSop.created_at)}</span>
                  <span>•</span>
                  <span>Kategori: {selectedSop.category_name || "SOP Internal"}</span>
                </div>
              </div>

              {/* Document Body (Clean Typography) */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 text-xs md:text-sm text-gray-800 leading-relaxed bg-[#FCFBF8]">
                {selectedSop.excerpt && (
                  <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-4 text-amber-950 font-medium">
                    {selectedSop.excerpt}
                  </div>
                )}

                <div className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed space-y-2">
                  {selectedSop.content}
                </div>
              </div>

              {/* Modal Footer (Acknowledgement) */}
              <div className="border-t border-gray-200 bg-white p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-gray-500">
                  {readAcks[selectedSop.sop_code] ? (
                    <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                      <CheckCircle2 size={16} /> Dokumen ini telah Anda baca pada {formatDate(readAcks[selectedSop.sop_code])}
                    </span>
                  ) : (
                    <span>Harap pahami seluruh isi prosedur kerja di atas sebelum menjalankan operasional.</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleAcknowledge(selectedSop.sop_code);
                      setSelectedSop(null);
                    }}
                    className="rounded-xl bg-[#111827] px-5 py-2.5 text-xs font-bold text-amber-200 hover:bg-black transition shadow-xs"
                  >
                    Saya Mengerti &amp; Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

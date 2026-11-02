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
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";
import { useAuth } from "../../auth/AuthContext";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { formatDate, errorMessage } from "../../utils/format";

export default function InternalSopPortal() {
  const { user } = useAuth();
  const userRole = user?.role || "staff";

  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'division' | 'general' | 'critical'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSop, setSelectedSop] = useState(null);
  const [acking, setAcking] = useState(false);

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

  async function handleAcknowledge(sop) {
    if (!sop) return;
    setAcking(true);
    try {
      const res = await api.post(`/kms/internal-sops/${sop.id}/acknowledge`);
      toast.success(res.data?.message || "SOP berhasil dikonfirmasi ke database audit!");
      setSops((prev) =>
        prev.map((item) =>
          item.id === sop.id
            ? { ...item, acknowledged: true, acknowledged_at: new Date().toISOString(), needs_reack: false }
            : item
        )
      );
      if (selectedSop && selectedSop.id === sop.id) {
        setSelectedSop((prev) => ({
          ...prev,
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          needs_reack: false,
        }));
      }
    } catch (err) {
      toast.error(errorMessage(err, "Gagal mengonfirmasi SOP"));
    } finally {
      setAcking(false);
    }
  }

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
    if (role === "store_staff" || role === "staff") return "Divisi Offline Store";
    if (role === "finance") return "Divisi Keuangan & Akuntansi";
    if (role === "manager") return "Divisi Retail General Manager";
    if (role === "super_admin" || role === "admin") return "Super Admin (Seluruh Divisi)";
    return "Staf Internal OAS";
  }

  function getDivisionLabel(targetRole) {
    if (targetRole === "warehouse_staff" || targetRole === "warehouse") return "SOP Warehouse";
    if (targetRole === "store_staff" || targetRole === "staff") return "SOP Offline Store";
    if (targetRole === "finance") return "SOP Finance";
    if (targetRole === "manager") return "SOP Manager";
    return "SOP Umum Internal";
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-line pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              Knowledge Management System (KMS)
            </span>
            <Badge status="info">{getRoleLabel(userRole)}</Badge>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-ink tracking-tight">
            SOP &amp; Panduan Kerja Operasional
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-secondary max-w-3xl">
            Portal dokumen resmi Standard Operating Procedure (SOP) internal OAS Overtone Music Store. Menampilkan prosedur kerja baku yang wajib dipahami dan ditandatangani oleh seluruh personel sesuai divisi.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={loadSops}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} aria-hidden="true" /> Muat Ulang SOP
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="tablist" aria-label="Filter kategori SOP">
          {[
            { id: "all", label: `Semua SOP Saya (${sops.length})` },
            { id: "division", label: "Khusus Divisi Saya" },
            { id: "general", label: "SOP Umum Perusahaan" },
            { id: "critical", label: "Wajib & Kritis" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`rounded-sm px-3.5 py-2 text-xs font-semibold transition-colors shrink-0 tabular-nums ${
                activeTab === t.id
                  ? "bg-ink text-canvas"
                  : "bg-surface border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <label htmlFor="sop-search-input" className="sr-only">Cari kode SOP atau kata kunci</label>
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            id="sop-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode SOP atau kata kunci..."
            className="ot-input pl-9 pr-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1"
            >
              <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* SOP Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-ink-secondary" role="status" aria-busy="true">
          <RefreshCw size={22} className="animate-spin mx-auto mb-2 text-ink-muted" aria-hidden="true" />
          Memuat dokumen SOP divisi...
        </div>
      ) : filteredSops.length === 0 ? (
        <div className="rounded-md border border-dashed border-line-strong bg-surface p-12 text-center text-xs text-ink-secondary">
          <BookOpen size={28} className="mx-auto mb-2 text-ink-muted" aria-hidden="true" />
          Tidak ada dokumen SOP yang sesuai dengan filter atau kata kunci.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSops.map((sop) => (
            <button
              key={sop.id}
              type="button"
              onClick={() => setSelectedSop(sop)}
              className="group text-left flex flex-col justify-between rounded-md border border-line bg-surface p-5 hover:border-line-strong transition-colors"
            >
              <div>
                {/* Badges Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 tabular-nums">
                    <span className="font-mono text-xs font-bold text-ink bg-surface-muted px-2 py-0.5 rounded-xs border border-line">
                      {sop.sop_code || "SOP"}
                    </span>
                    <span className="text-[10px] font-bold text-ink-muted bg-surface-muted px-1.5 py-0.5 rounded-xs border border-line">
                      v{sop.version || 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-xs bg-surface-muted border border-line px-2 py-0.5 text-[10px] font-semibold text-ink-secondary uppercase tracking-wider">
                      {getDivisionLabel(sop.target_role)}
                    </span>
                    {renderPriorityBadge(sop.priority_level)}
                  </div>
                </div>

                {/* Title & Excerpt */}
                <h2 className="font-display text-base font-bold text-ink group-hover:text-accent transition-colors line-clamp-2">
                  {sop.title}
                </h2>
                <p className="mt-2 text-xs text-ink-secondary leading-relaxed line-clamp-3">
                  {sop.excerpt || "Klik untuk membaca instruksi kerja lengkap dokumen SOP ini."}
                </p>
              </div>

              {/* Card Footer */}
              <div className="mt-5 w-full border-t border-line pt-3 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  {sop.needs_reack ? (
                    <Badge status="warning">Perlu Baca Ulang</Badge>
                  ) : sop.acknowledged ? (
                    <Badge status="completed">Sudah Dipahami</Badge>
                  ) : (
                    <span className="flex items-center gap-1 text-ink-muted font-medium">
                      <Clock size={12} aria-hidden="true" /> Belum Ditandai
                    </span>
                  )}
                </div>

                <span className="inline-flex items-center gap-1 font-bold text-ink group-hover:text-accent transition-colors">
                  Baca Dokumen <ArrowRight size={13} aria-hidden="true" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* CLEAN DOCUMENT READER MODAL */}
      <Modal
        open={Boolean(selectedSop)}
        onClose={() => setSelectedSop(null)}
        title={selectedSop?.title || "Dokumen SOP"}
        description={
          selectedSop
            ? `${selectedSop.sop_code || "SOP"} • Versi ${selectedSop.version || 1} • ${getDivisionLabel(selectedSop.target_role)}`
            : ""
        }
        size="xl"
        footer={
          selectedSop && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div className="text-xs text-ink-secondary">
                {selectedSop.acknowledged ? (
                  <span className="flex items-center gap-1.5 font-semibold text-status-success">
                    <CheckCircle2 size={15} aria-hidden="true" /> Anda telah menandatangani SOP ini (v{selectedSop.version}) pada {formatDate(selectedSop.acknowledged_at)}
                  </span>
                ) : selectedSop.needs_reack ? (
                  <span className="flex items-center gap-1.5 font-semibold text-status-warning">
                    <AlertTriangle size={15} aria-hidden="true" /> Versi baru belum ditandatangani ulang.
                  </span>
                ) : (
                  <span>Harap pahami seluruh isi prosedur kerja sebelum menjalankan operasional.</span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
                  <Printer size={14} aria-hidden="true" /> Cetak
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedSop(null)}>
                  Tutup
                </Button>
                {!selectedSop.acknowledged && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={acking}
                    disabled={acking}
                    onClick={() => handleAcknowledge(selectedSop)}
                  >
                    {acking ? "Menyimpan..." : "Tandai Telah Dibaca & Dipahami"}
                  </Button>
                )}
              </div>
            </div>
          )
        }
      >
        {selectedSop && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted border-b border-line pb-3 tabular-nums">
              <span>
                Diterbitkan oleh: <strong className="text-ink">{selectedSop.author_name || "Overtone Management"}</strong>
              </span>
              <span aria-hidden="true">&bull;</span>
              <span>Diperbarui: {formatDate(selectedSop.updated_at || selectedSop.created_at)}</span>
              <span aria-hidden="true">&bull;</span>
              <span>Kategori: {selectedSop.category_name || "SOP Internal"}</span>
              <span aria-hidden="true">&bull;</span>
              {renderPriorityBadge(selectedSop.priority_level)}
            </div>

            {selectedSop.needs_reack && (
              <div role="alert" className="rounded-sm bg-status-warning-bg border border-status-warning/30 p-3.5 text-xs text-status-warning font-semibold flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
                <span>Perhatian: Manajemen telah memperbarui materi SOP ini ke Versi {selectedSop.version}. Mohon baca kembali perubahan materi dan konfirmasi pemahaman Anda.</span>
              </div>
            )}

            {selectedSop.excerpt && (
              <div className="rounded-sm bg-surface-muted border border-line p-4 text-xs text-ink font-medium leading-relaxed">
                {selectedSop.excerpt}
              </div>
            )}

            <div className="whitespace-pre-wrap font-sans text-sm text-ink leading-relaxed max-w-[68ch]">
              {selectedSop.content}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Search,
  Truck,
  RefreshCw,
  Cpu,
} from "lucide-react";
import api from "../../api";
import { formatRupiah, formatDate, errorMessage } from "../../utils/format";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import EsRmaDiagnosticModal from "../../components/es/EsRmaDiagnosticModal";

export default function StoreReturns() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("requested"); // 'requested' | 'approved' | 'all'
  const [search, setSearch] = useState("");

  // Review Modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [reviewAction, setReviewAction] = useState("approve"); // 'approve' | 'reject'
  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [esModalOpen, setEsModalOpen] = useState(false);

  function fetchQueue() {
    setLoading(true);
    const param = filterStatus === "all" ? "" : `?status=${filterStatus}`;
    api
      .get(`/returns/store/queue${param}`)
      .then((res) => setItems(res.data?.data || []))
      .catch((err) => {
        console.error(err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchQueue();
  }, [filterStatus]);

  function handleOpenReview(item, action) {
    setSelectedItem(item);
    setReviewAction(action);
    setReviewNote(
      action === "approve"
        ? "Pengajuan klaim disetujui. Unit fisik memenuhi syarat awal retur garansi. Diteruskan ke Gudang Pusat."
        : "Pengajuan ditolak karena kendala tidak termasuk dalam cakupan cacat pabrik atau telah melewati batas masa garansi."
    );
  }

  async function handleConfirmReview(e) {
    e.preventDefault();
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/returns/${selectedItem.id}/review`, {
        action: reviewAction,
        review_note: reviewNote.trim(),
      });
      toast.success(res.data?.message || "Tindakan review berhasil disimpan!");
      setSelectedItem(null);
      fetchQueue();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal memproses review"));
    } finally {
      setSubmitting(false);
    }
  }

  const filteredItems = items.filter((it) => {
    const q = search.toLowerCase();
    return (
      it.return_number?.toLowerCase().includes(q) ||
      it.invoice_code?.toLowerCase().includes(q) ||
      it.customer_name?.toLowerCase().includes(q) ||
      it.product_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-canvas p-6 md:p-10 font-sans text-ink">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-line pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-ink text-canvas">
                <RotateCcw size={18} aria-hidden="true" />
              </span>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-ink tracking-tight">
                Antrean Retur &amp; Klaim Garansi Toko
              </h1>
              <Badge variant="neutral">Divisi Store &amp; Showroom</Badge>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-ink-secondary max-w-3xl">
              Tinjau pengajuan retur fisik dan klaim garansi dari pelanggan (TPS-OAS). Petugas toko berhak menyetujui unit untuk dikirim ke gudang atau menolak klaim yang tidak sah.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={fetchQueue}
            className="shrink-0"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} aria-hidden="true" />
            <span>Refresh Antrean</span>
          </Button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-sm border border-line bg-surface-muted p-1 text-xs font-bold">
            {[
              { id: "requested", label: "Menunggu Review" },
              { id: "approved", label: "Disetujui Toko" },
              { id: "all", label: "Semua Riwayat" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`rounded-xs px-4 py-1.5 transition-colors shrink-0 ${
                  filterStatus === tab.id
                    ? "bg-surface text-ink border border-line"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari RMA, invoice, pembeli..."
              className="ot-input w-full py-2 pl-9 pr-3 text-xs"
            />
          </div>
        </div>

        {/* Table Queue */}
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw size={24} className="mx-auto animate-spin text-ink-muted" aria-hidden="true" />
            <p className="mt-3 text-xs font-semibold text-ink-secondary">Memuat antrean retur...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-md border border-dashed border-line-strong bg-surface p-12 text-center">
            <CheckCircle2 size={32} className="mx-auto text-status-success" aria-hidden="true" />
            <h3 className="mt-3 font-display text-base font-bold text-ink">
              Tidak Ada Antrean Retur Aktif
            </h3>
            <p className="mt-1 text-xs text-ink-secondary">
              Semua pengajuan retur pelanggan telah diproses oleh staf showroom.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-line bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-ink">
                <thead className="bg-surface-muted text-[10px] font-bold uppercase tracking-wider text-ink-muted border-b border-line">
                  <tr>
                    <th className="px-5 py-3.5">Nomor RMA &amp; Tanggal</th>
                    <th className="px-5 py-3.5">Invoice &amp; Pelanggan</th>
                    <th className="px-5 py-3.5">Produk Instrumen</th>
                    <th className="px-5 py-3.5">Alasan &amp; Bukti</th>
                    <th className="px-5 py-3.5">Status &amp; Nilai</th>
                    <th className="px-5 py-3.5 text-right">Aksi Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-medium">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-muted/50 transition-colors">
                      <td className="px-5 py-4 tabular-nums">
                        <div className="font-mono font-bold text-accent bg-accent-soft px-2 py-0.5 rounded-xs inline-block">
                          {item.return_number}
                        </div>
                        <div className="mt-1 text-[11px] text-ink-muted">
                          {formatDate(item.created_at)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-ink tabular-nums">{item.invoice_code}</div>
                        <div className="text-ink-secondary">{item.customer_name || "Pelanggan Overtone"}</div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-ink">{item.product_name}</div>
                        {item.variant_name && (
                          <div className="text-[11px] text-ink-secondary">{item.variant_name}</div>
                        )}
                      </td>

                      <td className="px-5 py-4 max-w-xs">
                        <div className="font-bold text-ink">{item.reason_label || item.reason_code}</div>
                        <div className="line-clamp-2 text-[11px] text-ink-secondary mt-0.5">{item.description}</div>
                        {item.photos && item.photos.length > 0 && (
                          <div className="mt-1.5 flex gap-1">
                            {item.photos.map((p, i) => (
                              <a
                                key={i}
                                href={p}
                                target="_blank"
                                rel="noreferrer"
                                className="h-7 w-7 rounded-xs border border-line overflow-hidden block"
                              >
                                <img src={p} alt={`Bukti ${i + 1}`} className="h-full w-full object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 tabular-nums">
                        <div>
                          {item.status === "requested" && (
                            <Badge variant="amber">
                              <Clock size={10} className="mr-1 inline" aria-hidden="true" /> Menunggu Review
                            </Badge>
                          )}
                          {item.status === "approved" && (
                            <Badge variant="neutral">
                              <Truck size={10} className="mr-1 inline" aria-hidden="true" /> Disetujui Toko
                            </Badge>
                          )}
                          {item.status === "received" && (
                            <Badge variant="neutral">
                              <Package size={10} className="mr-1 inline" aria-hidden="true" /> Diterima Gudang
                            </Badge>
                          )}
                          {item.status === "rejected" && (
                            <Badge variant="rose">
                              <XCircle size={10} className="mr-1 inline" aria-hidden="true" /> Ditolak
                            </Badge>
                          )}
                          {item.status === "refunded" && (
                            <Badge variant="teal">
                              <CheckCircle2 size={10} className="mr-1 inline" aria-hidden="true" /> Refund Selesai
                            </Badge>
                          )}
                        </div>
                        <div className="font-mono font-bold text-ink mt-1">
                          {formatRupiah(item.refund_amount || 0)}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {item.status === "requested" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              className="!border-accent/40 !text-accent hover:!bg-accent hover:!text-accent-on"
                              onClick={() => {
                                setSelectedItem(item);
                                setEsModalOpen(true);
                              }}
                            >
                              <Cpu size={12} className="mr-1" />
                              Diagnosa ES
                            </Button>
                            <Button
                              type="button"
                              variant="primary"
                              size="xs"
                              onClick={() => handleOpenReview(item, "approve")}
                            >
                              Setujui
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="xs"
                              onClick={() => handleOpenReview(item, "reject")}
                            >
                              Tolak
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                setSelectedItem(item);
                                setEsModalOpen(true);
                              }}
                            >
                              <Cpu size={12} className="mr-1 text-accent" />
                              Log QC (ES)
                            </Button>
                            <span className="text-[11px] text-ink-muted font-semibold">
                              Telah diproses
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REVIEW MODAL */}
        <Modal
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={
            reviewAction === "approve"
              ? `Konfirmasi Persetujuan — ${selectedItem?.return_number || ""}`
              : `Konfirmasi Penolakan — ${selectedItem?.return_number || ""}`
          }
          maxWidth="max-w-lg"
        >
          {selectedItem && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-base font-bold text-ink">
                  {selectedItem.product_name}
                </h3>
                <p className="text-xs text-ink-secondary font-mono tabular-nums mt-0.5">
                  Invoice: {selectedItem.invoice_code} — Pembeli: {selectedItem.customer_name}
                </p>
              </div>

              <div className="rounded-sm bg-canvas p-3.5 text-xs space-y-1 text-ink border border-line tabular-nums">
                <p><strong>Alasan Pengajuan:</strong> {selectedItem.reason_label || selectedItem.reason_code}</p>
                <p><strong>Keluhan:</strong> {selectedItem.description}</p>
                <p><strong>Nilai Transaksi:</strong> {formatRupiah(selectedItem.refund_amount || 0)}</p>
              </div>

              <form onSubmit={handleConfirmReview} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-ink uppercase tracking-wider mb-1.5">
                    Catatan Review Staf Toko *
                  </label>
                  <textarea
                    rows={3}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="ot-input w-full p-3 text-xs"
                    required
                  />
                  <p className="mt-1 text-[11px] text-ink-muted">
                    Catatan ini akan dikirimkan langsung ke notifikasi akun pelanggan dan tim Gudang.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedItem(null)}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant={reviewAction === "approve" ? "primary" : "danger"}
                    size="sm"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Memproses..."
                      : reviewAction === "approve"
                      ? "Setujui Retur"
                      : "Tolak Retur"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Modal>

        {/* Modal Diagnosa Pakar 10-Point QC (ES) */}
        <EsRmaDiagnosticModal
          isOpen={esModalOpen}
          onClose={() => setEsModalOpen(false)}
          returnItem={selectedItem}
          onSuccess={fetchQueue}
        />
      </div>
    </div>
  );
}

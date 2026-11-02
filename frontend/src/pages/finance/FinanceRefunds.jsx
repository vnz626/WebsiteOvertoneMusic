import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
} from "lucide-react";
import api from "../../api";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { formatRupiah } from "../../utils/format";
import toast from "react-hot-toast";

export default function FinanceRefunds() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  function loadRefunds() {
    setLoading(true);
    api
      .get("/finance/refunds")
      .then((res) => {
        setRefunds(res.data?.data || []);
      })
      .catch((err) => {
        console.error(err);
        setRefunds([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRefunds();
  }, []);

  function handleOpenRefundModal(ord) {
    setSelectedOrder(ord);
    setRefundReason("Pembatalan pesanan dan retur fisik unit instrumen");
    setMsg("");
    setRefundModalOpen(true);
  }

  function handleConfirmRefund(e) {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmitting(true);
    api
      .post(`/finance/orders/${selectedOrder.id}/refund`, {
        reason: refundReason || "Pengembalian dana pelanggan",
      })
      .then(() => {
        setMsg(
          `Refund pesanan ${selectedOrder.invoice_code} berhasil diproses! Stok instrumen otomatis dipulihkan ke inventaris gudang.`
        );
        setTimeout(() => {
          setRefundModalOpen(false);
          loadRefunds();
        }, 1200);
      })
      .catch((err) =>
        toast.error(err.response?.data?.message || "Gagal memproses refund")
      )
      .finally(() => setSubmitting(false));
  }

  const filteredRefunds = refunds.filter((ord) => {
    const isRefunded = ord.order_status === "refunded";
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "pending" && !isRefunded) ||
      (filterStatus === "refunded" && isRefunded);
    const matchSearch =
      !search ||
      ord.invoice_code?.toLowerCase().includes(search.toLowerCase()) ||
      ord.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
      ord.event?.name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pendingCount = refunds.filter((r) => r.order_status !== "refunded").length;
  const totalRefundAmount = refunds
    .filter((r) => r.order_status === "refunded")
    .reduce((acc, c) => acc + (c.total_price || 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="accent">RMA &amp; Refund Disbursement</Badge>
            <Badge variant="neutral">7-Day Warranty Protection</Badge>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Refund &amp; Retur Pesanan Pelanggan
          </h1>
          <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
            Persetujuan pengembalian dana transaksi pelanggan (retur unit) dan
            sinkronisasi pemulihan stok instrumen.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadRefunds}>
          <RefreshCw
            size={13}
            className={loading ? "animate-spin" : ""}
            aria-hidden="true"
          />
          Refresh Data
        </Button>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 tabular-nums">
        <div className="rounded-md border border-line bg-surface p-5">
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-status-warning">
            <AlertCircle size={14} aria-hidden="true" /> Permintaan Refund Menunggu
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-status-warning">
            {pendingCount}{" "}
            <span className="text-xs font-normal text-ink-secondary">pesanan</span>
          </p>
        </div>

        <div className="rounded-md border border-line bg-surface p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-status-danger">
            Total Dana Telah Di-refund
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-status-danger">
            {formatRupiah(totalRefundAmount)}
          </p>
        </div>

        <div className="rounded-md border border-line bg-surface p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Total Transaksi Ditangani
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {refunds.length}{" "}
            <span className="text-xs font-normal text-ink-secondary">faktur</span>
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Cari nomor invoice, nama pelanggan, atau instrumen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari nomor invoice, nama pelanggan, atau instrumen"
            className="w-full rounded-sm border border-line bg-surface py-2 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={`rounded-sm px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filterStatus === "all"
                ? "bg-ink text-canvas"
                : "border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink"
            }`}
          >
            Semua ({refunds.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("pending")}
            className={`rounded-sm px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filterStatus === "pending"
                ? "bg-status-warning text-white"
                : "border border-line bg-surface text-status-warning hover:border-status-warning/40"
            }`}
          >
            Menunggu Refund ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("refunded")}
            className={`rounded-sm px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filterStatus === "refunded"
                ? "bg-status-danger text-white"
                : "border border-line bg-surface text-status-danger hover:border-status-danger/40"
            }`}
          >
            Sudah Di-refund
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3.5">Invoice &amp; Tanggal</th>
                <th className="px-4 py-3.5">Pelanggan</th>
                <th className="px-4 py-3.5">Produk Instrumen</th>
                <th className="px-4 py-3.5 text-right">Nilai Transaksi</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Aksi Finance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-medium tabular-nums">
              {filteredRefunds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted">
                    {loading
                      ? "Memuat riwayat refund..."
                      : "Tidak ada pesanan yang memerlukan refund."}
                  </td>
                </tr>
              ) : (
                filteredRefunds.map((ord) => (
                  <tr key={ord.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3.5 font-mono font-bold text-ink">
                      <div>{ord.invoice_code}</div>
                      {ord.return_request && (
                        <div className="mt-1 inline-block rounded-xs border border-status-warning/30 bg-status-warning/10 px-2 py-0.5 font-mono text-[10px] font-bold text-status-warning">
                          RMA: {ord.return_request.return_number}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-ink">{ord.buyer_name}</p>
                      <span className="text-[11px] text-ink-secondary">
                        {ord.buyer_phone || "-"}
                      </span>
                      {ord.return_request && (
                        <p className="mt-0.5 text-[10px] font-medium text-status-warning">
                          Alasan: {ord.return_request.reason_code}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-ink">{ord.event?.name}</p>
                      <span className="text-[11px] text-ink-secondary">
                        {ord.ticket_tier?.tier_name} ({ord.quantity} unit)
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-ink">
                      {formatRupiah(ord.total_price)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {ord.order_status === "refunded" ? (
                        <Badge variant="danger">Refunded</Badge>
                      ) : ord.return_request?.status === "received" ? (
                        <Badge variant="accent">Fisik Diterima Gudang</Badge>
                      ) : ord.return_request?.status === "approved" ? (
                        <Badge variant="info">Retur Disetujui Toko</Badge>
                      ) : (
                        <Badge variant="success">Lunas (Paid)</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {ord.order_status !== "refunded" ? (
                        <Button
                          type="button"
                          variant="danger"
                          size="xs"
                          onClick={() => handleOpenRefundModal(ord)}
                        >
                          Proses Refund
                        </Button>
                      ) : (
                        <span className="text-[11px] font-bold text-status-danger">
                          Dana Dikembalikan
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Refund */}
      <Modal
        open={refundModalOpen && Boolean(selectedOrder)}
        onClose={() => setRefundModalOpen(false)}
        title="Konfirmasi Pengembalian Dana (Refund)"
        size="md"
      >
        {selectedOrder && (
          <form onSubmit={handleConfirmRefund} className="space-y-4 text-xs">
            <p className="text-xs text-ink-secondary">
              Invoice:{" "}
              <span className="font-mono font-bold text-ink">
                {selectedOrder.invoice_code}
              </span>{" "}
              • {selectedOrder.buyer_name}
            </p>

            {msg && (
              <div className="flex items-center gap-2 rounded-sm border border-status-success/30 bg-status-success/10 p-3 text-xs font-bold text-status-success">
                <CheckCircle2 size={16} aria-hidden="true" /> {msg}
              </div>
            )}

            <div className="rounded-sm border border-status-danger/30 bg-status-danger/10 p-3.5 tabular-nums">
              <span className="block text-ink-secondary">
                Total Nilai Pengembalian Dana:
              </span>
              <p className="mt-0.5 font-display text-xl font-bold text-status-danger">
                {formatRupiah(selectedOrder.total_price)}
              </p>
              <p className="mt-1 text-[11px] text-ink-secondary">
                {selectedOrder.quantity} unit {selectedOrder.event?.name} (
                {selectedOrder.ticket_tier?.tier_name})
              </p>
            </div>

            <div>
              <label className="mb-1 block font-bold text-ink">
                Alasan Refund &amp; Retur
              </label>
              <textarea
                required
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="ot-input text-xs"
                placeholder="Masukkan alasan pembatalan atau retur unit..."
              />
            </div>

            <div className="flex items-start gap-2 rounded-sm border border-line bg-surface-muted p-3 text-[11px] text-ink-secondary">
              <ShieldAlert
                size={16}
                className="mt-0.5 shrink-0 text-status-warning"
                aria-hidden="true"
              />
              <span>
                Memproses refund akan otomatis mengembalikan kuota unit instrumen
                musik terkait ke stok gudang inventaris secara instan.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setRefundModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="danger" size="sm" loading={submitting}>
                Konfirmasi &amp; Cairkan Refund
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

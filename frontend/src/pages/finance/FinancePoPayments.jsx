import { useEffect, useState } from "react";
import {
  CheckCircle2,
  RefreshCw,
  Search,
  Wallet,
  AlertCircle,
  Printer,
} from "lucide-react";
import api from "../../api";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { formatRupiah } from "../../utils/format";
import { printPurchaseOrder } from "../../utils/printPurchaseOrder";
import toast from "react-hot-toast";

export default function FinancePoPayments() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  const [payProof, setPayProof] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  function loadPos() {
    setLoading(true);
    api
      .get("/finance/pos")
      .then((res) => {
        setPos(res.data?.data || []);
      })
      .catch((err) => {
        console.error(err);
        setPos([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPos();
  }, []);

  function handleOpenPay(po) {
    setSelectedPo(po);
    setPayProof(`BCA-TRF-${new Date().getTime().toString().slice(-6)}`);
    setPayNotes("Pelunasan tagihan supplier via Bank Transfer");
    setMsg("");
    setPayModalOpen(true);
  }

  function handleConfirmPayPo(e) {
    e.preventDefault();
    if (!selectedPo) return;
    setSubmitting(true);
    api
      .post(`/finance/pos/${selectedPo.id}/pay`, {
        payment_proof: payProof,
        notes: payNotes,
      })
      .then(() => {
        setMsg(`Pembayaran tagihan PO ${selectedPo.po_number} berhasil dicatat!`);
        setTimeout(() => {
          setPayModalOpen(false);
          loadPos();
        }, 800);
      })
      .catch((err) =>
        toast.error(err.response?.data?.message || "Gagal memproses pembayaran PO")
      )
      .finally(() => setSubmitting(false));
  }

  const filteredPos = pos.filter((po) => {
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "approved" && po.status === "approved") ||
      (filterStatus === "paid" &&
        (po.status === "paid" || po.status === "received"));
    const matchSearch =
      !search ||
      po.po_number?.toLowerCase().includes(search.toLowerCase()) ||
      po.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
      po.product?.name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pendingCount = pos.filter((p) => p.status === "approved").length;
  const totalPendingCost = pos
    .filter((p) => p.status === "approved")
    .reduce((acc, c) => acc + (c.total_cost || 0), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="accent">Accounts Payable</Badge>
            <Badge variant="neutral">B2B Supplier Settlement</Badge>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Pembayaran PO Supplier (Restock)
          </h1>
          <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
            Pelunasan invoice Purchase Order instrumen musik yang telah disetujui
            Manager kepada Brand / Authorized Supplier resmi.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadPos}>
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
            <AlertCircle size={14} aria-hidden="true" /> Tagihan PO Menunggu Bayar
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-status-warning">
            {pendingCount}{" "}
            <span className="text-xs font-normal text-ink-secondary">
              PO disetujui
            </span>
          </p>
        </div>

        <div className="rounded-md border border-line bg-surface p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Total Nilai Pelunasan Tertunda
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {formatRupiah(totalPendingCost)}
          </p>
        </div>

        <div className="rounded-md border border-line bg-surface p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Total Riwayat PO Terdaftar
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {pos.length}{" "}
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
            placeholder="Cari nomor PO, brand supplier, atau instrumen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari nomor PO, brand supplier, atau instrumen"
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
            Semua ({pos.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("approved")}
            className={`rounded-sm px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filterStatus === "approved"
                ? "bg-status-warning text-white"
                : "border border-line bg-surface text-status-warning hover:border-status-warning/40"
            }`}
          >
            Menunggu Bayar ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("paid")}
            className={`rounded-sm px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filterStatus === "paid"
                ? "bg-status-success text-white"
                : "border border-line bg-surface text-status-success hover:border-status-success/40"
            }`}
          >
            Sudah Lunas
          </button>
        </div>
      </div>

      {/* Table PO */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3.5">No. PO &amp; Approval</th>
                <th className="px-4 py-3.5">Brand Supplier</th>
                <th className="px-4 py-3.5">Produk Instrumen</th>
                <th className="px-4 py-3.5 text-center">Jumlah</th>
                <th className="px-4 py-3.5 text-right">Tagihan PO</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Aksi Finance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-medium tabular-nums">
              {filteredPos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-muted">
                    {loading
                      ? "Memuat tagihan PO..."
                      : "Tidak ada tagihan Purchase Order yang cocok."}
                  </td>
                </tr>
              ) : (
                filteredPos.map((po) => (
                  <tr key={po.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3.5">
                      <p className="font-mono font-bold text-ink">{po.po_number}</p>
                      <span className="text-[11px] text-ink-secondary">
                        Disetujui: {po.approver?.name || "Manager Retail"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-ink">
                        {po.supplier?.name || "Supplier Resmi"}
                      </p>
                      <span className="text-[11px] text-ink-secondary">
                        Tujuan: {po.venue?.name || "Gudang Pusat"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-ink">{po.product?.name}</p>
                      {po.tier && (
                        <span className="text-[11px] font-semibold text-status-success">
                          Varian: {po.tier.tier_name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm font-bold text-ink">
                      {po.quantity} unit
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="text-sm font-bold text-ink">
                        {formatRupiah(po.total_cost)}
                      </p>
                      <span className="text-[10px] text-ink-muted">
                        @ {formatRupiah(po.unit_cost)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge
                        variant={
                          po.status === "approved"
                            ? "warning"
                            : po.status === "paid" || po.status === "received"
                            ? "success"
                            : "info"
                        }
                      >
                        {po.status === "approved"
                          ? "Menunggu Bayar"
                          : po.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={() => printPurchaseOrder(po)}
                          title="Cetak PDF Purchase Order B2B"
                        >
                          <Printer size={13} aria-hidden="true" />
                          PDF PO
                        </Button>
                        {po.status === "approved" ? (
                          <Button
                            type="button"
                            variant="primary"
                            size="xs"
                            onClick={() => handleOpenPay(po)}
                          >
                            Bayar Tagihan
                          </Button>
                        ) : (
                          <span className="font-mono text-[11px] font-bold text-status-success">
                            Lunas ({po.payment_proof || "Bank Transfer"})
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Bayar PO */}
      <Modal
        open={payModalOpen && Boolean(selectedPo)}
        onClose={() => setPayModalOpen(false)}
        title="Pelunasan Tagihan PO Supplier"
        size="md"
      >
        {selectedPo && (
          <form onSubmit={handleConfirmPayPo} className="space-y-4 text-xs">
            <p className="text-xs text-ink-secondary">
              PO: <span className="font-mono font-bold text-ink">{selectedPo.po_number}</span>{" "}
              • {selectedPo.supplier?.name}
            </p>

            {msg && (
              <div className="flex items-center gap-2 rounded-sm border border-status-success/30 bg-status-success/10 p-3 text-xs font-bold text-status-success">
                <CheckCircle2 size={16} aria-hidden="true" /> {msg}
              </div>
            )}

            <div className="rounded-sm border border-line bg-surface-muted p-3.5 tabular-nums">
              <span className="block text-ink-secondary">Jumlah Tagihan Pelunasan:</span>
              <p className="mt-0.5 font-display text-xl font-bold text-ink">
                {formatRupiah(selectedPo.total_cost)}
              </p>
              <p className="mt-1 text-[11px] text-ink-muted">
                {selectedPo.quantity} unit {selectedPo.product?.name} (
                {selectedPo.tier?.tier_name})
              </p>
            </div>

            <div>
              <label className="mb-1 block font-bold text-ink">
                Referensi Bukti Transfer / No. Transaksi
              </label>
              <input
                type="text"
                required
                value={payProof}
                onChange={(e) => setPayProof(e.target.value)}
                className="ot-input font-mono text-xs"
                placeholder="BCA-TRF-091823"
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-ink">Catatan Finance</label>
              <input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="ot-input text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPayModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={submitting}>
                Konfirmasi Pembayaran
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

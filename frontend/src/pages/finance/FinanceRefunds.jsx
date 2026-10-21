import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
} from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import Badge from "../../components/ui/Badge";
import { formatRupiah } from "../../utils/format";

export default function FinanceRefunds() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modal Refund
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
        setMsg(`Refund pesanan ${selectedOrder.invoice_code} berhasil diproses! Stok instrumen otomatis dipulihkan ke inventaris gudang.`);
        setTimeout(() => {
          setRefundModalOpen(false);
          loadRefunds();
        }, 1200);
      })
      .catch((err) => alert(err.response?.data?.message || "Gagal memproses refund"))
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
    <div className="flex min-h-screen flex-col md:flex-row bg-[#FDFDFD]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white shadow-xs">
                  <RotateCcw size={18} />
                </span>
                <h1 className="font-jakarta text-2xl font-extrabold text-gray-900">
                  Refund &amp; Retur Pesanan Pelanggan
                </h1>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Persetujuan pengembalian dana transaksi pelanggan (retur unit) dan sinkronisasi pemulihan stok instrumen.
              </p>
            </div>
            <button
              onClick={loadRefunds}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh Data
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <AlertCircle size={14} /> Permintaan Refund Menunggu
              </span>
              <p className="mt-2 font-jakarta text-2xl font-extrabold text-amber-700">
                {pendingCount} <span className="text-xs font-normal text-gray-500">pesanan</span>
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                Total Dana Telah Di-refund
              </span>
              <p className="mt-2 font-jakarta text-2xl font-extrabold text-rose-700">
                {formatRupiah(totalRefundAmount)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Total Transaksi Ditangani
              </span>
              <p className="mt-2 font-jakarta text-2xl font-extrabold text-gray-900">
                {refunds.length} <span className="text-xs font-normal text-gray-500">faktur</span>
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nomor invoice, nama pelanggan, atau instrumen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-xs font-medium text-gray-900 outline-none transition focus:border-gray-900 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  filterStatus === "all"
                    ? "bg-gray-900 text-white shadow-xs"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Semua ({refunds.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("pending")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  filterStatus === "pending"
                    ? "bg-amber-700 text-white shadow-xs"
                    : "bg-white border border-gray-200 text-amber-700 hover:bg-amber-50"
                }`}
              >
                Menunggu Refund ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("refunded")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  filterStatus === "refunded"
                    ? "bg-rose-700 text-white shadow-xs"
                    : "bg-white border border-gray-200 text-rose-700 hover:bg-rose-50"
                }`}
              >
                Sudah Di-refund
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50/80 font-bold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="py-3.5 px-4">Invoice &amp; Tanggal</th>
                  <th className="py-3.5 px-4">Pelanggan</th>
                  <th className="py-3.5 px-4">Produk Instrumen</th>
                  <th className="py-3.5 px-4 text-right">Nilai Transaksi</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi Finance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredRefunds.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      {loading ? "Memuat riwayat refund..." : "Tidak ada pesanan yang memerlukan refund."}
                    </td>
                  </tr>
                ) : (
                  filteredRefunds.map((ord) => (
                    <tr key={ord.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        {ord.invoice_code}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{ord.buyer_name}</p>
                        <span className="text-[11px] text-gray-500">{ord.buyer_phone || "-"}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{ord.event?.name}</p>
                        <span className="text-[11px] text-gray-500">
                          {ord.ticket_tier?.tier_name} ({ord.quantity} unit)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-sm text-gray-900">
                        {formatRupiah(ord.total_price)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {ord.order_status === "refunded" ? (
                          <Badge variant="rose">Refunded</Badge>
                        ) : (
                          <Badge variant="teal">Lunas (Paid)</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {ord.order_status !== "refunded" ? (
                          <button
                            type="button"
                            onClick={() => handleOpenRefundModal(ord)}
                            className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                          >
                            Proses Refund
                          </button>
                        ) : (
                          <span className="text-[11px] text-rose-700 font-bold">
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

          {/* Modal Refund */}
          {refundModalOpen && selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
              <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-up">
                <h3 className="font-jakarta text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  <RotateCcw className="text-rose-600" size={20} /> Konfirmasi Pengembalian Dana (Refund)
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Invoice: <span className="font-mono font-bold text-gray-900">{selectedOrder.invoice_code}</span> &bull; {selectedOrder.buyer_name}
                </p>

                {msg && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={16} /> {msg}
                  </div>
                )}

                <form onSubmit={handleConfirmRefund} className="mt-4 space-y-3.5 text-xs">
                  <div className="rounded-xl bg-rose-50/70 border border-rose-200 p-3.5">
                    <span className="text-gray-600 block">Total Nilai Pengembalian Dana:</span>
                    <p className="font-jakarta text-xl font-extrabold text-rose-700 mt-0.5">
                      {formatRupiah(selectedOrder.total_price)}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-1">
                      {selectedOrder.quantity} unit {selectedOrder.event?.name} ({selectedOrder.ticket_tier?.tier_name})
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-gray-800">Alasan Refund &amp; Retur</label>
                    <textarea
                      required
                      rows={3}
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-gray-900 outline-none focus:border-gray-900 text-xs"
                      placeholder="Masukkan alasan pembatalan atau retur unit..."
                    />
                  </div>

                  <div className="rounded-xl bg-gray-50 p-3 text-[11px] text-gray-500 flex items-start gap-2 border border-gray-200">
                    <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Memproses refund akan otomatis mengembalikan kuota unit instrumen musik terkait ke stok gudang inventaris secara instan.
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setRefundModalOpen(false)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white shadow-sm hover:bg-rose-700 transition disabled:opacity-50"
                    >
                      {submitting ? "Memproses..." : "Konfirmasi &amp; Cairkan Refund"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

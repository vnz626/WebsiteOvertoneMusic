import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Filter,
  RefreshCw,
  Search,
  Wallet,
  Building2,
  Calendar,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import Badge from "../../components/ui/Badge";
import { formatRupiah } from "../../utils/format";

export default function FinancePoPayments() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modal Bayar
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
      .catch((err) => alert(err.response?.data?.message || "Gagal memproses pembayaran PO"))
      .finally(() => setSubmitting(false));
  }

  const filteredPos = pos.filter((po) => {
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "approved" && po.status === "approved") ||
      (filterStatus === "paid" && (po.status === "paid" || po.status === "received"));
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
    <div className="flex min-h-screen flex-col md:flex-row bg-[#FDFDFD]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white shadow-xs">
                  <Wallet size={18} />
                </span>
                <h1 className="font-jakarta text-2xl font-extrabold text-gray-900">
                  Pembayaran PO Supplier (Restock)
                </h1>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Pelunasan invoice Purchase Order instrumen musik yang telah disetujui Manager kepada Brand / Authorized Supplier resmi.
              </p>
            </div>
            <button
              onClick={loadPos}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh Data
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <AlertCircle size={14} /> Tagihan PO Menunggu Bayar
              </span>
              <p className="mt-2 font-jakarta text-2xl font-extrabold text-amber-700">
                {pendingCount} <span className="text-xs font-normal text-gray-500">PO disetujui</span>
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Total Nilai Pelunasan Tertunda
              </span>
              <p className="mt-2 font-jakarta text-2xl font-extrabold text-gray-900">
                {formatRupiah(totalPendingCost)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Total Riwayat PO Terdaftar
              </span>
              <p className="mt-2 font-jakarta text-2xl font-extrabold text-gray-900">
                {pos.length} <span className="text-xs font-normal text-gray-500">faktur</span>
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nomor PO, brand supplier, atau instrumen..."
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
                Semua ({pos.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("approved")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  filterStatus === "approved"
                    ? "bg-amber-700 text-white shadow-xs"
                    : "bg-white border border-gray-200 text-amber-700 hover:bg-amber-50"
                }`}
              >
                Menunggu Bayar ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("paid")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  filterStatus === "paid"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-white border border-gray-200 text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                Sudah Lunas
              </button>
            </div>
          </div>

          {/* Table PO */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50/80 font-bold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="py-3.5 px-4">No. PO &amp; Approval</th>
                  <th className="py-3.5 px-4">Brand Supplier</th>
                  <th className="py-3.5 px-4">Produk Instrumen</th>
                  <th className="py-3.5 px-4 text-center">Jumlah</th>
                  <th className="py-3.5 px-4 text-right">Tagihan PO</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi Finance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredPos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      {loading ? "Memuat tagihan PO..." : "Tidak ada tagihan Purchase Order yang cocok."}
                    </td>
                  </tr>
                ) : (
                  filteredPos.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 px-4">
                        <p className="font-mono font-bold text-gray-900">{po.po_number}</p>
                        <span className="text-[11px] text-gray-500">
                          Disetujui: {po.approver?.name || "Manager Retail"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{po.supplier?.name || "Supplier Resmi"}</p>
                        <span className="text-[11px] text-gray-500">Tujuan: {po.venue?.name || "Gudang Pusat"}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{po.product?.name}</p>
                        {po.tier && (
                          <span className="text-[11px] text-emerald-700 font-bold">
                            Varian: {po.tier.tier_name}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-sm text-gray-800">
                        {po.quantity} unit
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <p className="font-extrabold text-sm text-gray-900">
                          {formatRupiah(po.total_cost)}
                        </p>
                        <span className="text-[10px] text-gray-500">@ {formatRupiah(po.unit_cost)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={
                            po.status === "approved"
                              ? "amber"
                              : po.status === "paid" || po.status === "received"
                              ? "teal"
                              : "blue"
                          }
                        >
                          {po.status === "approved" ? "Menunggu Bayar" : po.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {po.status === "approved" ? (
                          <button
                            type="button"
                            onClick={() => handleOpenPay(po)}
                            className="rounded-xl bg-gray-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-black transition"
                          >
                            Bayar Tagihan
                          </button>
                        ) : (
                          <span className="font-mono text-[11px] text-emerald-700 font-bold">
                            Lunas ({po.payment_proof || "Bank Transfer"})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Bayar PO */}
          {payModalOpen && selectedPo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
              <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-up">
                <h3 className="font-jakarta text-lg font-extrabold text-gray-900">
                  Pelunasan Tagihan PO Supplier
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  PO: <span className="font-mono font-bold text-gray-900">{selectedPo.po_number}</span> &bull; {selectedPo.supplier?.name}
                </p>

                {msg && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={16} /> {msg}
                  </div>
                )}

                <form onSubmit={handleConfirmPayPo} className="mt-4 space-y-3.5 text-xs">
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-3.5">
                    <span className="text-gray-500 block">Jumlah Tagihan Pelunasan:</span>
                    <p className="font-jakarta text-xl font-extrabold text-gray-900 mt-0.5">
                      {formatRupiah(selectedPo.total_cost)}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      {selectedPo.quantity} unit {selectedPo.product?.name} ({selectedPo.tier?.tier_name})
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-gray-800">
                      Referensi Bukti Transfer / No. Transaksi
                    </label>
                    <input
                      type="text"
                      required
                      value={payProof}
                      onChange={(e) => setPayProof(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white p-2.5 font-mono text-gray-900 outline-none focus:border-gray-900"
                      placeholder="BCA-TRF-091823"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-gray-800">Catatan Finance</label>
                    <input
                      type="text"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-gray-900 outline-none focus:border-gray-900"
                    />
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setPayModalOpen(false)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-gray-900 px-5 py-2 font-bold text-white shadow-sm hover:bg-black transition disabled:opacity-50"
                    >
                      {submitting ? "Memproses..." : "Konfirmasi Pembayaran"}
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

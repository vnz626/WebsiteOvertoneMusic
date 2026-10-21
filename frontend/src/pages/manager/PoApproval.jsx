import { useEffect, useState } from "react";
import {
  CheckCircle2,
  FileCheck,
  Package,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import Badge from "../../components/ui/Badge";
import { formatRupiah } from "../../utils/format";

export default function ManagerPoApproval() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("submitted");
  const [submittingId, setSubmittingId] = useState(null);
  const [msg, setMsg] = useState("");

  function loadOrders() {
    setLoading(true);
    api
      .get("/po")
      .then((res) => setOrders(res.data.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filtered = orders.filter((o) => {
    if (filterStatus === "all") return true;
    return o.status === filterStatus;
  });

  function handleApprove(id) {
    if (!confirm("Setujui Purchase Order ini untuk diteruskan ke tim Finance?")) return;
    setSubmittingId(id);
    api
      .post(`/po/${id}/approve`)
      .then(() => {
        setMsg(`PO #${id} berhasil disetujui! Diteruskan ke Finance untuk pembayaran.`);
        loadOrders();
        setTimeout(() => setMsg(""), 3000);
      })
      .catch((err) => alert(err.response?.data?.message || "Gagal menyetujui PO"))
      .finally(() => setSubmittingId(null));
  }

  function handleReject(id) {
    const reason = prompt("Masukkan alasan penolakan PO:");
    if (!reason) return;
    setSubmittingId(id);
    api
      .post(`/po/${id}/reject`, { reason })
      .then(() => {
        setMsg(`PO #${id} ditolak.`);
        loadOrders();
        setTimeout(() => setMsg(""), 3000);
      })
      .catch((err) => alert(err.response?.data?.message || "Gagal menolak PO"))
      .finally(() => setSubmittingId(null));
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ts-primary/10 text-ts-primary dark:bg-brand-400/10 dark:text-brand-400">
                  <FileCheck size={20} />
                </span>
                <h1 className="font-jakarta text-2xl font-extrabold text-ts-ink dark:text-white">
                  Approval Purchase Order (Restock Barang)
                </h1>
              </div>
              <p className="mt-1 text-sm text-ts-muted dark:text-slate-400">
                Persetujuan pengadaan instrumen musik dari Brand/Supplier resmi sebelum diteruskan ke Finance untuk pelunasan.
              </p>
            </div>
            <button
              onClick={loadOrders}
              className="inline-flex items-center gap-2 rounded-xl border border-ts-subtle bg-white px-4 py-2 text-xs font-bold text-ts-ink shadow-sm hover:bg-ts-low dark:border-white/10 dark:bg-surface-container dark:text-white"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {msg && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} /> {msg}
            </div>
          )}

          {/* Filter Pills */}
          <div className="mt-6 flex items-center gap-2">
            {[
              { id: "submitted", label: "Menunggu Persetujuan Manager" },
              { id: "approved", label: "Disetujui (Menunggu Finance)" },
              { id: "paid", label: "Lunas (Menunggu Gudang)" },
              { id: "received", label: "Selesai Diterima" },
              { id: "all", label: "Semua PO" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  filterStatus === f.id
                    ? "bg-ts-primary text-white shadow-sm dark:bg-brand-500"
                    : "bg-white text-ts-muted border border-ts-subtle hover:bg-ts-low dark:bg-surface-container dark:border-white/10 dark:text-slate-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-ts-subtle bg-white shadow-sm dark:border-white/10 dark:bg-surface-container">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ts-subtle bg-ts-low/60 font-bold uppercase tracking-wider text-ts-muted dark:border-white/10 dark:bg-surface-high">
                <tr>
                  <th className="py-3.5 px-4">No. PO & Tanggal</th>
                  <th className="py-3.5 px-4">Brand Supplier & Tujuan</th>
                  <th className="py-3.5 px-4">Produk Instrumen</th>
                  <th className="py-3.5 px-4 text-center">Jumlah</th>
                  <th className="py-3.5 px-4 text-right">Nilai Tagihan</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Keputusan Manager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ts-subtle dark:divide-white/5 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-ts-muted">
                      Memuat Purchase Orders...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-ts-muted">
                      Tidak ada pengajuan PO dengan filter ini.
                    </td>
                  </tr>
                ) : (
                  filtered.map((po) => (
                    <tr key={po.id} className="hover:bg-ts-low/30 transition dark:hover:bg-white/5">
                      <td className="py-3.5 px-4">
                        <p className="font-mono font-bold text-ts-ink dark:text-white">{po.po_number}</p>
                        <span className="text-[11px] text-ts-muted">
                          Diajukan oleh: {po.requester?.name || "Staff Gudang"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-ts-ink dark:text-white">{po.supplier?.name || "Supplier"}</p>
                        <span className="text-[11px] text-ts-muted flex items-center gap-1">
                          <Truck size={12} /> {po.venue?.name || "Gudang Pusat"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-ts-ink dark:text-white">{po.product?.name}</p>
                        {po.tier && (
                          <span className="text-[11px] text-emerald-600 font-bold">
                            Varian: {po.tier.tier_name}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-sm">{po.quantity} unit</td>
                      <td className="py-3.5 px-4 text-right">
                        <p className="font-bold text-ts-ink dark:text-white">{formatRupiah(po.total_cost)}</p>
                        <span className="text-[10px] text-ts-muted">@ {formatRupiah(po.unit_cost)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={
                            po.status === "approved"
                              ? "blue"
                              : po.status === "paid"
                              ? "purple"
                              : po.status === "received"
                              ? "teal"
                              : po.status === "rejected"
                              ? "rose"
                              : "amber"
                          }
                        >
                          {po.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {po.status === "submitted" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(po.id)}
                              disabled={submittingId === po.id}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(po.id)}
                              disabled={submittingId === po.id}
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-ts-muted">Telah Diproses</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

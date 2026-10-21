import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
  User,
} from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import Badge from "../../components/ui/Badge";
import { formatRupiah } from "../../utils/format";

export default function WarehouseDeliveryOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  // Shipping Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courier, setCourier] = useState("JNE Trucking");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  function loadOrders() {
    setLoading(true);
    api
      .get("/warehouse/orders")
      .then((res) => {
        const d = res?.data?.data;
        setOrders(Array.isArray(d) ? d : []);
      })
      .catch((err) => {
        console.error(err);
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const filtered = safeOrders.filter((o) => {
    if (!o) return false;
    if (filterStatus === "all") return true;
    return o.order_status === filterStatus;
  });

  function handlePack(orderId) {
    api.post(`/warehouse/orders/${orderId}/pack`).then(() => {
      loadOrders();
    });
  }

  function handleOpenShip(order) {
    setSelectedOrder(order);
    setTrackingNumber(order.tracking_number || "");
    setCourier(order.shipping_courier || "JNE Trucking");
    setMsg("");
    setModalOpen(true);
  }

  function handleSubmitShip(e) {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmitting(true);
    api
      .post(`/warehouse/orders/${selectedOrder.id}/ship`, {
        tracking_number: trackingNumber,
        shipping_courier: courier,
      })
      .then(() => {
        setMsg("Pesanan berhasil dikirim dan nomor resi telah diinfokan ke pelanggan!");
        setTimeout(() => {
          setModalOpen(false);
          loadOrders();
        }, 1000);
      })
      .catch((err) => {
        alert(err.response?.data?.message || "Gagal mengupdate nomor resi");
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ts-primary/10 text-ts-primary dark:bg-brand-400/10 dark:text-brand-400">
                  <Truck size={20} />
                </span>
                <h1 className="font-jakarta text-2xl font-extrabold text-ts-ink dark:text-white">
                  Pesanan Ekspedisi (Packing & Input Resi)
                </h1>
              </div>
              <p className="mt-1 text-sm text-ts-muted dark:text-slate-400">
                Pemenuhan pesanan kirim ke alamat customer: verifikasi paket, packing aman, dan input tracking number resi ekspedisi.
              </p>
            </div>
            <button
              onClick={loadOrders}
              className="inline-flex items-center gap-2 rounded-xl border border-ts-subtle bg-white px-4 py-2 text-xs font-bold text-ts-ink shadow-sm transition hover:bg-ts-low dark:border-white/10 dark:bg-surface-container dark:text-white"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {/* Filter Pills */}
          <div className="mt-6 flex items-center gap-2">
            {[
              { id: "all", label: "Semua Pesanan" },
              { id: "paid", label: "Perlu Dipacking" },
              { id: "packed", label: "Siap Kirim / Tunggu Kurir" },
              { id: "shipped", label: "Sudah Dikirim (Ada Resi)" },
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

          {/* Orders Table */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-ts-subtle bg-white shadow-sm dark:border-white/10 dark:bg-surface-container">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ts-subtle bg-ts-low/60 font-bold uppercase tracking-wider text-ts-muted dark:border-white/10 dark:bg-surface-high">
                <tr>
                  <th className="py-3.5 px-4">Invoice & Tanggal</th>
                  <th className="py-3.5 px-4">Pembeli & Kontak</th>
                  <th className="py-3.5 px-4">Instrumen & Varian</th>
                  <th className="py-3.5 px-4">Alamat Kirim & Ekspedisi</th>
                  <th className="py-3.5 px-4 text-center">Status Pemenuhan</th>
                  <th className="py-3.5 px-4 text-right">Aksi Gudang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ts-subtle dark:divide-white/5 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ts-muted">
                      Memuat pesanan ekspedisi...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ts-muted">
                      Tidak ada pesanan ekspedisi dengan filter ini.
                    </td>
                  </tr>
                ) : (
                  filtered.map((ord) => (
                    <tr key={ord.id} className="hover:bg-ts-low/30 transition dark:hover:bg-white/5">
                      <td className="py-3.5 px-4">
                        <p className="font-mono font-bold text-ts-ink dark:text-white">{ord.invoice_code}</p>
                        <span className="text-[11px] text-ts-muted">
                          {ord.created_at ? new Date(ord.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-ts-ink dark:text-white flex items-center gap-1">
                          <User size={13} className="text-ts-muted" /> {ord.buyer_name}
                        </p>
                        <span className="text-[11px] text-ts-muted">{ord.buyer_phone}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-ts-ink dark:text-white">{ord.event?.name || "Instrumen"}</p>
                        {ord.ticket_tier && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                            {ord.ticket_tier.tier_name} ({ord.quantity} unit)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-ts-ink dark:text-white flex items-center gap-1 truncate">
                          <Truck size={13} className="text-ts-primary" /> {ord.shipping_courier || "JNE Trucking"}
                        </p>
                        <p className="text-[11px] text-ts-muted truncate flex items-center gap-1">
                          <MapPin size={11} className="shrink-0" /> {ord.shipping_address || "Alamat pembeli"}
                        </p>
                        {ord.tracking_number && (
                          <span className="mt-0.5 inline-block font-mono text-[11px] font-bold text-ts-primary dark:text-brand-400">
                            Resi: {ord.tracking_number}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {ord.order_status === "shipped" ? (
                          <Badge variant="teal">Dikirim via Ekspedisi</Badge>
                        ) : ord.order_status === "packed" ? (
                          <Badge variant="blue">Selesai Dipacking</Badge>
                        ) : (
                          <Badge variant="amber">Perlu Dipacking</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {ord.order_status === "paid" && (
                            <button
                              onClick={() => handlePack(ord.id)}
                              className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition"
                            >
                              Selesai Pack
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenShip(ord)}
                            className="rounded-lg bg-ts-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-ts-container transition dark:bg-brand-500"
                          >
                            {ord.tracking_number ? "Ubah Resi" : "Input Resi & Kirim"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Input Resi Pengiriman */}
        {modalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-ts-subtle bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-surface-container animate-fade-up">
              <h3 className="font-jakarta text-lg font-extrabold text-ts-ink dark:text-white">
                Input Nomor Resi Ekspedisi
              </h3>
              <p className="mt-1 text-xs text-ts-muted dark:text-slate-400">
                Invoice: <span className="font-mono font-bold">{selectedOrder.invoice_code}</span> &bull; Pembeli: {selectedOrder.buyer_name}
              </p>

              {msg && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} /> {msg}
                </div>
              )}

              <form onSubmit={handleSubmitShip} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="mb-1 block font-bold text-ts-ink dark:text-white">Kurir / Ekspedisi</label>
                  <select
                    value={courier}
                    onChange={(e) => setCourier(e.target.value)}
                    className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                  >
                    <option value="JNE Trucking">JNE Trucking (JTR)</option>
                    <option value="SiCepat Cargo">SiCepat Cargo</option>
                    <option value="Swee Lee Logistics">Swee Lee Express Dedicated</option>
                    <option value="Wahana Express">Wahana Express</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-ts-ink dark:text-white">
                    Nomor Resi Pelacakan (Tracking Number)
                  </label>
                  <input
                    type="text"
                    required
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 font-mono text-sm outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    placeholder="Contoh: JNE0928371928"
                  />
                  <span className="text-[10px] text-ts-muted">
                    Nomor resi ini akan otomatis tampil di dashboard customer dan dikirimkan via notifikasi.
                  </span>
                </div>

                <div className="rounded-xl bg-ts-low p-3 dark:bg-surface-high text-xs text-ts-muted">
                  <p className="font-bold text-ts-ink dark:text-white">Alamat Pengiriman:</p>
                  <p className="mt-0.5">{selectedOrder.shipping_address || "Alamat terdaftar"}</p>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-ts-subtle bg-white px-4 py-2 font-bold text-ts-muted transition hover:bg-ts-low dark:border-white/10 dark:bg-surface-high"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-ts-primary px-5 py-2 font-bold text-white shadow-md shadow-ts-primary/25 transition hover:bg-ts-container disabled:opacity-50 dark:bg-brand-500"
                  >
                    {submitting ? "Menyimpan..." : "Simpan & Kirim Paket"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

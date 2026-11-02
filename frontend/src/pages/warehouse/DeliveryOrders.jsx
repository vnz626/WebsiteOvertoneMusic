import { useEffect, useState } from "react";
import {
  CheckCircle2,
  MapPin,
  RefreshCw,
  Truck,
  User,
} from "lucide-react";
import api from "../../api";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";

export default function WarehouseDeliveryOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

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
        setMsg(
          "Pesanan berhasil dikirim dan nomor resi telah diinfokan ke pelanggan!"
        );
        setTimeout(() => {
          setModalOpen(false);
          loadOrders();
        }, 1000);
      })
      .catch((err) => {
        toast.error(
          err.response?.data?.message || "Gagal mengupdate nomor resi"
        );
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="accent">Outbound Logistics</Badge>
            <Badge variant="neutral">QC Crate Packing &amp; Courier Dispatch</Badge>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Pesanan Ekspedisi (Packing &amp; Input Resi)
          </h1>
          <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
            Pemenuhan pesanan kirim ke alamat filmmaker / pelanggan: verifikasi nomor seri sensor, packing
            hardcase &amp; kayu aman, dan input tracking number resi ekspedisi.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadOrders}>
          <RefreshCw
            size={14}
            className={loading ? "animate-spin" : ""}
            aria-hidden="true"
          />
          Refresh
        </Button>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { id: "all", label: "Semua Pesanan" },
          { id: "paid", label: "Perlu Dipacking" },
          { id: "packed", label: "Siap Kirim / Tunggu Kurir" },
          { id: "shipped", label: "Sudah Dikirim (Ada Resi)" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilterStatus(f.id)}
            className={`rounded-sm px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filterStatus === f.id
                ? "bg-ink text-canvas"
                : "border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3.5">Invoice &amp; Tanggal</th>
                <th className="px-4 py-3.5">Pembeli &amp; Kontak</th>
                <th className="px-4 py-3.5">Cinema Gear &amp; Varian</th>
                <th className="px-4 py-3.5">Alamat Kirim &amp; Ekspedisi</th>
                <th className="px-4 py-3.5 text-center">Status Pemenuhan</th>
                <th className="px-4 py-3.5 text-right">Aksi Gudang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-medium tabular-nums">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted">
                    Memuat pesanan ekspedisi...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted">
                    Tidak ada pesanan ekspedisi dengan filter ini.
                  </td>
                </tr>
              ) : (
                filtered.map((ord) => (
                  <tr key={ord.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3.5">
                      <p className="font-mono font-bold text-ink">
                        {ord.invoice_code}
                      </p>
                      <span className="text-[11px] text-ink-secondary">
                        {ord.created_at
                          ? new Date(ord.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="flex items-center gap-1 font-bold text-ink">
                        <User
                          size={13}
                          className="text-ink-muted"
                          aria-hidden="true"
                        />{" "}
                        {ord.buyer_name}
                      </p>
                      <span className="text-[11px] text-ink-secondary">
                        {ord.buyer_phone}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-ink">
                        {ord.event?.name || "Cinema Gear"}
                      </p>
                      {ord.ticket_tier && (
                        <span className="text-[11px] font-bold text-status-success">
                          {ord.ticket_tier.tier_name} ({ord.quantity} unit)
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3.5">
                      <p className="flex items-center gap-1 truncate font-bold text-ink">
                        <Truck
                          size={13}
                          className="text-accent"
                          aria-hidden="true"
                        />{" "}
                        {ord.shipping_courier || "JNE Trucking"}
                      </p>
                      <p className="flex items-center gap-1 truncate text-[11px] text-ink-secondary">
                        <MapPin
                          size={11}
                          className="shrink-0"
                          aria-hidden="true"
                        />{" "}
                        {ord.shipping_address || "Alamat pembeli"}
                      </p>
                      {ord.tracking_number && (
                        <span className="mt-0.5 inline-block font-mono text-[11px] font-bold text-accent">
                          Resi: {ord.tracking_number}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {ord.order_status === "shipped" ? (
                        <Badge variant="success">Dikirim via Ekspedisi</Badge>
                      ) : ord.order_status === "packed" ? (
                        <Badge variant="info">Selesai Dipacking</Badge>
                      ) : (
                        <Badge variant="warning">Perlu Dipacking</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {ord.order_status === "paid" && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="xs"
                            onClick={() => handlePack(ord.id)}
                          >
                            Selesai Pack
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="primary"
                          size="xs"
                          onClick={() => handleOpenShip(ord)}
                        >
                          {ord.tracking_number
                            ? "Ubah Resi"
                            : "Input Resi & Kirim"}
                        </Button>
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
      <Modal
        open={modalOpen && Boolean(selectedOrder)}
        onClose={() => setModalOpen(false)}
        title="Input Nomor Resi Ekspedisi"
        size="md"
      >
        {selectedOrder && (
          <form onSubmit={handleSubmitShip} className="space-y-4 text-xs">
            <p className="text-xs text-ink-secondary">
              Invoice:{" "}
              <span className="font-mono font-bold text-ink">
                {selectedOrder.invoice_code}
              </span>{" "}
              • Pembeli: {selectedOrder.buyer_name}
            </p>

            {msg && (
              <div className="flex items-center gap-2 rounded-sm border border-status-success/30 bg-status-success/10 p-3 text-xs font-bold text-status-success">
                <CheckCircle2 size={16} aria-hidden="true" /> {msg}
              </div>
            )}

            <div>
              <label className="mb-1 block font-bold text-ink">
                Kurir / Ekspedisi
              </label>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="ot-input text-xs"
              >
                <option value="JNE Trucking">JNE Trucking (JTR)</option>
                <option value="SiCepat Cargo">SiCepat Cargo</option>
                <option value="Overtone Logistics">
                  Overtone Express Dedicated
                </option>
                <option value="Wahana Express">Wahana Express</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-bold text-ink">
                Nomor Resi Pelacakan (Tracking Number)
              </label>
              <input
                type="text"
                required
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="ot-input font-mono text-sm"
                placeholder="Contoh: JNE0928371928"
              />
              <span className="mt-1 block text-[10px] text-ink-muted">
                Nomor resi ini akan otomatis tampil di dashboard pelanggan dan
                dikirimkan via notifikasi.
              </span>
            </div>

            <div className="rounded-sm border border-line bg-surface-muted p-3 text-xs text-ink-secondary">
              <p className="font-bold text-ink">Alamat Pengiriman:</p>
              <p className="mt-0.5">
                {selectedOrder.shipping_address || "Alamat terdaftar"}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={submitting}>
                Simpan &amp; Kirim Paket
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

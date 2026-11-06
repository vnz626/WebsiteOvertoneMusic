import React, { useState, useEffect } from "react";
import {
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

export default function WarehouseTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [serialNumbers, setSerialNumbers] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", type: "" });

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/warehouse/transfers", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.status === "success") {
        setTransfers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!activeModal) return;

    try {
      setDispatching(true);
      setFeedback({ text: "", type: "" });

      const res = await fetch(
        `/api/warehouse/transfers/${activeModal.id}/dispatch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ serial_numbers: serialNumbers }),
        }
      );
      const data = await res.json();

      if (data.status === "success") {
        setFeedback({
          text: `Stok berhasil ditransfer ke ${activeModal.branch_name}!`,
          type: "success",
        });
        setTimeout(() => {
          setActiveModal(null);
          setSerialNumbers("");
          setFeedback({ text: "", type: "" });
          fetchTransfers();
        }, 1200);
      } else {
        setFeedback({
          text: data.message || "Gagal memproses transfer stok",
          type: "error",
        });
      }
    } catch (err) {
      setFeedback({
        text: "Kesalahan jaringan: " + err.message,
        type: "error",
      });
    } finally {
      setDispatching(false);
    }
  };

  const pendingList = transfers.filter((t) => t.status === "pending_warehouse");
  const completedList = transfers.filter(
    (t) => t.status === "completed" || t.status === "shipped_to_branch"
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-line pb-5">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="accent">Logistik &amp; Distribusi Gudang Pusat</Badge>
          <Badge variant="neutral">Inter-Branch Stock Transfer</Badge>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Eksekusi Transfer Stok Antar Gudang &amp; Offline Store
        </h1>
        <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
          Fasilitas pemindahan unit fisik dari{" "}
          <strong className="font-semibold text-ink">
            Gudang Pusat Cikarang
          </strong>{" "}
          ke 5 Cabang Offline Store resmi Focalpoint.pro.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 tabular-nums">
        <div className="rounded-md border border-line bg-surface p-5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-status-warning">
            <span>Permintaan Menunggu Pengiriman</span>
            <Clock size={15} aria-hidden="true" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-ink">
            {pendingList.length} Order
          </div>
          <span className="mt-1 block text-xs text-ink-secondary">
            Perlu verifikasi &amp; packing unit
          </span>
        </div>

        <div className="rounded-md border border-line bg-surface p-5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-status-success">
            <span>Transfer Berhasil / Selesai</span>
            <CheckCircle size={15} aria-hidden="true" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-status-success">
            {completedList.length} Pengiriman
          </div>
          <span className="mt-1 block text-xs text-ink-secondary">
            Stok fisik telah tiba di Offline Store
          </span>
        </div>

        <div className="rounded-md border border-line bg-surface p-5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ink-muted">
            <span>Audit Mutasi Logistik</span>
            <ShieldCheck size={15} aria-hidden="true" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-ink">
            100% Tercatat
          </div>
          <span className="mt-1 block text-xs text-ink-secondary">
            Terkoneksi ke buku besar mutasi inventaris
          </span>
        </div>
      </div>

      {/* Pending Transfers Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-ink">
            <span className="h-2 w-2 rounded-full bg-status-warning" />
            Antrean Permintaan Cabang Offline Store (Pending Gudang)
          </h2>
          <span className="text-xs text-ink-secondary tabular-nums">
            {pendingList.length} Permintaan Butuh Eksekusi
          </span>
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-surface">
          {loading ? (
            <div className="py-16 text-center text-xs text-ink-muted">
              Memuat data transfer stok...
            </div>
          ) : pendingList.length === 0 ? (
            <div className="py-12 text-center text-xs text-ink-muted">
              Tidak ada permintaan stok yang tertunda. Semua Offline Store
              tercukupi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    <th className="px-4 py-3">No. Dokumen Transfer</th>
                    <th className="px-4 py-3">Cinema Gear &amp; SKU</th>
                    <th className="px-4 py-3">Cabang Tujuan</th>
                    <th className="px-4 py-3 text-center">Jumlah Unit</th>
                    <th className="px-4 py-3">Stok Gudang Pusat</th>
                    <th className="px-4 py-3">Catatan Permintaan</th>
                    <th className="px-4 py-3 text-right">Aksi Gudang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line tabular-nums">
                  {pendingList.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-muted/50">
                      <td className="px-4 py-3 font-mono font-bold text-ink">
                        {t.transfer_code}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink">
                          {t.product_name}
                        </div>
                        <div className="font-mono text-[11px] text-ink-muted">
                          Varian: {t.variant_name} ({t.sku})
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 font-semibold text-ink">
                          <MapPin
                            size={14}
                            className="text-accent"
                            aria-hidden="true"
                          />
                          {t.branch_name}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <Badge variant="warning">{t.qty} Unit</Badge>
                      </td>

                      <td className="px-4 py-3 font-mono font-semibold text-ink">
                        Tersedia: {t.warehouse_stock ?? "-"} Unit
                      </td>

                      <td className="max-w-xs truncate px-4 py-3 italic text-ink-secondary">
                        {t.notes || "Pengajuan restock Offline Store"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="primary"
                          size="xs"
                          onClick={() => {
                            setActiveModal(t);
                            setSerialNumbers("");
                            setFeedback({ text: "", type: "" });
                          }}
                        >
                          <Truck size={13} aria-hidden="true" /> Kirim Stok
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Completed Transfers History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-ink">
            <CheckCircle
              size={15}
              className="text-status-success"
              aria-hidden="true"
            />
            Riwayat Transfer Selesai &amp; Diterima Offline Store
          </h2>
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-surface">
          {completedList.length === 0 ? (
            <div className="py-10 text-center text-xs text-ink-muted">
              Belum ada riwayat transfer.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                    <th className="px-4 py-3">No. Dokumen</th>
                    <th className="px-4 py-3">Cinema Gear</th>
                    <th className="px-4 py-3">Tujuan</th>
                    <th className="px-4 py-3 text-center">Unit</th>
                    <th className="px-4 py-3">Nomor Seri Terkirim</th>
                    <th className="px-4 py-3">Status Logistik</th>
                    <th className="px-4 py-3">Waktu Eksekusi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line tabular-nums">
                  {completedList.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-muted/50">
                      <td className="px-4 py-3 font-mono font-medium text-ink">
                        {t.transfer_code}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink">
                        {t.product_name} - {t.variant_name}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink-secondary">
                        {t.branch_name}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-ink">
                        {t.qty} Unit
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-ink-secondary">
                        {t.serial_numbers || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="success">Berhasil Dipindahkan</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-ink-muted">
                        {t.created_at
                          ? new Date(t.created_at).toLocaleDateString("id-ID")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dispatch Modal */}
      <Modal
        open={Boolean(activeModal)}
        onClose={() => setActiveModal(null)}
        title="Eksekusi Pengiriman Stok"
        size="md"
      >
        {activeModal && (
          <form onSubmit={handleDispatch} className="space-y-4 text-xs">
            {feedback.text && (
              <div
                className={`flex items-center gap-2 rounded-sm border p-3 text-xs font-bold ${
                  feedback.type === "success"
                    ? "border-status-success/30 bg-status-success/10 text-status-success"
                    : "border-status-danger/30 bg-status-danger/10 text-status-danger"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle size={15} aria-hidden="true" />
                ) : (
                  <AlertCircle size={15} aria-hidden="true" />
                )}
                {feedback.text}
              </div>
            )}

            <div className="space-y-2 rounded-sm border border-line bg-surface-muted p-4 text-xs tabular-nums">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Kode Dokumen:</span>
                <span className="font-mono font-bold text-ink">
                  {activeModal.transfer_code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Produk &amp; Varian:</span>
                <span className="font-semibold text-ink">
                  {activeModal.product_name} ({activeModal.variant_name})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">
                  Cabang Offline Store Tujuan:
                </span>
                <span className="font-semibold text-accent">
                  {activeModal.branch_name}
                </span>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-sm font-bold">
                <span className="text-ink">Jumlah Unit Dikirim:</span>
                <span className="font-mono text-ink">
                  {activeModal.qty} Unit
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink">
                Nomor Seri Unit Fisik (Serial Number) *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Contoh: SN-FND-88291, SN-FND-88292"
                value={serialNumbers}
                onChange={(e) => setSerialNumbers(e.target.value)}
                className="ot-input font-mono text-xs"
              />
              <span className="mt-1 block text-[10px] text-ink-muted">
                Scan barcode serial number fisik unit sebelum keluar dari gudang
                pusat.
              </span>
            </div>

            <div className="flex justify-end gap-2 border-t border-line pt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setActiveModal(null)}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={dispatching}>
                <Truck size={14} aria-hidden="true" />
                Kirim Stok ke Offline Store
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

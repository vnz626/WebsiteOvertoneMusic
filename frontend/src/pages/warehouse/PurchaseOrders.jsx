import { useEffect, useState } from "react";
import {
  CheckCircle2,
  FileText,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Truck,
} from "lucide-react";
import api from "../../api";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { formatRupiah } from "../../utils/format";
import { printPurchaseOrder } from "../../utils/printPurchaseOrder";
import toast from "react-hot-toast";

export default function WarehousePurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ brands: [], venues: [] });
  const [products, setProducts] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: "",
    venue_id: "",
    event_id: "",
    tier_id: "",
    quantity: 5,
    unit_cost: 0,
    notes: "",
  });

  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  const [serialInput, setSerialInput] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  function loadPOs() {
    setLoading(true);
    api
      .get("/po")
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

  function loadMetadata() {
    api
      .get("/events/meta")
      .then((res) => {
        const d = res?.data || {};
        setMeta({
          brands: Array.isArray(d.brands) ? d.brands : [],
          venues: Array.isArray(d.venues)
            ? d.venues
            : Array.isArray(d.branches)
              ? d.branches
              : [],
        });
      })
      .catch(() => setMeta({ brands: [], venues: [] }));

    api
      .get("/events")
      .then((res) => {
        const d = res?.data?.data;
        setProducts(Array.isArray(d) ? d : []);
      })
      .catch(() => setProducts([]));
  }

  useEffect(() => {
    loadPOs();
    loadMetadata();
  }, []);

  const selectedProductObj = products.find(
    (p) => p.id === parseInt(formData.event_id)
  );

  function handleCreatePO(e) {
    e.preventDefault();
    setSubmitting(true);
    api
      .post("/po", formData)
      .then(() => {
        setMsg("Purchase Order berhasil diajukan ke Manager!");
        setTimeout(() => {
          setModalOpen(false);
          setFormData({
            supplier_id: "",
            venue_id: "",
            event_id: "",
            tier_id: "",
            quantity: 5,
            unit_cost: 0,
            notes: "",
          });
          loadPOs();
        }, 1000);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Gagal mengajukan PO");
      })
      .finally(() => setSubmitting(false));
  }

  function handleOpenReceive(po) {
    setSelectedPo(po);
    setSerialInput("");
    setReceiveNotes("Barang fisik diterima dalam kondisi baik & lolos QC");
    setMsg("");
    setReceiveModalOpen(true);
  }

  function handleConfirmReceive(e) {
    e.preventDefault();
    if (!selectedPo) return;
    setSubmitting(true);

    const serials = serialInput
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    api
      .post(`/po/${selectedPo.id}/receive`, {
        serial_numbers: serials,
        notes: receiveNotes,
      })
      .then(() => {
        setMsg(
          "Penerimaan barang berhasil! Stok produk dan varian otomatis bertambah."
        );
        setTimeout(() => {
          setReceiveModalOpen(false);
          loadPOs();
        }, 1200);
      })
      .catch((err) => {
        toast.error(
          err.response?.data?.message || "Gagal memproses penerimaan PO"
        );
      })
      .finally(() => setSubmitting(false));
  }

  function statusBadge(status) {
    switch (status) {
      case "submitted":
        return <Badge variant="warning">Menunggu Approval Manager</Badge>;
      case "approved":
        return <Badge variant="info">Disetujui - Menunggu Bayar Finance</Badge>;
      case "paid":
        return <Badge variant="accent">Lunas Dibayar - Siap Diterima Gudang</Badge>;
      case "received":
        return <Badge variant="success">Selesai Diterima (Stok Masuk)</Badge>;
      case "rejected":
        return <Badge variant="danger">Ditolak</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="accent">Procurement &amp; Inbound</Badge>
            <Badge variant="neutral">Supplier Purchase Orders</Badge>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Pengadaan Barang Restock (Purchase Orders)
          </h1>
          <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
            Alur pengadaan: Diajukan Staf Gudang → Disetujui Manager → Dibayar
            Finance → Diterima &amp; Masuk Stok.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setMsg("");
              setModalOpen(true);
            }}
          >
            <Plus size={15} aria-hidden="true" />
            Ajukan PO Restock
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadPOs}
            title="Segarkan Data"
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>

      {/* List Table */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3.5">No. PO &amp; Tanggal</th>
                <th className="px-4 py-3.5">Brand Supplier &amp; Tujuan</th>
                <th className="px-4 py-3.5">Produk &amp; Varian</th>
                <th className="px-4 py-3.5 text-center">Jumlah</th>
                <th className="px-4 py-3.5 text-right">Total Tagihan</th>
                <th className="px-4 py-3.5 text-center">Status Alur</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-medium tabular-nums">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-muted">
                    Memuat Purchase Orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-muted">
                    Belum ada Purchase Order yang diajukan.
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3.5">
                      <p className="font-mono font-bold text-ink">{po.po_number}</p>
                      <span className="text-[11px] text-ink-secondary">
                        {po.created_at
                          ? new Date(po.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-ink">
                        {po.supplier?.name || "Supplier"}
                      </p>
                      <span className="flex items-center gap-1 text-[11px] text-ink-secondary">
                        <Truck size={12} aria-hidden="true" />{" "}
                        {po.venue?.name || "Gudang Pusat"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-ink">
                        {po.product?.name || "Cinema Gear"}
                      </p>
                      {po.tier && (
                        <span className="text-[11px] font-bold text-status-success">
                          Varian: {po.tier.tier_name} ({po.tier.sku_code})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm font-bold text-ink">
                      {po.quantity} unit
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="font-bold text-ink">
                        {formatRupiah(po.total_cost)}
                      </p>
                      <span className="text-[10px] text-ink-muted">
                        @ {formatRupiah(po.unit_cost)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {statusBadge(po.status)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={() => printPurchaseOrder(po)}
                          title="Cetak PDF Dokumen Purchase Order"
                        >
                          <Printer size={13} aria-hidden="true" />
                          PDF PO
                        </Button>
                        {po.status === "paid" && (
                          <Button
                            type="button"
                            variant="primary"
                            size="xs"
                            onClick={() => handleOpenReceive(po)}
                          >
                            <PackageCheck size={14} aria-hidden="true" /> Terima
                            Fisik
                          </Button>
                        )}
                        {po.status === "received" && (
                          <span className="flex items-center justify-end gap-1 text-[11px] font-bold text-status-success">
                            <CheckCircle2 size={14} aria-hidden="true" /> Stok Masuk
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

      {/* Modal Ajukan PO */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ajukan Purchase Order (Restock)"
        size="lg"
      >
        <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
          <p className="text-xs text-ink-secondary">
            Pengadaan unit baru dari Brand/Supplier resmi untuk menambah stok
            persediaan toko.
          </p>

          {msg && (
            <div className="flex items-center gap-2 rounded-sm border border-status-success/30 bg-status-success/10 p-3 text-xs font-bold text-status-success">
              <CheckCircle2 size={16} aria-hidden="true" /> {msg}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-bold text-ink">
                Brand / Supplier
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_id: e.target.value })
                }
                required
                className="ot-input text-xs"
              >
                <option value="">Pilih Supplier...</option>
                {meta.brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.brand_country})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-bold text-ink">
                Gudang / Offline Store Tujuan
              </label>
              <select
                value={formData.venue_id}
                onChange={(e) =>
                  setFormData({ ...formData, venue_id: e.target.value })
                }
                required
                className="ot-input text-xs"
              >
                <option value="">Pilih Lokasi Penerima...</option>
                {meta.venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-bold text-ink">
              Produk Cinema Gear
            </label>
            <select
              value={formData.event_id}
              onChange={(e) => {
                const prodId = e.target.value;
                const p = products.find((x) => x.id === parseInt(prodId));
                const defaultCost = p ? Math.round(p.price * 0.65) : 0;
                setFormData({
                  ...formData,
                  event_id: prodId,
                  tier_id: p?.tiers?.[0]?.id || "",
                  unit_cost: defaultCost,
                });
              }}
              required
              className="ot-input text-xs"
            >
              <option value="">Pilih Model Cinema Gear...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - Retail: {formatRupiah(p.price)}
                </option>
              ))}
            </select>
          </div>

          {selectedProductObj &&
            selectedProductObj.tiers &&
            selectedProductObj.tiers.length > 0 && (
              <div>
                <label className="mb-1 block font-bold text-ink">
                  Varian SKU / Warna
                </label>
                <select
                  value={formData.tier_id}
                  onChange={(e) => {
                    const tId = e.target.value;
                    const t = selectedProductObj.tiers.find(
                      (x) => x.id === parseInt(tId)
                    );
                    setFormData({
                      ...formData,
                      tier_id: tId,
                      unit_cost:
                        t?.cost_price || Math.round((t?.price || 0) * 0.65),
                    });
                  }}
                  className="ot-input text-xs"
                >
                  {selectedProductObj.tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tier_name} ({t.sku_code}) - HPP:{" "}
                      {formatRupiah(
                        t.cost_price || Math.round(t.price * 0.65)
                      )}
                    </option>
                  ))}
                </select>
              </div>
            )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 tabular-nums">
            <div>
              <label className="mb-1 block font-bold text-ink">
                Kuantitas (Unit)
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: parseInt(e.target.value || 1),
                  })
                }
                required
                className="ot-input text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block font-bold text-ink">
                HPP Satuan (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={formData.unit_cost}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unit_cost: parseInt(e.target.value || 0),
                  })
                }
                required
                className="ot-input font-mono text-xs"
              />
            </div>
          </div>

          <div className="rounded-sm border border-line bg-surface-muted p-3 tabular-nums">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-ink-secondary">
                Estimasi Total Tagihan PO:
              </span>
              <span className="text-accent">
                {formatRupiah(formData.quantity * formData.unit_cost)}
              </span>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-bold text-ink">
              Catatan Pengadaan
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="ot-input text-xs"
              placeholder="Alasan restock atau catatan pengiriman"
            />
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
              Kirim Pengajuan PO
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Penerimaan Barang Fisik */}
      <Modal
        open={receiveModalOpen && Boolean(selectedPo)}
        onClose={() => setReceiveModalOpen(false)}
        title="Penerimaan Fisik Barang dari Supplier"
        size="lg"
      >
        {selectedPo && (
          <form onSubmit={handleConfirmReceive} className="space-y-4 text-xs">
            <p className="text-xs text-ink-secondary">
              PO:{" "}
              <span className="font-mono font-bold text-ink">
                {selectedPo.po_number}
              </span>{" "}
              • {selectedPo.product?.name} ({selectedPo.quantity} unit)
            </p>

            {msg && (
              <div className="flex items-center gap-2 rounded-sm border border-status-success/30 bg-status-success/10 p-3 text-xs font-bold text-status-success">
                <CheckCircle2 size={16} aria-hidden="true" /> {msg}
              </div>
            )}

            <div>
              <label className="mb-1 block font-bold text-ink">
                Nomor Seri Fisik (Serial Numbers)
              </label>
              <textarea
                rows={4}
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                className="ot-input font-mono text-xs"
                placeholder={
                  "Masukkan 1 nomor seri per baris, contoh:\nUS23091001\nUS23091002\nUS23091003"
                }
              />
              <span className="mt-1 block text-[10px] text-ink-muted">
                Opsional. Jika tidak diisi, sistem akan mencatat otomatis dengan
                referensi BATCH-{selectedPo.po_number}.
              </span>
            </div>

            <div>
              <label className="mb-1 block font-bold text-ink">
                Kondisi &amp; Catatan QC
              </label>
              <input
                type="text"
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                className="ot-input text-xs"
              />
            </div>

            <div className="rounded-sm border border-status-success/30 bg-status-success/10 p-3 text-xs text-status-success">
              <p className="font-bold">Konfirmasi Penambahan Stok:</p>
              <p className="mt-0.5 text-ink-secondary">
                Stok sebanyak{" "}
                <strong className="text-ink">{selectedPo.quantity} unit</strong>{" "}
                akan otomatis ditambahkan ke katalog dan dicatat di kartu mutasi
                inventaris.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setReceiveModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={submitting}>
                Konfirmasi Terima &amp; Update Stok
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

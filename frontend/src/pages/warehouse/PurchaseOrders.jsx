import { useEffect, useState } from "react";
import {
  Boxes,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  PackageCheck,
  Plus,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import Badge from "../../components/ui/Badge";
import { formatRupiah } from "../../utils/format";

export default function WarehousePurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ brands: [], venues: [] });
  const [products, setProducts] = useState([]);

  // Create PO Modal
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

  // Receive PO Modal
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
    api.get("/events/meta")
      .then((res) => {
        const d = res?.data || {};
        setMeta({
          brands: Array.isArray(d.brands) ? d.brands : [],
          venues: Array.isArray(d.venues) ? d.venues : (Array.isArray(d.branches) ? d.branches : []),
        });
      })
      .catch(() => setMeta({ brands: [], venues: [] }));

    api.get("/events")
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

  const selectedProductObj = products.find((p) => p.id === parseInt(formData.event_id));

  function handleCreatePO(e) {
    e.preventDefault();
    setSubmitting(true);
    api
      .post("/po", formData)
      .then((res) => {
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
        alert(err.response?.data?.message || "Gagal mengajukan PO");
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
      .then((res) => {
        setMsg("Penerimaan barang berhasil! Stok produk dan varian otomatis bertambah.");
        setTimeout(() => {
          setReceiveModalOpen(false);
          loadPOs();
        }, 1200);
      })
      .catch((err) => {
        alert(err.response?.data?.message || "Gagal memproses penerimaan PO");
      })
      .finally(() => setSubmitting(false));
  }

  function statusBadge(status) {
    switch (status) {
      case "submitted":
        return <Badge variant="amber">Menunggu Approval Manager</Badge>;
      case "approved":
        return <Badge variant="blue">Disetujui - Menunggu Bayar Finance</Badge>;
      case "paid":
        return <Badge variant="purple">Lunas Dibayar - Siap Diterima Gudang</Badge>;
      case "received":
        return <Badge variant="teal">Selesai Diterima (Stok Masuk)</Badge>;
      case "rejected":
        return <Badge variant="rose">Ditolak</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
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
                  <FileText size={20} />
                </span>
                <h1 className="font-jakarta text-2xl font-extrabold text-ts-ink dark:text-white">
                  Pengadaan Barang Restock (Purchase Orders)
                </h1>
              </div>
              <p className="mt-1 text-sm text-ts-muted dark:text-slate-400">
                Alur pengadaan: Diajukan Staff Gudang &rarr; Disetujui Manager &rarr; Dibayar Finance &rarr; Diterima & Masuk Stok.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMsg("");
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-ts-primary px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-ts-primary/25 transition hover:bg-ts-container dark:bg-brand-500"
              >
                <Plus size={16} /> Ajukan PO Restock
              </button>
              <button
                onClick={loadPOs}
                className="rounded-xl border border-ts-subtle bg-white p-2.5 text-ts-muted shadow-sm hover:text-ts-primary dark:border-white/10 dark:bg-surface-container"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* List Table */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-ts-subtle bg-white shadow-sm dark:border-white/10 dark:bg-surface-container">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ts-subtle bg-ts-low/60 font-bold uppercase tracking-wider text-ts-muted dark:border-white/10 dark:bg-surface-high">
                <tr>
                  <th className="py-3.5 px-4">No. PO & Tanggal</th>
                  <th className="py-3.5 px-4">Brand Supplier & Tujuan</th>
                  <th className="py-3.5 px-4">Produk & Varian</th>
                  <th className="py-3.5 px-4 text-center">Jumlah</th>
                  <th className="py-3.5 px-4 text-right">Total Tagihan</th>
                  <th className="py-3.5 px-4 text-center">Status Alur</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ts-subtle dark:divide-white/5 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-ts-muted">
                      Memuat Purchase Orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-ts-muted">
                      Belum ada Purchase Order yang diajukan.
                    </td>
                  </tr>
                ) : (
                  orders.map((po) => (
                    <tr key={po.id} className="hover:bg-ts-low/30 transition dark:hover:bg-white/5">
                      <td className="py-3.5 px-4">
                        <p className="font-mono font-bold text-ts-ink dark:text-white">{po.po_number}</p>
                        <span className="text-[11px] text-ts-muted">
                          {po.created_at ? new Date(po.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-ts-ink dark:text-white">{po.supplier?.name || "Supplier"}</p>
                        <span className="text-[11px] text-ts-muted flex items-center gap-1">
                          <Truck size={12} /> {po.venue?.name || "Gudang Pusat"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-ts-ink dark:text-white">{po.product?.name || "Instrumen"}</p>
                        {po.tier && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                            Varian: {po.tier.tier_name} ({po.tier.sku_code})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-sm">{po.quantity} unit</td>
                      <td className="py-3.5 px-4 text-right">
                        <p className="font-bold text-ts-ink dark:text-white">{formatRupiah(po.total_cost)}</p>
                        <span className="text-[10px] text-ts-muted">@ {formatRupiah(po.unit_cost)}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">{statusBadge(po.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        {po.status === "paid" && (
                          <button
                            onClick={() => handleOpenReceive(po)}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                          >
                            <PackageCheck size={14} /> Terima Fisik
                          </button>
                        )}
                        {po.status === "received" && (
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                            <CheckCircle2 size={14} /> Stok Masuk
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

        {/* Modal Ajukan PO */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-ts-subtle bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-surface-container animate-fade-up">
              <h3 className="font-jakarta text-lg font-extrabold text-ts-ink dark:text-white">
                Ajukan Purchase Order (Restock)
              </h3>
              <p className="mt-1 text-xs text-ts-muted dark:text-slate-400">
                Pengadaan unit baru dari Brand/Supplier resmi untuk menambah stok persediaan toko.
              </p>

              {msg && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} /> {msg}
                </div>
              )}

              <form onSubmit={handleCreatePO} className="mt-4 space-y-3.5 text-xs">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Brand / Supplier</label>
                    <select
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                      required
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
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
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Gudang / Showroom Tujuan</label>
                    <select
                      value={formData.venue_id}
                      onChange={(e) => setFormData({ ...formData, venue_id: e.target.value })}
                      required
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
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
                  <label className="mb-1 block font-bold text-ts-ink dark:text-white">Produk Instrumen</label>
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
                    className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                  >
                    <option value="">Pilih Model Instrumen...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - Retail: {formatRupiah(p.price)}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProductObj && selectedProductObj.tiers && selectedProductObj.tiers.length > 0 && (
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Varian SKU / Warna</label>
                    <select
                      value={formData.tier_id}
                      onChange={(e) => {
                        const tId = e.target.value;
                        const t = selectedProductObj.tiers.find((x) => x.id === parseInt(tId));
                        setFormData({
                          ...formData,
                          tier_id: tId,
                          unit_cost: t?.cost_price || Math.round((t?.price || 0) * 0.65),
                        });
                      }}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    >
                      {selectedProductObj.tiers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.tier_name} ({t.sku_code}) - HPP: {formatRupiah(t.cost_price || Math.round(t.price * 0.65))}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Kuantitas (Unit)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value || 1) })}
                      required
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">HPP Satuan (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData({ ...formData, unit_cost: parseInt(e.target.value || 0) })}
                      required
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-ts-low p-3 dark:bg-surface-high">
                  <div className="flex justify-between font-bold text-sm">
                    <span className="text-ts-muted">Estimasi Total Tagihan PO:</span>
                    <span className="text-ts-primary dark:text-brand-400">
                      {formatRupiah(formData.quantity * formData.unit_cost)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-ts-ink dark:text-white">Catatan Pengadaan</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    placeholder="Alasan restock atau catatan pengiriman"
                  />
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
                    {submitting ? "Mengajukan..." : "Kirim Pengajuan PO"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Penerimaan Barang Fisik */}
        {receiveModalOpen && selectedPo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-ts-subtle bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-surface-container animate-fade-up">
              <h3 className="font-jakarta text-lg font-extrabold text-ts-ink dark:text-white">
                Penerimaan Fisik Barang dari Supplier
              </h3>
              <p className="mt-1 text-xs text-ts-muted dark:text-slate-400">
                PO: <span className="font-mono font-bold">{selectedPo.po_number}</span> &bull; {selectedPo.product?.name} ({selectedPo.quantity} unit)
              </p>

              {msg && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} /> {msg}
                </div>
              )}

              <form onSubmit={handleConfirmReceive} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="mb-1 block font-bold text-ts-ink dark:text-white">
                    Nomor Seri Fisik (Serial Numbers)
                  </label>
                  <textarea
                    rows={4}
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                    className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 font-mono outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    placeholder={"Masukkan 1 nomor seri per baris, contoh:\nUS23091001\nUS23091002\nUS23091003"}
                  />
                  <span className="text-[10px] text-ts-muted">
                    Opsional. Jika tidak diisi, sistem akan mencatat otomatis dengan referensi BATCH-{selectedPo.po_number}.
                  </span>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-ts-ink dark:text-white">Kondisi & Catatan QC</label>
                  <input
                    type="text"
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                    className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                  />
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                  <p className="font-bold">Konfirmasi Penambahan Stok:</p>
                  <p className="mt-0.5">
                    Stok sebanyak <strong>{selectedPo.quantity} unit</strong> akan otomatis ditambahkan ke katalog dan dicatat di kartu mutasi inventaris.
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReceiveModalOpen(false)}
                    className="rounded-xl border border-ts-subtle bg-white px-4 py-2 font-bold text-ts-muted transition hover:bg-ts-low dark:border-white/10 dark:bg-surface-high"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    {submitting ? "Memproses..." : "Konfirmasi Terima & Update Stok"}
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

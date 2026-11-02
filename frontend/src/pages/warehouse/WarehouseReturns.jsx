import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  PackageCheck,
  CheckCircle2,
  Search,
  RefreshCw,
  Truck,
  Barcode,
  ShieldCheck,
} from "lucide-react";
import api from "../../api";
import { formatDate, errorMessage } from "../../utils/format";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

export default function WarehouseReturns() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("approved");

  const [selectedItem, setSelectedItem] = useState(null);
  const [serialNumber, setSerialNumber] = useState("");
  const [receivedNote, setReceivedNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function fetchQueue() {
    setLoading(true);
    api
      .get("/returns/warehouse/queue")
      .then((res) => setItems(res.data?.data || []))
      .catch((err) => {
        console.error(err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchQueue();
  }, []);

  function handleOpenReceive(item) {
    setSelectedItem(item);
    setSerialNumber("");
    setReceivedNote(
      "Unit fisik cinema gear telah sampai di gudang pusat, lolos uji QC sensor, dan stok otomatis dipulihkan."
    );
  }

  async function handleConfirmReceive(e) {
    e.preventDefault();
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/returns/${selectedItem.id}/receive`, {
        serial_number: serialNumber.trim() || undefined,
        received_note: receivedNote.trim(),
      });
      toast.success(
        res.data?.message ||
          "Barang retur berhasil diterima & stok unit dipulihkan!"
      );
      setSelectedItem(null);
      fetchQueue();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal menerima fisik retur"));
    } finally {
      setSubmitting(false);
    }
  }

  const filteredItems = items.filter((it) => {
    const matchTab =
      filterTab === "all" ||
      (filterTab === "approved" && it.status === "approved") ||
      (filterTab === "received" && it.status !== "approved");
    const q = search.toLowerCase();
    const matchSearch =
      it.return_number?.toLowerCase().includes(q) ||
      it.invoice_code?.toLowerCase().includes(q) ||
      it.product_name?.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="accent">Divisi Warehouse &amp; Logistik</Badge>
            <Badge variant="neutral">RMA Physical Inspection</Badge>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
            Penerimaan Fisik Retur &amp; Restock Gudang
          </h1>
          <p className="mt-1 max-w-3xl text-xs text-ink-secondary sm:text-sm">
            Terima fisik kiriman unit dari pelanggan yang klaimnya telah disetujui
            Toko. Memulihkan kuantitas stok varian cinema gear secara otomatis dan
            meneruskan berkas ke Finance untuk pencairan refund.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchQueue}>
          <RefreshCw
            size={13}
            className={loading ? "animate-spin" : ""}
            aria-hidden="true"
          />
          Refresh Data
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "approved", label: "Menunggu Kedatangan Fisik" },
            { id: "received", label: "Telah Diterima Gudang" },
            { id: "all", label: "Semua Unit" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`rounded-sm px-3.5 py-2 text-xs font-semibold transition-colors ${
                filterTab === tab.id
                  ? "bg-ink text-canvas"
                  : "border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            size={14}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari RMA, invoice, cinema gear..."
            aria-label="Cari RMA, invoice, atau cinema gear"
            className="w-full rounded-sm border border-line bg-surface py-2 pl-9 pr-3 text-xs text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
        </div>
      </div>

      {/* Queue Table */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-ink border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-ink-muted">
            Memeriksa antrean penerimaan gudang...
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-md border border-dashed border-line-strong bg-surface p-12 text-center">
          <CheckCircle2
            size={32}
            className="mx-auto text-status-success"
            aria-hidden="true"
          />
          <h3 className="mt-3 font-display text-base font-bold text-ink">
            Tidak Ada Kiriman Fisik yang Menunggu
          </h3>
          <p className="mt-1 text-xs text-ink-secondary">
            Semua paket retur telah diinspeksi dan diterima di rak stok gudang.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-5 py-3.5">Nomor RMA &amp; Tanggal</th>
                  <th className="px-5 py-3.5">Invoice &amp; Pelanggan</th>
                  <th className="px-5 py-3.5">Unit Cinema Gear</th>
                  <th className="px-5 py-3.5">Persetujuan Toko</th>
                  <th className="px-5 py-3.5">Status Fisik Gudang</th>
                  <th className="px-5 py-3.5 text-right">Aksi Gudang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-medium tabular-nums">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-muted/50">
                    <td className="px-5 py-4">
                      <div className="inline-block rounded-xs border border-line bg-surface-muted px-2 py-0.5 font-mono font-bold text-ink">
                        {item.return_number}
                      </div>
                      <div className="mt-1 text-[11px] text-ink-muted">
                        {formatDate(item.created_at)}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-mono font-bold text-ink">
                        {item.invoice_code}
                      </div>
                      <div className="text-ink-secondary">
                        {item.customer_name || "Pelanggan Overtone"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-ink">{item.product_name}</div>
                      {item.variant_name && (
                        <div className="text-[11px] text-ink-secondary">
                          {item.variant_name}
                        </div>
                      )}
                    </td>

                    <td className="max-w-xs px-5 py-4">
                      <div className="rounded-sm border border-line bg-surface-muted p-2 text-[11px] text-ink-secondary">
                        <p>
                          <strong className="text-ink">Reviewer:</strong>{" "}
                          {item.reviewer_name || "Store Staff"}
                        </p>
                        <p className="mt-0.5 line-clamp-2">{item.review_note}</p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {item.status === "approved" ? (
                        <Badge variant="info">
                          <Truck size={11} aria-hidden="true" /> Menunggu Paket
                          Sampai
                        </Badge>
                      ) : (
                        <div>
                          <Badge variant="success">
                            <PackageCheck size={11} aria-hidden="true" /> Fisik
                            Diterima &amp; Restocked
                          </Badge>
                          <div className="mt-0.5 text-[11px] text-ink-muted">
                            Oleh {item.receiver_name || "Warehouse"} (
                            {formatDate(item.received_at)})
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {item.status === "approved" ? (
                        <Button
                          type="button"
                          variant="primary"
                          size="xs"
                          onClick={() => handleOpenReceive(item)}
                        >
                          <PackageCheck size={13} aria-hidden="true" /> Terima
                          &amp; Restock
                        </Button>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-[11px] font-bold text-status-success">
                          <CheckCircle2 size={12} aria-hidden="true" /> Siap
                          Dicairkan Finance
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL RECEIVE */}
      <Modal
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title="Penerimaan Unit Fisik Retur"
        size="md"
      >
        {selectedItem && (
          <form onSubmit={handleConfirmReceive} className="space-y-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="rounded-xs border border-line bg-surface-muted px-2 py-0.5 font-mono text-xs font-bold text-ink">
                {selectedItem.return_number}
              </span>
              <span className="font-mono text-xs text-ink-secondary">
                Invoice: {selectedItem.invoice_code}
              </span>
            </div>

            <div>
              <h3 className="font-display text-base font-bold text-ink">
                {selectedItem.product_name}
              </h3>
              <p className="text-xs text-ink-secondary">
                Varian: {selectedItem.variant_name || "-"}
              </p>
            </div>

            <div className="space-y-1 rounded-sm border border-status-warning/30 bg-status-warning/10 p-3.5 text-xs text-ink">
              <p className="flex items-center gap-1.5 font-bold text-status-warning">
                <ShieldCheck size={14} aria-hidden="true" />
                Stok Inventaris Akan Dipulihkan (+1 Unit)
              </p>
              <p className="text-[11px] text-ink-secondary">
                Konfirmasi ini akan mencatat log mutasi stok gudang{" "}
                <code>return_restock</code> dan mengabari Finance bahwa refund
                siap ditransfer ke pembeli.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink">
                Nomor Seri Fisik Unit (Serial Number)
              </label>
              <div className="relative">
                <Barcode
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Contoh: SN-FND-2026-88192 (opsional)"
                  className="ot-input pl-10 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink">
                Catatan Hasil Inspeksi Gudang *
              </label>
              <textarea
                rows={3}
                value={receivedNote}
                onChange={(e) => setReceivedNote(e.target.value)}
                className="ot-input text-xs"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedItem(null)}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={submitting}>
                Konfirmasi Terima &amp; Restock
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

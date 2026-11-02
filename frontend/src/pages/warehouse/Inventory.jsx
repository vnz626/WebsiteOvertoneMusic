import React, { Fragment, useEffect, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";
import api from "../../api";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { formatRupiah } from "../../utils/format";
import toast from "react-hot-toast";

export default function WarehouseInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedTier, setSelectedTier] = useState("");
  const [qtyChange, setQtyChange] = useState(1);
  const [serialNumber, setSerialNumber] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  function loadInventory() {
    setLoading(true);
    api
      .get("/warehouse/inventory")
      .then((res) => {
        const raw = res?.data?.data;
        setItems(Array.isArray(raw) ? raw : []);
      })
      .catch((err) => {
        console.error(err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const safeItems = Array.isArray(items) ? items : [];
  const categories = [
    "all",
    ...new Set(safeItems.map((i) => i?.category).filter(Boolean)),
  ];

  const filtered = safeItems.filter((it) => {
    if (!it) return false;
    const matchCat =
      selectedCategory === "all" || it.category === selectedCategory;
    const matchQ =
      !search ||
      it.name?.toLowerCase().includes(search.toLowerCase()) ||
      (it.sku_prefix &&
        it.sku_prefix.toLowerCase().includes(search.toLowerCase())) ||
      (it.brand && it.brand.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchQ;
  });

  const lowStockCount = safeItems.filter((i) => i?.is_low_stock).length;
  const totalUnits = safeItems.reduce(
    (acc, cur) => acc + (cur?.total_quota || 0),
    0
  );

  function handleOpenAdjust(prod) {
    setSelectedProduct(prod);
    setSelectedTier(prod.variants?.[0]?.id || "");
    setQtyChange(1);
    setSerialNumber("");
    setAdjustmentNotes("");
    setMsg("");
    setModalOpen(true);
  }

  function handleSaveAdjust(e) {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmitting(true);
    api
      .post("/warehouse/logs", {
        event_id: selectedProduct.id,
        tier_id: selectedTier || null,
        change_type: "stock_adjustment",
        quantity_change: parseInt(qtyChange),
        serial_number: serialNumber || null,
        notes: adjustmentNotes || "Penyesuaian stok opname gudang",
      })
      .then(() => {
        setMsg("Stok dan serial number berhasil diperbarui!");
        setTimeout(() => {
          setModalOpen(false);
          loadInventory();
        }, 800);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Gagal memperbarui stok");
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="accent">Warehouse Control</Badge>
            <Badge variant="neutral">Physical Stock &amp; Serial Ledger</Badge>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Stok &amp; Serial Number Fisik
          </h1>
          <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
            Monitoring persediaan fisik cinema cameras, lenses &amp; broadcast gear, varian SKU, dan kartu stok
            gudang pusat Overtone.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadInventory}>
          <RefreshCw
            size={14}
            className={loading ? "animate-spin" : ""}
            aria-hidden="true"
          />
          Refresh Data
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 tabular-nums">
        <div className="rounded-md border border-line bg-surface p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Total Model Katalog
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {items.length}{" "}
            <span className="text-xs font-normal text-ink-secondary">produk</span>
          </p>
        </div>
        <div className="rounded-md border border-line bg-surface p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Total Unit Stok Fisik
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-accent">
            {totalUnits}{" "}
            <span className="text-xs font-normal text-ink-secondary">
              unit gear
            </span>
          </p>
        </div>
        <div className="rounded-md border border-line bg-surface p-5">
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-status-warning">
            <AlertTriangle size={14} aria-hidden="true" /> Stok Menipis (Restock
            Alert)
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-status-warning">
            {lowStockCount}{" "}
            <span className="text-xs font-normal text-ink-secondary">
              item ≤ 3 unit
            </span>
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Cari nama produk, SKU prefix, atau brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari nama produk, SKU prefix, atau brand"
            className="w-full rounded-sm border border-line bg-surface py-2 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-bold text-ink-muted">Kategori:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedCategory === cat
                  ? "bg-ink text-canvas"
                  : "border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink"
              }`}
            >
              {cat === "all" ? "Semua Kategori" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3.5">Cinema Gear &amp; SKU Prefix</th>
                <th className="px-4 py-3.5">Brand / Kategori</th>
                <th className="px-4 py-3.5 text-center">Stok Fisik</th>
                <th className="px-4 py-3.5 text-center">Terjual</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-medium tabular-nums">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted">
                    Memuat data inventaris...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted">
                    Tidak ada produk cinema gear yang cocok.
                  </td>
                </tr>
              ) : (
                filtered.map((prod) => {
                  const isExpanded = expandedId === prod.id;
                  const hasVariants = prod.variants && prod.variants.length > 0;
                  return (
                    <Fragment key={prod.id}>
                      <tr className="hover:bg-surface-muted/50">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            {hasVariants && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedId(isExpanded ? null : prod.id)
                                }
                                aria-label="Tampilkan rincian varian SKU"
                                className="text-ink-muted transition-colors hover:text-ink"
                              >
                                {isExpanded ? (
                                  <ChevronDown size={16} aria-hidden="true" />
                                ) : (
                                  <ChevronRight size={16} aria-hidden="true" />
                                )}
                              </button>
                            )}
                            <div>
                              <p className="font-bold text-ink">{prod.name}</p>
                              <span className="font-mono text-[11px] text-ink-muted">
                                {prod.sku_prefix || `PROD-${prod.id}`}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-ink">
                            {prod.brand || "Overtone"}
                          </p>
                          <span className="text-[11px] text-ink-secondary">
                            {prod.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center text-sm font-bold">
                          <span
                            className={
                              prod.is_low_stock
                                ? "font-bold text-status-warning"
                                : "text-ink"
                            }
                          >
                            {prod.total_quota} unit
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center text-ink-secondary">
                          {prod.total_sold} unit
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {prod.total_quota <= 0 ? (
                            <Badge variant="danger">Habis (0)</Badge>
                          ) : prod.is_low_stock ? (
                            <Badge variant="warning">Low Stock (≤3)</Badge>
                          ) : (
                            <Badge variant="success">Tersedia</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            size="xs"
                            onClick={() => handleOpenAdjust(prod)}
                          >
                            Sesuaikan Stok / SN
                          </Button>
                        </td>
                      </tr>

                      {/* Dropdown Varian SKU */}
                      {isExpanded && hasVariants && (
                        <tr className="bg-surface-muted/40">
                          <td colSpan={6} className="px-8 py-3">
                            <div className="rounded-sm border border-line bg-surface p-3">
                              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                                Rincian Varian SKU &amp; Warna (
                                {prod.variants.length} SKU)
                              </p>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {prod.variants.map((v) => (
                                  <div
                                    key={v.id}
                                    className="flex items-center justify-between rounded-xs border border-line bg-canvas p-2.5 text-xs"
                                  >
                                    <div>
                                      <p className="font-bold text-ink">
                                        {v.tier_name}
                                      </p>
                                      <p className="font-mono text-[10px] text-ink-muted">
                                        {v.sku_code}
                                      </p>
                                      <p className="text-[10px] font-bold text-status-success">
                                        HPP: {formatRupiah(v.cost_price || 0)}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <span
                                        className={`font-bold ${
                                          v.is_low_stock
                                            ? "text-status-warning"
                                            : "text-ink"
                                        }`}
                                      >
                                        {v.quota} unit
                                      </span>
                                      <p className="text-[10px] text-ink-secondary">
                                        {formatRupiah(v.price)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Penyesuaian Stok / Serial Number */}
      <Modal
        open={modalOpen && Boolean(selectedProduct)}
        onClose={() => setModalOpen(false)}
        title="Penyesuaian Stok & Serial Number"
        size="md"
      >
        {selectedProduct && (
          <form onSubmit={handleSaveAdjust} className="space-y-4 text-xs">
            <p className="text-xs font-semibold text-ink-secondary">
              {selectedProduct.name}
            </p>

            {msg && (
              <div className="flex items-center gap-2 rounded-sm border border-status-success/30 bg-status-success/10 p-3 text-xs font-bold text-status-success">
                <CheckCircle2 size={16} aria-hidden="true" /> {msg}
              </div>
            )}

            {selectedProduct.variants &&
              selectedProduct.variants.length > 0 && (
                <div>
                  <label className="mb-1 block font-bold text-ink">
                    Varian SKU
                  </label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value)}
                    className="ot-input text-xs"
                  >
                    {selectedProduct.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.tier_name} ({v.sku_code}) - Stok: {v.quota}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            <div>
              <label className="mb-1 block font-bold text-ink">
                Perubahan Jumlah (+/- Unit)
              </label>
              <input
                type="number"
                value={qtyChange}
                onChange={(e) => setQtyChange(e.target.value)}
                required
                className="ot-input text-xs tabular-nums"
                placeholder="Contoh: 5 untuk menambah, -2 untuk koreksi"
              />
              <span className="mt-1 block text-[10px] text-ink-muted">
                Nilai positif menambah stok, negatif mengurangi.
              </span>
            </div>

            <div>
              <label className="mb-1 block font-bold text-ink">
                Nomor Seri Fisik (Serial Number)
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="ot-input font-mono text-xs"
                placeholder="Misal: US23091482 atau FEN2026-X8"
              />
              <span className="mt-1 block text-[10px] text-ink-muted">
                Opsional untuk identifikasi kartu garansi fisik.
              </span>
            </div>

            <div>
              <label className="mb-1 block font-bold text-ink">
                Catatan Mutasi
              </label>
              <input
                type="text"
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                className="ot-input text-xs"
                placeholder="Alasan opname atau nomor batch"
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
                Simpan Mutasi
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

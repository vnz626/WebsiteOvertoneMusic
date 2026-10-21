import React, { Fragment, useEffect, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Filter,
  History,
  Layers,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import Badge from "../../components/ui/Badge";
import { formatRupiah } from "../../utils/format";

export default function WarehouseInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  // Modal Adjustment
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
  const categories = ["all", ...new Set(safeItems.map((i) => i?.category).filter(Boolean))];

  const filtered = safeItems.filter((it) => {
    if (!it) return false;
    const matchCat = selectedCategory === "all" || it.category === selectedCategory;
    const matchQ =
      !search ||
      it.name?.toLowerCase().includes(search.toLowerCase()) ||
      (it.sku_prefix && it.sku_prefix.toLowerCase().includes(search.toLowerCase())) ||
      (it.brand && it.brand.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchQ;
  });

  const lowStockCount = safeItems.filter((i) => i?.is_low_stock).length;
  const totalUnits = safeItems.reduce((acc, cur) => acc + (cur?.total_quota || 0), 0);

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
        alert(err.response?.data?.message || "Gagal memperbarui stok");
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
                  <Boxes size={20} />
                </span>
                <h1 className="font-jakarta text-2xl font-extrabold text-ts-ink dark:text-white">
                  Stok & Serial Number Fisik
                </h1>
              </div>
              <p className="mt-1 text-sm text-ts-muted dark:text-slate-400">
                Monitoring persediaan fisik instrumen musik, varian SKU, dan kartu stok gudang Swee Lee.
              </p>
            </div>
            <button
              onClick={loadInventory}
              className="inline-flex items-center gap-2 rounded-xl border border-ts-subtle bg-white px-4 py-2 text-xs font-bold text-ts-ink shadow-sm transition hover:bg-ts-low dark:border-white/10 dark:bg-surface-container dark:text-white"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Data
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-ts-subtle bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-container">
              <span className="text-xs font-bold uppercase tracking-wider text-ts-muted">Total Model Katalog</span>
              <p className="mt-2 font-jakarta text-3xl font-extrabold text-ts-ink dark:text-white">
                {items.length} <span className="text-sm font-normal text-ts-muted">produk</span>
              </p>
            </div>
            <div className="rounded-2xl border border-ts-subtle bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-container">
              <span className="text-xs font-bold uppercase tracking-wider text-ts-muted">Total Unit Stok Fisik</span>
              <p className="mt-2 font-jakarta text-3xl font-extrabold text-ts-primary dark:text-brand-400">
                {totalUnits} <span className="text-sm font-normal text-ts-muted">unit instrumen</span>
              </p>
            </div>
            <div className="rounded-2xl border border-ts-subtle bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-container">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle size={14} /> Stok Menipis (Restock Alert)
              </span>
              <p className="mt-2 font-jakarta text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                {lowStockCount} <span className="text-sm font-normal text-ts-muted">item &le; 3 unit</span>
              </p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-md">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ts-muted" />
              <input
                type="text"
                placeholder="Cari nama produk, SKU prefix, atau brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-ts-subtle bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-ts-ink outline-none transition focus:border-ts-primary dark:border-white/10 dark:bg-surface-container dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-ts-muted">Kategori:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-ts-primary text-white shadow-sm dark:bg-brand-500"
                      : "bg-white text-ts-muted border border-ts-subtle hover:bg-ts-low dark:bg-surface-container dark:border-white/10 dark:text-slate-300"
                  }`}
                >
                  {cat === "all" ? "Semua Kategori" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-ts-subtle bg-white shadow-sm dark:border-white/10 dark:bg-surface-container">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ts-subtle bg-ts-low/60 font-bold uppercase tracking-wider text-ts-muted dark:border-white/10 dark:bg-surface-high">
                <tr>
                  <th className="py-3.5 px-4">Instrumen & SKU Prefix</th>
                  <th className="py-3.5 px-4">Brand / Kategori</th>
                  <th className="py-3.5 px-4 text-center">Stok Fisik</th>
                  <th className="py-3.5 px-4 text-center">Terjual</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ts-subtle dark:divide-white/5 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ts-muted">
                      Memuat data inventaris...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ts-muted">
                      Tidak ada produk instrumen yang cocok.
                    </td>
                  </tr>
                ) : (
                  filtered.map((prod) => {
                    const isExpanded = expandedId === prod.id;
                    const hasVariants = prod.variants && prod.variants.length > 0;
                    return (
                      <Fragment key={prod.id}>
                        <tr className="hover:bg-ts-low/30 transition dark:hover:bg-white/5">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {hasVariants && (
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : prod.id)}
                                  className="text-ts-muted hover:text-ts-primary transition"
                                >
                                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                              )}
                              <div>
                                <p className="font-bold text-ts-ink dark:text-white">{prod.name}</p>
                                <span className="font-mono text-[11px] text-ts-muted">
                                  {prod.sku_prefix || `PROD-${prod.id}`}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-ts-ink dark:text-white">{prod.brand || "Swee Lee"}</p>
                            <span className="text-[11px] text-ts-muted">{prod.category}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-sm">
                            <span className={prod.is_low_stock ? "text-amber-600 font-extrabold" : "text-ts-ink dark:text-white"}>
                              {prod.total_quota} unit
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-ts-muted">{prod.total_sold} unit</td>
                          <td className="py-3.5 px-4 text-center">
                            {prod.total_quota <= 0 ? (
                              <Badge variant="rose">Habis (0)</Badge>
                            ) : prod.is_low_stock ? (
                              <Badge variant="amber">Low Stock (&le;3)</Badge>
                            ) : (
                              <Badge variant="teal">Tersedia</Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenAdjust(prod)}
                              className="rounded-lg border border-ts-subtle bg-white px-2.5 py-1.5 text-xs font-bold text-ts-ink transition hover:border-ts-primary hover:text-ts-primary dark:border-white/10 dark:bg-surface-high dark:text-white"
                            >
                              Sesuaikan Stok / SN
                            </button>
                          </td>
                        </tr>

                        {/* Dropdown Varian SKU */}
                        {isExpanded && hasVariants && (
                          <tr className="bg-ts-low/40 dark:bg-surface-high/30">
                            <td colSpan={6} className="py-3 px-8">
                              <div className="rounded-xl border border-ts-subtle/80 bg-white p-3 dark:border-white/10 dark:bg-surface-container">
                                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-ts-muted">
                                  Rincian Varian SKU & Warna ({prod.variants.length} SKU)
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {prod.variants.map((v) => (
                                    <div
                                      key={v.id}
                                      className="flex items-center justify-between rounded-lg border border-ts-subtle/50 p-2 text-xs dark:border-white/5"
                                    >
                                      <div>
                                        <p className="font-bold text-ts-ink dark:text-white">{v.tier_name}</p>
                                        <p className="font-mono text-[10px] text-ts-muted">{v.sku_code}</p>
                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                          HPP: {formatRupiah(v.cost_price || 0)}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <span className={`font-bold ${v.is_low_stock ? "text-amber-600" : "text-ts-ink dark:text-white"}`}>
                                          {v.quota} unit
                                        </span>
                                        <p className="text-[10px] text-ts-muted">{formatRupiah(v.price)}</p>
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
        {modalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-ts-subtle bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-surface-container animate-fade-up">
              <h3 className="font-jakarta text-lg font-extrabold text-ts-ink dark:text-white">
                Penyesuaian Stok & Serial Number
              </h3>
              <p className="mt-1 text-xs text-ts-muted dark:text-slate-400">{selectedProduct.name}</p>

              {msg && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} /> {msg}
                </div>
              )}

              <form onSubmit={handleSaveAdjust} className="mt-4 space-y-3.5 text-xs">
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Varian SKU</label>
                    <select
                      value={selectedTier}
                      onChange={(e) => setSelectedTier(e.target.value)}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
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
                  <label className="mb-1 block font-bold text-ts-ink dark:text-white">
                    Perubahan Jumlah (+/- Unit)
                  </label>
                  <input
                    type="number"
                    value={qtyChange}
                    onChange={(e) => setQtyChange(e.target.value)}
                    required
                    className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    placeholder="Contoh: 5 untuk menambah, -2 untuk koreksi"
                  />
                  <span className="text-[10px] text-ts-muted">Nilai positif menambah stok, negatif mengurangi.</span>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-ts-ink dark:text-white">
                    Nomor Seri Fisik (Serial Number)
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white font-mono"
                    placeholder="Misal: US23091482 atau FEN2026-X8"
                  />
                  <span className="text-[10px] text-ts-muted">Opsional untuk identifikasi kartu garansi fisik.</span>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-ts-ink dark:text-white">Catatan Mutasi</label>
                  <input
                    type="text"
                    value={adjustmentNotes}
                    onChange={(e) => setAdjustmentNotes(e.target.value)}
                    className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    placeholder="Alasan opname atau nomor batch"
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
                    {submitting ? "Menyimpan..." : "Simpan Mutasi"}
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

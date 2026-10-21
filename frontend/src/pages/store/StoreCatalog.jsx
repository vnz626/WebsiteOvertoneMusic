import React, { Fragment, useEffect, useState } from "react";
import {
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit,
  Guitar,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import Badge from "../../components/ui/Badge";
import { formatRupiah } from "../../utils/format";

export default function StoreCatalog() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState({ brands: [], venues: [], categories: [] });
  const [expandedId, setExpandedId] = useState(null);

  // Add Product Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "Electric Guitars",
    instrument_type: "Solid Body Electric Guitar",
    sku_prefix: "",
    brand_id: "",
    venue_id: "",
    price: 15000000,
    quota: 10,
    warranty_months: 12,
    specifications: "",
    description: "",
    image_url: "",
  });

  // Add Variant Modal
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [targetProduct, setTargetProduct] = useState(null);
  const [variantForm, setVariantForm] = useState({
    tier_name: "",
    sku_code: "",
    color_finish: "",
    cost_price: 10000000,
    price: 15000000,
    weight_kg: 3.6,
    quota: 5,
  });

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  function loadData() {
    setLoading(true);
    api
      .get("/promoter/events")
      .then((res) => setItems(res.data.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    api.get("/events/meta").then((res) => {
      setMeta({
        brands: res.data.brands || [],
        venues: res.data.venues || [],
        categories: res.data.categories || [],
      });
    });
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = items.filter((it) => {
    return (
      !search ||
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      (it.sku_prefix && it.sku_prefix.toLowerCase().includes(search.toLowerCase())) ||
      (it.organizer && it.organizer.toLowerCase().includes(search.toLowerCase()))
    );
  });

  function handleCreateProduct(e) {
    e.preventDefault();
    setSubmitting(true);
    const selectedBrand = meta.brands.find((b) => b.id === parseInt(form.brand_id));
    const selectedVenue = meta.venues.find((v) => v.id === parseInt(form.venue_id));

    api
      .post("/promoter/events", {
        name: form.name,
        category: form.category,
        instrument_type: form.instrument_type,
        sku_prefix: form.sku_prefix,
        organizer_id: form.brand_id || null,
        organizer: selectedBrand?.name || "Swee Lee",
        venue_id: form.venue_id || null,
        location: selectedVenue?.name || "Showroom Swee Lee",
        city: selectedVenue?.city || "Jakarta Selatan",
        price: parseInt(form.price),
        quota: parseInt(form.quota),
        warranty_months: parseInt(form.warranty_months),
        specifications: form.specifications,
        description: form.description,
        image_url: form.image_url,
        event_date: new Date().toISOString().slice(0, 10),
      })
      .then(() => {
        setMsg("Produk instrumen berhasil didaftarkan! Menunggu persetujuan Manager.");
        setTimeout(() => {
          setModalOpen(false);
          loadData();
        }, 1000);
      })
      .catch((err) => alert(err.response?.data?.message || "Gagal membuat produk"))
      .finally(() => setSubmitting(false));
  }

  function handleOpenAddVariant(prod) {
    setTargetProduct(prod);
    setVariantForm({
      tier_name: "",
      sku_code: `${prod.sku_prefix || "SKU"}-`,
      color_finish: "",
      cost_price: Math.round(prod.price * 0.65),
      price: prod.price,
      weight_kg: 3.6,
      quota: 5,
    });
    setMsg("");
    setVariantModalOpen(true);
  }

  function handleCreateVariant(e) {
    e.preventDefault();
    if (!targetProduct) return;
    setSubmitting(true);
    api
      .post(`/promoter/events/${targetProduct.id}/tiers`, variantForm)
      .then(() => {
        setMsg("Varian SKU warna berhasil ditambahkan!");
        setTimeout(() => {
          setVariantModalOpen(false);
          loadData();
        }, 800);
      })
      .catch((err) => alert(err.response?.data?.message || "Gagal menambah varian"))
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
                  <Tag size={20} />
                </span>
                <h1 className="font-jakarta text-2xl font-extrabold text-ts-ink dark:text-white">
                  Katalog & Varian SKU Instrumen Musik
                </h1>
              </div>
              <p className="mt-1 text-sm text-ts-muted dark:text-slate-400">
                Input master produk instrumen, spesifikasi kayu & pickup, garansi resmi, serta kelola varian warna/SKU.
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
                <Plus size={16} /> Tambah Instrumen Musik
              </button>
              <button
                onClick={loadData}
                className="rounded-xl border border-ts-subtle bg-white p-2.5 text-ts-muted shadow-sm hover:text-ts-primary dark:border-white/10 dark:bg-surface-container"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6 max-w-md">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ts-muted" />
              <input
                type="text"
                placeholder="Cari model instrumen, SKU, atau brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-ts-subtle bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-ts-ink outline-none transition focus:border-ts-primary dark:border-white/10 dark:bg-surface-container dark:text-white"
              />
            </div>
          </div>

          {/* Table */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-ts-subtle bg-white shadow-sm dark:border-white/10 dark:bg-surface-container">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ts-subtle bg-ts-low/60 font-bold uppercase tracking-wider text-ts-muted dark:border-white/10 dark:bg-surface-high">
                <tr>
                  <th className="py-3.5 px-4">Instrumen & SKU</th>
                  <th className="py-3.5 px-4">Brand & Showroom</th>
                  <th className="py-3.5 px-4">Harga Retail (HPP)</th>
                  <th className="py-3.5 px-4 text-center">Stok & Varian</th>
                  <th className="py-3.5 px-4 text-center">Status Tayang</th>
                  <th className="py-3.5 px-4 text-right">Kelola Varian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ts-subtle dark:divide-white/5 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ts-muted">
                      Memuat katalog produk...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ts-muted">
                      Belum ada katalog instrumen.
                    </td>
                  </tr>
                ) : (
                  filtered.map((prod) => {
                    const isExpanded = expandedId === prod.id;
                    const tierCount = prod.tiers?.length || 0;
                    return (
                      <Fragment key={prod.id}>
                        <tr className="hover:bg-ts-low/30 transition dark:hover:bg-white/5">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {prod.image_url ? (
                                <img
                                  src={prod.image_url}
                                  alt={prod.name}
                                  className="h-10 w-10 rounded-lg object-cover border border-ts-subtle dark:border-white/10"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ts-low text-ts-muted dark:bg-surface-high">
                                  <Guitar size={18} />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-ts-ink dark:text-white">{prod.name}</p>
                                <span className="font-mono text-[11px] text-ts-muted">
                                  {prod.sku_prefix || `PROD-${prod.id}`} &bull; Garansi: {prod.warranty_months || 12} bln
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-ts-ink dark:text-white">{prod.organizer || "Brand"}</p>
                            <span className="text-[11px] text-ts-muted flex items-center gap-1">
                              <MapPin size={11} /> {prod.location || "Showroom"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-ts-ink dark:text-white">{formatRupiah(prod.price)}</p>
                            <span className="text-[10px] text-ts-muted">{prod.category}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : prod.id)}
                              className="inline-flex items-center gap-1 rounded-full bg-ts-low px-2.5 py-1 text-xs font-bold text-ts-ink hover:bg-ts-primary/10 hover:text-ts-primary transition dark:bg-surface-high dark:text-white"
                            >
                              {tierCount} SKU Varian {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <p className="text-[10px] text-ts-muted mt-0.5">Total Stok: {prod.quota} unit</p>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {prod.approval_status === "published" || prod.status === "approved" || prod.status === "published" ? (
                              <Badge variant="teal">Tayang Publik</Badge>
                            ) : prod.approval_status === "rejected" ? (
                              <Badge variant="rose">Ditolak Manager</Badge>
                            ) : (
                              <Badge variant="amber">Review Manager</Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenAddVariant(prod)}
                              className="inline-flex items-center gap-1 rounded-lg border border-ts-primary/30 bg-ts-primary/10 px-2.5 py-1.5 text-xs font-bold text-ts-primary hover:bg-ts-primary/20 transition dark:text-brand-400"
                            >
                              <Plus size={13} /> Tambah Varian
                            </button>
                          </td>
                        </tr>

                        {/* Rincian Varian Dropdown */}
                        {isExpanded && (
                          <tr className="bg-ts-low/40 dark:bg-surface-high/30">
                            <td colSpan={6} className="py-3 px-8">
                              <div className="rounded-xl border border-ts-subtle/80 bg-white p-3 dark:border-white/10 dark:bg-surface-container">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-ts-muted">
                                    Daftar Varian Warna & SKU ({tierCount} varian)
                                  </p>
                                  <button
                                    onClick={() => handleOpenAddVariant(prod)}
                                    className="text-xs font-bold text-ts-primary hover:underline flex items-center gap-1"
                                  >
                                    <Plus size={12} /> Tambah Varian Baru
                                  </button>
                                </div>
                                {tierCount === 0 ? (
                                  <p className="text-xs text-ts-muted py-2">Belum ada varian warna terdaftar.</p>
                                ) : (
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {prod.tiers.map((t) => (
                                      <div
                                        key={t.id}
                                        className="rounded-lg border border-ts-subtle/50 p-2.5 text-xs dark:border-white/5 bg-ts-canvas/50 dark:bg-surface/50"
                                      >
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <p className="font-bold text-ts-ink dark:text-white">{t.tier_name}</p>
                                            <p className="font-mono text-[10px] text-ts-muted">{t.sku_code}</p>
                                            {t.color_finish && (
                                              <span className="text-[10px] text-ts-muted">Warna: {t.color_finish}</span>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <span className="font-bold text-ts-primary dark:text-brand-400">
                                              {formatRupiah(t.price)}
                                            </span>
                                            <p className="text-[10px] text-emerald-600 font-bold">
                                              HPP: {formatRupiah(t.cost_price || Math.round(t.price * 0.65))}
                                            </p>
                                            <p className="text-[10px] text-ts-muted font-bold mt-0.5">
                                              Stok: {t.quota} unit ({t.weight_kg || 3.5} kg)
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
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

        {/* Modal Tambah Instrumen Musik */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-ts-subtle bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-surface-container animate-fade-up">
              <h3 className="font-jakarta text-lg font-extrabold text-ts-ink dark:text-white">
                Daftarkan Master Katalog Instrumen Musik
              </h3>
              <p className="mt-1 text-xs text-ts-muted dark:text-slate-400">
                Input spesifikasi instrumen musik baru. Katalog akan dikirim ke Retail Manager untuk persetujuan publish.
              </p>

              {msg && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} /> {msg}
                </div>
              )}

              <form onSubmit={handleCreateProduct} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="mb-1 block font-bold text-ts-ink dark:text-white">Nama Model Instrumen</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    placeholder="Contoh: Fender Player Stratocaster Plus Top"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Brand / Supplier</label>
                    <select
                      value={form.brand_id}
                      onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                      required
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    >
                      <option value="">Pilih Brand...</option>
                      {meta.brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.brand_country})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Kategori</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    >
                      {meta.categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">SKU Prefix</label>
                    <input
                      type="text"
                      required
                      value={form.sku_prefix}
                      onChange={(e) => setForm({ ...form, sku_prefix: e.target.value })}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 font-mono outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                      placeholder="FEN-STRAT"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Tipe Instrumen</label>
                    <input
                      type="text"
                      value={form.instrument_type}
                      onChange={(e) => setForm({ ...form, instrument_type: e.target.value })}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                      placeholder="Solid Body Guitar"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Garansi (Bulan)</label>
                    <input
                      type="number"
                      value={form.warranty_months}
                      onChange={(e) => setForm({ ...form, warranty_months: e.target.value })}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Harga Retail Standar (Rp)</label>
                    <input
                      type="number"
                      required
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Cabang Showroom Display</label>
                    <select
                      value={form.venue_id}
                      onChange={(e) => setForm({ ...form, venue_id: e.target.value })}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    >
                      <option value="">Pilih Showroom...</option>
                      {meta.venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-ts-ink dark:text-white">URL Foto Produk</label>
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-ts-ink dark:text-white">Spesifikasi Detail Kayu & Elektronik</label>
                  <textarea
                    rows={3}
                    value={form.specifications}
                    onChange={(e) => setForm({ ...form, specifications: e.target.value })}
                    className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    placeholder="Body: Alder, Neck: Maple Modern C, Pickups: Alnico V Single-Coils..."
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-ts-ink dark:text-white">Deskripsi Produk</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
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
                    {submitting ? "Mendaftarkan..." : "Ajukan Katalog ke Manager"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Tambah Varian SKU */}
        {variantModalOpen && targetProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-ts-subtle bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-surface-container animate-fade-up">
              <h3 className="font-jakarta text-lg font-extrabold text-ts-ink dark:text-white">
                Tambah Varian Warna & SKU
              </h3>
              <p className="mt-1 text-xs text-ts-muted dark:text-slate-400">{targetProduct.name}</p>

              {msg && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} /> {msg}
                </div>
              )}

              <form onSubmit={handleCreateVariant} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="mb-1 block font-bold text-ts-ink dark:text-white">Nama Varian</label>
                  <input
                    type="text"
                    required
                    value={variantForm.tier_name}
                    onChange={(e) => setVariantForm({ ...variantForm, tier_name: e.target.value })}
                    className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    placeholder="Contoh: 3-Color Sunburst / Maple Fretboard"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">SKU Code</label>
                    <input
                      type="text"
                      required
                      value={variantForm.sku_code}
                      onChange={(e) => setVariantForm({ ...variantForm, sku_code: e.target.value })}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 font-mono outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                      placeholder="FEN-ST-3TS"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Warna / Finish</label>
                    <input
                      type="text"
                      value={variantForm.color_finish}
                      onChange={(e) => setVariantForm({ ...variantForm, color_finish: e.target.value })}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                      placeholder="3-Tone Sunburst"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Harga Jual Retail (Rp)</label>
                    <input
                      type="number"
                      required
                      value={variantForm.price}
                      onChange={(e) => setVariantForm({ ...variantForm, price: parseInt(e.target.value || 0) })}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">HPP Pengadaan (Rp)</label>
                    <input
                      type="number"
                      value={variantForm.cost_price}
                      onChange={(e) => setVariantForm({ ...variantForm, cost_price: parseInt(e.target.value || 0) })}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Berat Fisik (Kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={variantForm.weight_kg}
                      onChange={(e) => setVariantForm({ ...variantForm, weight_kg: parseFloat(e.target.value || 3.5) })}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Stok Awal (Unit)</label>
                    <input
                      type="number"
                      value={variantForm.quota}
                      onChange={(e) => setVariantForm({ ...variantForm, quota: parseInt(e.target.value || 0) })}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setVariantModalOpen(false)}
                    className="rounded-xl border border-ts-subtle bg-white px-4 py-2 font-bold text-ts-muted transition hover:bg-ts-low dark:border-white/10 dark:bg-surface-high"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-ts-primary px-5 py-2 font-bold text-white shadow-md shadow-ts-primary/25 transition hover:bg-ts-container disabled:opacity-50 dark:bg-brand-500"
                  >
                    {submitting ? "Menyimpan..." : "Simpan Varian"}
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

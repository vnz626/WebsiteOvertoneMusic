import React, { Fragment, useEffect, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Tag,
} from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { formatRupiah } from "../../utils/format";
import toast from "react-hot-toast";

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
    category: "Cinema & Broadcast Cameras",
    instrument_type: "Cinema Camera Body",
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
        organizer: selectedBrand?.name || "Overtone",
        venue_id: form.venue_id || null,
        location: selectedVenue?.name || "Showroom Overtone",
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
      .catch((err) => toast.error(err.response?.data?.message || "Gagal membuat produk"))
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
      .catch((err) => toast.error(err.response?.data?.message || "Gagal menambah varian"))
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-canvas text-ink font-sans">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-line pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-ink text-canvas">
                  <Tag size={18} aria-hidden="true" />
                </span>
                <h1 className="font-display text-2xl font-bold text-ink tracking-tight">
                  Katalog &amp; Varian SKU Cinema &amp; Broadcast Gear
                </h1>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-ink-secondary">
                Input master produk cinema, spesifikasi sensor &amp; mount, garansi resmi, serta kelola varian bundle/SKU.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setMsg("");
                  setModalOpen(true);
                }}
              >
                <Plus size={15} aria-hidden="true" />
                <span>Tambah Cinema Gear</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={loadData}
                aria-label="Segarkan data katalog"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="max-w-md">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                type="text"
                placeholder="Cari model instrumen, SKU, atau brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ot-input w-full py-2.5 pl-10 pr-4 text-xs font-medium"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-md border border-line bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-surface-muted font-bold uppercase tracking-wider text-ink-muted text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Instrumen &amp; SKU</th>
                    <th className="py-3.5 px-4">Brand &amp; Showroom</th>
                    <th className="py-3.5 px-4">Harga Retail (HPP)</th>
                    <th className="py-3.5 px-4 text-center">Stok &amp; Varian</th>
                    <th className="py-3.5 px-4 text-center">Status Tayang</th>
                    <th className="py-3.5 px-4 text-right">Kelola Varian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ink-muted">
                        Memuat katalog produk...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ink-muted">
                        Belum ada katalog instrumen.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((prod) => {
                      const isExpanded = expandedId === prod.id;
                      const tierCount = prod.tiers?.length || 0;
                      return (
                        <Fragment key={prod.id}>
                          <tr className="hover:bg-surface-muted/50 transition-colors tabular-nums">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                {prod.image_url ? (
                                  <img
                                    src={prod.image_url}
                                    alt={prod.name}
                                    className="h-10 w-10 rounded-xs object-cover border border-line"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xs bg-surface-muted text-ink-muted border border-line">
                                    <Camera size={18} aria-hidden="true" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-display font-bold text-ink">{prod.name}</p>
                                  <span className="font-mono text-[11px] text-ink-muted">
                                    {prod.sku_prefix || `PROD-${prod.id}`} &bull; Garansi: {prod.warranty_months || 12} bln
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-ink">{prod.organizer || "Brand"}</p>
                              <span className="text-[11px] text-ink-secondary flex items-center gap-1">
                                <MapPin size={11} aria-hidden="true" /> {prod.location || "Showroom"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-ink">{formatRupiah(prod.price)}</p>
                              <span className="text-[10px] text-ink-muted">{prod.category}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : prod.id)}
                                className="inline-flex items-center gap-1 rounded-xs border border-line bg-surface-muted px-2.5 py-1 text-xs font-bold text-ink hover:border-line-strong transition-colors"
                              >
                                <span>{tierCount} SKU Varian</span>
                                {isExpanded ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
                              </button>
                              <p className="text-[10px] text-ink-muted mt-0.5">Total Stok: {prod.quota} unit</p>
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
                              <Button
                                type="button"
                                variant="secondary"
                                size="xs"
                                onClick={() => handleOpenAddVariant(prod)}
                              >
                                <Plus size={13} aria-hidden="true" />
                                <span>Tambah Varian</span>
                              </Button>
                            </td>
                          </tr>

                          {/* Rincian Varian Dropdown */}
                          {isExpanded && (
                            <tr className="bg-canvas">
                              <td colSpan={6} className="py-3 px-6">
                                <div className="rounded-sm border border-line bg-surface p-3.5">
                                  <div className="flex items-center justify-between mb-2.5">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted tabular-nums">
                                      Daftar Varian Warna &amp; SKU ({tierCount} varian)
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAddVariant(prod)}
                                      className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                                    >
                                      <Plus size={12} aria-hidden="true" /> Tambah Varian Baru
                                    </button>
                                  </div>
                                  {tierCount === 0 ? (
                                    <p className="text-xs text-ink-muted py-2">Belum ada varian warna terdaftar.</p>
                                  ) : (
                                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                                      {prod.tiers.map((t) => (
                                        <div
                                          key={t.id}
                                          className="rounded-sm border border-line p-2.5 text-xs bg-canvas tabular-nums"
                                        >
                                          <div className="flex justify-between items-start gap-2">
                                            <div>
                                              <p className="font-bold text-ink">{t.tier_name}</p>
                                              <p className="font-mono text-[10px] text-ink-muted">{t.sku_code}</p>
                                              {t.color_finish && (
                                                <span className="text-[10px] text-ink-secondary">Warna: {t.color_finish}</span>
                                              )}
                                            </div>
                                            <div className="text-right">
                                              <span className="font-bold text-accent">
                                                {formatRupiah(t.price)}
                                              </span>
                                              <p className="text-[10px] text-status-success font-bold">
                                                HPP: {formatRupiah(t.cost_price || Math.round(t.price * 0.65))}
                                              </p>
                                              <p className="text-[10px] text-ink-muted font-bold mt-0.5">
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
        </div>

        {/* Modal Tambah Instrumen Musik */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Daftarkan Master Katalog Instrumen Musik"
          maxWidth="max-w-xl"
        >
          <p className="text-xs text-ink-secondary mb-3">
            Input spesifikasi instrumen musik baru. Katalog akan dikirim ke Retail Manager untuk persetujuan publish.
          </p>

          {msg && (
            <div className="mb-3 flex items-center gap-2 rounded-sm border border-status-success/30 bg-status-success/10 p-3 text-xs font-bold text-status-success">
              <CheckCircle2 size={16} aria-hidden="true" /> {msg}
            </div>
          )}

          <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
            <div>
              <label className="mb-1 block font-bold text-ink">Nama Model Instrumen</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="ot-input w-full p-2.5"
                placeholder="Contoh: Fender Player Stratocaster Plus Top"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-bold text-ink">Brand / Supplier</label>
                <select
                  value={form.brand_id}
                  onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                  required
                  className="ot-input w-full p-2.5"
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
                <label className="mb-1 block font-bold text-ink">Kategori</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="ot-input w-full p-2.5"
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
                <label className="mb-1 block font-bold text-ink">SKU Prefix</label>
                <input
                  type="text"
                  required
                  value={form.sku_prefix}
                  onChange={(e) => setForm({ ...form, sku_prefix: e.target.value })}
                  className="ot-input w-full p-2.5 font-mono"
                  placeholder="SONY-FX3"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-ink">Tipe Hardware / Kategori</label>
                <input
                  type="text"
                  value={form.instrument_type}
                  onChange={(e) => setForm({ ...form, instrument_type: e.target.value })}
                  className="ot-input w-full p-2.5"
                  placeholder="Cinema Camera Body / Cine Prime Lens"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-ink">Garansi (Bulan)</label>
                <input
                  type="number"
                  value={form.warranty_months}
                  onChange={(e) => setForm({ ...form, warranty_months: e.target.value })}
                  className="ot-input w-full p-2.5 tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-bold text-ink">Harga Retail Standar (Rp)</label>
                <input
                  type="number"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="ot-input w-full p-2.5 tabular-nums"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-ink">Cabang Showroom Display</label>
                <select
                  value={form.venue_id}
                  onChange={(e) => setForm({ ...form, venue_id: e.target.value })}
                  className="ot-input w-full p-2.5"
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
              <label className="mb-1 block font-bold text-ink">URL Foto Produk</label>
              <input
                type="url"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                className="ot-input w-full p-2.5"
                placeholder="https://images.unsplash.com/..."
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-ink">Spesifikasi Sensor, Mount &amp; Output Video</label>
              <textarea
                rows={3}
                value={form.specifications}
                onChange={(e) => setForm({ ...form, specifications: e.target.value })}
                className="ot-input w-full p-2.5"
                placeholder="Sensor: Full-Frame 12MP Exmor R, Mount: Sony E-Mount, Video: 4K 120p 10-bit 4:2:2..."
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-ink">Deskripsi Produk</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="ot-input w-full p-2.5"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-line">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting}
              >
                {submitting ? "Mendaftarkan..." : "Ajukan Katalog ke Manager"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal Tambah Varian SKU */}
        <Modal
          open={variantModalOpen && !!targetProduct}
          onClose={() => setVariantModalOpen(false)}
          title="Tambah Varian Warna & SKU"
          maxWidth="max-w-md"
        >
          {targetProduct && (
            <div>
              <p className="text-xs text-ink-secondary mb-3">{targetProduct.name}</p>

              {msg && (
                <div className="mb-3 flex items-center gap-2 rounded-sm border border-status-success/30 bg-status-success/10 p-3 text-xs font-bold text-status-success">
                  <CheckCircle2 size={16} aria-hidden="true" /> {msg}
                </div>
              )}

              <form onSubmit={handleCreateVariant} className="space-y-3.5 text-xs">
                <div>
                  <label className="mb-1 block font-bold text-ink">Nama Varian</label>
                  <input
                    type="text"
                    required
                    value={variantForm.tier_name}
                    onChange={(e) => setVariantForm({ ...variantForm, tier_name: e.target.value })}
                    className="ot-input w-full p-2.5"
                    placeholder="Contoh: Body Only / Matte Black / Standard Kit"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-ink">SKU Code</label>
                    <input
                      type="text"
                      required
                      value={variantForm.sku_code}
                      onChange={(e) => setVariantForm({ ...variantForm, sku_code: e.target.value })}
                      className="ot-input w-full p-2.5 font-mono"
                      placeholder="SONY-FX3-BODY"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-ink">Warna / Finish</label>
                    <input
                      type="text"
                      value={variantForm.color_finish}
                      onChange={(e) => setVariantForm({ ...variantForm, color_finish: e.target.value })}
                      className="ot-input w-full p-2.5"
                      placeholder="3-Tone Sunburst"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-ink">Harga Jual Retail (Rp)</label>
                    <input
                      type="number"
                      required
                      value={variantForm.price}
                      onChange={(e) => setVariantForm({ ...variantForm, price: parseInt(e.target.value || 0) })}
                      className="ot-input w-full p-2.5 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-ink">HPP Pengadaan (Rp)</label>
                    <input
                      type="number"
                      value={variantForm.cost_price}
                      onChange={(e) => setVariantForm({ ...variantForm, cost_price: parseInt(e.target.value || 0) })}
                      className="ot-input w-full p-2.5 tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-ink">Berat Fisik (Kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={variantForm.weight_kg}
                      onChange={(e) => setVariantForm({ ...variantForm, weight_kg: parseFloat(e.target.value || 3.5) })}
                      className="ot-input w-full p-2.5 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-ink">Stok Awal (Unit)</label>
                    <input
                      type="number"
                      value={variantForm.quota}
                      onChange={(e) => setVariantForm({ ...variantForm, quota: parseInt(e.target.value || 0) })}
                      className="ot-input w-full p-2.5 tabular-nums"
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setVariantModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={submitting}
                  >
                    {submitting ? "Menyimpan..." : "Simpan Varian"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Modal>
      </main>
    </div>
  );
}

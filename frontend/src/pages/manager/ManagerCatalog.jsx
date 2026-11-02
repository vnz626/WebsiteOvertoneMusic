import React, { useState, useEffect } from "react";
import {
  Camera,
  Plus,
  Search,
  Filter,
  Edit,
  Layers,
  Tag,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  DollarSign,
  Sparkles,
  RefreshCw,
  X,
} from "lucide-react";
import api from "../../api";
import { formatRupiah } from "../../utils/format";
import toast from "react-hot-toast";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

const DEFAULT_CATEGORIES = [
  { id: "Cinema Cameras", name: "Cinema Cameras" },
  { id: "Cine Lenses", name: "Cine Lenses" },
  { id: "Gimbals & Stabilizers", name: "Gimbals & Stabilizers" },
  { id: "Studio Lighting", name: "Studio Lighting" },
  { id: "Wireless Audio & Mics", name: "Wireless Audio & Mics" },
  { id: "Monitor & Recorders", name: "Monitor & Recorders" },
];

export default function ManagerCatalog() {
  const [items, setItems] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCat, setSelectedCat] = useState("");

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "",
    subtitle: "",
    brand_id: "",
    category_id: "",
    series: "",
    origin_country: "USA",
    base_price: "",
    warranty_months: 12,
    is_featured: false,
    is_active: true,
    image_url: "",
    description: "",
    sku: "",
    variant_name: "Standard Edition",
    color_finish: "Natural",
    cost_price: "",
    stock: 5,
  });

  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [targetProductForVariant, setTargetProductForVariant] = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantForm, setVariantForm] = useState({
    sku: "",
    name: "",
    color_finish: "",
    price: "",
    cost_price: "",
    stock: 0,
    safety_stock: 2,
    weight_gram: 4500,
    is_active: true,
  });

  const [submitting, setSubmitting] = useState(false);

  function loadCatalogData() {
    setLoading(true);
    Promise.all([
      api.get("/manager/catalog/products"),
      api.get("/manager/suppliers"),
    ])
      .then(([itemsRes, brandsRes]) => {
        const rawProducts = itemsRes.data?.data || [];
        const rawBrands = brandsRes.data?.data || [];

        const normalizedItems = rawProducts.map((p) => {
          const rawVariants = p.tiers || p.variants || [];
          const mappedVariants = rawVariants.map((v) => {
            const vPrice = Number(v.price || 0);
            const vCogs = Number(v.cost_price || Math.round(vPrice * 0.7));
            const vStock = Number(v.stock ?? v.quota ?? 0);
            const marginPct =
              vPrice > 0 ? Number((((vPrice - vCogs) / vPrice) * 100).toFixed(1)) : 0;
            return {
              ...v,
              id: v.id,
              sku: v.sku_code || v.sku || v.tier_name || `SKU-${v.id}`,
              name: v.variant_name || v.name || v.tier_name || "Standard",
              color_finish: v.color_finish || "",
              cost_price: vCogs,
              price: vPrice,
              stock: vStock,
              safety_stock: Number(v.safety_stock || 2),
              margin_percent: marginPct,
              is_active: v.is_active !== false,
            };
          });

          const totalStock = mappedVariants.reduce((sum, v) => sum + v.stock, 0);
          const brandName = p.brand_name || p.organizer || p.brand || "Official Brand";
          const catName = p.category || "Cinema Cameras";

          return {
            ...p,
            brand: brandName,
            brand_id: p.brand_id || brandName,
            category: catName,
            category_id: p.category_id || catName,
            subtitle:
              p.subtitle ||
              p.instrument_type ||
              (p.description ? p.description.slice(0, 72) : "Pro Cinema Hardware"),
            origin_country: p.origin_country || "USA / Japan",
            warranty_months: Number(p.warranty_months || 12),
            base_price: Number(p.price || p.base_price || mappedVariants[0]?.price || 0),
            is_active: p.status !== "archived" && p.is_active !== false,
            variants: mappedVariants,
            total_stock: totalStock,
          };
        });

        const uniqueBrandNames = Array.from(
          new Set([
            ...rawBrands.map((b) => b.brand_specialization || b.name).filter(Boolean),
            ...normalizedItems.map((i) => i.brand).filter(Boolean),
          ])
        ).map((name) => ({ id: name, name }));

        const uniqueCategories = Array.from(
          new Set([
            ...DEFAULT_CATEGORIES.map((c) => c.name),
            ...normalizedItems.map((i) => i.category).filter(Boolean),
          ])
        ).map((name) => ({ id: name, name }));

        setItems(normalizedItems);
        setBrands(uniqueBrandNames);
        setCategories(uniqueCategories);
      })
      .catch((err) => console.error("Error loading manager catalog:", err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCatalogData();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchSearch =
      !search ||
      (item.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(search.toLowerCase())) ||
      item.variants?.some((v) =>
        (v.sku || "").toLowerCase().includes(search.toLowerCase())
      );
    const matchBrand =
      !selectedBrand ||
      String(item.brand) === String(selectedBrand) ||
      String(item.brand_id) === String(selectedBrand);
    const matchCat =
      !selectedCat ||
      String(item.category) === String(selectedCat) ||
      String(item.category_id) === String(selectedCat);
    return matchSearch && matchBrand && matchCat;
  });

  const totalModels = items.length;
  const totalVariants = items.reduce((acc, p) => acc + (p.variants?.length || 0), 0);
  const totalPhysicalUnits = items.reduce((acc, p) => acc + (p.total_stock || 0), 0);
  const totalAssetCogs = items.reduce(
    (acc, p) =>
      acc +
      (p.variants || []).reduce(
        (vAcc, v) => vAcc + (v.cost_price || 0) * (v.stock || 0),
        0
      ),
    0
  );

  function handleOpenCreateProduct() {
    setEditingProduct(null);
    setProductForm({
      name: "",
      subtitle: "",
      brand_id: brands[0]?.id || "Sony Cinema Line",
      category_id: categories[0]?.id || "Cinema Cameras",
      series: "Cinema Line Series",
      origin_country: "Japan",
      base_price: "59999000",
      warranty_months: 24,
      is_featured: false,
      is_active: true,
      image_url:
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
      description: "",
      sku: `SNY-FX3-${Math.floor(100 + Math.random() * 900)}`,
      variant_name: "Body Only / Full-Frame",
      color_finish: "Matte Black",
      cost_price: "45000000",
      stock: 5,
    });
    setProductModalOpen(true);
  }

  function handleOpenEditProduct(item) {
    setEditingProduct(item);
    setProductForm({
      name: item.name,
      subtitle: item.subtitle || "",
      brand_id: item.brand || item.brand_id || "",
      category_id: item.category || item.category_id || "",
      series: item.series || "",
      origin_country: item.origin_country || "USA",
      base_price: String(item.base_price || 0),
      warranty_months: item.warranty_months || 12,
      is_featured: Boolean(item.is_featured),
      is_active: Boolean(item.is_active),
      image_url: item.image_url || "",
      description: item.description || "",
    });
    setProductModalOpen(true);
  }

  function handleSaveProduct(e) {
    e.preventDefault();
    setSubmitting(true);
    const basePrice = Number(productForm.base_price || 0);
    const costPrice = Number(productForm.cost_price || Math.round(basePrice * 0.72));
    const stockNum = Number(productForm.stock || 5);

    const payload = {
      name: productForm.name,
      brand_name: productForm.brand_id,
      organizer: productForm.brand_id,
      category: productForm.category_id,
      instrument_type: productForm.subtitle || productForm.series || "Cinema Gear",
      description: productForm.description || productForm.subtitle,
      image_url: productForm.image_url,
      status: productForm.is_active ? "published" : "archived",
      tiers: editingProduct
        ? undefined
        : [
            {
              sku_code: productForm.sku,
              variant_name: productForm.variant_name,
              tier_name: productForm.variant_name,
              color_finish: productForm.color_finish,
              price: basePrice,
              cost_price: costPrice,
              stock: stockNum,
              quota: stockNum,
            },
          ],
    };

    const apiCall = editingProduct
      ? api.put(`/manager/catalog/products/${editingProduct.id}`, payload)
      : api.post("/manager/catalog/products", payload);

    apiCall
      .then(() => {
        toast.success(
          editingProduct
            ? "Model cinema gear berhasil diperbarui"
            : "Model cinema gear baru berhasil ditambahkan"
        );
        setProductModalOpen(false);
        loadCatalogData();
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Gagal menyimpan produk katalog");
      })
      .finally(() => setSubmitting(false));
  }

  function handleOpenAddVariant(product) {
    setTargetProductForVariant(product);
    setEditingVariant(null);
    setVariantForm({
      sku: `${(product.brand || "SKU").substring(0, 3).toUpperCase()}-${Math.floor(
        1000 + Math.random() * 9000
      )}`,
      name: "",
      color_finish: "",
      price: String(product.base_price || 0),
      cost_price: String(Math.round((product.base_price || 0) * 0.72)),
      stock: 5,
      safety_stock: 2,
      weight_gram: 4500,
      is_active: true,
    });
    setVariantModalOpen(true);
  }

  function handleOpenEditVariant(product, variant) {
    setTargetProductForVariant(product);
    setEditingVariant(variant);
    setVariantForm({
      sku: variant.sku,
      name: variant.name,
      color_finish: variant.color_finish || "",
      price: String(variant.price || 0),
      cost_price: String(variant.cost_price || 0),
      stock: variant.stock || 0,
      safety_stock: variant.safety_stock || 2,
      weight_gram: variant.weight_gram || 4500,
      is_active: Boolean(variant.is_active),
    });
    setVariantModalOpen(true);
  }

  function handleSaveVariant(e) {
    e.preventDefault();
    if (!targetProductForVariant) return;

    const priceNum = Number(variantForm.price);
    const cogsNum = Number(variantForm.cost_price);
    if (priceNum < cogsNum) {
      toast.error(
        "Margin Guardrail Violation: Harga Jual tidak boleh lebih rendah dari HPP (COGS)!"
      );
      return;
    }

    setSubmitting(true);
    const payload = {
      sku_code: variantForm.sku,
      variant_name: variantForm.name,
      tier_name: variantForm.name,
      color_finish: variantForm.color_finish,
      price: priceNum,
      cost_price: cogsNum,
      stock: Number(variantForm.stock),
      quota: Number(variantForm.stock),
      weight_gram: Number(variantForm.weight_gram || 4500),
    };

    const apiCall = editingVariant
      ? api.put(`/manager/catalog/variants/${editingVariant.id}`, payload)
      : api.post(
          `/manager/catalog/products/${targetProductForVariant.id}/variants`,
          payload
        );

    apiCall
      .then(() => {
        toast.success("SKU Varian & Harga berhasil disimpan");
        setVariantModalOpen(false);
        loadCatalogData();
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Gagal menyimpan SKU varian");
      })
      .finally(() => setSubmitting(false));
  }

  function handleToggleProductActive(item) {
    api
      .put(`/manager/catalog/products/${item.id}`, {
        status: item.is_active ? "archived" : "published",
      })
      .then(() => loadCatalogData())
      .catch((err) => console.error(err));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="accent">Otoritas Penuh Manager</Badge>
            <Badge variant="neutral">Master Catalog &amp; Pricing</Badge>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Master Katalog Cinema &amp; Broadcast Gear (HPP/Retail)
          </h1>
          <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
            Kelola lini cinema gear, SKU varian bundle/mount, harga pokok pembelian
            (COGS), dan margin keuntungan ritel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handleOpenCreateProduct}>
            <Plus size={15} aria-hidden="true" />
            Tambah Cinema Gear Baru
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={loadCatalogData}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-md border border-line bg-surface p-4">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Model Cinema Gear
            </span>
            <Camera size={16} aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink tabular-nums">
            {totalModels}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-secondary">Seri &amp; Model Katalog</p>
        </div>

        <div className="rounded-md border border-line bg-surface p-4">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total SKU Varian
            </span>
            <Layers size={16} aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink tabular-nums">
            {totalVariants}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-secondary">Kombinasi Mount / Kit</p>
        </div>

        <div className="rounded-md border border-line bg-surface p-4">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Stok Fisik
            </span>
            <Package size={16} aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-ink tabular-nums">
            {totalPhysicalUnits}{" "}
            <span className="text-xs font-normal text-ink-secondary">unit</span>
          </p>
          <p className="mt-0.5 text-[11px] text-ink-secondary">Akumulasi Gudang &amp; Toko</p>
        </div>

        <div className="rounded-md border border-line bg-surface p-4">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Valuasi Modal (COGS)
            </span>
            <DollarSign size={16} aria-hidden="true" />
          </div>
          <p className="mt-2 font-display text-lg font-bold text-status-success sm:text-xl tabular-nums">
            {formatRupiah(totalAssetCogs)}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-secondary">Nilai Aset Inventaris HPP</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Cari nama cinema gear, kode SKU, atau brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari nama cinema gear, kode SKU, atau brand"
            className="w-full rounded-sm border border-line bg-canvas py-2 pl-9 pr-3 text-xs text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            aria-label="Filter Brand"
            className="rounded-sm border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink focus:border-ink focus:outline-none"
          >
            <option value="">Semua Brand ({brands.length})</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            aria-label="Filter Kategori"
            className="rounded-sm border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink focus:border-ink focus:outline-none"
          >
            <option value="">Semua Kategori ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Master Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-md border border-line bg-surface p-12 text-center text-xs text-ink-muted">
            Memuat data master katalog cinema gear...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-md border border-line bg-surface p-12 text-center text-xs text-ink-muted">
            Tidak ada cinema gear yang sesuai dengan filter pencarian.
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-md border border-line bg-surface transition-colors hover:border-line-strong"
            >
              {/* Product Header Row */}
              <div className="flex flex-col gap-4 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3.5">
                  <img
                    src={
                      item.image_url ||
                      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80"
                    }
                    alt={item.name}
                    className="h-14 w-14 rounded-sm border border-line bg-surface-muted object-cover"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-xs bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-canvas">
                        {item.brand}
                      </span>
                      <Badge variant="neutral">{item.category}</Badge>
                      {item.series && <Badge variant="neutral">{item.series}</Badge>}
                      {item.is_featured && <Badge variant="accent">Featured</Badge>}
                    </div>
                    <h3 className="mt-1 font-display text-sm font-bold text-ink sm:text-base">
                      {item.name}
                    </h3>
                    <p className="text-xs text-ink-secondary">
                      {item.subtitle} • Origin: {item.origin_country} • Garansi:{" "}
                      {item.warranty_months} Bulan
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleProductActive(item)}
                    className={`inline-flex items-center gap-1 rounded-sm border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      item.is_active
                        ? "border-status-success/30 bg-status-success/10 text-status-success"
                        : "border-line bg-surface-muted text-ink-muted"
                    }`}
                  >
                    {item.is_active ? (
                      <>
                        <CheckCircle2 size={12} aria-hidden="true" /> Aktif di Katalog
                      </>
                    ) : (
                      <>
                        <XCircle size={12} aria-hidden="true" /> Diarsipkan
                      </>
                    )}
                  </button>

                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => handleOpenEditProduct(item)}
                  >
                    <Edit size={12} aria-hidden="true" />
                    Edit Model
                  </Button>

                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => handleOpenAddVariant(item)}
                  >
                    <Plus size={12} aria-hidden="true" />
                    Tambah SKU Varian
                  </Button>
                </div>
              </div>

              {/* Variants Table */}
              <div className="overflow-x-auto bg-surface-muted/30">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      <th className="px-4 py-2.5">Kode SKU</th>
                      <th className="px-4 py-2.5">Nama Varian &amp; Finishing</th>
                      <th className="px-4 py-2.5 text-right">Harga Beli (HPP/COGS)</th>
                      <th className="px-4 py-2.5 text-right">Harga Jual Ritel</th>
                      <th className="px-4 py-2.5 text-center">Gross Margin</th>
                      <th className="px-4 py-2.5 text-center">Stok Gudang</th>
                      <th className="px-4 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-surface tabular-nums">
                    {(item.variants || []).map((v) => {
                      const isLowMargin = v.margin_percent < 15;
                      const isLowStock = v.stock <= v.safety_stock;
                      return (
                        <tr key={v.id} className="hover:bg-surface-muted/50">
                          <td className="px-4 py-2.5 font-mono font-bold text-ink">
                            {v.sku}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-semibold text-ink">{v.name}</span>
                            {v.color_finish && (
                              <span className="ml-2 rounded-xs border border-line bg-surface-muted px-1.5 py-0.5 text-[10px] text-ink-secondary">
                                {v.color_finish}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-ink-secondary">
                            {formatRupiah(v.cost_price)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-ink">
                            {formatRupiah(v.price)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge variant={isLowMargin ? "warning" : "success"}>
                              {v.margin_percent}%
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge variant={isLowStock ? "danger" : "neutral"}>
                              {v.stock} unit
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenEditVariant(item, v)}
                              className="inline-flex items-center gap-1 rounded-xs border border-line px-2 py-1 text-[11px] font-semibold text-ink-secondary hover:border-line-strong hover:text-ink"
                            >
                              <Edit size={11} aria-hidden="true" />
                              Atur Harga / SKU
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL TAMBAH / EDIT MODEL CINEMA GEAR */}
      <Modal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={
          editingProduct
            ? `Edit Model Cinema Gear: ${editingProduct.name}`
            : "Tambah Model Cinema Gear Baru"
        }
        size="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="font-bold text-ink">Nama Lengkap Model Cinema Gear</label>
              <input
                type="text"
                placeholder="Contoh: Sony FX3 Cinema Line Camera Body"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="ot-input mt-1 text-xs"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-medium text-ink-secondary">
                Sub-Judul / Ringkasan Spesifikasi Sensor &amp; Mount
              </label>
              <input
                type="text"
                placeholder="Contoh: Full-Frame 12MP Exmor R, 4K 120p, Dual Base ISO 800/12800"
                value={productForm.subtitle}
                onChange={(e) =>
                  setProductForm({ ...productForm, subtitle: e.target.value })
                }
                className="ot-input mt-1 text-xs"
              />
            </div>

            <div>
              <label className="font-bold text-ink">Brand Principal</label>
              <select
                value={productForm.brand_id}
                onChange={(e) =>
                  setProductForm({ ...productForm, brand_id: e.target.value })
                }
                className="ot-input mt-1 text-xs"
                required
              >
                <option value="">-- Pilih Brand --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-ink">Kategori Katalog</label>
              <select
                value={productForm.category_id}
                onChange={(e) =>
                  setProductForm({ ...productForm, category_id: e.target.value })
                }
                className="ot-input mt-1 text-xs"
                required
              >
                <option value="">-- Pilih Kategori --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium text-ink-secondary">Lini Seri (Series)</label>
              <input
                type="text"
                placeholder="American Professional II"
                value={productForm.series}
                onChange={(e) =>
                  setProductForm({ ...productForm, series: e.target.value })
                }
                className="ot-input mt-1 text-xs"
              />
            </div>

            <div>
              <label className="font-medium text-ink-secondary">
                Negara Pembuatan (Origin)
              </label>
              <input
                type="text"
                placeholder="United States / Japan / Indonesia"
                value={productForm.origin_country}
                onChange={(e) =>
                  setProductForm({ ...productForm, origin_country: e.target.value })
                }
                className="ot-input mt-1 text-xs"
              />
            </div>

            <div>
              <label className="font-bold text-ink">Harga Jual Dasar Ritel (IDR)</label>
              <input
                type="number"
                value={productForm.base_price}
                onChange={(e) =>
                  setProductForm({ ...productForm, base_price: e.target.value })
                }
                className="ot-input mt-1 font-mono text-xs tabular-nums"
                required
              />
            </div>

            <div>
              <label className="font-medium text-ink-secondary">Garansi Resmi (Bulan)</label>
              <input
                type="number"
                value={productForm.warranty_months}
                onChange={(e) =>
                  setProductForm({ ...productForm, warranty_months: e.target.value })
                }
                className="ot-input mt-1 text-xs tabular-nums"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-medium text-ink-secondary">URL Foto Hardware / Kamera</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={productForm.image_url}
                onChange={(e) =>
                  setProductForm({ ...productForm, image_url: e.target.value })
                }
                className="ot-input mt-1 text-xs"
              />
            </div>

            {!editingProduct && (
              <div className="grid grid-cols-1 gap-3 rounded-sm border border-line bg-surface-muted p-3.5 sm:col-span-2 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink">
                    Inisialisasi SKU Varian Pertama
                  </p>
                </div>
                <div>
                  <label className="font-medium text-ink-secondary">Kode SKU</label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) =>
                      setProductForm({ ...productForm, sku: e.target.value })
                    }
                    className="ot-input mt-1 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-ink-secondary">Nama Varian</label>
                  <input
                    type="text"
                    value={productForm.variant_name}
                    onChange={(e) =>
                      setProductForm({ ...productForm, variant_name: e.target.value })
                    }
                    className="ot-input mt-1 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-medium text-ink-secondary">
                    HPP / COGS Awal (IDR)
                  </label>
                  <input
                    type="number"
                    value={productForm.cost_price}
                    onChange={(e) =>
                      setProductForm({ ...productForm, cost_price: e.target.value })
                    }
                    className="ot-input mt-1 font-mono text-xs tabular-nums"
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 pt-1 sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={productForm.is_featured}
                  onChange={(e) =>
                    setProductForm({ ...productForm, is_featured: e.target.checked })
                  }
                  className="rounded-xs border-line-strong text-accent focus:ring-accent"
                />
                <span className="font-semibold text-ink">
                  Tampilkan di Highlight Etalase Utama (Featured)
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setProductModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Simpan Katalog Cinema Gear
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL TAMBAH / EDIT VARIAN SKU & PENETAPAN HARGA */}
      <Modal
        open={variantModalOpen && Boolean(targetProductForVariant)}
        onClose={() => setVariantModalOpen(false)}
        title={editingVariant ? "Atur Harga & SKU Varian" : "Tambah SKU Varian Baru"}
        size="md"
      >
        {targetProductForVariant && (
          <form onSubmit={handleSaveVariant} className="space-y-4 text-xs">
            <p className="text-xs text-ink-secondary">{targetProductForVariant.name}</p>

            <div>
              <label className="font-bold text-ink">Kode Unik SKU</label>
              <input
                type="text"
                value={variantForm.sku}
                onChange={(e) =>
                  setVariantForm({ ...variantForm, sku: e.target.value })
                }
                className="ot-input mt-1 font-mono text-xs uppercase"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-ink">Nama Varian</label>
                <input
                  type="text"
                  placeholder="Olympic White Maple"
                  value={variantForm.name}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, name: e.target.value })
                  }
                  className="ot-input mt-1 text-xs"
                  required
                />
              </div>
              <div>
                <label className="font-medium text-ink-secondary">Finishing Warna</label>
                <input
                  type="text"
                  placeholder="Olympic White"
                  value={variantForm.color_finish}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, color_finish: e.target.value })
                  }
                  className="ot-input mt-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-sm border border-line bg-surface-muted p-3.5">
              <div>
                <label className="font-bold text-ink">Harga Pokok HPP / COGS</label>
                <input
                  type="number"
                  value={variantForm.cost_price}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, cost_price: e.target.value })
                  }
                  className="ot-input mt-1 font-mono text-xs tabular-nums"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-ink">Harga Jual Ritel</label>
                <input
                  type="number"
                  value={variantForm.price}
                  onChange={(e) =>
                    setVariantForm({ ...variantForm, price: e.target.value })
                  }
                  className="ot-input mt-1 font-mono text-xs font-bold tabular-nums"
                  required
                />
              </div>
              <div className="col-span-2 flex items-center justify-between pt-1 text-[11px] tabular-nums">
                <span className="text-ink-secondary">Estimasi Margin Kotor:</span>
                {Number(variantForm.price) > 0 ? (
                  <span
                    className={`font-bold ${
                      Number(variantForm.price) < Number(variantForm.cost_price)
                        ? "text-status-danger"
                        : "text-status-success"
                    }`}
                  >
                    {(
                      ((Number(variantForm.price) - Number(variantForm.cost_price)) /
                        Number(variantForm.price)) *
                      100
                    ).toFixed(1)}
                    % (
                    {formatRupiah(
                      Number(variantForm.price) - Number(variantForm.cost_price)
                    )}
                    )
                  </span>
                ) : (
                  <span>0%</span>
                )}
              </div>
            </div>

            {!editingVariant && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-ink-secondary">Stok Fisik Awal</label>
                  <input
                    type="number"
                    value={variantForm.stock}
                    onChange={(e) =>
                      setVariantForm({ ...variantForm, stock: e.target.value })
                    }
                    className="ot-input mt-1 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="font-medium text-ink-secondary">
                    Batas Aman (Safety Stock)
                  </label>
                  <input
                    type="number"
                    value={variantForm.safety_stock}
                    onChange={(e) =>
                      setVariantForm({ ...variantForm, safety_stock: e.target.value })
                    }
                    className="ot-input mt-1 text-xs tabular-nums"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setVariantModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={submitting}>
                Simpan SKU &amp; Harga
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

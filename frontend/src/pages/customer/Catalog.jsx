import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Package,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import api from "../../api";
import { fileUrl, formatRupiah } from "../../utils/format";
import { ProductCard } from "./Home";
import Skeleton from "../../components/ui/Skeleton";

const OFFICIAL_CINEMA_CATEGORIES = [
  "Cinema & Mirrorless Cameras",
  "Cinema & Prime Lenses",
  "Gimbals & Camera Stabilizers",
  "Studio & Cinema Lighting",
  "Wireless & Broadcast Audio",
  "Monitors & Field Recorders",
];

const PRICE_PRESETS = [
  { label: "Semua Rentang Harga", min: null, max: null },
  { label: "Di bawah Rp 10.000.000", min: 0, max: 10000000 },
  { label: "Rp 10.000.000 – Rp 35.000.000", min: 10000000, max: 35000000 },
  { label: "Rp 35.000.000 – Rp 75.000.000", min: 35000000, max: 75000000 },
  { label: "Di atas Rp 75.000.000", min: 75000000, max: null },
];

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allProducts, setAllProducts] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const selectedCategory = searchParams.get("category") || "all";
  const [selectedBrands, setSelectedBrands] = useState(() => {
    const b = searchParams.get("brand");
    return b ? b.split(",").filter(Boolean) : [];
  });
  const [availability, setAvailability] = useState(searchParams.get("availability") || "all");
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "relevance");
  const [viewMode, setViewMode] = useState("grid");

  const [accordionOpen, setAccordionOpen] = useState({
    category: true,
    brand: true,
    availability: true,
    price: true,
  });

  const toggleAccordion = (key) => {
    setAccordionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    setLoading(true);
    api
      .get("/products")
      .catch(() => api.get("/events"))
      .then((res) => {
        setAllProducts(Array.isArray(res?.data?.data) ? res.data.data : []);
      })
      .catch(() => setAllProducts([]))
      .finally(() => setLoading(false));

    fetch("/api/store/bundles")
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success" && Array.isArray(d.data)) {
          setBundles(d.data);
        }
      })
      .catch(() => {});
  }, []);

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === "" || val === "all") {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    });
    setSearchParams(next);
  };

  function handleCategoryChange(cat) {
    setSelectedBrands([]);
    const next = new URLSearchParams(searchParams);
    if (cat === "all") next.delete("category");
    else next.set("category", cat);
    next.delete("brand");
    setSearchParams(next);
  }

  function handleBrandToggle(brandName) {
    let nextList;
    if (selectedBrands.includes(brandName)) {
      nextList = selectedBrands.filter((b) => b !== brandName);
    } else {
      nextList = [...selectedBrands, brandName];
    }
    setSelectedBrands(nextList);
    updateParams({ brand: nextList.length > 0 ? nextList.join(",") : null });
  }

  function handleAvailabilityChange(val) {
    const nextVal = availability === val ? "all" : val;
    setAvailability(nextVal);
    updateParams({ availability: nextVal });
  }

  function resetAllFilters() {
    setSearchQuery("");
    setSelectedBrands([]);
    setAvailability("all");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("relevance");
    setSearchParams(new URLSearchParams());
  }

  const categoryList = useMemo(() => {
    const catsFromData = Array.from(
      new Set(allProducts.map((p) => p.category).filter(Boolean))
    );
    if (catsFromData.length > 0) {
      const ordered = OFFICIAL_CINEMA_CATEGORIES.filter((c) =>
        catsFromData.some((pCat) => pCat.toLowerCase() === c.toLowerCase())
      );
      catsFromData.forEach((c) => {
        if (!ordered.some((o) => o.toLowerCase() === c.toLowerCase())) {
          ordered.push(c);
        }
      });
      return ordered;
    }
    return OFFICIAL_CINEMA_CATEGORIES;
  }, [allProducts]);

  const dynamicBrands = useMemo(() => {
    const productsInCat =
      selectedCategory === "all"
        ? allProducts
        : allProducts.filter(
            (p) => (p.category || "").toLowerCase() === selectedCategory.toLowerCase()
          );

    const brandCounts = new Map();
    productsInCat.forEach((p) => {
      const bName = p.brand?.name || p.brand || p.organizer;
      if (bName) {
        brandCounts.set(bName, (brandCounts.get(bName) || 0) + 1);
      }
    });

    return Array.from(brandCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts, selectedCategory]);

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.sku_prefix?.toLowerCase().includes(q) ||
          (p.brand?.name && p.brand.name.toLowerCase().includes(q)) ||
          (p.instrument_type && p.instrument_type.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter(
        (p) => (p.category || "").toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (selectedBrands.length > 0) {
      result = result.filter((p) => {
        const bName = p.brand?.name || p.brand || p.organizer;
        return selectedBrands.includes(bName);
      });
    }

    if (availability === "in_stock") {
      result = result.filter((p) => (p.remaining_quota || p.stock || 0) > 0);
    } else if (availability === "out_of_stock") {
      result = result.filter((p) => (p.remaining_quota || p.stock || 0) <= 0);
    }

    if (minPrice) {
      result = result.filter((p) => (p.price || p.min_price || 0) >= Number(minPrice));
    }
    if (maxPrice) {
      result = result.filter((p) => (p.price || p.min_price || 0) <= Number(maxPrice));
    }

    if (sortBy === "price_asc") {
      result.sort((a, b) => (a.price || a.min_price || 0) - (b.price || b.min_price || 0));
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => (b.price || b.min_price || 0) - (a.price || a.min_price || 0));
    } else if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    return result;
  }, [
    allProducts,
    searchQuery,
    selectedCategory,
    selectedBrands,
    availability,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  const hasActiveFilters =
    selectedCategory !== "all" ||
    selectedBrands.length > 0 ||
    availability !== "all" ||
    Boolean(minPrice) ||
    Boolean(maxPrice) ||
    Boolean(searchQuery);

  return (
    <div className="min-h-screen bg-canvas text-ink pb-20">
      {/* Header Katalog */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-12">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-ink-muted mb-2">
            <Link to="/" className="hover:text-ink transition-colors duration-fast">
              Beranda
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-ink font-bold">Katalog Cinema Gear</span>
            {selectedCategory !== "all" && (
              <>
                <span aria-hidden="true">/</span>
                <span className="text-accent font-bold">{selectedCategory}</span>
              </>
            )}
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-ink tracking-tight">
                {selectedCategory === "all" ? "Katalog Cinema Cameras & Broadcast Gear" : selectedCategory}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-ink-secondary">
                Unit orisinal bergaransi distributor resmi dengan inspeksi 10-point sensor calibration &amp; firmware QC.
              </p>
            </div>

            {/* Pencarian Katalog */}
            <div className="relative w-full md:w-80">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Cari kamera cinema, lensa, atau kode SKU"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  updateParams({ q: e.target.value });
                }}
                placeholder="Cari seri kamera, merek, atau SKU..."
                className="ot-input pl-10 pr-8"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Bersihkan kata kunci pencarian"
                  onClick={() => {
                    setSearchQuery("");
                    updateParams({ q: null });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 pt-8 sm:px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* 1. SIDEBAR FILTER KIRI */}
          <aside aria-label="Filter katalog produk" className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-line">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-accent" aria-hidden="true" />
                <span>Filter Katalog</span>
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1"
                >
                  <RotateCcw size={12} aria-hidden="true" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            {/* ACCORDION 1: KATEGORI */}
            <div className="rounded-md border border-line bg-surface overflow-hidden">
              <button
                type="button"
                aria-expanded={accordionOpen.category}
                onClick={() => toggleAccordion("category")}
                className="w-full px-4 py-3 bg-surface-muted flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-ink hover:bg-surface-subtle transition-colors duration-fast"
              >
                <span>Kategori Cinema &amp; Broadcast</span>
                {accordionOpen.category ? (
                  <ChevronUp size={15} aria-hidden="true" />
                ) : (
                  <ChevronDown size={15} aria-hidden="true" />
                )}
              </button>

              {accordionOpen.category && (
                <div className="p-3 space-y-1 border-t border-line">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange("all")}
                    className={`w-full text-left rounded-sm px-2.5 py-1.5 text-xs transition-colors duration-fast flex items-center justify-between ${
                      selectedCategory === "all"
                        ? "font-bold text-accent bg-accent-subtle"
                        : "text-ink-secondary hover:bg-surface-muted hover:text-ink"
                    }`}
                  >
                    <span>Semua Kategori</span>
                    <span className="text-[11px] text-ink-muted tabular-nums">
                      ({allProducts.length})
                    </span>
                  </button>

                  {categoryList.map((c) => {
                    const isSelected = selectedCategory.toLowerCase() === c.toLowerCase();
                    const count = allProducts.filter(
                      (p) => (p.category || "").toLowerCase() === c.toLowerCase()
                    ).length;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleCategoryChange(c)}
                        className={`w-full text-left rounded-sm px-2.5 py-1.5 text-xs transition-colors duration-fast flex items-center justify-between ${
                          isSelected
                            ? "font-bold text-accent bg-accent-subtle"
                            : "text-ink-secondary hover:bg-surface-muted hover:text-ink"
                        }`}
                      >
                        <span className="truncate">{c}</span>
                        <span className="text-[11px] text-ink-muted tabular-nums">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ACCORDION 2: MEREK */}
            <div className="rounded-md border border-line bg-surface overflow-hidden">
              <button
                type="button"
                aria-expanded={accordionOpen.brand}
                onClick={() => toggleAccordion("brand")}
                className="w-full px-4 py-3 bg-surface-muted flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-ink hover:bg-surface-subtle transition-colors duration-fast"
              >
                <span>Merek Resmi (Brand)</span>
                {accordionOpen.brand ? (
                  <ChevronUp size={15} aria-hidden="true" />
                ) : (
                  <ChevronDown size={15} aria-hidden="true" />
                )}
              </button>

              {accordionOpen.brand && (
                <div className="p-3.5 space-y-2 border-t border-line max-h-60 overflow-y-auto">
                  {dynamicBrands.length === 0 ? (
                    <p className="text-xs text-ink-muted py-1">
                      Tidak ada merek di kategori ini.
                    </p>
                  ) : (
                    dynamicBrands.map((b) => {
                      const isChecked = selectedBrands.includes(b.name);
                      return (
                        <label
                          key={b.name}
                          className="flex items-center justify-between cursor-pointer text-xs text-ink-secondary hover:text-ink py-0.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleBrandToggle(b.name)}
                              className="h-4 w-4 rounded-xs accent-[var(--color-accent)] cursor-pointer"
                            />
                            <span className={isChecked ? "font-bold text-ink" : "font-normal"}>
                              {b.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-ink-muted tabular-nums">
                            ({b.count})
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* ACCORDION 3: KETERSEDIAAN */}
            <div className="rounded-md border border-line bg-surface overflow-hidden">
              <button
                type="button"
                aria-expanded={accordionOpen.availability}
                onClick={() => toggleAccordion("availability")}
                className="w-full px-4 py-3 bg-surface-muted flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-ink hover:bg-surface-subtle transition-colors duration-fast"
              >
                <span>Ketersediaan Stok</span>
                {accordionOpen.availability ? (
                  <ChevronUp size={15} aria-hidden="true" />
                ) : (
                  <ChevronDown size={15} aria-hidden="true" />
                )}
              </button>

              {accordionOpen.availability && (
                <div className="p-3.5 space-y-2.5 border-t border-line">
                  <label className="flex items-center justify-between cursor-pointer text-xs text-ink-secondary hover:text-ink">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={availability === "in_stock"}
                        onChange={() => handleAvailabilityChange("in_stock")}
                        className="h-4 w-4 rounded-xs accent-[var(--color-accent)] cursor-pointer"
                      />
                      <span>Stok Tersedia (Siap Kirim)</span>
                    </div>
                    <span
                      className="h-2 w-2 rounded-full bg-status-success-text"
                      aria-hidden="true"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-xs text-ink-secondary hover:text-ink">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={availability === "out_of_stock"}
                        onChange={() => handleAvailabilityChange("out_of_stock")}
                        className="h-4 w-4 rounded-xs accent-[var(--color-accent)] cursor-pointer"
                      />
                      <span>Stok Habis</span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-ink-muted" aria-hidden="true" />
                  </label>
                </div>
              )}
            </div>

            {/* ACCORDION 4: KISARAN HARGA */}
            <div className="rounded-md border border-line bg-surface overflow-hidden">
              <button
                type="button"
                aria-expanded={accordionOpen.price}
                onClick={() => toggleAccordion("price")}
                className="w-full px-4 py-3 bg-surface-muted flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-ink hover:bg-surface-subtle transition-colors duration-fast"
              >
                <span>Rentang Harga (Rp)</span>
                {accordionOpen.price ? (
                  <ChevronUp size={15} aria-hidden="true" />
                ) : (
                  <ChevronDown size={15} aria-hidden="true" />
                )}
              </button>

              {accordionOpen.price && (
                <div className="p-3.5 border-t border-line space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor="catalog-min-price"
                        className="block text-[10px] font-bold text-ink-muted uppercase mb-1"
                      >
                        Minimum (Rp)
                      </label>
                      <input
                        id="catalog-min-price"
                        type="number"
                        placeholder="0"
                        value={minPrice}
                        onChange={(e) => {
                          setMinPrice(e.target.value);
                          updateParams({ min_price: e.target.value });
                        }}
                        className="ot-input py-1.5 px-2.5 text-xs tabular-nums"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="catalog-max-price"
                        className="block text-[10px] font-bold text-ink-muted uppercase mb-1"
                      >
                        Maksimum (Rp)
                      </label>
                      <input
                        id="catalog-max-price"
                        type="number"
                        placeholder="Maks"
                        value={maxPrice}
                        onChange={(e) => {
                          setMaxPrice(e.target.value);
                          updateParams({ max_price: e.target.value });
                        }}
                        className="ot-input py-1.5 px-2.5 text-xs tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-line">
                    {PRICE_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setMinPrice(p.min !== null ? String(p.min) : "");
                          setMaxPrice(p.max !== null ? String(p.max) : "");
                          updateParams({
                            min_price: p.min !== null ? String(p.min) : null,
                            max_price: p.max !== null ? String(p.max) : null,
                          });
                        }}
                        className="block w-full text-left text-[11px] font-medium text-ink-secondary hover:text-accent py-1 truncate tabular-nums"
                      >
                        • {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* 2. AREA UTAMA DAFTAR PRODUK */}
          <div className="lg:col-span-9">
            {/* Curated Rig Bundles Showcase */}
            {bundles.length > 0 && selectedCategory === "all" && !searchQuery && (
              <section
                aria-label="Paket Bundling Kurasi"
                className="mb-8 rounded-md border border-line-strong bg-surface p-5 sm:p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-line mb-5 gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-accent text-[11px] font-bold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Curated Indie Filmmaker Production Kits</span>
                    </div>
                    <h2 className="text-xl font-display font-extrabold text-ink tracking-tight mt-0.5">
                      Paket Rig Lengkap Pilihan Overtone
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-accent-subtle text-accent border border-accent/30 rounded-xs self-start md:self-auto">
                    Alokasi Rig Terbatas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {bundles.map((bundle) => (
                    <article
                      key={bundle.id}
                      className="rounded-sm border border-line bg-canvas p-4 flex flex-col justify-between hover:border-line-strong transition-colors duration-fast"
                    >
                      <div>
                        <div className="relative h-32 bg-surface-muted overflow-hidden mb-3 border border-line rounded-xs">
                          <img
                            src={
                              bundle.image_url ||
                              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80"
                            }
                            alt={`Paket rig ${bundle.name}`}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          {bundle.savings_amount > 0 && (
                            <span className="absolute top-2 right-2 bg-accent text-accent-on text-[10px] font-bold px-2 py-0.5 rounded-xs tabular-nums">
                              Hemat {formatRupiah(bundle.savings_amount)}
                            </span>
                          )}
                          <span className="absolute bottom-2 left-2 bg-surface/95 border border-line px-2 py-0.5 text-[10px] font-bold text-ink rounded-xs tabular-nums">
                            {bundle.bundle_code}
                          </span>
                        </div>

                        <h3 className="font-display font-bold text-sm text-ink line-clamp-1">
                          {bundle.name}
                        </h3>
                        <p className="text-[11px] text-ink-secondary mt-1 line-clamp-2">
                          {bundle.description}
                        </p>

                        <div className="mt-3 pt-2.5 border-t border-line space-y-1">
                          <p className="text-[10px] uppercase tracking-wider text-ink-muted font-bold">
                            Isi Paket:
                          </p>
                          {(bundle.items || []).slice(0, 3).map((item, idx) => (
                            <div
                              key={idx}
                              className="text-[11px] text-ink-secondary flex items-center gap-1.5 truncate tabular-nums"
                            >
                              <span
                                className="w-1 h-1 rounded-full bg-accent shrink-0"
                                aria-hidden="true"
                              />
                              <span className="truncate">
                                {item.qty}x {item.product_name} ({item.variant_name})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-line">
                        <div className="text-[11px] text-ink-muted line-through tabular-nums">
                          {formatRupiah(bundle.normal_total_price)}
                        </div>
                        <div className="text-base font-display font-extrabold text-ink flex items-baseline justify-between tabular-nums">
                          <span>{formatRupiah(bundle.bundle_price)}</span>
                          <Link
                            to="/offline-stores"
                            className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider font-bold text-accent hover:underline"
                          >
                            <span>Cek di Cabang</span>
                            <ArrowRight className="w-3 h-3" aria-hidden="true" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Bar Pengurutan & Chip Filter Aktif (Aturan G) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4 mb-4">
              <div className="text-xs text-ink-secondary font-medium tabular-nums">
                Menampilkan <strong className="font-bold text-ink">{filteredProducts.length}</strong>{" "}
                dari <strong className="font-bold text-ink">{allProducts.length}</strong> unit produk cinema
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="flex items-center gap-2 text-xs">
                  <label htmlFor="catalog-sort" className="text-ink-secondary font-bold">
                    Urutkan:
                  </label>
                  <select
                    id="catalog-sort"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      updateParams({ sort: e.target.value });
                    }}
                    className="rounded-sm border border-line-strong bg-surface px-3 py-1.5 text-xs font-bold text-ink cursor-pointer"
                  >
                    <option value="relevance">Relevansi Kurasi</option>
                    <option value="price_asc">Harga: Rendah ke Tinggi</option>
                    <option value="price_desc">Harga: Tinggi ke Rendah</option>
                    <option value="newest">Rilisan Terbaru</option>
                  </select>
                </div>

                <div className="flex items-center rounded-sm border border-line-strong bg-surface p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    aria-pressed={viewMode === "grid"}
                    aria-label="Tampilan Grid"
                    title="Tampilan Grid"
                    className={`rounded-xs p-1.5 transition-colors duration-fast ${
                      viewMode === "grid"
                        ? "bg-ink text-surface"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    <LayoutGrid size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    aria-pressed={viewMode === "list"}
                    aria-label="Tampilan Daftar"
                    title="Tampilan Daftar"
                    className={`rounded-xs p-1.5 transition-colors duration-fast ${
                      viewMode === "list"
                        ? "bg-ink text-surface"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    <List size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            {/* Baris Filter Aktif yang Selalu Terlihat (Aturan G) */}
            {hasActiveFilters && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Filter Aktif:
                </span>
                {selectedCategory !== "all" && (
                  <button
                    type="button"
                    onClick={() => handleCategoryChange("all")}
                    className="inline-flex items-center gap-1.5 rounded-xs border border-line-strong bg-surface px-2.5 py-1 text-xs font-bold text-ink hover:border-accent"
                  >
                    <span>Kategori: {selectedCategory}</span>
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
                {selectedBrands.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => handleBrandToggle(b)}
                    className="inline-flex items-center gap-1.5 rounded-xs border border-line-strong bg-surface px-2.5 py-1 text-xs font-bold text-ink hover:border-accent"
                  >
                    <span>Merek: {b}</span>
                    <X size={12} aria-hidden="true" />
                  </button>
                ))}
                {availability !== "all" && (
                  <button
                    type="button"
                    onClick={() => handleAvailabilityChange(availability)}
                    className="inline-flex items-center gap-1.5 rounded-xs border border-line-strong bg-surface px-2.5 py-1 text-xs font-bold text-ink hover:border-accent"
                  >
                    <span>{availability === "in_stock" ? "Stok Tersedia" : "Stok Habis"}</span>
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
                {(minPrice || maxPrice) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice("");
                      setMaxPrice("");
                      updateParams({ min_price: null, max_price: null });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xs border border-line-strong bg-surface px-2.5 py-1 text-xs font-bold text-ink hover:border-accent tabular-nums"
                  >
                    <span>
                      Harga: {minPrice ? formatRupiah(minPrice) : "Rp 0"} –{" "}
                      {maxPrice ? formatRupiah(maxPrice) : "Maks"}
                    </span>
                    <X size={12} aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs font-bold text-accent hover:underline ml-1"
                >
                  Hapus Semua
                </button>
              </div>
            )}

            {/* DAFTAR PRODUK */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <Skeleton key={n} className="h-80 w-full" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-md border border-dashed border-line-strong bg-surface p-10 text-center my-4">
                <Package
                  size={44}
                  className="mx-auto text-ink-muted mb-3"
                  aria-hidden="true"
                />
                <h2 className="font-display text-lg font-bold text-ink">
                  Tidak Ada Cinema Gear yang Sesuai Filter
                </h2>
                <p className="mt-1 text-xs text-ink-secondary max-w-md mx-auto leading-relaxed">
                  Longgarkan batas harga, hapus filter merek, atau kembali ke seluruh kategori untuk melihat kamera dan lensa yang tersedia.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="inline-flex items-center gap-1.5 rounded-sm bg-accent px-5 py-2.5 text-xs font-bold text-accent-on hover:bg-accent-hover transition-colors duration-fast"
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                    <span>Reset Semua Filter</span>
                  </button>
                  <Link
                    to="/offline-stores"
                    className="inline-flex items-center gap-1.5 rounded-sm border border-line-strong bg-canvas px-4 py-2.5 text-xs font-bold text-ink hover:bg-surface-muted transition-colors duration-fast"
                  >
                    <span>Tanyakan Stok di Cabang</span>
                  </Link>
                </div>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredProducts.map((p) => {
                  const stock = p.remaining_quota ?? p.stock ?? 0;
                  const isAvailable = stock > 0;
                  const brandName = p.brand?.name || p.brand || p.organizer || "Overtone";
                  const hasClearance = Boolean(p.has_clearance || p.is_clearance_active);
                  const clearanceDiscount = p.max_discount_percent || p.discount_percent || 0;
                  const originalPrice = p.min_price || p.price || 0;
                  const activeDisplayPrice =
                    hasClearance && p.effective_min_price
                      ? p.effective_min_price
                      : originalPrice;
                  const reviewCount = Number(p.review_count || 0);
                  const avgRating = p.avg_rating ? Number(p.avg_rating).toFixed(1) : null;

                  return (
                    <Link
                      key={p.id}
                      to={`/products/${p.id}`}
                      className="group relative rounded-md border border-line bg-surface p-4 sm:p-5 hover:border-ink transition-colors duration-fast flex flex-col sm:flex-row gap-5 items-center"
                    >
                      <div className="h-28 w-28 aspect-square shrink-0 rounded-sm bg-surface-muted border border-line p-2 flex items-center justify-center overflow-hidden">
                        {p.image_url ? (
                          <img
                            src={fileUrl(p.image_url)}
                            alt={`Foto ${p.name} oleh ${brandName}`}
                            loading="lazy"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Package size={32} className="text-ink-muted" aria-hidden="true" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                            {brandName}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                            • {p.instrument_type || p.category || "Cinema Gear"}
                          </span>
                          {hasClearance && clearanceDiscount > 0 && (
                            <span className="rounded-xs bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-on">
                              Diskon -{clearanceDiscount}%
                            </span>
                          )}
                        </div>
                        <h3 className="font-display text-base font-bold text-ink mt-0.5 truncate group-hover:text-accent transition-colors duration-fast">
                          {p.name}
                        </h3>
                        {avgRating && reviewCount > 0 && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs">
                            <span className="text-accent font-bold" aria-hidden="true">
                              ★
                            </span>
                            <span className="tabular-nums font-bold text-ink">{avgRating}</span>
                            <span className="tabular-nums text-[11px] text-ink-muted">
                              ({reviewCount} ulasan)
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-ink-secondary line-clamp-2 mt-1 leading-relaxed">
                          {p.description ||
                            "Peralatan cinema & broadcast bergaransi distributor resmi Overtone Pro Cinema Store."}
                        </p>
                      </div>

                      <div className="sm:text-right shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-line pt-3 sm:pt-0 flex sm:block items-center justify-between">
                        {hasClearance && activeDisplayPrice < originalPrice ? (
                          <div>
                            <span className="block text-xs text-ink-muted line-through tabular-nums">
                              {formatRupiah(originalPrice)}
                            </span>
                            <p className="font-display text-base font-extrabold text-accent tabular-nums">
                              {formatRupiah(activeDisplayPrice)}
                            </p>
                          </div>
                        ) : (
                          <p className="font-display text-base font-extrabold text-ink tabular-nums">
                            {formatRupiah(originalPrice)}
                          </p>
                        )}
                        <p className="mt-1 text-xs font-bold tabular-nums">
                          {isAvailable ? (
                            <span className="text-status-success-text">Stok: {stock} unit</span>
                          ) : (
                            <span className="text-ink-muted">Stok Habis</span>
                          )}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

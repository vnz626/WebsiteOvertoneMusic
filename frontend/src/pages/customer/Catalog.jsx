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
    const next = availability === val ? "all" : val;
    setAvailability(next);
    updateParams({ availability: next === "all" ? null : next });
  }

  function resetAllFilters() {
    setSearchQuery("");
    setSelectedBrands([]);
    setAvailability("all");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("relevance");
    setSearchParams({});
  }

  const categoryList = useMemo(() => {
    const fromApi = Array.from(
      new Set(allProducts.map((p) => p.category || p.instrument_type).filter(Boolean))
    );
    return fromApi.length > 0 ? fromApi : OFFICIAL_CINEMA_CATEGORIES;
  }, [allProducts]);

  const dynamicBrands = useMemo(() => {
    const scoped =
      selectedCategory === "all"
        ? allProducts
        : allProducts.filter(
            (p) =>
              (p.category || p.instrument_type || "").toLowerCase() ===
              selectedCategory.toLowerCase()
          );

    const map = new Map();
    scoped.forEach((p) => {
      const b = p.brand?.name || p.brand || p.organizer;
      if (b) {
        map.set(b, (map.get(b) || 0) + 1);
      }
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allProducts, selectedCategory]);

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.brand?.name?.toLowerCase().includes(q) ||
          p.organizer?.toLowerCase().includes(q) ||
          p.sku_prefix?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter(
        (p) =>
          (p.category || p.instrument_type || "").toLowerCase() ===
          selectedCategory.toLowerCase()
      );
    }

    if (selectedBrands.length > 0) {
      result = result.filter((p) => {
        const b = p.brand?.name || p.brand || p.organizer;
        return selectedBrands.includes(b);
      });
    }

    if (availability === "in_stock") {
      result = result.filter((p) => (p.remaining_quota ?? p.stock ?? 0) > 0);
    } else if (availability === "out_of_stock") {
      result = result.filter((p) => (p.remaining_quota ?? p.stock ?? 0) <= 0);
    }

    if (minPrice) {
      const min = Number(minPrice);
      if (!isNaN(min)) {
        result = result.filter((p) => {
          const price = p.min_price || p.price || 0;
          return price >= min;
        });
      }
    }

    if (maxPrice) {
      const max = Number(maxPrice);
      if (!isNaN(max)) {
        result = result.filter((p) => {
          const price = p.min_price || p.price || 0;
          return price <= max;
        });
      }
    }

    if (sortBy === "price_asc") {
      result.sort((a, b) => (a.min_price || a.price || 0) - (b.min_price || b.price || 0));
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => (b.min_price || b.price || 0) - (a.min_price || a.price || 0));
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
    <div className="min-h-screen fp-home-canvas pb-24">
      {/* Header Frosted Glass Bar */}
      <div className="fp-glass-bar py-7 mb-8">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12">
          <div className="flex items-center gap-2 mb-3">
            <div className="fp-section-pill">
              <span className="fp-section-pill-dot" aria-hidden="true" />
              <span>Katalog Resmi Focalpoint Pro</span>
            </div>
            {selectedCategory !== "all" && (
              <span className="rounded-full bg-[#0F1B2D]/[0.06] border border-[#0F1B2D]/10 px-3 py-1 text-[11px] font-bold text-[#E8622C]">
                {selectedCategory}
              </span>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0F1B2D] tracking-tight">
                {selectedCategory === "all" ? "Katalog Cinema Cameras & Broadcast Gear" : selectedCategory}
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-[#3A4A63] max-w-2xl leading-relaxed">
                Unit 100% orisinal bergaransi resmi distributor internasional dengan kalibrasi sensor 10-point &amp; sertifikasi QC studio.
              </p>
            </div>

            {/* Pencarian Glass Pill */}
            <div className="relative w-full md:w-84">
              <Search
                size={15}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#3A4A63]"
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
                className="h-10 w-full rounded-full border border-white/80 bg-white/70 backdrop-blur-md pl-10 pr-8 text-xs font-medium text-[#0F1B2D] placeholder:text-[#3A4A63]/80 focus:border-[#E8622C] focus:bg-white focus:outline-none transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Bersihkan kata kunci pencarian"
                  onClick={() => {
                    setSearchQuery("");
                    updateParams({ q: null });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3A4A63] hover:text-[#0F1B2D] p-1 cursor-pointer"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* 1. SIDEBAR FILTER KIRI */}
          <aside aria-label="Filter katalog produk" className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#0F1B2D]/10">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-[#0F1B2D] flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-[#E8622C]" aria-hidden="true" />
                <span>Filter Katalog</span>
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-[11px] font-bold text-[#E8622C] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} aria-hidden="true" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            {/* ACCORDION 1: KATEGORI */}
            <div className="fp-glass-card !p-0 !rounded-2xl overflow-hidden">
              <button
                type="button"
                aria-expanded={accordionOpen.category}
                onClick={() => toggleAccordion("category")}
                className="w-full px-4 py-3.5 bg-white/50 backdrop-blur-md flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-[#0F1B2D] hover:bg-white/80 transition-colors cursor-pointer"
              >
                <span>Kategori Cinema &amp; Broadcast</span>
                {accordionOpen.category ? (
                  <ChevronUp size={15} aria-hidden="true" />
                ) : (
                  <ChevronDown size={15} aria-hidden="true" />
                )}
              </button>

              {accordionOpen.category && (
                <div className="p-2 space-y-1 border-t border-[#0F1B2D]/10 bg-white/40">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange("all")}
                    className={`w-full text-left px-3 py-2 text-xs transition-all flex items-center justify-between cursor-pointer rounded-xl ${
                      selectedCategory === "all"
                        ? "font-bold text-white bg-[#0F1B2D] shadow-xs"
                        : "text-[#3A4A63] hover:bg-[#0F1B2D]/[0.05] hover:text-[#0F1B2D]"
                    }`}
                  >
                    <span>Semua Kategori</span>
                    <span className={`text-[11px] tabular-nums ${selectedCategory === "all" ? "text-white/70" : "text-[#3A4A63]"}`}>
                      ({allProducts.length})
                    </span>
                  </button>

                  {categoryList.map((c) => {
                    const isSelected = selectedCategory.toLowerCase() === c.toLowerCase();
                    const count = allProducts.filter(
                      (p) => (p.category || p.instrument_type || "").toLowerCase() === c.toLowerCase()
                    ).length;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleCategoryChange(c)}
                        className={`w-full text-left px-3 py-2 text-xs transition-all flex items-center justify-between cursor-pointer rounded-xl ${
                          isSelected
                            ? "font-bold text-white bg-[#0F1B2D] shadow-xs"
                            : "text-[#3A4A63] hover:bg-[#0F1B2D]/[0.05] hover:text-[#0F1B2D]"
                        }`}
                      >
                        <span className="truncate">{c}</span>
                        <span className={`text-[11px] tabular-nums ${isSelected ? "text-white/70" : "text-[#3A4A63]"}`}>
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ACCORDION 2: MEREK */}
            <div className="fp-glass-card !p-0 !rounded-2xl overflow-hidden">
              <button
                type="button"
                aria-expanded={accordionOpen.brand}
                onClick={() => toggleAccordion("brand")}
                className="w-full px-4 py-3.5 bg-white/50 backdrop-blur-md flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-[#0F1B2D] hover:bg-white/80 transition-colors cursor-pointer"
              >
                <span>Merek Resmi (Brand)</span>
                {accordionOpen.brand ? (
                  <ChevronUp size={15} aria-hidden="true" />
                ) : (
                  <ChevronDown size={15} aria-hidden="true" />
                )}
              </button>

              {accordionOpen.brand && (
                <div className="p-3.5 space-y-2 border-t border-[#0F1B2D]/10 max-h-60 overflow-y-auto bg-white/40">
                  {dynamicBrands.length === 0 ? (
                    <p className="text-xs text-[#3A4A63] py-1">
                      Tidak ada merek di kategori ini.
                    </p>
                  ) : (
                    dynamicBrands.map((b) => {
                      const isChecked = selectedBrands.includes(b.name);
                      return (
                        <label
                          key={b.name}
                          className="flex items-center justify-between cursor-pointer text-xs text-[#3A4A63] hover:text-[#0F1B2D] py-1 px-1 rounded-lg hover:bg-white/60 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleBrandToggle(b.name)}
                              className="h-4 w-4 rounded-xs accent-[#E8622C] cursor-pointer"
                            />
                            <span className={isChecked ? "font-bold text-[#0F1B2D]" : "font-medium"}>
                              {b.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#3A4A63] tabular-nums">
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
            <div className="fp-glass-card !p-0 !rounded-2xl overflow-hidden">
              <button
                type="button"
                aria-expanded={accordionOpen.availability}
                onClick={() => toggleAccordion("availability")}
                className="w-full px-4 py-3.5 bg-white/50 backdrop-blur-md flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-[#0F1B2D] hover:bg-white/80 transition-colors cursor-pointer"
              >
                <span>Ketersediaan Stok</span>
                {accordionOpen.availability ? (
                  <ChevronUp size={15} aria-hidden="true" />
                ) : (
                  <ChevronDown size={15} aria-hidden="true" />
                )}
              </button>

              {accordionOpen.availability && (
                <div className="p-3.5 space-y-2.5 border-t border-[#0F1B2D]/10 bg-white/40">
                  <label className="flex items-center justify-between cursor-pointer text-xs text-[#3A4A63] hover:text-[#0F1B2D] py-0.5">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={availability === "in_stock"}
                        onChange={() => handleAvailabilityChange("in_stock")}
                        className="h-4 w-4 rounded-xs accent-[#E8622C] cursor-pointer"
                      />
                      <span>Stok Tersedia (Siap Kirim)</span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs" aria-hidden="true" />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-xs text-[#3A4A63] hover:text-[#0F1B2D] py-0.5">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={availability === "out_of_stock"}
                        onChange={() => handleAvailabilityChange("out_of_stock")}
                        className="h-4 w-4 rounded-xs accent-[#E8622C] cursor-pointer"
                      />
                      <span>Stok Habis</span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-[#3A4A63]/50" aria-hidden="true" />
                  </label>
                </div>
              )}
            </div>

            {/* ACCORDION 4: KISARAN HARGA */}
            <div className="fp-glass-card !p-0 !rounded-2xl overflow-hidden">
              <button
                type="button"
                aria-expanded={accordionOpen.price}
                onClick={() => toggleAccordion("price")}
                className="w-full px-4 py-3.5 bg-white/50 backdrop-blur-md flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-[#0F1B2D] hover:bg-white/80 transition-colors cursor-pointer"
              >
                <span>Rentang Harga (Rp)</span>
                {accordionOpen.price ? (
                  <ChevronUp size={15} aria-hidden="true" />
                ) : (
                  <ChevronDown size={15} aria-hidden="true" />
                )}
              </button>

              {accordionOpen.price && (
                <div className="p-3.5 border-t border-[#0F1B2D]/10 space-y-3 bg-white/40">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor="catalog-min-price"
                        className="block text-[10px] font-bold text-[#3A4A63] uppercase mb-1"
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
                        className="w-full rounded-xl border border-white/80 bg-white/70 py-1.5 px-2.5 text-xs tabular-nums text-[#0F1B2D] focus:border-[#E8622C] focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="catalog-max-price"
                        className="block text-[10px] font-bold text-[#3A4A63] uppercase mb-1"
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
                        className="w-full rounded-xl border border-white/80 bg-white/70 py-1.5 px-2.5 text-xs tabular-nums text-[#0F1B2D] focus:border-[#E8622C] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-[#0F1B2D]/10">
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
                        className="block w-full text-left text-[11px] font-medium text-[#3A4A63] hover:text-[#E8622C] py-1 truncate tabular-nums cursor-pointer"
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
                className="mb-8 fp-dark-glass-section !rounded-3xl p-6 sm:p-7 border border-white/10"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/10 mb-5 gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-[#E8622C] text-[11px] font-bold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Curated Indie Filmmaker Production Kits</span>
                    </div>
                    <h2 className="text-xl font-display font-extrabold text-white tracking-tight mt-0.5">
                      Paket Rig Lengkap Pilihan Focalpoint Pro
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-[#E8622C]/20 text-[#E8622C] border border-[#E8622C]/40 rounded-full self-start md:self-auto">
                    Alokasi Rig Terbatas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {bundles.map((bundle) => (
                    <article
                      key={bundle.id}
                      className="fp-glass-card-dark p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative aspect-[16/10] bg-black/40 overflow-hidden mb-3 border border-white/15 rounded-xl">
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
                            <span className="absolute top-2 right-2 bg-[#E8622C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                              Hemat {formatRupiah(bundle.savings_amount)}
                            </span>
                          )}
                          <span className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md border border-white/20 px-2 py-0.5 text-[10px] font-bold text-white rounded-md tabular-nums">
                            {bundle.bundle_code}
                          </span>
                        </div>

                        <h3 className="font-display font-bold text-sm text-white line-clamp-1">
                          {bundle.name}
                        </h3>
                        <p className="text-[11px] text-white/70 mt-1 line-clamp-2">
                          {bundle.description}
                        </p>

                        <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1">
                          <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">
                            Isi Paket:
                          </p>
                          {(bundle.items || []).slice(0, 3).map((item, idx) => (
                            <div
                              key={idx}
                              className="text-[11px] text-white/80 flex items-center gap-1.5 truncate tabular-nums"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-[#E8622C] shrink-0"
                                aria-hidden="true"
                              />
                              <span className="truncate">
                                {item.qty}x {item.product_name} ({item.variant_name})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10">
                        <div className="text-[11px] text-white/50 line-through tabular-nums">
                          {formatRupiah(bundle.normal_total_price)}
                        </div>
                        <div className="text-base font-display font-extrabold text-white flex items-baseline justify-between tabular-nums">
                          <span>{formatRupiah(bundle.bundle_price)}</span>
                          <Link
                            to="/offline-stores"
                            className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider font-bold text-[#E8622C] hover:underline"
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

            {/* Toolbar Pengurutan & Filter Aktif */}
            <div className="fp-glass-card !p-3 !rounded-2xl mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-[#3A4A63] font-medium tabular-nums pl-1">
                Menampilkan <strong className="font-extrabold text-[#0F1B2D]">{filteredProducts.length}</strong>{" "}
                dari <strong className="font-extrabold text-[#0F1B2D]">{allProducts.length}</strong> unit gear produksi
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="flex items-center gap-2 text-xs">
                  <label htmlFor="catalog-sort" className="text-[#3A4A63] font-bold">
                    Urutkan:
                  </label>
                  <select
                    id="catalog-sort"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      updateParams({ sort: e.target.value });
                    }}
                    className="rounded-full border border-white/80 bg-white/70 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-[#0F1B2D] cursor-pointer focus:outline-none focus:border-[#E8622C] shadow-xs"
                  >
                    <option value="relevance">Relevansi Kurasi</option>
                    <option value="price_asc">Harga: Rendah ke Tinggi</option>
                    <option value="price_desc">Harga: Tinggi ke Rendah</option>
                    <option value="newest">Rilisan Terbaru</option>
                  </select>
                </div>

                <div className="flex items-center rounded-full border border-[#0F1B2D]/10 bg-white/60 p-0.5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    aria-pressed={viewMode === "grid"}
                    aria-label="Tampilan Grid"
                    title="Tampilan Grid"
                    className={`rounded-full p-1.5 transition-all cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-[#0F1B2D] text-white shadow-xs"
                        : "text-[#3A4A63] hover:text-[#0F1B2D]"
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
                    className={`rounded-full p-1.5 transition-all cursor-pointer ${
                      viewMode === "list"
                        ? "bg-[#0F1B2D] text-white shadow-xs"
                        : "text-[#3A4A63] hover:text-[#0F1B2D]"
                    }`}
                  >
                    <List size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            {/* Baris Filter Aktif */}
            {hasActiveFilters && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3A4A63]">
                  Filter Aktif:
                </span>
                {selectedCategory !== "all" && (
                  <button
                    type="button"
                    onClick={() => handleCategoryChange("all")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-[#0F1B2D] hover:border-[#E8622C] shadow-xs cursor-pointer"
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
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-[#0F1B2D] hover:border-[#E8622C] shadow-xs cursor-pointer"
                  >
                    <span>Merek: {b}</span>
                    <X size={12} aria-hidden="true" />
                  </button>
                ))}
                {availability !== "all" && (
                  <button
                    type="button"
                    onClick={() => handleAvailabilityChange(availability)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-[#0F1B2D] hover:border-[#E8622C] shadow-xs cursor-pointer"
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
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-[#0F1B2D] hover:border-[#E8622C] shadow-xs cursor-pointer tabular-nums"
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
                  className="text-xs font-bold text-[#E8622C] hover:underline ml-1 cursor-pointer"
                >
                  Hapus Semua
                </button>
              </div>
            )}

            {/* DAFTAR PRODUK */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <Skeleton key={n} className="h-80 w-full rounded-3xl" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="fp-glass-card !p-12 text-center my-4">
                <Package
                  size={44}
                  className="mx-auto text-[#3A4A63] mb-3"
                  aria-hidden="true"
                />
                <h2 className="font-display text-lg font-bold text-[#0F1B2D]">
                  Tidak Ada Cinema Gear yang Sesuai Filter
                </h2>
                <p className="mt-1 text-xs text-[#3A4A63] max-w-md mx-auto leading-relaxed">
                  Longgarkan batas harga, hapus filter merek, atau kembali ke seluruh kategori untuk melihat kamera dan lensa yang tersedia.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="fp-btn-glass-primary !py-2.5 !px-5"
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                    <span>Reset Semua Filter</span>
                  </button>
                  <Link
                    to="/offline-stores"
                    className="fp-btn-glass-secondary !py-2.5 !px-5"
                  >
                    <span>Tanyakan Stok di Cabang</span>
                  </Link>
                </div>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProducts.map((p) => {
                  const stock = p.remaining_quota ?? p.stock ?? 0;
                  const isAvailable = stock > 0;
                  const brandName = p.brand?.name || p.brand || p.organizer || "Focalpoint Pro";
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
                      className="group fp-glass-card !p-4 sm:!p-5 flex flex-col sm:flex-row gap-5 items-center cursor-pointer"
                    >
                      <div className="h-28 w-28 aspect-square shrink-0 fp-glass-stage p-2 flex items-center justify-center overflow-hidden">
                        {p.image_url ? (
                          <img
                            src={fileUrl(p.image_url)}
                            alt={`Foto ${p.name} oleh ${brandName}`}
                            loading="lazy"
                            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <Package size={32} className="text-[#3A4A63]" aria-hidden="true" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#E8622C]">
                            {brandName}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#3A4A63]">
                            • {p.instrument_type || p.category || "Cinema Gear"}
                          </span>
                          {hasClearance && clearanceDiscount > 0 && (
                            <span className="rounded-full bg-[#E8622C] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              Diskon -{clearanceDiscount}%
                            </span>
                          )}
                        </div>
                        <h3 className="font-display text-base font-bold text-[#0F1B2D] mt-1 truncate group-hover:text-[#E8622C] transition-colors">
                          {p.name}
                        </h3>
                        {avgRating && reviewCount > 0 && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs">
                            <span className="text-[#E8622C] font-bold" aria-hidden="true">
                              ★
                            </span>
                            <span className="tabular-nums font-bold text-[#0F1B2D]">{avgRating}</span>
                            <span className="tabular-nums text-[11px] text-[#3A4A63]">
                              ({reviewCount} ulasan)
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-[#3A4A63] line-clamp-2 mt-1 leading-relaxed">
                          {p.description ||
                            "Peralatan cinema & broadcast bergaransi distributor resmi Focalpoint Pro."}
                        </p>
                      </div>

                      <div className="sm:text-right shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-[#0F1B2D]/10 pt-3 sm:pt-0 flex sm:block items-center justify-between">
                        {hasClearance && activeDisplayPrice < originalPrice ? (
                          <div>
                            <span className="block text-xs text-[#3A4A63] line-through tabular-nums">
                              {formatRupiah(originalPrice)}
                            </span>
                            <p className="font-display text-base font-extrabold text-[#E8622C] tabular-nums">
                              {formatRupiah(activeDisplayPrice)}
                            </p>
                          </div>
                        ) : (
                          <p className="font-display text-base font-extrabold text-[#0F1B2D] tabular-nums">
                            {formatRupiah(originalPrice)}
                          </p>
                        )}
                        <p className="mt-1 text-xs font-bold tabular-nums">
                          {isAvailable ? (
                            <span className="text-emerald-700">Stok: {stock} unit</span>
                          ) : (
                            <span className="text-[#3A4A63]">Stok Habis</span>
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

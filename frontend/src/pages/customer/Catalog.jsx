import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Grid,
  LayoutGrid,
  List,
  Package,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
  Check
} from "lucide-react";
import api from "../../api";
import { fileUrl, formatRupiah } from "../../utils/format";

const CATEGORIES_LIST = [
  "Electric Guitars",
  "Acoustic Guitars",
  "Bass Guitars",
  "Drums & Percussion",
  "Keyboards & Synths",
  "Pro Audio & Studio",
];

const PRICE_PRESETS = [
  { label: "Semua Harga", min: null, max: null },
  { label: "Di bawah Rp 5 Juta", min: 0, max: 5000000 },
  { label: "Rp 5 Juta - Rp 15 Juta", min: 5000000, max: 15000000 },
  { label: "Rp 15 Juta - Rp 30 Juta", min: 15000000, max: 30000000 },
  { label: "Di atas Rp 30 Juta", min: 30000000, max: null },
];

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const selectedCategory = searchParams.get("category") || "all";
  const [selectedBrands, setSelectedBrands] = useState(() => {
    const b = searchParams.get("brand");
    return b ? b.split(",").filter(Boolean) : [];
  });
  const [availability, setAvailability] = useState(searchParams.get("availability") || "all"); // 'all' | 'in_stock' | 'out_of_stock'
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "relevance");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'

  // Accordion open/close states
  const [accordionOpen, setAccordionOpen] = useState({
    category: true,
    brand: true,
    availability: true,
    price: true,
  });

  const toggleAccordion = (key) => {
    setAccordionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Load all published products
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
  }, []);

  // Update query params in URL
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
    updateParams({ category: cat });
    // Reset selected brands if they don't apply, or let the user re-pick
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

  // DYNAMIC REACTIVE BRAND FILTER:
  // Calculate available brands based solely on the currently selected category!
  const dynamicBrands = useMemo(() => {
    const productsInCat = selectedCategory === "all"
      ? allProducts
      : allProducts.filter((p) => (p.category || "").toLowerCase() === selectedCategory.toLowerCase());

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

  // FILTER & SORT PRODUCTS
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // 1. Search Query
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

    // 2. Category
    if (selectedCategory !== "all") {
      result = result.filter(
        (p) => (p.category || "").toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // 3. Brands (Multiple select)
    if (selectedBrands.length > 0) {
      result = result.filter((p) => {
        const bName = p.brand?.name || p.brand || p.organizer;
        return selectedBrands.includes(bName);
      });
    }

    // 4. Availability
    if (availability === "in_stock") {
      result = result.filter((p) => (p.remaining_quota || p.stock || 0) > 0);
    } else if (availability === "out_of_stock") {
      result = result.filter((p) => (p.remaining_quota || p.stock || 0) <= 0);
    }

    // 5. Price Range
    if (minPrice) {
      result = result.filter((p) => (p.price || p.min_price || 0) >= Number(minPrice));
    }
    if (maxPrice) {
      result = result.filter((p) => (p.price || p.min_price || 0) <= Number(maxPrice));
    }

    // 6. Sorting
    if (sortBy === "price_asc") {
      result.sort((a, b) => (a.price || a.min_price || 0) - (b.price || b.min_price || 0));
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => (b.price || b.min_price || 0) - (a.price || a.min_price || 0));
    } else if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    return result;
  }, [allProducts, searchQuery, selectedCategory, selectedBrands, availability, minPrice, maxPrice, sortBy]);

  const hasActiveFilters =
    selectedCategory !== "all" ||
    selectedBrands.length > 0 ||
    availability !== "all" ||
    Boolean(minPrice) ||
    Boolean(maxPrice) ||
    Boolean(searchQuery);

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24">
      {/* Editorial Breadcrumb & Header Bar */}
      <div className="border-b border-gray-200 bg-[#FBFBFB]">
        <div className="mx-auto max-w-[1440px] px-6 py-6 lg:px-12">
          <nav className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Link to="/" className="hover:text-black transition-colors">Beranda</Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Katalog Alat Musik</span>
            {selectedCategory !== "all" && (
              <>
                <span>/</span>
                <span className="text-[#8C7A5B] font-semibold">{selectedCategory}</span>
              </>
            )}
          </nav>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {selectedCategory === "all" ? "Katalog Instrumen Musik" : selectedCategory}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-600">
                Peralatan musik orisinal bergaransi distributor resmi Overtone Music Store.
              </p>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  updateParams({ q: e.target.value });
                }}
                placeholder="Cari tipe instrumen atau SKU..."
                className="w-full rounded-full border border-gray-200 bg-white py-2 pl-10 pr-4 text-xs font-medium text-gray-900 placeholder-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    updateParams({ q: null });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-6 pt-8 lg:px-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* ============================================================== */}
          {/* 1. SIDEBAR FILTER KIRI (ACCORDION ABU-ABU MUDA #F5F5F5)        */}
          {/* ============================================================== */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <SlidersHorizontal size={14} /> Filter Produk
              </span>
              {hasActiveFilters && (
                <button
                  onClick={resetAllFilters}
                  className="text-[11px] font-semibold text-[#8C7A5B] hover:text-black flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={12} /> Reset Filter
                </button>
              )}
            </div>

            {/* ACCORDION 1: KATEGORI */}
            <div className="rounded-xl border border-gray-200 bg-[#F5F5F5] overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleAccordion("category")}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-gray-900 hover:bg-gray-200/60 transition-colors"
              >
                <span>Kategori Gear</span>
                {accordionOpen.category ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {accordionOpen.category && (
                <div className="px-4 pb-4 pt-1 space-y-1.5 border-t border-gray-200/80 bg-white">
                  <button
                    onClick={() => handleCategoryChange("all")}
                    className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition-colors flex items-center justify-between ${
                      selectedCategory === "all"
                        ? "font-bold text-black bg-gray-100"
                        : "text-gray-600 hover:bg-gray-50 hover:text-black"
                    }`}
                  >
                    <span>Semua Kategori</span>
                    <span className="text-[11px] text-gray-400 font-mono">({allProducts.length})</span>
                  </button>

                  {CATEGORIES_LIST.map((c) => {
                    const isSelected = selectedCategory.toLowerCase() === c.toLowerCase();
                    const count = allProducts.filter((p) => (p.category || "").toLowerCase() === c.toLowerCase()).length;
                    return (
                      <button
                        key={c}
                        onClick={() => handleCategoryChange(c)}
                        className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition-colors flex items-center justify-between ${
                          isSelected
                            ? "font-bold text-black bg-gray-100"
                            : "text-gray-600 hover:bg-gray-50 hover:text-black"
                        }`}
                      >
                        <span className="truncate">{c}</span>
                        <span className="text-[11px] text-gray-400 font-mono">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ACCORDION 2: MEREK (DYNAMIC BRAND FILTER - REACTIVE TO CATEGORY) */}
            <div className="rounded-xl border border-gray-200 bg-[#F5F5F5] overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleAccordion("brand")}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-gray-900 hover:bg-gray-200/60 transition-colors"
              >
                <span>Merek (Brand)</span>
                {accordionOpen.brand ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {accordionOpen.brand && (
                <div className="px-4 pb-4 pt-2 space-y-2 border-t border-gray-200/80 bg-white max-h-60 overflow-y-auto">
                  {dynamicBrands.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">
                      Tidak ada merek yang cocok di kategori ini.
                    </p>
                  ) : (
                    dynamicBrands.map((b) => {
                      const isChecked = selectedBrands.includes(b.name);
                      return (
                        <label
                          key={b.name}
                          className="flex items-center justify-between cursor-pointer text-xs text-gray-700 hover:text-black py-0.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleBrandToggle(b.name)}
                              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                            />
                            <span className={isChecked ? "font-bold text-black" : "font-normal"}>
                              {b.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400 font-mono">({b.count})</span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* ACCORDION 3: KETERSEDIAAN (AVAILABILITY) */}
            <div className="rounded-xl border border-gray-200 bg-[#F5F5F5] overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleAccordion("availability")}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-gray-900 hover:bg-gray-200/60 transition-colors"
              >
                <span>Ketersediaan Stok</span>
                {accordionOpen.availability ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {accordionOpen.availability && (
                <div className="px-4 pb-4 pt-2 space-y-2.5 border-t border-gray-200/80 bg-white">
                  <label className="flex items-center justify-between cursor-pointer text-xs text-gray-700 hover:text-black">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={availability === "in_stock"}
                        onChange={() => handleAvailabilityChange("in_stock")}
                        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                      />
                      <span>Tersedia (In Stock)</span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-xs text-gray-700 hover:text-black">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={availability === "out_of_stock"}
                        onChange={() => handleAvailabilityChange("out_of_stock")}
                        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black accent-black cursor-pointer"
                      />
                      <span>Stok Habis (Out of Stock)</span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                  </label>
                </div>
              )}
            </div>

            {/* ACCORDION 4: KISARAN HARGA (IDR) */}
            <div className="rounded-xl border border-gray-200 bg-[#F5F5F5] overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleAccordion("price")}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-gray-900 hover:bg-gray-200/60 transition-colors"
              >
                <span>Kisaran Harga (IDR)</span>
                {accordionOpen.price ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {accordionOpen.price && (
                <div className="px-4 pb-4 pt-3 border-t border-gray-200/80 bg-white space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">Min (IDR)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={minPrice}
                        onChange={(e) => {
                          setMinPrice(e.target.value);
                          updateParams({ min_price: e.target.value });
                        }}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-black"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase">Max (IDR)</label>
                      <input
                        type="number"
                        placeholder="Maksimal"
                        value={maxPrice}
                        onChange={(e) => {
                          setMaxPrice(e.target.value);
                          updateParams({ max_price: e.target.value });
                        }}
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
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
                        className="block w-full text-left text-[11px] text-gray-600 hover:text-black py-0.5 truncate"
                      >
                        • {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </aside>

          {/* ============================================================== */}
          {/* 2. TOP BAR & PRODUCT GRID / LIST VIEW (COL 9)                   */}
          {/* ============================================================== */}
          <main className="lg:col-span-9">
            
            {/* Top Bar Katalog */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4 mb-6">
              
              {/* Kiri: Info Jumlah Hasil */}
              <div className="text-xs text-gray-600 font-medium">
                Halaman 1 | Menunjukkan 1–{Math.min(filteredProducts.length, filteredProducts.length)} dari{" "}
                <span className="font-bold text-gray-900">{filteredProducts.length}</span> hasil ditemukan
              </div>

              {/* Kanan: Dropdown "Urut berdasarkan" & View Toggle */}
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 font-medium hidden sm:inline">Urut berdasarkan:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      updateParams({ sort: e.target.value });
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 outline-none focus:border-black cursor-pointer"
                  >
                    <option value="relevance">Relevansi</option>
                    <option value="price_asc">Harga: Rendah ke Tinggi</option>
                    <option value="price_desc">Harga: Tinggi ke Rendah</option>
                    <option value="newest">Terbaru</option>
                  </select>
                </div>

                {/* View Toggle: Grid vs List */}
                <div className="flex items-center rounded-lg border border-gray-300 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    title="Tampilan Grid (4 Kolom)"
                    className={`rounded-md p-1.5 transition-colors ${
                      viewMode === "grid"
                        ? "bg-[#111111] text-white"
                        : "text-gray-500 hover:text-black"
                    }`}
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    title="Tampilan List"
                    className={`rounded-md p-1.5 transition-colors ${
                      viewMode === "list"
                        ? "bg-[#111111] text-white"
                        : "text-gray-500 hover:text-black"
                    }`}
                  >
                    <List size={15} />
                  </button>
                </div>
              </div>

            </div>

            {/* PRODUCT LISTINGS */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div key={n} className="animate-pulse rounded-2xl bg-gray-200 h-80" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-[#F9FAFB] p-12 text-center my-6">
                <Package size={48} className="mx-auto text-gray-400 stroke-1 mb-3" />
                <h3 className="text-base font-bold text-gray-900">Tidak Ada Produk yang Cocok</h3>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                  Cobalah menyesuaikan filter pencarian, memilih kategori lain, atau reset semua filter.
                </p>
                <button
                  onClick={resetAllFilters}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#111111] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-black"
                >
                  <RotateCcw size={13} /> Reset Semua Filter
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* GRID VIEW (4 KOLOM) */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {filteredProducts.map((p) => {
                  const stock = p.remaining_quota || p.stock || 0;
                  const isAvailable = stock > 0;
                  const brandName = p.brand?.name || p.brand || p.organizer || "Overtone";
                  const hasClearance = Boolean(p.has_clearance || p.is_clearance_active);
                  const clearanceDiscount = p.max_discount_percent || p.discount_percent || 0;
                  const originalPrice = p.min_price || p.price || 0;
                  const activeDisplayPrice = hasClearance && p.effective_min_price ? p.effective_min_price : originalPrice;

                  return (
                    <Link
                      key={p.id}
                      to={`/products/${p.id}`}
                      className="group relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-900 hover:shadow-md transition-all flex flex-col"
                    >
                      {/* Badge Clearance Promo */}
                      {hasClearance && (
                        <div className="absolute top-3 left-3 z-10">
                          <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-xs">
                            CLEARANCE -{clearanceDiscount}%
                          </span>
                        </div>
                      )}

                      {/* Gambar Bersih di Atas Putih (aspect-square, object-contain) */}
                      <div className="aspect-square w-full rounded-xl bg-white border border-gray-100 p-4 flex items-center justify-center overflow-hidden">
                        {p.image_url ? (
                          <img
                            src={fileUrl(p.image_url)}
                            alt={p.name}
                            className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <Package size={40} className="text-gray-300" />
                        )}
                      </div>

                      {/* Info Produk */}
                      <div className="mt-4 flex-1 flex flex-col">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A5B]">
                          {brandName}
                        </p>
                        <h3 className="mt-1 text-xs font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-black">
                          {p.name}
                        </h3>

                        <div className="mt-auto pt-3">
                          {hasClearance ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-400 font-semibold line-through">
                                  {formatRupiah(originalPrice)}
                                </span>
                              </div>
                              <p className="text-sm font-black text-red-600">
                                {formatRupiah(activeDisplayPrice)}
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm font-extrabold text-gray-900">
                              {formatRupiah(originalPrice)}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] font-semibold">
                            {isAvailable ? (
                              <span className="text-[#16A34A]">Tersedia</span>
                            ) : (
                              <span className="text-gray-400">Stok Habis</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="space-y-4">
                {filteredProducts.map((p) => {
                  const stock = p.remaining_quota || p.stock || 0;
                  const isAvailable = stock > 0;
                  const brandName = p.brand?.name || p.brand || p.organizer || "Overtone";
                  const hasClearance = Boolean(p.has_clearance || p.is_clearance_active);
                  const clearanceDiscount = p.max_discount_percent || p.discount_percent || 0;
                  const originalPrice = p.min_price || p.price || 0;
                  const activeDisplayPrice = hasClearance && p.effective_min_price ? p.effective_min_price : originalPrice;

                  return (
                    <Link
                      key={p.id}
                      to={`/products/${p.id}`}
                      className="group relative rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm hover:border-gray-900 transition-all flex flex-col sm:flex-row gap-5 items-center"
                    >
                      {hasClearance && (
                        <div className="absolute top-3 left-3 sm:hidden z-10">
                          <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                            CLEARANCE -{clearanceDiscount}%
                          </span>
                        </div>
                      )}
                      <div className="h-28 w-28 shrink-0 rounded-xl bg-white border border-gray-100 p-2 flex items-center justify-center overflow-hidden">
                        {p.image_url ? (
                          <img
                            src={fileUrl(p.image_url)}
                            alt={p.name}
                            className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <Package size={32} className="text-gray-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A5B]">
                            {brandName}
                          </p>
                          {hasClearance && (
                            <span className="hidden sm:inline-flex rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                              CLEARANCE -{clearanceDiscount}%
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 mt-0.5 truncate">
                          {p.name}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                          {p.description || "Instrumen musik bergaransi distributor resmi Overtone Music Store."}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          {p.instrument_type && <span>Tipe: {p.instrument_type}</span>}
                          {p.sku_prefix && <span>• SKU: {p.sku_prefix}</span>}
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0">
                        {hasClearance ? (
                          <div>
                            <span className="text-xs text-gray-400 font-semibold line-through">
                              {formatRupiah(originalPrice)}
                            </span>
                            <p className="text-base font-black text-red-600">
                              {formatRupiah(activeDisplayPrice)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-base font-extrabold text-gray-900">
                            {formatRupiah(originalPrice)}
                          </p>
                        )}
                        <p className="mt-1 text-xs font-semibold">
                          {isAvailable ? (
                            <span className="text-[#16A34A]">Tersedia</span>
                          ) : (
                            <span className="text-gray-400">Stok Habis</span>
                          )}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

          </main>

        </div>
      </div>
    </div>
  );
}

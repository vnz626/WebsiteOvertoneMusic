import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  Aperture,
  Compass,
  Sun,
  Mic,
  Tv,
  Package,
  Sparkles,
} from "lucide-react";
import api from "../../api";
import { formatRupiah, fileUrl } from "../../utils/format";
import Hero from "../../components/hero/Hero";
import BrandTicker from "../../components/home/BrandTicker";
import Editorial from "../../components/home/Editorial";
import Skeleton from "../../components/ui/Skeleton";

const CATEGORY_ITEMS = [
  {
    name: "Cinema & Mirrorless Cameras",
    icon: Camera,
    desc: "Full-Frame 4K/6K Cinema, Dual Native ISO & Super35",
  },
  {
    name: "Cinema & Prime Lenses",
    icon: Aperture,
    desc: "Cine Primes T1.3/T1.5, Cine Zoom & Anamorphic",
  },
  {
    name: "Gimbals & Camera Stabilizers",
    icon: Compass,
    desc: "3-Axis & 4-Axis Stabilizers, LiDAR Focus & Sliders",
  },
  {
    name: "Studio & Cinema Lighting",
    icon: Sun,
    desc: "High-Output Point Source COB, RGBWW Panels & Modifiers",
  },
  {
    name: "Wireless & Broadcast Audio",
    icon: Mic,
    desc: "32-bit Float Wireless Lavs, Shotgun Mics & Recorders",
  },
  {
    name: "Monitors & Field Recorders",
    icon: Tv,
    desc: "ProRes RAW 4K/8K Field Monitors & Wireless Video",
  },
];

/**
 * Kartu Produk Glassmorphism Focalpoint Pro (UI/UX Pro Max):
 * - Permukaan frosted glass (.fp-glass-card) dengan stage gambar 1:1 (.fp-glass-stage)
 * - Menampilkan foto, brand, judul, kategori, harga (tabular-nums), dan status stok
 * - Maksimal 1 badge pill per kartu di sudut kiri atas
 */
export function ProductCard({ product }) {
  const stock = product.remaining_quota ?? product.stock ?? 0;
  const isAvailable = stock > 0;
  const brandName =
    product.brand?.name || product.brand || product.organizer || "Focalpoint Pro";
  const categoryName =
    product.instrument_type || product.category || "Cinema Gear";
  const hasClearance = Boolean(
    product.has_clearance || product.is_clearance_active
  );
  const clearanceDiscount =
    product.max_discount_percent || product.discount_percent || 0;
  const originalPrice = product.min_price || product.price || 0;
  const activeDisplayPrice =
    hasClearance && product.effective_min_price
      ? product.effective_min_price
      : originalPrice;

  // Maksimal 1 badge pill per kartu
  let primaryBadge = null;
  if (!isAvailable) {
    primaryBadge = {
      label: "Stok Habis",
      cls: "bg-rose-950/80 text-white border-rose-400/40",
    };
  } else if (hasClearance && clearanceDiscount > 0) {
    primaryBadge = {
      label: `Diskon -${clearanceDiscount}%`,
      cls: "bg-[#E8622C]/95 text-white border-white/40",
    };
  } else if (stock > 0 && stock <= 3) {
    primaryBadge = {
      label: `Sisa ${stock} Unit`,
      cls: "bg-amber-900/85 text-amber-100 border-amber-400/40",
    };
  }

  const reviewCount = Number(product.review_count || 0);
  const avgRating = product.avg_rating
    ? Number(product.avg_rating).toFixed(1)
    : null;

  return (
    <Link
      to={`/products/${product.id}`}
      className="group relative fp-glass-card p-4 sm:p-5 flex flex-col cursor-pointer"
    >
      {/* Stage Gambar 1:1 Frosted Glass */}
      <div className="relative aspect-square w-full fp-glass-stage p-4 flex items-center justify-center overflow-hidden">
        {primaryBadge && (
          <span
            className={`absolute top-3 left-3 z-10 inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${primaryBadge.cls}`}
          >
            {primaryBadge.label}
          </span>
        )}

        {product.image_url ? (
          <img
            src={fileUrl(product.image_url)}
            alt={`Foto perlengkapan ${product.name} oleh ${brandName}`}
            loading="lazy"
            width={320}
            height={320}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80";
            }}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <Package size={40} className="text-[#3A4A63]/60" aria-hidden="true" />
        )}
      </div>

      {/* Informasi Produk */}
      <div className="mt-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider">
          <span className="text-[#E8622C] truncate">{brandName}</span>
          <span className="rounded-full bg-[#0F1B2D]/[0.06] border border-[#0F1B2D]/10 px-2.5 py-0.5 text-[#3A4A63] truncate">
            {categoryName}
          </span>
        </div>

        <h3 className="mt-2 font-display text-sm sm:text-[15px] font-bold text-[#0F1B2D] line-clamp-2 leading-snug group-hover:text-[#E8622C] transition-colors">
          {product.name}
        </h3>

        {avgRating && reviewCount > 0 && (
          <div className="flex items-center gap-1 mt-1.5 text-xs">
            <span className="text-[#E8622C] font-bold" aria-hidden="true">
              ★
            </span>
            <span className="tabular-nums font-bold text-[#0F1B2D]">
              {avgRating}
            </span>
            <span className="tabular-nums text-[11px] text-[#3A4A63]">
              ({reviewCount} ulasan)
            </span>
          </div>
        )}

        <div className="mt-auto pt-3.5 border-t border-[#0F1B2D]/10 flex items-end justify-between gap-2">
          <div>
            {hasClearance && activeDisplayPrice < originalPrice ? (
              <div>
                <span className="block tabular-nums text-[11px] text-[#3A4A63] line-through">
                  {formatRupiah(originalPrice)}
                </span>
                <span className="tabular-nums font-display text-sm sm:text-base font-extrabold text-[#E8622C]">
                  {formatRupiah(activeDisplayPrice)}
                </span>
              </div>
            ) : (
              <span className="tabular-nums font-display text-sm sm:text-base font-extrabold text-[#0F1B2D]">
                {formatRupiah(originalPrice)}
              </span>
            )}
          </div>

          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums border ${
              isAvailable
                ? "bg-emerald-500/12 border-emerald-600/25 text-emerald-900"
                : "bg-[#0F1B2D]/[0.06] border-[#0F1B2D]/12 text-[#3A4A63]"
            }`}
          >
            {isAvailable ? `Stok: ${stock}` : "Habis"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/products")
      .catch(() => api.get("/events"))
      .then((res) => setProducts(res?.data?.data || []))
      .catch(() => setProducts([]))
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

  return (
    <div className="min-h-screen fp-home-canvas">
      {/* 1. HERO SECTION — "WINDOW TO THE SET" (FOCALPOINT PRO) */}
      <Hero productCount={products.length || 91} />

      {/* 2. BRAND TICKER GLASS BAR */}
      <BrandTicker />

      {/* 3. RILISAN & GEAR PRODUKSI PILIHAN (GLASS CARDS) */}
      <section
        aria-labelledby="featured-heading"
        className="py-16 lg:py-24 relative z-10"
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="fp-section-pill mb-3">
                <span className="fp-section-pill-dot" aria-hidden="true" />
                <span>Katalog Kurasi Utama</span>
              </div>
              <h2
                id="featured-heading"
                className="font-display text-3xl sm:text-4xl font-bold text-[#0F1B2D] tracking-tight"
              >
                Rilisan &amp; Gear{" "}
                <span className="text-[#3A4A63] font-semibold">
                  Produksi Pilihan
                </span>
              </h2>
            </div>
            <Link to="/products" className="fp-btn-glass-primary self-start sm:self-auto">
              <span>Buka Seluruh Katalog ({products.length || 91} Unit)</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-80 w-full rounded-3xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {products.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. CURATED RIG BUNDLES — DARK VIDEO VILLAGE GLASS SHOWCASE */}
      {bundles.length > 0 && (
        <section
          aria-labelledby="bundles-heading"
          className="py-16 lg:py-24 fp-dark-glass-section border-y border-white/10"
        >
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-10">
              <div>
                <div className="fp-section-pill-dark mb-3">
                  <Sparkles
                    size={13}
                    className="text-[#E8622C]"
                    aria-hidden="true"
                  />
                  <span>Curated Indie Filmmaker Production Kits</span>
                </div>
                <h2
                  id="bundles-heading"
                  className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight"
                >
                  Paket Rig Produksi{" "}
                  <span className="text-white/65 font-semibold">
                    Film &amp; Broadcast
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-white/75 mt-2 editorial-measure">
                  Kombinasi kamera sinema, lensa prime, gimbal 4-axis, lighting,
                  dan audio nirkabel yang telah diuji kompatibilitasnya oleh
                  teknisi spesialis Focalpoint Pro.
                </p>
              </div>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/12 backdrop-blur-md px-5 py-2.5 text-xs font-bold text-white hover:bg-white hover:text-[#0F1B2D] transition-all self-start md:self-auto"
              >
                <span>Lihat Detail di Katalog</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {bundles.map((bundle) => (
                <article
                  key={bundle.id}
                  className="fp-glass-card-dark p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-[16/10] w-full rounded-2xl bg-black/40 border border-white/15 overflow-hidden mb-5">
                      {bundle.image_url ? (
                        <img
                          src={bundle.image_url}
                          alt={`Paket bundling ${bundle.name}`}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/40">
                          <Package size={36} aria-hidden="true" />
                        </div>
                      )}
                      {bundle.savings_amount > 0 && (
                        <span className="absolute top-3 left-3 rounded-full bg-[#E8622C]/95 backdrop-blur-md border border-white/35 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white tabular-nums shadow-lg">
                          Hemat {formatRupiah(bundle.savings_amount)}
                        </span>
                      )}
                      <span className="absolute bottom-3 right-3 rounded-full bg-black/65 backdrop-blur-md border border-white/25 px-3 py-1 text-[10px] font-bold text-white tabular-nums">
                        {bundle.bundle_code}
                      </span>
                    </div>

                    <h3 className="font-display text-lg font-bold text-white">
                      {bundle.name}
                    </h3>
                    <p className="text-xs text-white/75 mt-1.5 line-clamp-2 leading-relaxed">
                      {bundle.description}
                    </p>

                    <div className="mt-4 pt-3.5 border-t border-white/12 space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-white/55 font-bold">
                        Komponen Paket Rig:
                      </p>
                      {(bundle.items || []).slice(0, 3).map((item, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-white/85 flex items-center gap-2 truncate"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-[#E8622C] shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate tabular-nums">
                            {item.qty}x {item.product_name} ({item.variant_name})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/12 flex items-end justify-between gap-3">
                    <div>
                      <span className="block text-[11px] text-white/50 line-through tabular-nums">
                        {formatRupiah(bundle.normal_total_price)}
                      </span>
                      <span className="font-display text-xl font-extrabold text-white tabular-nums">
                        {formatRupiah(bundle.bundle_price)}
                      </span>
                    </div>
                    <Link
                      to="/offline-stores"
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#0F1B2D] hover:bg-[#E8622C] hover:text-white transition-all shadow-lg"
                    >
                      <span>Demo di Showroom</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. INDEKS KATEGORI CINEMA & BROADCAST (GLASS GRID) */}
      <section
        id="categories-section"
        aria-labelledby="categories-heading"
        className="py-16 lg:py-24 relative z-10"
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="fp-section-pill mb-3">
                <span className="fp-section-pill-dot" aria-hidden="true" />
                <span>Indeks Departemen</span>
              </div>
              <h2
                id="categories-heading"
                className="font-display text-3xl sm:text-4xl font-bold text-[#0F1B2D] tracking-tight"
              >
                Telusuri Berdasarkan{" "}
                <span className="text-[#3A4A63] font-semibold">
                  Kategori Produksi
                </span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {CATEGORY_ITEMS.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  to={`/products?category=${encodeURIComponent(cat.name)}`}
                  className="group fp-glass-card p-5 flex flex-col justify-between cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F1B2D]/[0.06] border border-[#0F1B2D]/12 text-[#0F1B2D] group-hover:bg-[#E8622C] group-hover:text-white group-hover:border-[#E8622C] transition-all duration-200"
                      aria-hidden="true"
                    >
                      <Icon size={20} />
                    </div>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70 border border-[#0F1B2D]/10 text-[#3A4A63] group-hover:border-[#E8622C] group-hover:text-[#E8622C] transition-colors">
                      <ArrowRight size={13} aria-hidden="true" />
                    </span>
                  </div>
                  <div className="mt-5">
                    <h3 className="font-display text-xs sm:text-sm font-bold text-[#0F1B2D] group-hover:text-[#E8622C] transition-colors">
                      {cat.name}
                    </h3>
                    <p className="mt-1.5 text-[11px] text-[#3A4A63] line-clamp-2 leading-snug">
                      {cat.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. SEKSI EDITORIAL KALIBRASI SENSOR & PENGIRIMAN */}
      <Editorial />
    </div>
  );
}

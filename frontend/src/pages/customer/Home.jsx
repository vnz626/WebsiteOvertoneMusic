import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Boxes,
  CheckCircle2,
  Disc,
  Guitar,
  Headphones,
  Keyboard,
  MapPin,
  Mic,
  Package,
  Radio,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Truck,
  Volume2,
  Award
} from "lucide-react";
import api from "../../api";
import { formatRupiah, fileUrl } from "../../utils/format";
import BrandTicker from "../../components/home/BrandTicker";

const SLIDES = [
  {
    id: 1,
    tag: "NEW ARRIVAL HIGHLIGHT",
    title: "Fender Player II Series",
    subtitle: "Timeless Tone, Modern Playability — Dirancang untuk musisi panggung dan studio dengan upgrade pickup Alnico V dan profil neck Modern C.",
    ctaText: "Jelajahi Electric Guitars",
    ctaLink: "/products?category=Electric+Guitars",
    secondaryText: "Lihat Semua Seri",
    secondaryLink: "/products",
    bgImage: "https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?auto=format&fit=crop&w=1920&q=80",
    gradient: "from-black/90 via-black/60 to-black/25",
  },
  {
    id: 2,
    tag: "STUDIO & PRO AUDIO HIGHLIGHT",
    title: "Elevate Your Studio Sound",
    subtitle: "Professional Audio Interfaces, Studio Monitors & Reference Microphones. Akurasi sonik tertinggi untuk rekaman dan mixing tanpa kompromi.",
    ctaText: "Jelajahi Pro Audio",
    ctaLink: "/products?category=Pro+Audio+%26+Studio",
    secondaryText: "Peralatan Rekaman",
    secondaryLink: "/products",
    bgImage: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1920&q=80",
    gradient: "from-black/90 via-black/60 to-black/25",
  },
  {
    id: 3,
    tag: "EXCLUSIVE SHOWROOM EXPERIENCE",
    title: "Click & Collect at Overtone",
    subtitle: "Beli online dengan jaminan alokasi unit resmi, ambil dan coba langsung di Flagship Showroom Overtone bersama tim luthier kami.",
    ctaText: "Temukan Showroom",
    ctaLink: "/help",
    secondaryText: "Cara Pengambilan",
    secondaryLink: "/help",
    bgImage: "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=1920&q=80",
    gradient: "from-black/90 via-black/60 to-black/25",
  },
  {
    id: 4,
    tag: "SYNTHESIZERS & KEYS HIGHLIGHT",
    title: "Roland & Yamaha Flagship Keys",
    subtitle: "Eksplorasi suara tanpa batas dengan tuts berbobot otentik, ekspresi polifonik, dan sound engine synthesizer kelas konser dunia.",
    ctaText: "Jelajahi Keyboards & Synths",
    ctaLink: "/products?category=Keyboards+%26+Synths",
    secondaryText: "Katalog Piano Digital",
    secondaryLink: "/products",
    bgImage: "https://images.unsplash.com/photo-1520523839898-507121c2967e?auto=format&fit=crop&w=1920&q=80",
    gradient: "from-black/90 via-black/60 to-black/25",
  },
];

const BRAND_LOGOS = [
  { name: "Fender", country: "USA", desc: "Stratocaster & Telecaster" },
  { name: "Gibson", country: "USA", desc: "Les Paul & SG Standards" },
  { name: "Yamaha", country: "Japan", desc: "Acoustics & Digital Pianos" },
  { name: "Roland", country: "Japan", desc: "V-Drums & Synthesizers" },
  { name: "Taylor", country: "USA", desc: "Acoustic Craftsmanship" },
  { name: "Ibanez", country: "Japan", desc: "Precision Shred & Bass" },
  { name: "Marshall", country: "UK", desc: "Iconic Valve Amplifiers" },
  { name: "Shure", country: "USA", desc: "Industry Standard Audio" },
];

const CATEGORY_ITEMS = [
  { name: "Electric Guitars", icon: Guitar, desc: "Fender, Gibson, Ibanez" },
  { name: "Acoustic Guitars", icon: Disc, desc: "Taylor, Yamaha, Martin" },
  { name: "Bass Guitars", icon: Volume2, desc: "Precision & Jazz Basses" },
  { name: "Keyboards & Synths", icon: Keyboard, desc: "Stage Pianos & Workstations" },
  { name: "Drums & Percussion", icon: Radio, desc: "Acoustic & Roland V-Drums" },
  { name: "Pro Audio & Studio", icon: Headphones, desc: "Monitors, Mic & Interface" },
];

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auto-slide effect (every 5 seconds)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  // Fetch featured products
  useEffect(() => {
    api
      .get("/products")
      .catch(() => api.get("/events"))
      .then((res) => setProducts(res?.data?.data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const slide = SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      
      {/* 1. INTERACTIVE HERO CAROUSEL / SLIDER */}
      <section
        className="relative h-[560px] sm:h-[620px] lg:h-[680px] w-full overflow-hidden bg-black select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Slides rendering with smooth cross-fade */}
        {SLIDES.map((s, idx) => {
          const isActive = idx === currentSlide;
          return (
            <div
              key={s.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {/* Background Image */}
              <img
                src={s.bgImage}
                alt={s.title}
                className="h-full w-full object-cover object-center transform scale-105 transition-transform duration-[7000ms] ease-out"
                style={{ transform: isActive ? "scale(1.02)" : "scale(1.08)" }}
              />

              {/* Clean Dark Overlay for Editorial Legibility */}
              <div className={`absolute inset-0 bg-gradient-to-r ${s.gradient}`} />
              <div className="absolute inset-0 bg-black/30" />

              {/* Slide Content Box */}
              <div className="relative mx-auto flex h-full max-w-[1440px] items-center px-6 lg:px-16">
                <div className="max-w-2xl text-white">
                  
                  {/* Category / Subsystem Pill */}
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur-md mb-4">
                    <Sparkles size={12} className="text-[#8C7A5B]" />
                    {s.tag}
                  </div>

                  {/* Main Editorial Headline */}
                  <h1 className="font-jakarta text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white leading-[1.1]">
                    {s.title}
                  </h1>

                  {/* Editorial Description */}
                  <p className="mt-4 text-sm sm:text-base text-gray-200 leading-relaxed font-sans max-w-xl">
                    {s.subtitle}
                  </p>

                  {/* CTAs */}
                  <div className="mt-8 flex flex-wrap items-center gap-3.5">
                    <Link
                      to={s.ctaLink}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-xs font-bold uppercase tracking-wider text-black shadow-lg hover:bg-gray-100 transition-all"
                    >
                      {s.ctaText} <ArrowRight size={15} />
                    </Link>
                    <Link
                      to={s.secondaryLink}
                      className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/30 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md hover:bg-white/10 transition-all"
                    >
                      {s.secondaryText}
                    </Link>
                  </div>

                </div>
              </div>
            </div>
          );
        })}

        {/* Carousel Navigation Arrows (< and >) */}
        <button
          onClick={prevSlide}
          aria-label="Slide Sebelumnya"
          className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-all hover:bg-white hover:text-black focus:outline-none"
        >
          <ChevronLeft size={22} />
        </button>

        <button
          onClick={nextSlide}
          aria-label="Slide Berikutnya"
          className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition-all hover:bg-white hover:text-black focus:outline-none"
        >
          <ChevronRight size={22} />
        </button>

        {/* Pagination Dots at Bottom Center */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              aria-label={`Pindah ke slide ${i + 1}`}
              className={`h-2 transition-all rounded-full ${
                i === currentSlide
                  ? "w-8 bg-white"
                  : "w-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>

      </section>

      {/* 2. REPUTATION & BRAND STRIP (LOOPING GESER KE KIRI / INFINITE MARQUEE) */}
      <BrandTicker />

      {/* 3. KATEGORI INSTRUMEN (CLEAN EDITORIAL TILES) */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C7A5B]">
                Eksplorasi Instrumen
              </span>
              <h2 className="font-jakarta text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
                Kategori Alat Musik
              </h2>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-900 hover:text-[#8C7A5B] transition-colors"
            >
              Lihat Seluruh Katalog <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {CATEGORY_ITEMS.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  to={`/products?category=${encodeURIComponent(cat.name)}`}
                  className="group rounded-2xl border border-gray-200 bg-[#F9FAFB] p-5 text-center transition-all hover:border-gray-900 hover:bg-white hover:shadow-sm"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-800 group-hover:bg-[#111111] group-hover:text-white transition-all">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-3.5 text-xs font-bold text-gray-900 truncate">
                    {cat.name}
                  </h3>
                  <p className="mt-1 text-[11px] text-gray-500 truncate">
                    {cat.desc}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. FEATURED PRODUCTS (NEW ARRIVALS) */}
      <section className="py-16 bg-[#F9FAFB] border-t border-gray-200">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C7A5B]">
                Pilihan Terbaik
              </span>
              <h2 className="font-jakarta text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
                Instrumen Musik Terbaru
              </h2>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-900 hover:text-[#8C7A5B] transition-colors"
            >
              Buka Katalog Lengkap <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-gray-200 h-80" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {products.slice(0, 8).map((p) => {
                const isAvailable = (p.remaining_quota || p.stock || 0) > 0;
                return (
                  <Link
                    key={p.id}
                    to={`/products/${p.id}`}
                    className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-900 hover:shadow-md transition-all flex flex-col"
                  >
                    {/* Aspect Square Image Box */}
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

                    {/* Product Details */}
                    <div className="mt-4 flex-1 flex flex-col">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A5B]">
                        {p.brand?.name || p.brand || p.organizer || "Overtone"}
                      </p>
                      <h3 className="mt-1 text-xs font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-black">
                        {p.name}
                      </h3>
                      
                      <div className="mt-auto pt-3">
                        <p className="text-sm font-extrabold text-gray-900">
                          {formatRupiah(p.price || p.min_price || 0)}
                        </p>
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
          )}
        </div>
      </section>

      {/* 5. EDITORIAL PILLARS / OVERTONE COMMITMENT */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-[#F9FAFB] p-8 text-center sm:text-left">
              <Award size={28} className="text-[#111111] mb-4" />
              <h3 className="font-bold text-base text-gray-900">Garansi Distributor Resmi</h3>
              <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                Seluruh instrumen di Overtone Music Store merupakan unit orisinal distributor resmi dengan nomor seri terverifikasi dan perlindungan garansi service terpercaya.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-[#F9FAFB] p-8 text-center sm:text-left">
              <Store size={28} className="text-[#111111] mb-4" />
              <h3 className="font-bold text-base text-gray-900">Click &amp; Collect di Showroom</h3>
              <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                Pesan gear secara online dan ambil di showroom resmi. Coba langsung kualitas akustik instrumen Anda dan dapatkan setup gratis dari tim spesialis kami.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-[#F9FAFB] p-8 text-center sm:text-left">
              <Truck size={28} className="text-[#111111] mb-4" />
              <h3 className="font-bold text-base text-gray-900">Ekspedisi Berasuransi &amp; Kayu</h3>
              <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                Pengiriman jarak jauh menggunakan packing kayu kokoh dan perlindungan asuransi penuh agar gear Anda tiba dalam kondisi sempurna dan siap dimainkan.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

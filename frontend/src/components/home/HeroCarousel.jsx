import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Store, ShieldCheck } from "lucide-react";
import { formatRupiah, fileUrl } from "../../utils/format";

const CURATED_EDITIONS = [
  {
    id: 1,
    issueNo: "EDISI KURASI 01 / 04",
    category: "Cinema & Mirrorless Cameras",
    title: "Sony FX3 Cinema Line — Full-Frame 4K 120p & S-Cinetone Color Science",
    specs: "Sensor 12.1MP Exmor R • Dual Base ISO 800/12800 • 16-Bit RAW Output • Active Cooling Fan System",
    description:
      "Dirancang untuk artikulasi visual bioskop dan fleksibilitas solo filmmaker. Setiap unit melalui inspeksi sensor chamber bebas debu mikro dan uji back-focus di Cleanroom Bench Overtone.",
    ctaText: "Buka Koleksi Cinema Cameras",
    ctaLink: "/products?category=Cinema+%26+Mirrorless+Cameras",
    secondaryText: "Jadwalkan Test Bay di Cabang",
    secondaryLink: "/offline-stores",
    bgImage:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Kamera bioskop Sony FX3 di studio produksi film",
  },
  {
    id: 2,
    issueNo: "EDISI KURASI 02 / 04",
    category: "Cinema & Prime Lenses",
    title: "Canon CN-E & Cine Zoom Series — Optik Resolusi 4K & T-Stop Presisi",
    specs: "Aperture Melingkar 11-Blade • Zero Focus Breathing • Focus Throw 300° Metrik • Mount EF/RF/PL",
    description:
      "Rangkaian lensa sinematik resolusi tinggi dengan transmisi warna konsisten dan bokeh lembut organik untuk produksi film layar lebar dan iklan komersial.",
    ctaText: "Lihat Lensa Cinema & Prime",
    ctaLink: "/products?category=Cinema+%26+Prime+Lenses",
    secondaryText: "Baca Panduan Teknis KMS",
    secondaryLink: "/help",
    bgImage:
      "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Koleksi lensa bioskop prime di meja kerja teknisi",
  },
  {
    id: 3,
    issueNo: "EDISI KURASI 03 / 04",
    category: "Gimbals & Camera Stabilizers",
    title: "DJI Ronin 4D & RS 3 Pro — Stabilisasi 4-Axis & LiDAR Autofocus",
    specs: "Motorized Z-Axis Active Stabilization • LiDAR Range Finder 43,200 Poin • Transmisi Nirkabel O3 Pro",
    description:
      "Ekosistem stabilisasi kamera revolusioner untuk gerakan dinamis sinematik tanpa guncangan vertikal, didukung transmisi jarak jauh ke monitor sutradara.",
    ctaText: "Telusuri Gimbals & Stabilizers",
    ctaLink: "/products?category=Gimbals+%26+Camera+Stabilizers",
    secondaryText: "Cek Stok Cabang",
    secondaryLink: "/offline-stores",
    bgImage:
      "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Gimbal kamera stabilizer di lokasi syuting luar ruangan",
  },
  {
    id: 4,
    issueNo: "EDISI KURASI 04 / 04",
    category: "Click & Collect",
    title: "Pesan Daring, Uji Coba di Cleanroom Sensor Bench 5 Cabang",
    specs: "Jakarta Senayan • Jakarta PIK • Bandung Dago • Surabaya Tunjungan • Bali Seminyak",
    description:
      "Amankan alokasi nomor seri kamera secara daring, lalu uji langsung performa sensor, kalibrasi back-focus lensa, dan firmware di Cleanroom Tech Bench cabang kami sebelum dibawa pulang.",
    ctaText: "Lihat Lokasi 5 Cabang",
    ctaLink: "/offline-stores",
    secondaryText: "Lacak Pickup Pass",
    secondaryLink: "/track",
    bgImage:
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1600&q=80",
    imageAlt: "Ruang showroom kamera sinema profesional dengan studio test bay",
  },
];

export default function HeroCarousel({ featuredProducts = [] }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CURATED_EDITIONS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + CURATED_EDITIONS.length) % CURATED_EDITIONS.length);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % CURATED_EDITIONS.length);
  }, []);

  const activeEdition = CURATED_EDITIONS[currentSlide];
  const spotlightProduct = featuredProducts[currentSlide % Math.max(1, featuredProducts.length)];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Sorotan Rilisan dan Koleksi Instrumen Overtone"
      className="border-b border-line bg-canvas"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-12 lg:py-10">
        {/* Tata Letak Poster Editorial Asimetris (Aturan F: Bukan Hero Tengah Generik) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          {/* Kolom Kiri (7 Kolom): Tipografi Ekspresif + Spesifikasi Teknis + Kontrol */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-md border border-line-strong bg-surface p-6 sm:p-8 lg:p-10">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4 mb-6">
                <span className="tabular-nums text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
                  {activeEdition.issueNo}
                </span>
                <span className="rounded-xs bg-surface-muted border border-line px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                  {activeEdition.category}
                </span>
              </div>

              <h1 className="display-heading text-ink">
                {activeEdition.title}
              </h1>

              <p className="mt-4 inline-block rounded-xs bg-surface-muted border border-line px-3 py-1.5 text-xs font-bold text-ink-secondary">
                {activeEdition.specs}
              </p>

              <p className="mt-4 text-sm sm:text-base text-ink-secondary leading-relaxed editorial-measure">
                {activeEdition.description}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-line space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={activeEdition.ctaLink}
                  className="inline-flex items-center gap-2 rounded-sm bg-accent hover:bg-accent-hover px-6 py-3 text-xs font-bold uppercase tracking-wider text-accent-on transition-colors duration-fast"
                >
                  <span>{activeEdition.ctaText}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link
                  to={activeEdition.secondaryLink}
                  className="inline-flex items-center gap-2 rounded-sm border border-line-strong bg-surface px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink hover:bg-surface-muted transition-colors duration-fast"
                >
                  <span>{activeEdition.secondaryText}</span>
                </Link>
              </div>

              {/* Kontrol Karusel Native: Prev, Next, Pause/Play, Indikator Slide (Aturan J & L) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={prevSlide}
                    aria-label="Edisi sebelumnya"
                    className="flex h-9 w-9 items-center justify-center rounded-sm border border-line-strong bg-surface text-ink hover:bg-surface-muted transition-colors duration-fast"
                  >
                    <ChevronLeft size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={nextSlide}
                    aria-label="Edisi berikutnya"
                    className="flex h-9 w-9 items-center justify-center rounded-sm border border-line-strong bg-surface text-ink hover:bg-surface-muted transition-colors duration-fast"
                  >
                    <ChevronRight size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPaused((p) => !p)}
                    aria-pressed={isPaused}
                    aria-label={isPaused ? "Putar pergantian slide otomatis" : "Jeda pergantian slide otomatis"}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border border-line-strong bg-surface text-xs font-bold text-ink hover:bg-surface-muted transition-colors duration-fast"
                  >
                    {isPaused ? (
                      <>
                        <Play size={13} aria-hidden="true" />
                        <span>Putar</span>
                      </>
                    ) : (
                      <>
                        <Pause size={13} aria-hidden="true" />
                        <span>Jeda</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2" role="tablist" aria-label="Pilih slide edisi">
                  {CURATED_EDITIONS.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={idx === currentSlide}
                      aria-label={`Tampilkan ${item.issueNo}: ${item.category}`}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2.5 rounded-xs transition-all duration-fast ${
                        idx === currentSlide
                          ? "w-8 bg-accent"
                          : "w-2.5 bg-line-strong hover:bg-ink-secondary"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan (5 Kolom): Visual Instrumen & Kartu Unit Nyata (Aturan F: Konten Utama = Produk Nyata) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="relative flex-1 min-h-[280px] sm:min-h-[340px] rounded-md border border-line-strong overflow-hidden bg-ink">
              <img
                src={activeEdition.bgImage}
                alt={activeEdition.imageAlt}
                className="h-full w-full object-cover opacity-90"
              />
              {/* Scrim terukur di bagian bawah untuk teks di atas gambar (Kontras >= 4.5:1) */}
              <div className="absolute inset-x-0 bottom-0 bg-[#121110]/85 border-t border-white/15 px-5 py-3.5 text-[#F5F2EB] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <ShieldCheck size={16} className="text-[#86EFAC] shrink-0" aria-hidden="true" />
                  <span>Inspeksi Luthier &amp; Nomor Seri Resmi</span>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#FDBA74] shrink-0">
                  Siap Audisi
                </span>
              </div>
            </div>

            {/* Kartu Produk Nyata yang Sedang Disorot */}
            {spotlightProduct && (
              <Link
                to={`/products/${spotlightProduct.id}`}
                className="group flex items-center gap-4 rounded-md border border-line-strong bg-surface p-4 hover:border-ink transition-colors duration-fast"
              >
                <div className="h-20 w-20 shrink-0 aspect-square rounded-sm border border-line bg-surface-muted p-2 flex items-center justify-center overflow-hidden">
                  {spotlightProduct.image_url ? (
                    <img
                      src={fileUrl(spotlightProduct.image_url)}
                      alt={`Foto instrumen ${spotlightProduct.name}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Store size={24} className="text-ink-muted" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                       Sorotan Katalog • {spotlightProduct.brand?.name || spotlightProduct.organizer || "Overtone"}
                    </span>
                    <span className="text-[10px] font-bold text-status-success-text bg-status-success-bg border border-status-success-border px-1.5 py-0.5 rounded-xs">
                      Unit Tersedia
                    </span>
                  </div>
                  <h2 className="font-display text-sm font-bold text-ink truncate mt-0.5 group-hover:text-accent transition-colors duration-fast">
                    {spotlightProduct.name}
                  </h2>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="tabular-nums font-display text-sm font-extrabold text-ink">
                      {formatRupiah(spotlightProduct.price || spotlightProduct.min_price || 0)}
                    </span>
                    <span className="text-[11px] font-bold text-accent inline-flex items-center gap-1">
                      <span>Lihat Spesifikasi</span>
                      <ArrowRight size={12} aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}


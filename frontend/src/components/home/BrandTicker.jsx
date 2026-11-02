import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Pause, Play, ChevronLeft, ChevronRight } from "lucide-react";

const BRAND_LOGOS = [
  { name: "Sony Cinema Line", origin: "Tokyo, JP", specialty: "Full-Frame Cinema & E-Mount" },
  { name: "RED Digital Cinema", origin: "Irvine, USA", specialty: "Global Shutter & REDCODE RAW" },
  { name: "Canon Professional", origin: "Tokyo, JP", specialty: "Cinema EOS & RF Cine Mount" },
  { name: "DJI Enterprise & Pro", origin: "Shenzhen, CN", specialty: "4-Axis Gimbals & LiDAR" },
  { name: "Aputure Lighting", origin: "Los Angeles, USA", specialty: "Point Source COB & RGBWW" },
  { name: "Rode Microphones", origin: "Sydney, AU", specialty: "32-bit Float Wireless & Mics" },
  { name: "Atomos", origin: "Melbourne, AU", specialty: "ProRes RAW Field Monitors" },
  { name: "Sennheiser", origin: "Wedemark, DE", specialty: "Broadcast RF Shotgun Mics" },
  { name: "ARRI", origin: "Munich, DE", specialty: "High-End Motion Picture" },
  { name: "Blackmagic Design", origin: "Melbourne, AU", specialty: "Digital Film & DaVinci Resolve" },
  { name: "Cooke Optics", origin: "Leicester, UK", specialty: "Anamorphic & Cine Primes" },
  { name: "SmallRig", origin: "Shenzhen, CN", specialty: "Modular Rigging & Cages" },
];

export default function BrandTicker() {
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);
  const duplicatedLogos = [...BRAND_LOGOS, ...BRAND_LOGOS];

  function scrollManual(direction) {
    setPaused(true);
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: direction * 280, behavior: "smooth" });
    }
  }

  return (
    <section
      aria-label="Daftar merek resmi distributor Focalpoint Pro"
      className="fp-glass-bar py-8 overflow-hidden relative z-10"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="fp-section-pill mb-2">
            <span className="fp-section-pill-dot" aria-hidden="true" />
            <span>Mitra Distribusi Resmi Focalpoint Pro</span>
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold text-[#0F1B2D] tracking-tight">
            Katalog Merek Cinema Camera &amp; Broadcast Gear Terverifikasi
          </h2>
        </div>

        {/* Kontrol Keyboard & Jeda (Glass Pill Controls) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollManual(-1)}
            aria-label="Geser daftar merek ke kiri"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#0F1B2D]/15 bg-white/75 backdrop-blur-md text-[#0F1B2D] shadow-sm hover:border-[#E8622C] hover:text-[#E8622C] transition-all cursor-pointer"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={
              paused
                ? "Jalankan pergerakan daftar merek"
                : "Jeda pergerakan daftar merek"
            }
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-[#0F1B2D]/15 bg-white/75 backdrop-blur-md text-xs font-bold text-[#0F1B2D] shadow-sm hover:border-[#E8622C] hover:text-[#E8622C] transition-all cursor-pointer"
          >
            {paused ? (
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
          <button
            type="button"
            onClick={() => scrollManual(1)}
            aria-label="Geser daftar merek ke kanan"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#0F1B2D]/15 bg-white/75 backdrop-blur-md text-[#0F1B2D] shadow-sm hover:border-[#E8622C] hover:text-[#E8622C] transition-all cursor-pointer"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        className="relative w-full overflow-x-auto no-scrollbar"
      >
        <div
          className={`animate-marquee flex items-center gap-4 px-4 sm:px-6 lg:px-12 py-2 ${
            paused ? "is-paused" : ""
          }`}
        >
          {duplicatedLogos.map((brand, idx) => (
            <Link
              key={`${brand.name}-${idx}`}
              to={`/products?brand=${encodeURIComponent(brand.name)}`}
              className="group fp-glass-card flex h-[76px] min-w-[235px] flex-col justify-center px-5 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-base font-bold tracking-tight text-[#0F1B2D] group-hover:text-[#E8622C] transition-colors">
                  {brand.name}
                </span>
                <span className="rounded-full bg-[#0F1B2D]/[0.06] border border-[#0F1B2D]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#3A4A63]">
                  {brand.origin}
                </span>
              </div>
              <span className="text-xs text-[#3A4A63] truncate mt-1 font-medium">
                {brand.specialty}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

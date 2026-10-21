import React from "react";

const BRAND_LOGOS = [
  {
    name: "Numark",
    render: () => (
      <div className="flex items-center gap-1.5">
        <div className="flex flex-col gap-0.5">
          <span className="h-1.5 w-1.5 bg-red-600 rounded-2xs" />
          <span className="h-1.5 w-1.5 bg-black rounded-2xs" />
        </div>
        <span className="font-sans font-black tracking-tighter text-xl text-black">
          Numark
        </span>
      </div>
    ),
  },
  {
    name: "Hercules",
    render: () => (
      <div className="flex flex-col items-center leading-none">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white font-black text-sm">
          H
        </div>
        <span className="mt-1 font-sans font-black text-[9px] tracking-widest text-black">
          HERCULES
        </span>
      </div>
    ),
  },
  {
    name: "AKAI",
    render: () => (
      <div className="flex flex-col items-center leading-none">
        <span className="font-sans font-black tracking-wider text-xl text-[#D80027]">
          AKAI
        </span>
        <span className="font-sans font-bold text-[7px] tracking-[0.25em] text-[#D80027] mt-0.5">
          PROFESSIONAL
        </span>
      </div>
    ),
  },
  {
    name: "Alesis",
    render: () => (
      <span className="font-sans font-extrabold tracking-widest text-lg text-[#006699]">
        ALESIS
      </span>
    ),
  },
  {
    name: "Gibson",
    render: () => (
      <div className="rounded-md bg-black px-3 py-1 flex items-center justify-center">
        <span className="font-serif italic font-extrabold text-lg text-white tracking-wide">
          Gibson
        </span>
      </div>
    ),
  },
  {
    name: "Epiphone",
    render: () => (
      <span className="font-serif italic font-black text-xl text-black tracking-tight scale-y-110">
        Epiphone
      </span>
    ),
  },
  {
    name: "Kramer",
    render: () => (
      <div className="border border-black px-2 py-0.5 transform -skew-x-12">
        <span className="font-sans font-black text-xs tracking-widest text-black uppercase">
          KRAMER
        </span>
      </div>
    ),
  },
  {
    name: "Donner",
    render: () => (
      <div className="flex items-center gap-1.5">
        <span className="font-black text-base text-black">ıll</span>
        <span className="font-sans font-extrabold text-sm tracking-wider text-black">
          DONNER
        </span>
      </div>
    ),
  },
  {
    name: "Hartke",
    render: () => (
      <span className="font-sans font-black text-lg text-black tracking-tight">
        Hartke
      </span>
    ),
  },
  {
    name: "HEADRUSH",
    render: () => (
      <span className="font-sans font-medium tracking-[0.3em] text-xs text-black">
        HEAD RUSH
      </span>
    ),
  },
  {
    name: "M-AUDIO",
    render: () => (
      <span className="font-sans font-black text-sm tracking-widest text-black">
        M-AUDIO
      </span>
    ),
  },
  {
    name: "OLYMPIA",
    render: () => (
      <div className="flex flex-col items-center leading-none">
        <div className="flex items-center gap-1 text-[10px] text-black">
          <span>🏛️</span>
        </div>
        <span className="font-serif font-black text-xs tracking-[0.2em] text-black mt-0.5">
          OLYMPIA
        </span>
      </div>
    ),
  },
  {
    name: "Fender",
    render: () => (
      <span className="font-serif italic font-black text-2xl text-black tracking-normal">
        Fender
      </span>
    ),
  },
  {
    name: "Yamaha",
    render: () => (
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-black text-black">❖</span>
        <span className="font-sans font-black text-base tracking-widest text-black">
          YAMAHA
        </span>
      </div>
    ),
  },
  {
    name: "Roland",
    render: () => (
      <span className="font-sans font-black text-lg text-black tracking-wider">
        Roland
      </span>
    ),
  },
  {
    name: "Marshall",
    render: () => (
      <span className="font-serif italic font-black text-xl text-black">
        Marshall
      </span>
    ),
  },
  {
    name: "Shure",
    render: () => (
      <span className="font-sans font-black text-sm tracking-[0.25em] text-black">
        SHURE
      </span>
    ),
  },
];

export default function BrandTicker() {
  // Duplikasi array logo agar looping marquee bergerak ke kiri tanpa putus (seamless loop)
  const duplicatedLogos = [...BRAND_LOGOS, ...BRAND_LOGOS];

  return (
    <section className="border-b border-gray-200 bg-[#FAFAFA] py-7 overflow-hidden select-none">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12 mb-4 text-center sm:text-left">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">
          Official Retail Partner
        </p>
        <h2 className="text-sm font-extrabold text-gray-900 tracking-tight mt-0.5">
          Authorized Multi-Brand Musical Instruments Retailer
        </h2>
      </div>

      {/* Marquee Track (Geser ke kiri secara halus & looping) */}
      <div className="relative w-full overflow-hidden mask-fade-edges">
        <div className="animate-marquee flex items-center gap-6 py-2">
          {duplicatedLogos.map((brand, idx) => (
            <div
              key={`${brand.name}-${idx}`}
              className="flex h-16 min-w-[140px] sm:min-w-[160px] items-center justify-center rounded-xl border border-gray-200/90 bg-white px-5 shadow-xs transition-transform hover:scale-105 hover:border-gray-900 cursor-pointer"
              title={brand.name}
            >
              {brand.render()}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

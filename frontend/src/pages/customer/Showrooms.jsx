import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin, Clock, Phone, MessageCircle, ExternalLink, Sparkles,
  Camera, Eye, Sun, Compass, Video, Wrench, Coffee, CheckCircle2, Search, ArrowRight, ShieldCheck
} from "lucide-react";

const SHOWROOMS_DATA = [
  {
    id: "jkt-senayan",
    name: "Focalpoint.pro Flagship — Senayan City (Jakarta Pusat)",
    city: "Jakarta Pusat",
    address: "Senayan City Mall, Ground Floor #G-18, Jl. Asia Afrika No. 19, Gelora, Tanah Abang, Jakarta Pusat 10270",
    hours: "Setiap Hari (10:00 - 22:00 WIB)",
    phone: "(021) 7278-1999",
    whatsapp: "+62 811-1900-2821",
    googleMapsUrl: "https://maps.google.com/?q=Senayan+City+Jakarta",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
    facilities: [
      { name: "Studio Camera Test Bay", icon: Camera },
      { name: "Cleanroom Sensor Tech Bench", icon: Wrench },
      { name: "Cine Lens Projection Wall", icon: Eye },
      { name: "Espresso Filmmaker Lounge", icon: Coffee },
      { name: "Click & Collect Pickup Pass", icon: CheckCircle2 },
    ],
    highlight: "Flagship Pro Cinema Store terbesar di Indonesia dengan jajaran lengkap Sony Cinema Line, RED Komodo-X & Canon Cinema EOS",
  },
  {
    id: "jkt-pik",
    name: "Focalpoint.pro Experience Hub — PIK Avenue (Jakarta Utara)",
    city: "Jakarta Utara",
    address: "PIK Avenue Mall, Lantai 1 Unit 1F-02, Jl. Pantai Indah Kapuk, Penjaringan, Jakarta Utara 14470",
    hours: "Setiap Hari (10:00 - 22:00 WIB)",
    phone: "(021) 5088-7200",
    whatsapp: "+62 811-1900-2822",
    googleMapsUrl: "https://maps.google.com/?q=PIK+Avenue+Jakarta",
    image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80",
    facilities: [
      { name: "Gimbal & Motion Rig Arena", icon: Compass },
      { name: "Field Monitor HDR Suite", icon: Video },
      { name: "Wireless Audio Isolation Booth", icon: Sparkles },
      { name: "Click & Collect Pickup Pass", icon: CheckCircle2 },
    ],
    highlight: "Pusat Gimbal DJI Ronin 4D, Wireless Video Transmitters, Monitor Atomos HDR & Field Audio 32-bit Float",
  },
  {
    id: "bdg-dago",
    name: "Focalpoint.pro Boutique Store — Dago (Bandung)",
    city: "Bandung",
    address: "Jl. Ir. H. Juanda (Dago) No. 88, Coblong, Kota Bandung, Jawa Barat 40135",
    hours: "Senin - Minggu (09:30 - 21:00 WIB)",
    phone: "(022) 250-8819",
    whatsapp: "+62 811-1900-2823",
    googleMapsUrl: "https://maps.google.com/?q=Jl.+Ir.+H.+Juanda+Dago+Bandung",
    image: "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=800&q=80",
    facilities: [
      { name: "Sensor Cleaning & Calibration Lab", icon: Wrench },
      { name: "Anamorphic & Cine Prime Gallery", icon: Eye },
      { name: "Lighting & Modifiers Test Studio", icon: Sun },
      { name: "Garden Community Terrace", icon: Coffee },
      { name: "Click & Collect Pickup Pass", icon: CheckCircle2 },
    ],
    highlight: "Toko butik sinematografi dengan Cleanroom sensor bench dan workshop kalibrasi optik bergaransi resmi",
  },
  {
    id: "sby-tp6",
    name: "Focalpoint.pro Cinema Store — Tunjungan Plaza 6 (Surabaya)",
    city: "Surabaya",
    address: "Tunjungan Plaza 6, Level 2 Unit TP6-202, Jl. Embong Malang No. 32-36, Surabaya, Jawa Timur 60261",
    hours: "Setiap Hari (10:00 - 22:00 WIB)",
    phone: "(031) 534-8890",
    whatsapp: "+62 811-1900-2824",
    googleMapsUrl: "https://maps.google.com/?q=Tunjungan+Plaza+6+Surabaya",
    image: "https://images.unsplash.com/photo-1520523839898-50712825e3a7?auto=format&fit=crop&w=800&q=80",
    facilities: [
      { name: "Cinema Production Rig Hub", icon: Camera },
      { name: "Aputure Studio Lighting Bay", icon: Sun },
      { name: "Wireless Video Testing Room", icon: Video },
      { name: "Click & Collect Pickup Pass", icon: CheckCircle2 },
    ],
    highlight: "Pusat kamera cinema & broadcast terlengkap di Jawa Timur dengan studio uji coba pencahayaan Aputure",
  },
  {
    id: "bali-sunset",
    name: "Focalpoint.pro Production Hub — Seminyak (Bali)",
    city: "Bali",
    address: "Sunset Point Shopping Centre Lt. 1, Jl. Sunset Road No. 88, Seminyak, Kuta, Kabupaten Badung, Bali 80361",
    hours: "Setiap Hari (10:00 - 21:30 WITA)",
    phone: "(0361) 847-5500",
    whatsapp: "+62 811-1900-2825",
    googleMapsUrl: "https://maps.google.com/?q=Sunset+Road+Seminyak+Bali",
    image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80",
    facilities: [
      { name: "Travel & Outdoor Cinema Rig Hub", icon: Camera },
      { name: "Underwater & Drone Gear Bay", icon: Compass },
      { name: "Cleanroom Sensor Service Station", icon: Wrench },
      { name: "Click & Collect Pickup Pass", icon: CheckCircle2 },
    ],
    highlight: "Pusat gear produksi film pulau tropis, perlengkapan outdoor broadcast, dan layanan antar cepat area Denpasar/Badung",
  },
];

const CITIES = ["Semua Kota", "Jakarta Pusat", "Jakarta Utara", "Bandung", "Surabaya", "Bali"];

export default function Showrooms() {
  const [selectedCity, setSelectedCity] = useState("Semua Kota");
  const [search, setSearch] = useState("");

  const filteredShowrooms = SHOWROOMS_DATA.filter((s) => {
    const matchCity = selectedCity === "Semua Kota" || s.city === selectedCity;
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.address.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase());
    return matchCity && matchSearch;
  });

  return (
    <div className="min-h-screen fp-home-canvas pb-24">
      {/* Header Frosted Glass Bar */}
      <section className="fp-glass-bar py-10 lg:py-14">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="fp-section-pill mb-3">
              <MapPin size={13} className="text-[#E8622C]" aria-hidden="true" />
              <span>Jaringan Showroom Resmi (5 Cabang)</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0F1B2D]">
              Focalpoint.pro Experience Showrooms
            </h1>
            <p className="mt-3 text-sm sm:text-base text-[#3A4A63] leading-relaxed max-w-2xl">
              Rasakan pengalaman langsung menguji puluhan kamera bioskop dan lensa autentik di studio test bay kami. Konsultasikan setup gear Anda bersama teknisi spesialis in-house, atau ambil pesanan online via layanan <strong className="text-[#0F1B2D]">Click &amp; Collect</strong>.
            </p>
          </div>

          {/* Filter & Search Bar */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" role="tablist" aria-label="Filter kota cabang">
              {CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  role="tab"
                  aria-selected={selectedCity === city}
                  onClick={() => setSelectedCity(city)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCity === city
                      ? "bg-[#0F1B2D] text-white shadow-xs"
                      : "bg-white/70 border border-white/80 text-[#3A4A63] hover:bg-white hover:text-[#0F1B2D]"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:max-w-xs">
              <label htmlFor="showroom-search" className="sr-only">Cari lokasi cabang</label>
              <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#3A4A63]" aria-hidden="true" />
              <input
                id="showroom-search"
                type="search"
                placeholder="Cari lokasi cabang atau alamat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-full border border-white/80 bg-white/70 backdrop-blur-md pl-10 pr-4 text-xs font-medium text-[#0F1B2D] placeholder:text-[#3A4A63]/80 focus:border-[#E8622C] focus:bg-white focus:outline-none transition-all shadow-xs"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Showroom Cards List */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12 mt-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {filteredShowrooms.map((showroom) => (
            <article
              key={showroom.id}
              className="fp-glass-card !p-0 overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Photo & City Pill */}
                <div className="relative h-60 sm:h-72 w-full overflow-hidden bg-black/10 border-b border-[#0F1B2D]/10">
                  <img
                    src={showroom.image}
                    alt={`Suasana showroom ${showroom.name}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute top-4 left-4 rounded-full bg-[#0F1B2D]/90 backdrop-blur-md border border-white/20 px-3.5 py-1 text-[11px] font-bold text-white uppercase tracking-wider shadow-sm">
                    {showroom.city}
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-6 sm:p-8">
                  <h2 className="font-display text-2xl font-bold text-[#0F1B2D] tracking-tight">
                    {showroom.name}
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm font-semibold text-[#E8622C]">
                    {showroom.highlight}
                  </p>

                  <div className="mt-5 space-y-3 text-xs text-[#3A4A63]">
                    <div className="flex items-start gap-2.5">
                      <MapPin size={16} className="text-[#0F1B2D] shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="leading-relaxed">{showroom.address}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock size={16} className="text-[#0F1B2D] shrink-0" aria-hidden="true" />
                      <span>{showroom.hours}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Phone size={16} className="text-[#0F1B2D] shrink-0" aria-hidden="true" />
                      <span className="font-semibold text-[#0F1B2D]">{showroom.phone}</span>
                    </div>
                  </div>

                  {/* Facilities Grid */}
                  <div className="mt-6 pt-5 border-t border-[#0F1B2D]/10">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#3A4A63] block mb-3">
                      Fasilitas Showroom &amp; Studio QC:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {showroom.facilities.map((fac, idx) => {
                        const Icon = fac.icon;
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 backdrop-blur-md px-3 py-1 text-xs font-semibold text-[#0F1B2D] shadow-2xs"
                          >
                            <Icon size={13} className="text-[#E8622C]" aria-hidden="true" />
                            <span>{fac.name}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 sm:p-8 pt-0 flex flex-wrap items-center gap-3">
                <a
                  href={`https://wa.me/${showroom.whatsapp.replace(/[^0-9]/g, "")}?text=Halo%20Focalpoint.pro,%20saya%20ingin%20konsultasi%20cinema%20gear%20di%20cabang%20${encodeURIComponent(showroom.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fp-btn-glass-primary !py-2.5 !px-5 !text-xs flex-1 sm:flex-initial"
                >
                  <MessageCircle size={14} aria-hidden="true" />
                  <span>Chat WhatsApp Teknisi</span>
                </a>
                <a
                  href={showroom.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fp-btn-glass-secondary !py-2.5 !px-5 !text-xs flex-1 sm:flex-initial"
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  <span>Petunjuk Arah Google Maps</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin, Clock, Phone, MessageCircle, ExternalLink, Sparkles,
  Camera, Eye, Sun, Compass, Video, Wrench, Coffee, CheckCircle2, Search, ArrowRight, ShieldCheck
} from "lucide-react";

const SHOWROOMS_DATA = [
  {
    id: "jkt-senayan",
    name: "Overtone Pro Cinema Store — Senayan City (Jakarta Pusat)",
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
    name: "Overtone Pro Cinema Store — PIK Avenue (Jakarta Utara)",
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
    name: "Overtone Pro Cinema Store — Dago (Bandung)",
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
    highlight: "Toko Offline butik dengan Cleanroom sensor bench dan workshop kalibrasi optik bergaransi resmi",
  },
  {
    id: "sby-tp6",
    name: "Overtone Pro Cinema Store — Tunjungan Plaza 6 (Surabaya)",
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
    name: "Overtone Pro Cinema Store — Seminyak (Bali)",
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
    <div className="min-h-screen bg-canvas text-ink pb-20">
      {/* Hero Header */}
      <section className="border-b border-line bg-surface py-12 lg:py-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <div className="max-w-3xl">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent flex items-center gap-1.5">
              <MapPin size={13} aria-hidden="true" /> Jaringan Toko Fisik Resmi (5 Cabang)
            </span>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              Overtone Pro Cinema Stores
            </h1>
            <p className="mt-3 text-sm sm:text-base text-ink-secondary leading-relaxed max-w-[65ch]">
              Rasakan pengalaman langsung menguji puluhan kamera bioskop dan lensa autentik di studio test bay kami. Konsultasikan setup gear Anda bersama teknisi spesialis in-house, atau ambil pesanan online via layanan <strong className="text-ink">Click &amp; Collect</strong>.
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
                  className={`rounded-sm px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${selectedCity === city
                    ? "bg-ink text-canvas"
                    : "bg-surface-muted border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                    }`}
                >
                  {city}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:max-w-xs">
              <label htmlFor="showroom-search" className="sr-only">Cari lokasi cabang</label>
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                id="showroom-search"
                type="search"
                placeholder="Cari lokasi cabang atau alamat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ot-input pl-9"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Showroom Cards List */}
      <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 mt-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredShowrooms.map((showroom) => (
            <article
              key={showroom.id}
              className="flex flex-col justify-between overflow-hidden rounded-md border border-line bg-surface transition-colors hover:border-line-strong"
            >
              <div>
                {/* Photo & Badge */}
                <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-surface-muted border-b border-line">
                  <img
                    src={showroom.image}
                    alt={`Suasana ruang pamer ${showroom.name}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-3 left-3 rounded-xs bg-ink px-2.5 py-1 text-[11px] font-bold text-canvas uppercase tracking-wider">
                    {showroom.city}
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-6 sm:p-7">
                  <h2 className="font-display text-xl font-bold text-ink tracking-tight">
                    {showroom.name}
                  </h2>
                  <p className="mt-1.5 text-xs font-semibold text-accent">
                    {showroom.highlight}
                  </p>

                  <div className="mt-5 space-y-2.5 text-xs text-ink-secondary tabular-nums">
                    <div className="flex items-start gap-3">
                      <MapPin size={15} className="text-ink shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{showroom.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock size={15} className="text-ink shrink-0" aria-hidden="true" />
                      <span>{showroom.hours}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={15} className="text-ink shrink-0" aria-hidden="true" />
                      <span>{showroom.phone} &bull; WhatsApp: {showroom.whatsapp}</span>
                    </div>
                  </div>

                  {/* Facilities */}
                  <div className="mt-6 border-t border-line pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-2.5">
                      Fasilitas &amp; Layanan Unggulan:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {showroom.facilities.map((fac, idx) => {
                        const Icon = fac.icon;
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-xs border border-line bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-ink"
                          >
                            <Icon size={12} className="text-accent" aria-hidden="true" />
                            {fac.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="border-t border-line bg-surface-muted p-4 sm:px-7 flex flex-wrap items-center justify-between gap-3">
                <a
                  href={showroom.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink hover:border-line-strong transition-colors"
                >
                  <ExternalLink size={13} aria-hidden="true" /> Buka Google Maps
                </a>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${showroom.whatsapp.replace(/[^0-9]/g, "")}?text=Halo%20Overtone%20Music%20Store%2C%20saya%20ingin%20bertanya%20mengenai%20koleksi%20alat%20musik%20di%20showroom%20${encodeURIComponent(showroom.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-sm border border-status-success/40 bg-status-success-bg px-3 py-2 text-xs font-semibold text-status-success hover:opacity-90 transition-opacity"
                  >
                    <MessageCircle size={14} aria-hidden="true" /> Tanya via WhatsApp
                  </a>
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-1.5 rounded-sm bg-ink px-4 py-2 text-xs font-semibold text-canvas hover:bg-ink-secondary transition-colors"
                  >
                    Beli &amp; Ambil di Sini <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Info Banner Click & Collect */}
        <div className="mt-12 rounded-md border border-line bg-surface p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-status-success">
              <ShieldCheck size={16} aria-hidden="true" /> Layanan Prioritas Click &amp; Collect
            </span>
            <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold text-ink tracking-tight">
              Belanja Online, Ambil Langsung di Pro Cinema Store Terdekat
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-ink-secondary leading-relaxed">
              Ingin segera menggunakan kamera cinema impian Anda tanpa menunggu ekspedisi? Pilih metode pemenuhan <strong className="text-ink">Click &amp; Collect</strong> saat checkout. Tim teknisi sensor kami akan menyiapkan unit dan menguji kalibrasi sebelum Anda tiba di toko.
            </p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 rounded-sm bg-accent px-5 py-3 text-xs font-semibold text-[#FAF8F5] hover:bg-accent-hover transition-colors whitespace-nowrap shrink-0"
          >
            Lihat Katalog Cinema Gear <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}

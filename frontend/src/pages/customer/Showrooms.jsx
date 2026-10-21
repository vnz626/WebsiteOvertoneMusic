import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin, Clock, Phone, MessageCircle, ExternalLink, Sparkles,
  Music, Volume2, Wrench, Coffee, CheckCircle2, Search, ArrowRight, ShieldCheck
} from "lucide-react";

const SHOWROOMS_DATA = [
  {
    id: "jkt-senayan",
    name: "Jakarta Flagship Store & Acoustic Lounge",
    city: "Jakarta Pusat",
    address: "Senayan City Mall, Ground Floor #G-18, Jl. Asia Afrika No. 19, Gelora, Tanah Abang, Jakarta Pusat 10270",
    hours: "Setiap Hari (10:00 - 22:00 WIB)",
    phone: "(021) 7278-1999",
    whatsapp: "+62 811-1900-2821",
    googleMapsUrl: "https://maps.google.com/?q=Senayan+City+Jakarta",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
    facilities: [
      { name: "Soundproof Testing Room", icon: Volume2 },
      { name: "Guitar Setup & Luthier Lab", icon: Wrench },
      { name: "Synthesizer Wall", icon: Music },
      { name: "Espresso Lounge Bar", icon: Coffee },
      { name: "Click & Collect Pickup Pass", icon: CheckCircle2 },
    ],
    highlight: "Flagship Showroom Terbesar di Indonesia dengan koleksi Fender Custom Shop & Gibson Murphy Lab",
  },
  {
    id: "jkt-pik",
    name: "Jakarta North Pro Audio & DJ Experience Center",
    city: "Jakarta Utara",
    address: "PIK Avenue Mall, Lantai 1 Unit 1F-02, Jl. Pantai Indah Kapuk, Penjaringan, Jakarta Utara 14470",
    hours: "Setiap Hari (10:00 - 22:00 WIB)",
    phone: "(021) 5088-7200",
    whatsapp: "+62 811-1900-2822",
    googleMapsUrl: "https://maps.google.com/?q=PIK+Avenue+Jakarta",
    image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80",
    facilities: [
      { name: "DJ Rig & Controller Pods", icon: Music },
      { name: "Studio Monitors Demo Room", icon: Volume2 },
      { name: "Electronic Drums Isolation Booth", icon: Volume2 },
      { name: "Click & Collect Pickup Pass", icon: CheckCircle2 },
    ],
    highlight: "Pusat Gear Pro Audio, DJ Numark/Hercules, Synthesizer Akai/Alesis, & Home Studio",
  },
  {
    id: "bdg-dago",
    name: "Bandung Heritage & Luthier Workshop",
    city: "Bandung",
    address: "Jl. Ir. H. Juanda (Dago) No. 128, Coblong, Kota Bandung, Jawa Barat 40135",
    hours: "Senin - Minggu (09:30 - 21:00 WIB)",
    phone: "(022) 250-8819",
    whatsapp: "+62 811-1900-2823",
    googleMapsUrl: "https://maps.google.com/?q=Jl.+Ir.+H.+Juanda+Dago+Bandung",
    image: "https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=800&q=80",
    facilities: [
      { name: "Luthier Repair & Custom Bench", icon: Wrench },
      { name: "Acoustic Guitar Sanctuary", icon: Music },
      { name: "Pedalboard Effects Rig", icon: Sparkles },
      { name: "Garden Community Terrace", icon: Coffee },
      { name: "Click & Collect Pickup Pass", icon: CheckCircle2 },
    ],
    highlight: "Showroom konsep butik kolonial dengan workshop perbaikan gitar dan perawatan resmi bergaransi",
  },
  {
    id: "sby-tp6",
    name: "Surabaya Experience Hub & Piano Gallery",
    city: "Surabaya",
    address: "Tunjungan Plaza 6, Level 3 Unit TP6-302, Jl. Embong Malang No. 32-36, Surabaya, Jawa Timur 60261",
    hours: "Setiap Hari (10:00 - 22:00 WIB)",
    phone: "(031) 534-8890",
    whatsapp: "+62 811-1900-2824",
    googleMapsUrl: "https://maps.google.com/?q=Tunjungan+Plaza+6+Surabaya",
    image: "https://images.unsplash.com/photo-1520523839898-50712825e3a7?auto=format&fit=crop&w=800&q=80",
    facilities: [
      { name: "Grand Piano & Digital Stage Lounge", icon: Music },
      { name: "Bass Guitar Vault", icon: Volume2 },
      { name: "Wireless PA Audio Arena", icon: Sparkles },
      { name: "Click & Collect Pickup Pass", icon: CheckCircle2 },
    ],
    highlight: "Pusat instrumen musik terlengkap di Jawa Timur dengan galeri keyboard & piano akustik",
  },
  {
    id: "bali-sunset",
    name: "Bali Island Music Sanctuary",
    city: "Bali",
    address: "Jl. Sunset Road No. 88, Seminyak, Kuta, Kabupaten Badung, Bali 80361",
    hours: "Setiap Hari (10:00 - 21:30 WITA)",
    phone: "(0361) 847-5500",
    whatsapp: "+62 811-1900-2825",
    googleMapsUrl: "https://maps.google.com/?q=Sunset+Road+Seminyak+Bali",
    image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80",
    facilities: [
      { name: "Boutique Acoustic Hub", icon: Music },
      { name: "Island DJ & Club Gear Rig", icon: Volume2 },
      { name: "Sound Healing & Travel Guitars", icon: Sparkles },
      { name: "Click & Collect Pickup Pass", icon: CheckCircle2 },
    ],
    highlight: "Pusat gear musisi pulau tropis, perlengkapan DJ venue, dan layanan antar cepat area Denpasar/Badung",
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
    <div className="min-h-screen bg-[#FDFDFD] text-gray-900 pb-20">
      {/* Hero Header */}
      <section className="border-b border-gray-200 bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-800">
              <MapPin size={13} /> Flagship Showrooms &amp; Experience Centers
            </span>
            <h1 className="mt-3 font-jakarta text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
              Kunjungi Showroom Resmi Overtone
            </h1>
            <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed">
              Rasakan pengalaman langsung mencoba ratusan instrumen musik autentik di ruang kedap suara kami.
              Konsultasikan kebutuhan gear Anda dengan spesialis musisi kami, atau ambil pesanan online Anda via layanan <b>Click &amp; Collect</b>.
            </p>
          </div>

          {/* Filter & Search Bar */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => setSelectedCity(city)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                    selectedCity === city
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>

            <div className="relative w-full max-w-xs">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari lokasi showroom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-[#F5F5F5] py-2 pl-9 pr-4 text-xs font-medium text-gray-900 outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Showroom Cards List */}
      <section className="mx-auto max-w-[1440px] px-6 lg:px-12 mt-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {filteredShowrooms.map((showroom) => (
            <div
              key={showroom.id}
              className="flex flex-col justify-between overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xs transition hover:border-gray-900 hover:shadow-md"
            >
              <div>
                {/* Photo & Badge */}
                <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-gray-100">
                  <img
                    src={showroom.image}
                    alt={showroom.name}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute top-4 left-4 rounded-full bg-black/75 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                    {showroom.city}
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-6 sm:p-7">
                  <h3 className="font-jakarta text-xl font-extrabold text-gray-900 tracking-tight">
                    {showroom.name}
                  </h3>
                  <p className="mt-2 text-xs font-semibold text-[#8C7A5B]">
                    {showroom.highlight}
                  </p>

                  <div className="mt-5 space-y-3 text-xs text-gray-600">
                    <div className="flex items-start gap-3">
                      <MapPin size={16} className="text-gray-900 shrink-0 mt-0.5" />
                      <span>{showroom.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-gray-900 shrink-0" />
                      <span>{showroom.hours}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-gray-900 shrink-0" />
                      <span>{showroom.phone} &bull; WhatsApp: {showroom.whatsapp}</span>
                    </div>
                  </div>

                  {/* Facilities */}
                  <div className="mt-6 border-t border-gray-100 pt-5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
                      Fasilitas &amp; Layanan Unggulan:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {showroom.facilities.map((fac, idx) => {
                        const Icon = fac.icon;
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700"
                          >
                            <Icon size={12} className="text-gray-900" />
                            {fac.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="border-t border-gray-100 bg-[#FAFAFA] p-5 sm:px-7 flex flex-wrap items-center justify-between gap-3">
                <a
                  href={showroom.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-800 shadow-2xs hover:bg-gray-100 transition"
                >
                  <ExternalLink size={13} /> Petunjuk Arah (Google Maps)
                </a>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${showroom.whatsapp.replace(/[^0-9]/g, "")}?text=Halo%20Overtone%20Music%20Store%2C%20saya%20ingin%20bertanya%20mengenai%20koleksi%20alat%20musik%20di%20showroom%20${encodeURIComponent(showroom.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                  >
                    <MessageCircle size={14} /> Tanya via WA
                  </a>
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-black transition"
                  >
                    Beli &amp; Ambil di Sini <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Banner Click & Collect */}
        <div className="mt-14 rounded-3xl border border-gray-200 bg-white p-8 sm:p-10 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <ShieldCheck size={16} /> Layanan Prioritas Click &amp; Collect
            </span>
            <h3 className="mt-2 font-jakarta text-2xl font-extrabold text-gray-900 tracking-tight">
              Belanja Online, Ambil Langsung di Showroom Terdekat
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed">
              Ingin segera menggunakan gear impian Anda tanpa menunggu ekspedisi? Pilih metode pemenuhan <b>Click &amp; Collect</b> saat checkout.
              Staf kami akan menyiapkan dan menguji coba unit instrumen Anda, lengkap dengan free unboxing &amp; konsultasi setup di Showroom!
            </p>
          </div>
          <Link
            to="/products"
            className="rounded-2xl bg-gray-900 px-6 py-3.5 text-xs font-bold text-white shadow-sm hover:bg-black transition whitespace-nowrap shrink-0"
          >
            Lihat Katalog Instrumen &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}

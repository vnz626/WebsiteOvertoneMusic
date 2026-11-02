import { Link } from "react-router-dom";
import {
  Instagram,
  Youtube,
  Twitter,
  ShieldCheck,
  Store,
  Truck,
  Award,
} from "lucide-react";

const SOCIALS = [
  {
    label: "Instagram Focalpoint Pro",
    href: "https://instagram.com",
    icon: Instagram,
  },
  {
    label: "YouTube Focalpoint Pro",
    href: "https://youtube.com",
    icon: Youtube,
  },
  {
    label: "X Focalpoint Pro",
    href: "https://x.com",
    icon: Twitter,
  },
];

const EXPLORE = [
  { label: "Katalog Cinema Gear & Lensa", to: "/products" },
  { label: "Direktori Offline Store Resmi", to: "/offline-stores" },
  { label: "Lacak Status Pesanan & Resi", to: "/track" },
  { label: "Pesanan Saya & Pickup Pass", to: "/tickets" },
  { label: "Wishlist Cinema Gear", to: "/saved-events" },
  { label: "Pusat Panduan Teknis (KMS)", to: "/help" },
  { label: "Portal Ruang Kerja Staf (OAS)", to: "/internal/portal" },
];

const CATEGORIES = [
  "Cinema & Mirrorless Cameras",
  "Cinema & Prime Lenses",
  "Gimbals & Camera Stabilizers",
  "Studio & Cinema Lighting",
  "Wireless & Broadcast Audio",
  "Monitors & Field Recorders",
];

export default function Footer() {
  return (
    <footer className="mt-auto fp-dark-glass-section border-t border-white/15 text-white/75">
      <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-14 sm:px-6 lg:px-12 relative z-10">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Kolom 1: Identitas Focalpoint Pro & Jaminan Layanan */}
          <div className="md:col-span-5">
            <Link
              to="/"
              className="inline-flex flex-col leading-none select-none"
              aria-label="Beranda Focalpoint Pro — Cinema. Broadcast. Pro."
            >
              <span className="font-display text-2xl font-bold tracking-[-0.035em] text-white leading-none">
                Focalpoint<span className="text-[#E8622C] font-extrabold">.pro</span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/65 mt-1.5 leading-none">
                CINEMA · BROADCAST · PRO
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-xs sm:text-sm leading-relaxed text-white/75 editorial-measure">
              Distributor resmi kamera sinema Sony Cinema Line, RED Digital
              Cinema, Canon Pro, DJI, Aputure, Rode, Atomos, dan Sennheiser di
              Indonesia. Setiap unit melewati inspeksi{" "}
              <em>10-point sensor calibration &amp; firmware QC</em> sebelum
              diserahkan.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5 text-xs font-semibold text-white/90">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md px-3 py-1">
                <Award
                  size={13}
                  className="text-[#E8622C] shrink-0"
                  aria-hidden="true"
                />
                Garansi Resmi
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md px-3 py-1">
                <Store
                  size={13}
                  className="text-[#E8622C] shrink-0"
                  aria-hidden="true"
                />
                Click &amp; Collect 5 Cabang
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md px-3 py-1">
                <Truck
                  size={13}
                  className="text-[#E8622C] shrink-0"
                  aria-hidden="true"
                />
                Packing Kayu Anti-Statis
              </span>
            </div>

            <div className="mt-6 flex items-center gap-2.5">
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 backdrop-blur-md text-white/80 transition-all hover:border-[#E8622C] hover:bg-[#E8622C] hover:text-white"
                >
                  <Icon size={15} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Kolom 2: Navigasi Ritel */}
          <div className="md:col-span-3">
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-white">
              Layanan &amp; Navigasi
            </h2>
            <ul className="mt-4 space-y-2.5 text-xs">
              {EXPLORE.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-white/75 transition-colors hover:text-[#E8622C] font-medium"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kolom 3: Kategori Cinema & Broadcast */}
          <div className="md:col-span-4">
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-white">
              Kategori Kurasi
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Link
                  key={c}
                  to={`/products?category=${encodeURIComponent(c)}`}
                  className="rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white/85 transition-all hover:border-[#E8622C] hover:bg-[#E8622C] hover:text-white"
                >
                  {c}
                </Link>
              ))}
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md px-4 py-2.5">
              <ShieldCheck
                size={16}
                className="text-emerald-400 shrink-0"
                aria-hidden="true"
              />
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">
                100% Cinema Gear Orisinal Bergaransi Resmi
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/15 pt-6 text-xs text-white/60 sm:flex-row">
          <p>
            © {new Date().getFullYear()} Focalpoint Pro — Cinema. Broadcast.
            Pro. Hak cipta dilindungi.
          </p>
          <p className="tabular-nums text-[11px] font-bold tracking-wider text-white/75">
            SISTEM RITEL &amp; INVENTARIS TERPADU (TPS · OAS · KMS · MIS · DSS)
          </p>
        </div>
      </div>
    </footer>
  );
}

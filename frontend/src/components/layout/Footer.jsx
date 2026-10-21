import { Link } from "react-router-dom";
import { Instagram, Youtube, Twitter, ShieldCheck, Store, Truck, Award } from "lucide-react";

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com/overtonemusic", icon: Instagram },
  { label: "YouTube", href: "https://youtube.com/@overtonemusic", icon: Youtube },
  { label: "X", href: "https://x.com/overtonemusic", icon: Twitter },
];

const EXPLORE = [
  { label: "Katalog Instrumen Musik", to: "/products" },
  { label: "Pesanan Saya & Resi", to: "/tickets" },
  { label: "Wishlist Gear Impian", to: "/saved-events" },
  { label: "Pusat Panduan & KMS", to: "/help" },
  { label: "Portal Khusus Staf (OAS)", to: "/internal/portal" },
];

const CATEGORIES = [
  "Electric Guitars",
  "Acoustic Guitars",
  "Bass Guitars",
  "Drums & Percussion",
  "Keyboards & Synths",
  "Amplifiers & Effects",
  "Pro Audio & Studio",
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-[#F9FAFB] text-gray-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
      <div className="mx-auto max-w-[1440px] px-6 pb-8 pt-12 lg:px-12">
        <div className="grid gap-10 md:grid-cols-12">
          
          {/* Kolom 1: Brand & Filosofi */}
          <div className="md:col-span-5">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white uppercase font-sans">
                OVERTONE <span className="text-gray-500 font-light text-xl">Music Store</span>
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-xs sm:text-sm leading-relaxed text-gray-600 dark:text-slate-400">
              Authorized Multi-Brand Musical Instruments &amp; Pro Audio Retailer. Distributor resmi instrumen musik Fender, Gibson, Roland, Yamaha, Marshall, Shure, dan Taylor di Indonesia.
            </p>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><Award size={14} className="text-gray-900 dark:text-white" /> Garansi Resmi Distributor</span>
              <span className="flex items-center gap-1.5"><Store size={14} className="text-gray-900 dark:text-white" /> Click &amp; Collect Showroom</span>
              <span className="flex items-center gap-1.5"><Truck size={14} className="text-gray-900 dark:text-white" /> Packing Kayu Berasuransi</span>
            </div>

            <div className="mt-6 flex items-center gap-2.5">
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 transition-all hover:border-black hover:text-black dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Kolom 2: Navigasi Ritel */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">Layanan &amp; Navigasi</h4>
            <ul className="mt-4 space-y-2 text-xs">
              {EXPLORE.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-gray-600 dark:text-slate-400 transition hover:text-black dark:hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kolom 3: Kategori Alat Musik */}
          <div className="md:col-span-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">Kategori Instrumen</h4>
            <div className="mt-4 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Link
                  key={c}
                  to={`/products?category=${encodeURIComponent(c)}`}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 transition hover:border-gray-900 hover:text-black dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  {c}
                </Link>
              ))}
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-3.5 py-2 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <ShieldCheck size={16} className="text-[#16A34A]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-800 dark:text-slate-200">100% Original Authorized Gear</span>
            </div>
          </div>

        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-5 text-xs text-gray-500 sm:flex-row dark:border-slate-800">
          <p>© {new Date().getFullYear()} Overtone Music Store Indonesia. All rights reserved.</p>
          <p className="font-mono text-[11px] tracking-wider text-gray-600 dark:text-slate-400">ENTERPRISE RETAIL &amp; INVENTORY SYSTEM (TPS · OAS · KMS · MIS)</p>
        </div>
      </div>
    </footer>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowRight, Package } from "lucide-react";
import api from "../../api";
import { ProductCard } from "./Home";

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/users/saved-events")
      .then((r) => setItems(r.data.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen fp-home-canvas pb-24 px-4 sm:px-6 lg:px-12 pt-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#0F1B2D]/10 pb-6 mb-8">
          <div>
            <div className="fp-section-pill mb-2">
              <Heart size={12} className="text-[#E8622C] fill-current" aria-hidden="true" />
              <span>Koleksi Cinema Gear Tersimpan</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F1B2D]">
              Wishlist Cinema &amp; Broadcast Gear
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#3A4A63] max-w-2xl">
              Daftar kamera bioskop, lensa prime, gimbal, dan perangkat broadcast pilihan yang Anda simpan untuk dibandingkan atau diuji langsung di Showroom Focalpoint Pro.
            </p>
          </div>
          <Link to="/products" className="fp-btn-glass-secondary !py-2.5 !px-5 !text-xs self-start sm:self-auto">
            <span>Jelajahi Katalog</span>
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4" role="status" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton rounded-3xl h-80" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="fp-glass-card !p-12 text-center max-w-lg mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/80 border border-white text-[#3A4A63] mb-4 shadow-xs">
              <Heart size={26} aria-hidden="true" className="text-[#E8622C]" />
            </div>
            <h2 className="font-display font-bold text-[#0F1B2D] text-lg">Wishlist Anda Masih Kosong</h2>
            <p className="mt-1.5 text-xs text-[#3A4A63] max-w-sm mx-auto leading-relaxed">
              Simpan kamera bioskop, lensa cinema prime, gimbal, lighting, mikrofon, atau field monitor impian Anda saat menjelajah katalog kami.
            </p>
            <Link to="/products" className="fp-btn-glass-primary !py-2.5 !px-5 mt-6 inline-flex">
              <span>Mulai Eksplorasi Katalog</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

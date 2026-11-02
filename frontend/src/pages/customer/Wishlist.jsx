import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ArrowRight } from "lucide-react";
import api from "../../api";
import Button from "../../components/ui/Button";
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
    <div className="min-h-[calc(100vh-72px)] bg-canvas py-10 text-ink">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-6 mb-8">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent flex items-center gap-1.5">
              <Heart size={12} aria-hidden="true" /> Koleksi Cinema Gear Tersimpan
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink mt-1">
              Wishlist Cinema &amp; Broadcast Gear
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-secondary max-w-[65ch]">
              Daftar kamera bioskop, lensa prime, gimbal, dan perangkat broadcast pilihan yang Anda simpan untuk dibandingkan atau diuji langsung di Pro Cinema Store.
            </p>
          </div>
          <Link to="/products">
            <Button variant="secondary" size="sm">
              Jelajahi Katalog <ArrowRight size={13} aria-hidden="true" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4" role="status" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton rounded-md h-80 border border-line" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-md border border-dashed border-line-strong bg-surface p-12 text-center max-w-lg mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-surface-muted border border-line text-ink-muted mb-3">
              <Heart size={24} aria-hidden="true" />
            </div>
            <h2 className="font-display font-bold text-ink text-base">Wishlist Anda Masih Kosong</h2>
            <p className="mt-1 text-xs text-ink-secondary max-w-sm mx-auto leading-relaxed">
              Simpan kamera bioskop, lensa cinema prime, gimbal, lighting, mikrofon, atau field monitor impian Anda saat menjelajah katalog kami.
            </p>
            <Link to="/products" className="inline-block mt-5">
              <Button variant="primary" size="sm">
                Mulai Eksplorasi Katalog
              </Button>
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

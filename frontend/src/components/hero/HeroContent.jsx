import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

const QUICK_CATEGORIES = [
  { label: "Cinema Cameras", category: "Cinema & Mirrorless Cameras" },
  { label: "Prime Lenses", category: "Cinema & Prime Lenses" },
  { label: "Gimbals", category: "Gimbals & Camera Stabilizers" },
  { label: "Studio Lighting", category: "Studio & Cinema Lighting" },
  { label: "Broadcast Audio", category: "Wireless & Broadcast Audio" },
  { label: "Field Monitors", category: "Monitors & Field Recorders" },
];

export default function HeroContent() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function handleSearchSubmit(e) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/products?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate("/products");
    }
  }

  function handleQuickCategory(categoryName) {
    navigate(`/products?category=${encodeURIComponent(categoryName)}`);
  }

  return (
    <div className="hero__content">
      <div className="hero__content-inner">
        {/* 1. Headline (2 lines, centered, tight tracking) */}
        <h1 className="hero__headline reveal">
          Everything <span className="hero__headline-muted">in</span>
          <br />
          Focus
        </h1>

        {/* 2. Subtext (Concise, high-contrast frosted glass capsule) */}
        <p className="hero__sub reveal">
          Kamera sinema, lensa prime, lighting &amp; audio broadcast profesional.
          <br className="hidden sm:inline" /> Perlengkapan standar industri untuk
          setiap skala produksi.
        </p>

        {/* 3. Glass Search / CTA Pill */}
        <form
          onSubmit={handleSearchSubmit}
          role="search"
          aria-label="Pencarian perlengkapan produksi Focalpoint Pro"
          className="hero__search-form reveal"
        >
          <div className="hero__search-pill glass">
            <Search
              size={17}
              className="hero__search-icon"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kamera, lensa, gimbal, lighting…"
              aria-label="Cari kamera, lensa, gimbal, lighting"
              className="hero__search-input"
            />
            <button type="submit" className="hero__search-btn">
              Cari Gear
            </button>
          </div>
        </form>

        {/* 4. Quick 1-Click Category Tags */}
        <div
          className="hero__quick-tags reveal"
          role="group"
          aria-label="Kategori populer"
        >
          {QUICK_CATEGORIES.map((item) => (
            <button
              key={item.category}
              type="button"
              onClick={() => handleQuickCategory(item.category)}
              className="hero__quick-tag"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

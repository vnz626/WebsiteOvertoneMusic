import { useEffect, useRef } from "react";
import HeroNavbar from "./HeroNavbar";
import HeroContent from "./HeroContent";
import "./hero.css";

export default function Hero({ productCount = 91 }) {
  const heroRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    function handleScroll() {
      if (prefersReducedMotion.matches || window.innerWidth < 768) {
        el.style.setProperty("--py", "0px");
        return;
      }
      const scrollY = window.scrollY;
      if (scrollY <= window.innerHeight) {
        const offsetY = Math.min(Math.max(scrollY * 0.04, -14), 14);
        el.style.setProperty("--py", `${offsetY.toFixed(1)}px`);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function handleMouseMove(e) {
    const el = heroRef.current;
    if (!el) return;
    if (
      window.innerWidth < 768 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const rect = el.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const px = Math.min(Math.max(relX * -16, -14), 14).toFixed(1);
      const scrollBoost = Math.min(window.scrollY * 0.03, 10);
      const py = Math.min(Math.max(relY * -12 + scrollBoost, -14), 14).toFixed(1);
      el.style.setProperty("--px", `${px}px`);
      el.style.setProperty("--py", `${py}px`);
    });
  }

  function handleMouseLeave() {
    const el = heroRef.current;
    if (!el) return;
    el.style.setProperty("--px", "0px");
    const scrollBoost =
      window.innerWidth >= 768
        ? Math.min(window.scrollY * 0.035, 12).toFixed(1)
        : "0";
    el.style.setProperty("--py", `${scrollBoost}px`);
  }

  return (
    <>
      {/* Layer z-100: Floating Glass Navbar (Outside .hero stacking context so it stays above all page sections on scroll) */}
      <HeroNavbar />

      <section
        ref={heroRef}
        className="hero"
        aria-label="Focalpoint Pro — Window to the Set Hero"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Layer z-0: Exterior Film Set (Kamera dolly, boom mic, gimbal, LED softbox, video village) */}
        <img
          src="/hero/exterior-set.webp"
          alt="Set syuting film profesional di lapangan terbuka dengan kamera sinema di atas dolly, operator boom mic, gimbal stabilizer, lampu LED softbox, dan tenda video village"
          className="hero__exterior"
          fetchPriority="high"
          decoding="async"
        />
        <div className="hero__set-glow" aria-hidden="true" />

        {/* Layer z-10: Interior Production Trailer Frame (Alpha transparent window, director chairs, field monitor, XLR cables) */}
        <picture className="hero__interior-picture">
          <source
            media="(max-width: 767px)"
            srcSet="/hero/interior-frame-mobile.webp"
            type="image/webp"
          />
          <img
            src="/hero/interior-frame.webp"
            alt="Interior trailer produksi video village dengan bingkai jendela logam, kursi sutradara oranye, monitor lapangan menyala, headphone studio, dan kabel XLR"
            className="hero__interior"
            fetchPriority="high"
            decoding="async"
          />
        </picture>

        {/* Layer z-20: Subtle Glass Tint & Readability Backdrop */}
        <div className="hero__glass-tint" aria-hidden="true" />

        {/* Layer z-30: Centered Headline, Subtext, Badge & Glass Search Pill */}
        <HeroContent productCount={productCount} />
      </section>
    </>
  );
}


import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  User,
  Package,
  Bookmark,
  LogOut,
  Bell,
  LayoutDashboard,
} from "lucide-react";
import { useAuth, homeForRole } from "../../auth/AuthContext";
import ProfileModal from "../profile/ProfileModal";

export default function HeroNavbar() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleCategoryClick(e) {
    setMobileOpen(false);
    if (location.pathname === "/") {
      const el = document.getElementById("categories-section");
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function handleLogout() {
    setUserMenuOpen(false);
    setMobileOpen(false);
    logout();
    navigate("/login");
  }

  const displayName = user?.name || user?.username || "Akun Saya";
  const isInternalStaff = [
    "super_admin",
    "admin",
    "manager",
    "finance",
    "warehouse_staff",
    "warehouse",
    "store_staff",
    "promoter",
    "staff",
  ].includes(role);

  return (
    <>
      <header
        className={`hero__nav ${scrolled ? "hero__nav--scrolled" : ""}`}
        role="banner"
      >
        {/* Column 1 (Left): Focalpoint Pro Full-Text Wordmark */}
        <div className="hero__nav-left">
          <Link
            to="/"
            className="hero__logo-link flex flex-col leading-none select-none"
            aria-label="Focalpoint Pro — Cinema. Broadcast. Pro."
          >
            <span className="font-display text-[21px] sm:text-[22px] font-bold tracking-[-0.035em] text-white leading-none">
              Focalpoint<span className="text-[#E8622C] font-extrabold">.pro</span>
            </span>
            <span className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-white/70 mt-1 leading-none">
              CINEMA · BROADCAST · PRO
            </span>
          </Link>
        </div>

        {/* Column 2 (Center): Glass Pill Menu (Beranda · Produk · Kategori · Kontak) */}
        <nav
          className="hero__nav-menu glass"
          aria-label="Navigasi utama Focalpoint Pro"
        >
          <Link
            to="/"
            className={`hero__nav-link ${
              location.pathname === "/" && !location.hash
                ? "hero__nav-link--active"
                : ""
            }`}
          >
            Beranda
          </Link>
          <Link
            to="/products"
            className={`hero__nav-link ${
              location.pathname.startsWith("/products")
                ? "hero__nav-link--active"
                : ""
            }`}
          >
            Produk
          </Link>
          <a
            href="#categories-section"
            onClick={handleCategoryClick}
            className="hero__nav-link"
          >
            Kategori
          </a>
          <Link
            to="/offline-stores"
            className={`hero__nav-link ${
              location.pathname.startsWith("/offline-store")
                ? "hero__nav-link--active"
                : ""
            }`}
          >
            Kontak
          </Link>
        </nav>

        {/* Column 3 (Right): Masuk / User Menu + "Lihat Katalog" Button + Mobile Hamburger */}
        <div className="hero__nav-right">
          {isAuthenticated && isInternalStaff && (
            <Link
              to={homeForRole(role)}
              className="nav-login"
              title="Ruang Kerja Staf"
            >
              <LayoutDashboard size={14} aria-hidden="true" />
              <span>Workspace</span>
            </Link>
          )}

          {isAuthenticated ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="nav-login"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                title={displayName}
              >
                <User size={14} aria-hidden="true" />
                <span>{displayName.split(" ")[0]}</span>
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 rounded-xl border border-white/25 bg-[#0E1116]/95 backdrop-blur-xl py-2 shadow-2xl text-white z-50"
                >
                  <div className="px-4 py-2.5 border-b border-white/10">
                    <p className="text-xs font-bold text-white truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-white/60 truncate">
                      {user?.email || "Member Focalpoint Pro"}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setProfileModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors text-left"
                    >
                      <User size={14} className="text-[#E8622C] shrink-0" />
                      <span>Profil Saya</span>
                    </button>

                    <Link
                      to="/tickets"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Package size={14} className="text-[#E8622C] shrink-0" />
                      <span>Pesanan Saya</span>
                    </Link>

                    <Link
                      to="/saved-events"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Bookmark size={14} className="text-[#E8622C] shrink-0" />
                      <span>Wishlist Gear</span>
                    </Link>

                    <Link
                      to="/notifications"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Bell size={14} className="text-[#E8622C] shrink-0" />
                      <span>Notifikasi</span>
                    </Link>

                    {isInternalStaff && (
                      <Link
                        to={homeForRole(role)}
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-[#F59E0B] hover:bg-white/10 transition-colors"
                      >
                        <LayoutDashboard size={14} className="shrink-0" />
                        <span>Ruang Kerja Staf</span>
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/15 transition-colors text-left"
                    >
                      <LogOut size={14} className="shrink-0" />
                      <span>Keluar Akun</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="nav-login">
              Masuk
            </Link>
          )}

          <Link to="/products" className="nav-cta">
            Lihat Katalog
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="hero__burger"
            aria-expanded={mobileOpen}
            aria-label={
              mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"
            }
          >
            {mobileOpen ? (
              <X size={18} aria-hidden="true" />
            ) : (
              <Menu size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Drawer (< 768px) */}
      {mobileOpen && (
        <nav
          className="hero__mobile-panel"
          aria-label="Navigasi seluler Focalpoint Pro"
        >
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="hero__mobile-link"
          >
            Beranda
          </Link>
          <Link
            to="/products"
            onClick={() => setMobileOpen(false)}
            className="hero__mobile-link"
          >
            Produk &amp; Katalog
          </Link>
          <a
            href="#categories-section"
            onClick={handleCategoryClick}
            className="hero__mobile-link"
          >
            Kategori Gear
          </a>
          <Link
            to="/offline-stores"
            onClick={() => setMobileOpen(false)}
            className="hero__mobile-link"
          >
            Kontak &amp; Showroom
          </Link>
          <Link
            to="/track"
            onClick={() => setMobileOpen(false)}
            className="hero__mobile-link"
          >
            Lacak Pesanan
          </Link>
          <Link
            to="/help"
            onClick={() => setMobileOpen(false)}
            className="hero__mobile-link"
          >
            Panduan &amp; KMS
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/tickets"
                onClick={() => setMobileOpen(false)}
                className="hero__mobile-link"
              >
                Pesanan Saya
              </Link>
              {isInternalStaff && (
                <Link
                  to={homeForRole(role)}
                  onClick={() => setMobileOpen(false)}
                  className="hero__mobile-link text-[#F59E0B]"
                >
                  Ruang Kerja Staf
                </Link>
              )}
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="hero__mobile-link"
            >
              Masuk Akun
            </Link>
          )}
        </nav>
      )}

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </>
  );
}

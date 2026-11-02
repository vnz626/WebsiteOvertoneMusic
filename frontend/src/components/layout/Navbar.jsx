import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bookmark,
  LogOut,
  Package,
  Search,
  User,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { useAuth, homeForRole } from "../../auth/AuthContext";
import NotificationBell from "./NotificationBell";
import ProfileModal from "../profile/ProfileModal";

const navLinkClass = ({ isActive }) =>
  `text-xs font-bold tracking-wide transition-all duration-fast px-3.5 py-1.5 rounded-full ${
    isActive
      ? "bg-[#0F1B2D] text-white shadow-sm"
      : "text-[#2C3D52] hover:bg-[#0F1B2D]/[0.07] hover:text-[#0F1B2D]"
  }`;

export default function Navbar() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function handleSearch(e) {
    e.preventDefault();
    const term = q.trim();
    setMobileMenuOpen(false);
    navigate(`/products${term ? `?q=${encodeURIComponent(term)}` : ""}`);
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const displayName = user?.name || user?.username || "Akun Saya";
  const initial = displayName.charAt(0).toUpperCase() || "U";
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
      <header className="sticky top-0 z-40 h-[72px] w-full fp-glass-bar">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-12">
          {/* Brand Focalpoint Pro */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              className="inline-flex lg:hidden h-9 w-9 items-center justify-center rounded-full border border-[#0F1B2D]/15 bg-white/80 text-[#0F1B2D] hover:bg-white transition-colors duration-fast"
            >
              {mobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>

            <Link
              to="/"
              className="flex flex-col flex-shrink-0 group leading-none select-none"
              aria-label="Beranda Focalpoint Pro — Cinema. Broadcast. Pro."
            >
              <span className="font-display text-[21px] sm:text-[22px] font-bold tracking-[-0.035em] text-[#0F1B2D] leading-none group-hover:opacity-90 transition-opacity">
                Focalpoint<span className="text-[#E8622C] font-extrabold">.pro</span>
              </span>
              <span className="text-[8.5px] font-bold uppercase tracking-[0.18em] text-[#3A4A63] mt-1 leading-none">
                CINEMA · BROADCAST · PRO
              </span>
            </Link>
          </div>

          {/* Pencarian Glass Pill */}
          <form
            onSubmit={handleSearch}
            role="search"
            className="hidden max-w-xs md:max-w-sm xl:max-w-md flex-1 md:block"
          >
            <div className="relative flex w-full items-center">
              <Search
                size={15}
                className="pointer-events-none absolute left-4 text-[#3A4A63]"
                aria-hidden="true"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9 w-full rounded-full border border-[#0F1B2D]/15 bg-white/75 backdrop-blur-md pl-10 pr-4 text-xs font-medium text-[#0F1B2D] placeholder:text-[#3A4A63] focus:border-[#E8622C] focus:bg-white transition-all"
                placeholder="Cari kamera cinema, lensa, gimbal, atau merek (Sony, RED, Canon)..."
                type="search"
                aria-label="Cari kamera cinema atau brand"
              />
            </div>
          </form>

          {/* Navigasi Utama Glass Pill */}
          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 rounded-full border border-[#0F1B2D]/12 bg-white/65 backdrop-blur-md p-1 lg:flex">
            <NavLink to="/products" className={navLinkClass}>
              Katalog
            </NavLink>
            <NavLink to="/offline-stores" className={navLinkClass}>
              Showroom
            </NavLink>
            <NavLink to="/track" className={navLinkClass}>
              Lacak Pesanan
            </NavLink>
            <NavLink to="/help" className={navLinkClass}>
              Panduan &amp; KMS
            </NavLink>
            {isAuthenticated && isInternalStaff && (
              <Link
                to={homeForRole(role)}
                className="rounded-full bg-[#E8622C]/15 border border-[#E8622C]/30 px-3.5 py-1.5 text-xs font-bold text-[#E8622C] transition-colors hover:bg-[#E8622C] hover:text-white"
              >
                Workspace
              </Link>
            )}
          </nav>

          {/* Aksi Pengguna */}
          <div className="flex flex-shrink-0 items-center gap-2.5">
            {isAuthenticated && (
              <Link
                to="/tickets"
                className="hidden items-center gap-2 rounded-sm border border-line bg-surface px-3.5 py-1.5 text-xs font-bold text-ink transition-colors duration-fast hover:border-line-strong hover:bg-surface-muted sm:inline-flex"
              >
                <Package size={15} className="text-accent" aria-hidden="true" />
                <span>Pesanan Saya</span>
              </Link>
            )}

            <NotificationBell />

            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-sm border border-line bg-surface-muted py-1 pl-1.5 pr-2.5 text-xs font-bold text-ink transition-colors duration-fast hover:border-line-strong hover:bg-surface-subtle"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-xs bg-ink text-xs font-bold text-surface">
                    {initial}
                  </span>
                  <span className="max-w-[120px] truncate text-xs font-bold text-ink">
                    {displayName}
                  </span>
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`text-ink-muted transition-transform duration-fast ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {dropdownOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 rounded-md border border-line-strong bg-surface py-1.5 shadow-lg z-50"
                  >
                    <div className="px-4 py-2.5 border-b border-line bg-surface-muted">
                      <p className="text-xs font-bold text-ink truncate">{displayName}</p>
                      <p className="text-[11px] text-ink-muted truncate">{user?.email || ""}</p>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setDropdownOpen(false);
                          setProfileModalOpen(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-ink-secondary hover:bg-surface-muted hover:text-ink transition-colors duration-fast text-left"
                      >
                        <User size={15} className="text-ink-muted shrink-0" aria-hidden="true" />
                        <div>
                          <p className="font-bold text-ink">Profil Saya</p>
                          <p className="text-[11px] text-ink-muted">Identitas, alamat, &amp; notifikasi</p>
                        </div>
                      </button>

                      <Link
                        to="/saved-events"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-ink-secondary hover:bg-surface-muted hover:text-ink transition-colors duration-fast"
                      >
                        <Bookmark size={15} className="text-ink-muted shrink-0" aria-hidden="true" />
                        <div>
                          <p className="font-bold text-ink">Wishlist Cinema Gear</p>
                          <p className="text-[11px] text-ink-muted">Daftar gear yang disimpan</p>
                        </div>
                      </Link>

                      <Link
                        to="/tickets"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full flex sm:hidden items-center gap-3 px-4 py-2.5 text-xs text-ink-secondary hover:bg-surface-muted hover:text-ink transition-colors duration-fast"
                      >
                        <Package size={15} className="text-ink-muted shrink-0" aria-hidden="true" />
                        <div>
                          <p className="font-bold text-ink">Pesanan Saya</p>
                          <p className="text-[11px] text-ink-muted">Riwayat pembelian &amp; resi</p>
                        </div>
                      </Link>
                    </div>

                    <div className="border-t border-line pt-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-status-danger-text hover:bg-status-danger-bg transition-colors duration-fast text-left"
                      >
                        <LogOut size={15} className="shrink-0" aria-hidden="true" />
                        <span>Keluar Akun</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-sm bg-accent hover:bg-accent-hover px-4 py-2 text-xs font-bold text-accent-on transition-colors duration-fast"
              >
                Masuk Akun
              </Link>
            )}
          </div>
        </div>

        {/* Panel Navigasi Mobile */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-line bg-surface px-4 py-4 shadow-md space-y-4">
            <form onSubmit={handleSearch} role="search">
              <div className="relative flex w-full items-center">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="h-9 w-full rounded-sm border border-line bg-canvas pl-10 pr-4 text-xs font-medium text-ink"
                  placeholder="Cari kamera cinema atau brand..."
                  type="search"
                  aria-label="Cari kamera cinema atau brand"
                />
              </div>
            </form>
            <nav aria-label="Navigasi seluler" className="flex flex-col space-y-2">
              <NavLink
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-ink hover:bg-surface-muted rounded-sm"
              >
                Katalog Cinema Gear
              </NavLink>
              <NavLink
                to="/offline-stores"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-ink hover:bg-surface-muted rounded-sm"
              >
                Offline Stores
              </NavLink>
              <NavLink
                to="/track"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-ink hover:bg-surface-muted rounded-sm"
              >
                Lacak Pesanan
              </NavLink>
              <NavLink
                to="/help"
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-ink hover:bg-surface-muted rounded-sm"
              >
                Panduan &amp; KMS
              </NavLink>
              {isAuthenticated && isInternalStaff && (
                <Link
                  to={homeForRole(role)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-accent hover:bg-surface-muted rounded-sm"
                >
                  Ruang Kerja Staf
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </>
  );
}

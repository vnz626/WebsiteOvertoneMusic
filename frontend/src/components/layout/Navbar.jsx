import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bookmark, LogOut, Package, Search, User, ChevronDown, Sparkles } from "lucide-react";
import { useAuth, homeForRole } from "../../auth/AuthContext";
import NotificationBell from "./NotificationBell";
import ProfileModal from "../profile/ProfileModal";

const linkCls =
  "text-xs uppercase font-bold tracking-wider text-gray-700 transition hover:text-black";

export default function Navbar() {
  const { isAuthenticated, user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function handleSearch(e) {
    e.preventDefault();
    const term = q.trim();
    navigate(`/products${term ? `?q=${encodeURIComponent(term)}` : ""}`);
  }

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.name || user?.username || "Akun Saya";
  const initial = displayName.charAt(0).toUpperCase() || "U";
  const isInternalStaff = ["super_admin", "admin", "manager", "finance", "warehouse_staff", "warehouse", "store_staff", "promoter", "staff"].includes(role);

  return (
    <>
      <header className="sticky top-0 z-40 h-[72px] w-full border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-6 px-6 lg:px-12">
          {/* Brand Overtone Music Store - Text Wordmark */}
          <Link to="/" className="flex flex-col flex-shrink-0 group" aria-label="Overtone Music Store">
            <span className="font-jakarta text-[22px] font-black tracking-tight text-gray-900 leading-none group-hover:text-black transition">
              OVERTONE
            </span>
            <span className="text-[9px] font-bold tracking-[0.24em] uppercase text-gray-500 mt-0.5">
              MUSIC STORE
            </span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden max-w-xs md:max-w-sm xl:max-w-md flex-1 md:block">
            <div className="relative flex w-full items-center">
              <Search size={15} className="pointer-events-none absolute left-3.5 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-9.5 w-full rounded-full border border-gray-200 bg-[#F5F5F5] pl-10 pr-4 text-xs font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
                placeholder="Cari alat musik atau brand (Fender, Gibson, Yamaha)..."
                type="text"
                aria-label="Cari instrumen"
              />
            </div>
          </form>

          <nav className="hidden items-center gap-5 lg:flex">
            <NavLink to="/products" className={linkCls}>Katalog</NavLink>
            <NavLink to="/showrooms" className={linkCls}>Showroom</NavLink>
            <NavLink to="/help" className={linkCls}>Bantuan</NavLink>
            {isAuthenticated && isInternalStaff && (
              <Link
                to={homeForRole(role)}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-900 transition hover:bg-gray-200"
              >
                Dashboard Staff
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex flex-shrink-0 items-center gap-3">
            {isAuthenticated && (
              <Link
                to="/tickets"
                className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 sm:inline-flex"
              >
                <Package size={15} className="text-gray-700" />
                Pesanan Saya
              </Link>
            )}

            <NotificationBell />

            {isAuthenticated ? (
              /* User Pill Dropdown Menu (Seperti Referensi Gambar) */
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2.5 rounded-full border border-gray-200 bg-[#F5F5F5] py-1 pl-1 pr-3 text-xs font-semibold text-gray-800 transition hover:bg-gray-200 hover:border-gray-300 shadow-xs focus:outline-none"
                  aria-expanded={dropdownOpen}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#111111] text-xs font-bold text-white shadow-xs">
                    {initial}
                  </span>
                  <span className="max-w-[130px] truncate text-xs font-bold text-gray-900">
                    {displayName}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown Container */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-gray-200 bg-white py-2 shadow-xl z-50 animate-fadeIn">
                    {/* User Info Header */}
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-900 truncate">{displayName}</p>
                      <p className="text-[11px] text-gray-500 truncate">{user?.email || ""}</p>
                    </div>

                    <div className="py-1">
                      {/* 1. Profil Saya (Bisa Isi Alamat) */}
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          setProfileModalOpen(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-black transition-colors text-left"
                      >
                        <User size={15} className="text-gray-500" />
                        <div>
                          <p className="font-semibold text-gray-900">Profil Saya</p>
                          <p className="text-[10px] text-gray-500">Kelola info akun &amp; alamat</p>
                        </div>
                      </button>

                      {/* 2. Wishlist (Dipindah ke dalam Dropdown) */}
                      <Link
                        to="/saved-events"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
                      >
                        <Bookmark size={15} className="text-gray-500" />
                        <div>
                          <p className="font-semibold text-gray-900">Wishlist</p>
                          <p className="text-[10px] text-gray-500">Gear musik yang disimpan</p>
                        </div>
                      </Link>
                    </div>

                    {/* Divider & 3. Log Out (Highlight Merah) */}
                    <div className="border-t border-gray-100 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left"
                      >
                        <LogOut size={15} className="text-red-500" />
                        <span>Keluar (Log Out)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1 rounded-full bg-[#111111] hover:bg-black px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Modal Profil Saya (Isi Alamat) */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </>
  );
}

import { useState, useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  Menu,
  X,
  Store,
  LogOut,
  User,
  TrendingUp,
  Cpu,
  Tag,
  FileCheck,
  CalendarCheck,
  BarChart3,
  Wallet,
  RotateCcw,
  CreditCard,
  Boxes,
  FileText,
  Truck,
  PackageCheck,
  Headphones,
  Users,
  BookOpen,
  Percent,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

const ROLE_MENUS = {
  super_admin: [
    { to: "/admin/dashboard", label: "System Overview", icon: BarChart3 },
    { to: "/store/support", label: "Live Chat Console & Helpdesk", icon: Headphones },
    { to: "/admin/users", label: "Manajemen Staf (OAS)", icon: Users },
    { to: "/admin/users?tab=customers", label: "Direktori Pelanggan (TPS)", icon: User },
    { to: "/admin/kms", label: "KMS & Artikel (Dual-Scope)", icon: BookOpen },
    { to: "/admin/sop", label: "Portal SOP Staf", icon: Sparkles },
  ],
  admin: [
    { to: "/admin/dashboard", label: "System Overview", icon: BarChart3 },
    { to: "/store/support", label: "Live Chat Console & Helpdesk", icon: Headphones },
    { to: "/admin/users", label: "Manajemen Staf (OAS)", icon: Users },
    { to: "/admin/users?tab=customers", label: "Direktori Pelanggan (TPS)", icon: User },
    { to: "/admin/kms", label: "KMS & Artikel (Dual-Scope)", icon: BookOpen },
    { to: "/admin/sop", label: "Portal SOP Staf", icon: Sparkles },
  ],
  manager: [
    { to: "/admin/mis", label: "MIS Executive Dashboard", icon: TrendingUp },
    { to: "/manager/dss", label: "Smart Restock DSS", icon: Cpu },
    { to: "/manager/clearance", label: "Deadstock & Clearance Simulator", icon: Tag },
    { to: "/manager/po", label: "Approval Purchase Order", icon: FileCheck },
    { to: "/admin/events", label: "Approval Katalog", icon: CalendarCheck },
    { to: "/manager/sop", label: "SOP & Panduan Kerja", icon: BookOpen },
  ],
  finance: [
    { to: "/finance/dashboard", label: "Laporan Laba Rugi (P&L)", icon: BarChart3 },
    { to: "/finance/clearance", label: "Deadstock & Clearance Simulator", icon: Tag },
    { to: "/finance/po", label: "Pembayaran PO Supplier", icon: Wallet },
    { to: "/finance/refunds", label: "Refund & Retur", icon: RotateCcw },
    { to: "/finance/transactions", label: "Audit Transaksi", icon: CreditCard },
    { to: "/finance/sop", label: "SOP & Panduan Kerja", icon: BookOpen },
  ],
  warehouse_staff: [
    { to: "/warehouse/inventory", label: "Kartu Stok & Inventaris", icon: Boxes },
    { to: "/warehouse/dss", label: "Smart Restock DSS", icon: Cpu },
    { to: "/warehouse/po", label: "Pengajuan PO Supplier", icon: FileText },
    { to: "/warehouse/orders", label: "Pengiriman & Resi Ekspedisi", icon: Truck },
    { to: "/warehouse/logs", label: "Log Mutasi Stok", icon: PackageCheck },
    { to: "/warehouse/sop", label: "SOP & Panduan Kerja", icon: BookOpen },
  ],
  warehouse: [
    { to: "/warehouse/inventory", label: "Kartu Stok & Inventaris", icon: Boxes },
    { to: "/warehouse/dss", label: "Smart Restock DSS", icon: Cpu },
    { to: "/warehouse/po", label: "Pengajuan PO Supplier", icon: FileText },
    { to: "/warehouse/orders", label: "Pengiriman & Resi Ekspedisi", icon: Truck },
    { to: "/warehouse/logs", label: "Log Mutasi Stok", icon: PackageCheck },
    { to: "/warehouse/sop", label: "SOP & Panduan Kerja", icon: BookOpen },
  ],
  store_staff: [
    { to: "/store/support", label: "Live Chat Console & Helpdesk", icon: Headphones },
    { to: "/store/catalog", label: "Manajemen Katalog & SKU", icon: Tag },
    { to: "/store/pickups", label: "Click & Collect Pickup Pass", icon: Store },
    { to: "/store/sop", label: "SOP & Panduan Kerja", icon: BookOpen },
  ],
  promoter: [
    { to: "/store/support", label: "Live Chat Console & Helpdesk", icon: Headphones },
    { to: "/store/catalog", label: "Manajemen Katalog & SKU", icon: Tag },
    { to: "/store/pickups", label: "Click & Collect Pickup Pass", icon: Store },
    { to: "/store/sop", label: "SOP & Panduan Kerja", icon: BookOpen },
  ],
  staff: [
    { to: "/store/support", label: "Live Chat Console & Helpdesk", icon: Headphones },
    { to: "/store/catalog", label: "Manajemen Katalog & SKU", icon: Tag },
    { to: "/store/pickups", label: "Click & Collect Pickup Pass", icon: Store },
    { to: "/store/sop", label: "SOP & Panduan Kerja", icon: BookOpen },
  ],
};

function getPageName(pathname) {
  if (pathname.includes("/sop")) return "SOP & Panduan Kerja Operasional";
  if (pathname.startsWith("/admin/mis")) return "MIS Executive Dashboard";
  if (pathname.startsWith("/manager/dss") || pathname.startsWith("/warehouse/dss")) return "Smart Restock DSS";
  if (pathname.startsWith("/manager/clearance") || pathname.startsWith("/finance/clearance")) return "Deadstock & Clearance Simulator";
  if (pathname.startsWith("/manager/po")) return "Approval Purchase Order";
  if (pathname.startsWith("/admin/events")) return "Approval Katalog";
  if (pathname.startsWith("/finance/dashboard") || pathname.startsWith("/finance/laporan") || pathname.startsWith("/finance/pnl")) return "Laporan Laba Rugi (P&L)";
  if (pathname.startsWith("/finance/po")) return "Pembayaran PO Supplier";
  if (pathname.startsWith("/finance/refunds")) return "Refund & Retur";
  if (pathname.startsWith("/finance/transactions")) return "Audit Transaksi";
  if (pathname.startsWith("/warehouse/inventory")) return "Kartu Stok & Inventaris";
  if (pathname.startsWith("/warehouse/po")) return "Pengajuan PO Supplier";
  if (pathname.startsWith("/warehouse/orders")) return "Pengiriman & Resi Ekspedisi";
  if (pathname.startsWith("/warehouse/logs")) return "Log Mutasi Stok";
  if (pathname === "/warehouse" || pathname === "/dashboard/warehouse") return "Dashboard Gudang";
  if (pathname.startsWith("/store/catalog")) return "Manajemen Katalog & SKU";
  if (pathname.startsWith("/store/pickups")) return "Click & Collect Pickup Pass";
  if (pathname.startsWith("/store/support") || pathname.startsWith("/store/helpdesk") || pathname.startsWith("/store/live-chat")) return "Live Chat Console & Helpdesk";
  if (pathname === "/store") return "Dashboard Toko & Showroom";
  if (pathname.startsWith("/admin/dashboard")) return "System Overview";
  if (pathname.startsWith("/admin/users")) return "Manajemen Staf & Pengguna";
  if (pathname.startsWith("/admin/kms")) return "KMS & Artikel";
  return "Internal Dashboard";
}

export default function InternalLayout({ children }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Close drawer on escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  function handleLogout() {
    setIsDrawerOpen(false);
    logout();
    navigate("/internal/portal");
  }

  const staffRole = role || "super_admin";
  const menuItems = ROLE_MENUS[staffRole] || ROLE_MENUS.super_admin;
  const pageName = getPageName(location.pathname);
  const displayName = user?.name || user?.username || "Staf Overtone";

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans antialiased flex flex-col">
      {/* 1. Minimal Top Bar (#FFFFFF with thin #E5E7EB border) */}
      <header className="sticky top-0 z-40 h-14 w-full border-b border-[#E5E7EB] bg-[#FFFFFF]">
        <div className="flex h-full w-full items-center justify-between px-4 sm:px-6">
          {/* Left: Hamburger Button (☰) & Page Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:text-black transition"
              aria-label="Buka menu navigasi"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <span className="font-semibold text-gray-900">Overtone Internal</span>
              <span className="text-gray-400">/</span>
              <span className="text-gray-800 font-medium truncate max-w-[200px] sm:max-w-md">{pageName}</span>
            </div>
          </div>

          {/* Right: Staff Name & Role Badge (NO search bar) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-bold text-gray-900 leading-tight">{displayName}</p>
                <p className="text-[10px] text-gray-500 capitalize">{staffRole.replace("_", " ")}</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-800 border border-gray-200">
                {staffRole.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Slide-Over Hamburger Drawer */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[300px] flex-col justify-between bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        aria-label="Sidebar Menu"
      >
        {/* Drawer Header (Clean Close Button ✕) */}
        <div className="flex h-14 items-center justify-between border-b border-gray-100 px-5">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-black transition"
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
          <div className="flex flex-col text-right">
            <span className="font-jakarta text-[13px] font-black tracking-tight text-gray-900">OVERTONE</span>
            <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-gray-400">INTERNAL DESK</span>
          </div>
        </div>

        {/* Drawer Body: Vertical Menu according to Role */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
            Menu Utama ({staffRole.replace("_", " ")})
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon || BarChart3;
              const isActive = location.pathname === item.to || (item.to !== "/admin/dashboard" && location.pathname.startsWith(item.to));
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all ${
                    isActive
                      ? "bg-gray-100 font-bold text-gray-900 shadow-xs"
                      : "text-gray-600 font-medium hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-black" : "text-gray-400"} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Drawer Footer: Separated at bottom (Store Menu, My Account, Log Out) */}
        <div className="border-t border-gray-100 bg-[#FAFAFA] p-4 space-y-3">
          {/* Store Menu (Link ke Etalase Toko Publik) */}
          <Link
            to="/"
            onClick={() => setIsDrawerOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-white hover:text-black hover:shadow-xs transition"
          >
            <Store size={15} className="text-gray-500" />
            <span>Store Menu (Etalase Toko)</span>
          </Link>

          {/* My Account (Brief Profile Info) */}
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white uppercase">
                {displayName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900 truncate">{displayName}</p>
                <p className="text-[10px] text-gray-500 truncate">{user?.email || `${user?.username || "staff"}@overtone.id`}</p>
              </div>
            </div>
          </div>

          {/* Log Out */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/70 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 hover:text-red-700 transition"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}

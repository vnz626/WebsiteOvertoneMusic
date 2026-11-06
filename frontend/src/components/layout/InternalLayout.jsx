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
  Sparkles,
  ShieldAlert,
  Bell,
  Search,
  Building2,
  Layers,
  ArrowRightLeft,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import NotificationBell from "./NotificationBell";
import StaffAttendanceGate from "../../pages/store/StaffAttendanceGate";
import api from "../../api";
import toast from "react-hot-toast";
import { useConfirm } from "../ui/ConfirmDialog";

const ROLE_MENUS = {
  super_admin: [
    { to: "/admin/dashboard", label: "Ringkasan Sistem", icon: BarChart3 },
    { to: "/manager/shifts", label: "Rekap Shift & Absensi Staf", icon: CalendarCheck },
    { to: "/admin/users", label: "Manajemen Staf (OAS)", icon: Users },
    { to: "/admin/users?tab=customers", label: "Direktori Pelanggan (TPS)", icon: User },
    { to: "/admin/kms", label: "KMS & Artikel (Dual-Scope)", icon: BookOpen },
    { to: "/admin/kms?tab=es_rules", label: "Basis Aturan Pakar (ES)", icon: Cpu },
    { to: "/rig-advisor", label: "Cinema Rig Advisor (ES)", icon: Sparkles },
    { to: "/admin/sop", label: "Portal SOP Staf", icon: Sparkles },
    { to: "/admin/audit-logs", label: "Audit Log & Keamanan", icon: ShieldAlert },
    { to: "/internal/notifications", label: "Pusat Notifikasi & Alert", icon: Bell },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Ringkasan Sistem", icon: BarChart3 },
    { to: "/manager/shifts", label: "Rekap Shift & Absensi Staf", icon: CalendarCheck },
    { to: "/admin/users", label: "Manajemen Staf (OAS)", icon: Users },
    { to: "/admin/users?tab=customers", label: "Direktori Pelanggan (TPS)", icon: User },
    { to: "/admin/kms", label: "KMS & Artikel (Dual-Scope)", icon: BookOpen },
    { to: "/admin/kms?tab=es_rules", label: "Basis Aturan Pakar (ES)", icon: Cpu },
    { to: "/rig-advisor", label: "Cinema Rig Advisor (ES)", icon: Sparkles },
    { to: "/admin/sop", label: "Portal SOP Staf", icon: Sparkles },
    { to: "/admin/audit-logs", label: "Audit Log & Keamanan", icon: ShieldAlert },
    { to: "/internal/notifications", label: "Pusat Notifikasi & Alert", icon: Bell },
  ],
  manager: [
    { to: "/admin/mis", label: "Dashboard Eksekutif MIS", icon: TrendingUp },
    { to: "/manager/dss", label: "Smart Restock DSS (AHP-TOPSIS)", icon: Cpu },
    { to: "/rig-advisor", label: "Cinema Rig Advisor (ES)", icon: Sparkles },
    { to: "/manager/clearance", label: "Simulator Clearance Deadstock", icon: Tag },
    { to: "/manager/catalog", label: "Master Katalog & Varian SKU", icon: Boxes },
    { to: "/manager/suppliers", label: "Merek & Supplier Resmi", icon: Building2 },
    { to: "/manager/bundles", label: "Paket Bundling & Starter Rig", icon: Layers },
    { to: "/manager/po", label: "Persetujuan Purchase Order", icon: FileCheck },
    { to: "/manager/shifts", label: "Rekap Shift & Absensi Staf", icon: CalendarCheck },
    { to: "/manager/sop", label: "SOP & Panduan Kerja", icon: BookOpen },
    { to: "/internal/notifications", label: "Pusat Notifikasi & Alert", icon: Bell },
  ],
  finance: [
    { to: "/finance/dashboard", label: "Laporan Laba Rugi (P&L)", icon: BarChart3 },
    { to: "/finance/clearance", label: "Simulator Clearance Deadstock", icon: Tag },
    { to: "/finance/po", label: "Pembayaran PO Supplier", icon: Wallet },
    { to: "/finance/refunds", label: "Pencairan Dana Retur", icon: RotateCcw },
    { to: "/finance/transactions", label: "Buku Besar Audit Transaksi", icon: CreditCard },
    { to: "/finance/sop", label: "SOP & Panduan Kerja", icon: BookOpen },
    { to: "/internal/notifications", label: "Pusat Notifikasi & Alert", icon: Bell },
  ],
  warehouse_staff: [
    { to: "/warehouse/inventory", label: "Kartu Stok & Inventaris", icon: Boxes },
    { to: "/warehouse/transfers", label: "Transfer Stok ke Offline Store", icon: Truck },
    { to: "/warehouse/returns", label: "Penerimaan Fisik Retur", icon: RotateCcw },
    { to: "/warehouse/dss", label: "Smart Restock DSS", icon: Cpu },
    { to: "/warehouse/po", label: "Pengajuan PO Supplier", icon: FileText },
    { to: "/warehouse/orders", label: "Pengiriman & Resi Ekspedisi", icon: Truck },
    { to: "/warehouse/logs", label: "Log Mutasi Stok", icon: PackageCheck },
    { to: "/warehouse/sop", label: "SOP & Panduan Kerja", icon: BookOpen },
    { to: "/internal/notifications", label: "Pusat Notifikasi & Alert", icon: Bell },
  ],
  warehouse: [
    { to: "/warehouse/inventory", label: "Kartu Stok & Inventaris", icon: Boxes },
    { to: "/warehouse/transfers", label: "Transfer Stok ke Offline Store", icon: Truck },
    { to: "/warehouse/returns", label: "Penerimaan Fisik Retur", icon: RotateCcw },
    { to: "/warehouse/dss", label: "Smart Restock DSS", icon: Cpu },
    { to: "/warehouse/po", label: "Pengajuan PO Supplier", icon: FileText },
    { to: "/warehouse/orders", label: "Pengiriman & Resi Ekspedisi", icon: Truck },
    { to: "/warehouse/logs", label: "Log Mutasi Stok", icon: PackageCheck },
    { to: "/warehouse/sop", label: "SOP & Panduan Kerja", icon: BookOpen },
    { to: "/internal/notifications", label: "Pusat Notifikasi & Alert", icon: Bell },
  ],
  store_staff: [
    { to: "/store/pos", label: "Kasir POS Offline Store", icon: CreditCard },
    { to: "/store/stock-lookup", label: "Cek Stok Lintas Cabang & Gudang", icon: Search },
    { to: "/rig-advisor", label: "Cinema Rig Advisor (ES)", icon: Sparkles },
    { to: "/store/pickups", label: "Serah-Terima Click & Collect", icon: Store },
    { to: "/store/support", label: "Konsol Live Chat & Helpdesk", icon: Headphones },
    { to: "/store/returns", label: "Verifikasi Klaim Retur", icon: RotateCcw },
    { to: "/store/sop", label: "SOP & Panduan Kerja", icon: BookOpen },
    { to: "/internal/notifications", label: "Pusat Notifikasi & Alert", icon: Bell },
  ],
  promoter: [
    { to: "/store/pos", label: "Kasir POS Offline Store", icon: CreditCard },
    { to: "/store/stock-lookup", label: "Cek Stok Lintas Cabang & Gudang", icon: Search },
    { to: "/rig-advisor", label: "Cinema Rig Advisor (ES)", icon: Sparkles },
    { to: "/store/pickups", label: "Serah-Terima Click & Collect", icon: Store },
    { to: "/store/support", label: "Konsol Live Chat & Helpdesk", icon: Headphones },
    { to: "/store/returns", label: "Verifikasi Klaim Retur", icon: RotateCcw },
    { to: "/store/sop", label: "SOP & Panduan Kerja", icon: BookOpen },
    { to: "/internal/notifications", label: "Pusat Notifikasi & Alert", icon: Bell },
  ],
  staff: [
    { to: "/store/pos", label: "Kasir POS Offline Store", icon: CreditCard },
    { to: "/store/stock-lookup", label: "Cek Stok Lintas Cabang & Gudang", icon: Search },
    { to: "/rig-advisor", label: "Cinema Rig Advisor (ES)", icon: Sparkles },
    { to: "/store/pickups", label: "Serah-Terima Click & Collect", icon: Store },
    { to: "/store/support", label: "Konsol Live Chat & Helpdesk", icon: Headphones },
    { to: "/store/returns", label: "Verifikasi Klaim Retur", icon: RotateCcw },
    { to: "/store/sop", label: "SOP & Panduan Kerja", icon: BookOpen },
    { to: "/internal/notifications", label: "Pusat Notifikasi & Alert", icon: Bell },
  ],
};

function getPageName(pathname) {
  if (pathname.includes("/notifications")) return "Pusat Notifikasi & Alert Operasional";
  if (pathname.includes("/sop")) return "SOP & Panduan Kerja Operasional";
  if (pathname.startsWith("/admin/mis") || pathname.startsWith("/manager/mis")) return "Dashboard Eksekutif MIS";
  if (pathname.startsWith("/manager/dss") || pathname.startsWith("/warehouse/dss")) return "Smart Restock DSS (AHP-TOPSIS)";
  if (pathname.startsWith("/manager/clearance") || pathname.startsWith("/finance/clearance")) return "Simulator Clearance Deadstock";
  if (pathname.startsWith("/manager/catalog")) return "Master Katalog & Varian SKU";
  if (pathname.startsWith("/manager/suppliers")) return "Merek & Supplier Resmi";
  if (pathname.startsWith("/manager/bundles")) return "Paket Bundling & Starter Rig";
  if (pathname.startsWith("/manager/shifts")) return "Rekapitulasi Shift & Absensi Staf";
  if (pathname.startsWith("/manager/po")) return "Persetujuan Purchase Order";
  if (pathname.startsWith("/admin/events") || pathname.startsWith("/admin/products")) return "Persetujuan Katalog";
  if (pathname.startsWith("/finance/dashboard") || pathname.startsWith("/finance/laporan") || pathname.startsWith("/finance/pnl")) return "Laporan Laba Rugi (P&L)";
  if (pathname.startsWith("/finance/po")) return "Pembayaran PO Supplier";
  if (pathname.startsWith("/finance/refunds")) return "Pencairan Dana Retur Pelanggan";
  if (pathname.startsWith("/finance/transactions")) return "Buku Besar Audit Transaksi";
  if (pathname.startsWith("/warehouse/inventory")) return "Kartu Stok & Inventaris Gudang";
  if (pathname.startsWith("/warehouse/transfers")) return "Distribusi & Transfer Stok Cabang";
  if (pathname.startsWith("/warehouse/po")) return "Pengajuan PO Supplier";
  if (pathname.startsWith("/warehouse/orders")) return "Pengiriman & Resi Ekspedisi";
  if (pathname.startsWith("/warehouse/logs")) return "Log Mutasi Stok";
  if (pathname === "/warehouse" || pathname === "/dashboard/warehouse") return "Dashboard Gudang Pusat";
  if (pathname.startsWith("/store/pos")) return "Kasir Offline Store Terintegrasi (POS)";
  if (pathname.startsWith("/store/stock-lookup")) return "Cek Ketersediaan Stok Lintas Cabang";
  if (pathname.startsWith("/store/pickups")) return "Verifikasi Pickup Pass Click & Collect";
  if (pathname.startsWith("/store/support") || pathname.startsWith("/store/helpdesk") || pathname.startsWith("/store/live-chat")) return "Konsol Live Chat & Helpdesk";
  if (pathname.startsWith("/store/returns")) return "Verifikasi Klaim Retur Pelanggan";
  if (pathname === "/store") return "Dashboard Operasional Cabang";
  if (pathname.startsWith("/admin/dashboard")) return "Ringkasan Sistem & Infrastruktur";
  if (pathname.startsWith("/admin/audit-logs")) return "Jejak Audit & Aktivitas Sistem";
  if (pathname.startsWith("/admin/users")) return "Manajemen Akun Staf & Pelanggan";
  if (pathname.startsWith("/admin/kms")) {
    if (typeof window !== "undefined" && window.location.search.includes("compliance")) {
      return "Matriks Kepatuhan SOP Staf";
    }
    return "Manajemen KMS & SOP Dual-Scope";
  }
  return "Ruang Kerja Internal";
}

export default function InternalLayout({ children }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [shiftForm, setShiftForm] = useState({
    shift_mode: "offline_store",
    branch_id: 2,
    notes: "",
  });
  const [savingShift, setSavingShift] = useState(false);

  const { user, role, logout } = useAuth();
  const confirm = useConfirm();
  const location = useLocation();
  const navigate = useNavigate();

  function loadCurrentShift() {
    setShiftLoading(true);
    api
      .get("/store/shift")
      .then((res) => {
        if (res.data?.data) {
          setActiveShift(res.data.data);
          setShiftForm({
            shift_mode: res.data.data.shift_mode || "offline_store",
            branch_id: res.data.data.branch_id || 2,
            notes: res.data.data.notes || "",
          });
        } else {
          setActiveShift(null);
        }
      })
      .catch(() => setActiveShift(null))
      .finally(() => setShiftLoading(false));
  }

  useEffect(() => {
    loadCurrentShift();
    api
      .get("/products/venues")
      .then((res) => {
        const brs = (res.data?.data || res.data?.venues || []).filter(
          (b) => b.branch_type !== "warehouse"
        );
        setBranches(brs);
        if (brs.length > 0 && !shiftForm.branch_id) {
          setShiftForm((prev) => ({ ...prev, branch_id: brs[0].id }));
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsDrawerOpen(false);
        setIsShiftModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isDrawerOpen || isShiftModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen, isShiftModalOpen]);

  function handleLogout() {
    setIsDrawerOpen(false);
    logout();
    navigate("/internal/portal");
  }

  function handleSaveShift(e) {
    e.preventDefault();
    setSavingShift(true);
    const endpoint = activeShift ? "/store/shift/switch-mode" : "/store/shift/clock-in";
    api
      .post(endpoint, shiftForm)
      .then((res) => {
        setActiveShift(res.data?.data);
        setIsShiftModalOpen(false);
        toast.success("Mode penugasan shift berhasil diperbarui.");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Gagal memperbarui mode shift.");
      })
      .finally(() => setSavingShift(false));
  }

  async function handleClockOut() {
    const ok = await confirm({
      title: "Konfirmasi Absen Keluar (Clock-Out)",
      message: "Apakah Anda yakin ingin mengakhiri sesi shift kerja aktif hari ini?",
      confirmText: "Ya, Akhiri Shift",
      isDanger: true,
    });
    if (!ok) return;

    setSavingShift(true);
    api
      .post("/store/shift/check-out")
      .then(() => {
        setActiveShift(null);
        setIsShiftModalOpen(false);
        setIsDrawerOpen(false);
        toast.success("Presensi keluar tercatat. Shift kerja telah berakhir.");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Gagal mencatat absen keluar.");
      })
      .finally(() => setSavingShift(false));
  }

  const staffRole = role || "super_admin";
  const isStoreStaff =
    staffRole === "store_staff" || staffRole === "promoter" || staffRole === "staff";
  const isAttendanceGateRequired = isStoreStaff && !shiftLoading && !activeShift;

  let menuItems = ROLE_MENUS[staffRole] || ROLE_MENUS.super_admin;
  if (isStoreStaff && activeShift) {
    if (activeShift.shift_mode === "offline_store") {
      menuItems = [
        { to: "/store/pos", label: "Kasir POS Offline Store", icon: CreditCard },
        { to: "/store/pickups", label: "Serah-Terima Click & Collect", icon: Store },
        { to: "/store/stock-lookup", label: "Cek Stok Cabang & Gudang", icon: Search },
        { to: "/store/sop", label: "SOP & Panduan Kerja (KMS)", icon: BookOpen },
        { to: "/internal/notifications", label: "Pusat Notifikasi & Alert", icon: Bell },
      ];
    } else if (activeShift.shift_mode === "online_cs") {
      menuItems = [
        { to: "/store/support", label: "Konsol Live Chat & Helpdesk CS", icon: Headphones },
        { to: "/store/returns", label: "Verifikasi Klaim Retur & Garansi", icon: RotateCcw },
        { to: "/store/stock-lookup", label: "Cek Stok Cabang & Gudang", icon: Search },
        { to: "/store/sop", label: "SOP & Panduan Kerja (KMS)", icon: BookOpen },
        { to: "/internal/notifications", label: "Pusat Notifikasi & Alert", icon: Bell },
      ];
    }
  }

  const pageName = getPageName(location.pathname);
  const displayName = user?.name || user?.username || "Staf Focalpoint.pro";

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans antialiased flex flex-col">
      {/* 1. Frosted Glass Top Bar */}
      <header className="sticky top-0 z-40 h-14 w-full border-b border-line/80 bg-surface/90 backdrop-blur-md shadow-xs">
        <div className="flex h-full w-full items-center justify-between px-4 sm:px-6">
          {isAttendanceGateRequired ? (
            <>
              <div className="flex items-center gap-2.5">
                <Link to="/" className="font-display font-extrabold text-sm tracking-tight text-ink hover:text-accent transition-colors">
                  FOCALPOINT<span className="text-accent">.PRO</span>
                </Link>
                <span className="text-line-strong" aria-hidden="true">|</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/25 px-2.5 py-0.5 text-[10px] font-bold text-accent uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" aria-hidden="true" />
                  Gerbang Presensi Staf
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-bold text-ink leading-tight">{displayName}</p>
                  <p className="text-[10px] text-ink-muted uppercase tracking-wider">
                    {staffRole.replace(/_/g, " ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line-strong bg-surface text-xs font-bold text-ink hover:bg-surface-muted transition-colors duration-fast"
                >
                  <LogOut size={13} aria-hidden="true" />
                  <span>Keluar</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Kiri: Tombol Hamburger (☰) & Brand Breadcrumb */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  aria-expanded={isDrawerOpen}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface text-ink hover:border-accent hover:text-accent hover:bg-surface-muted transition-colors duration-fast"
                  aria-label="Buka menu navigasi internal"
                >
                  <Menu size={18} aria-hidden="true" />
                </button>
                <div className="flex items-center gap-2 text-xs">
                  <Link to="/" className="flex items-center gap-1.5 group">
                    <span className="font-display text-sm font-extrabold tracking-tight text-ink group-hover:text-accent transition-colors">
                      FOCALPOINT<span className="text-accent">.PRO</span>
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-accent/10 border border-accent/25 px-2 py-0.5 text-[9px] font-bold text-accent uppercase tracking-widest">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" aria-hidden="true" />
                      Console
                    </span>
                  </Link>
                  <span className="text-line-strong hidden md:inline" aria-hidden="true">/</span>
                  <span className="text-ink font-semibold text-xs truncate max-w-[150px] sm:max-w-xs md:max-w-md hidden sm:inline">
                    {pageName}
                  </span>
                </div>
              </div>

              {/* Kanan: Indikator Shift Aktif, Lonceng Notifikasi, Info Staf */}
              <div className="flex items-center gap-3">
                {activeShift && isStoreStaff && (
                  <div className="hidden md:flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsShiftModalOpen(true)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors duration-fast border shadow-2xs ${
                        activeShift.shift_mode === "offline_store"
                          ? "text-status-success-text bg-status-success-bg border-status-success-border"
                          : "text-status-info-text bg-status-info-bg border-status-info-border"
                      }`}
                      title="Klik untuk beralih mode penugasan"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-current shrink-0 animate-pulse"
                        aria-hidden="true"
                      />
                      <span className="tabular-nums text-[11px]">
                        Shift:{" "}
                        {activeShift.shift_mode === "offline_store"
                          ? activeShift.branch_name || "Offline Store"
                          : "Online CS"}
                        {activeShift.clock_in_at &&
                          ` (${new Date(activeShift.clock_in_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })})`}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClockOut}
                      disabled={savingShift}
                      className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-status-danger-text bg-status-danger-bg hover:opacity-90 border border-status-danger-border rounded-full transition-opacity duration-fast"
                      title="Akhiri Shift Kerja (Clock-Out)"
                    >
                      Akhiri Shift
                    </button>
                  </div>
                )}

                <NotificationBell />
                <div className="flex items-center gap-2">
                  <div className="hidden text-right sm:block">
                    <p className="text-xs font-bold text-ink leading-tight">{displayName}</p>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wider">
                      {staffRole.replace(/_/g, " ")}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent border border-accent/25">
                    {staffRole.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* 2. Slide-Over Hamburger Drawer */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-normal"
          onClick={() => setIsDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[310px] flex-col justify-between bg-surface border-r border-line-strong shadow-xl transition-transform duration-normal ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        aria-label="Navigasi ruang kerja internal"
      >
        <div className="flex h-14 items-center justify-between border-b border-line bg-surface-muted/60 px-5">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-ink-secondary hover:bg-surface hover:text-ink transition-colors duration-fast"
            aria-label="Tutup menu navigasi"
          >
            <X size={17} aria-hidden="true" />
          </button>
          <div className="flex flex-col text-right">
            <span className="font-display text-[13px] font-extrabold tracking-tight text-ink">
              FOCALPOINT<span className="text-accent">.PRO</span>
            </span>
            <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-accent">
              CINEMA ENTERPRISE CONSOLE
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {isStoreStaff && (
            <div className="rounded-md border border-line bg-surface-muted p-3 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  Status Kehadiran
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setIsShiftModalOpen(true);
                  }}
                  className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1"
                >
                  <ArrowRightLeft size={11} aria-hidden="true" />
                  <span>{activeShift ? "Ubah Mode" : "Clock In"}</span>
                </button>
              </div>
              {activeShift ? (
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full bg-status-success-text shrink-0 animate-pulse"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-ink truncate">
                      {activeShift.shift_mode === "offline_store"
                        ? activeShift.branch_name || "Cabang Offline Store"
                        : "Spesialis Online CS"}
                    </p>
                    <p className="text-[10px] text-ink-secondary">
                      {activeShift.shift_mode === "offline_store"
                        ? "Mode Kasir & Cabang Fisik"
                        : "Mode Live Chat & Helpdesk"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-ink-secondary text-[11px]">Belum melakukan check-in</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setIsShiftModalOpen(true);
                    }}
                    className="rounded-full bg-accent px-3 py-1 text-[10px] font-bold text-accent-on hover:bg-accent-hover transition-colors duration-fast"
                  >
                    Check In Sekarang
                  </button>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-2 flex items-center justify-between">
              <span>Modul Operasional</span>
              <span className="font-mono text-[9px] text-accent">6 SUBSYSTEMS</span>
            </p>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon || BarChart3;
                const isActive =
                  location.pathname === item.to ||
                  (item.to !== "/admin/dashboard" && location.pathname.startsWith(item.to));
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs transition-colors duration-fast ${
                      isActive
                        ? "bg-accent/10 font-bold text-accent border-l-2 border-accent"
                        : "text-ink-secondary font-medium hover:text-ink hover:bg-surface-muted"
                    }`}
                  >
                    <Icon
                      size={16}
                      aria-hidden="true"
                      className={isActive ? "text-accent" : "text-ink-muted"}
                    />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="border-t border-line bg-surface-muted/60 p-4 space-y-3">
          <Link
            to="/"
            onClick={() => setIsDrawerOpen(false)}
            className="flex items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-2 text-xs font-bold text-ink hover:border-accent hover:text-accent transition-colors duration-fast"
          >
            <Store size={15} className="text-accent" aria-hidden="true" />
            <span>Buka Etalase Focalpoint.pro</span>
          </Link>

          <div className="rounded-md border border-line bg-surface p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 border border-accent/25 text-xs font-bold text-accent uppercase">
                {displayName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-ink truncate">{displayName}</p>
                <p className="text-[10px] text-ink-muted truncate">
                  {user?.email || `${user?.username || "staff"}@focalpoint.pro`}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-status-danger-border bg-status-danger-bg py-2.5 text-xs font-bold text-status-danger-text hover:opacity-90 transition-opacity duration-fast"
          >
            <LogOut size={14} aria-hidden="true" />
            <span>Keluar Ruang Kerja</span>
          </button>
        </div>
      </aside>

      {/* 3. Modal Absensi / Shift Mode Staf */}
      {isShiftModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#181614]/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shift-modal-title"
        >
          <div className="w-full max-w-md rounded-lg border border-line-strong bg-surface p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 id="shift-modal-title" className="font-display text-base font-bold text-ink">
                  Pengaturan Mode Shift Kerja
                </h3>
                <p className="text-xs text-ink-secondary">
                  Pilih mode penugasan operasional saat bertugas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(false)}
                aria-label="Tutup pengaturan shift"
                className="flex h-8 w-8 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-muted hover:text-ink"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveShift} className="mt-4 space-y-4">
              <fieldset className="space-y-2">
                <legend className="text-xs font-bold text-ink mb-1">Mode Kerja Aktif</legend>
                <div className="grid grid-cols-1 gap-2.5">
                  <label
                    className={`flex items-start gap-3 rounded-sm border p-3 cursor-pointer transition-colors duration-fast ${
                      shiftForm.shift_mode === "offline_store"
                        ? "border-accent bg-accent-subtle/40"
                        : "border-line hover:border-line-strong"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shift_mode"
                      value="offline_store"
                      checked={shiftForm.shift_mode === "offline_store"}
                      onChange={(e) => setShiftForm({ ...shiftForm, shift_mode: e.target.value })}
                      className="mt-0.5 accent-[var(--color-accent)]"
                    />
                    <div>
                      <p className="text-xs font-bold text-ink">Mode 1: Staf Cabang Offline Store</p>
                      <p className="text-[11px] text-ink-secondary mt-0.5">
                        Kasir POS Walk-In, serah terima Click &amp; Collect, dan cek stok fisik cabang.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 rounded-sm border p-3 cursor-pointer transition-colors duration-fast ${
                      shiftForm.shift_mode === "online_cs"
                        ? "border-accent bg-accent-subtle/40"
                        : "border-line hover:border-line-strong"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shift_mode"
                      value="online_cs"
                      checked={shiftForm.shift_mode === "online_cs"}
                      onChange={(e) => setShiftForm({ ...shiftForm, shift_mode: e.target.value })}
                      className="mt-0.5 accent-[var(--color-accent)]"
                    />
                    <div>
                      <p className="text-xs font-bold text-ink">Mode 2: Staf Online &amp; Customer Service</p>
                      <p className="text-[11px] text-ink-secondary mt-0.5">
                        Konsol Live Chat Concierge, verifikasi klaim garansi &amp; retur, serta cek stok lintas cabang.
                      </p>
                    </div>
                  </label>
                </div>
              </fieldset>

              {shiftForm.shift_mode === "offline_store" && (
                <div>
                  <label htmlFor="shift-branch-select" className="block text-xs font-bold text-ink mb-1">
                    Lokasi Cabang Bertugas
                  </label>
                  <select
                    id="shift-branch-select"
                    value={shiftForm.branch_id}
                    onChange={(e) =>
                      setShiftForm({ ...shiftForm, branch_id: parseInt(e.target.value, 10) })
                    }
                    className="ot-input"
                  >
                    {branches.length > 0 ? (
                      branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.city})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={2}>Overtone Flagship Store - Senayan City</option>
                        <option value={3}>Overtone Experience Store - PIK Avenue</option>
                        <option value={4}>Overtone Offline Store - Bandung</option>
                        <option value={5}>Overtone Offline Store - Surabaya</option>
                        <option value={6}>Overtone Offline Store - Bali</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="shift-notes-input" className="block text-xs font-bold text-ink mb-1">
                  Catatan Penugasan (Opsional)
                </label>
                <input
                  id="shift-notes-input"
                  type="text"
                  placeholder="Contoh: Shift Pagi, serah terima kasir utama"
                  value={shiftForm.notes}
                  onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                  className="ot-input"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-line">
                {activeShift ? (
                  <button
                    type="button"
                    onClick={handleClockOut}
                    disabled={savingShift}
                    className="rounded-sm border border-status-danger-border bg-status-danger-bg px-3 py-2 text-xs font-bold text-status-danger-text hover:opacity-90 transition-opacity duration-fast"
                  >
                    Absen Keluar
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsShiftModalOpen(false)}
                    className="rounded-sm border border-line-strong bg-surface px-4 py-2 text-xs font-bold text-ink hover:bg-surface-muted"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingShift}
                    className="rounded-sm bg-accent px-4 py-2 text-xs font-bold text-accent-on hover:bg-accent-hover transition-colors duration-fast"
                  >
                    {savingShift
                      ? "Menyimpan..."
                      : activeShift
                      ? "Simpan Perubahan Mode"
                      : "Check In Sekarang"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Area Konten Utama */}
      <div className="flex-1 w-full">
        {isAttendanceGateRequired ? (
          <StaffAttendanceGate
            user={user}
            branches={branches}
            onShiftStarted={(newShift, mode) => {
              setActiveShift(newShift);
              if (mode === "offline_store") {
                navigate("/store/pos");
              } else {
                navigate("/store/support");
              }
            }}
          />
        ) : (
          children ?? <Outlet />
        )}
      </div>
    </div>
  );
}

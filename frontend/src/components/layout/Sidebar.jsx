import { NavLink } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Boxes,
  CalendarCheck,
  CreditCard,
  FileCheck,
  FileText,
  Guitar,
  Headphones,
  Home,
  MessageSquare,
  Package,
  PackageCheck,
  Percent,
  QrCode,
  RotateCcw,
  ShoppingBag,
  Store,
  Tag,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

const MESSAGES_ITEM = { to: "/notifications", label: "Pesan & Notifikasi", icon: MessageSquare };

const MENU = {
  super_admin: [
    { to: "/admin/dashboard", label: "Overview & Stats", icon: BarChart3 },
    { to: "/admin/users", label: "Kelola Pegawai (RBAC)", icon: Users },
    { to: "/admin/events", label: "Approval Katalog", icon: CalendarCheck },
    { to: "/admin/kms", label: "Pusat Pengetahuan KMS", icon: BookOpen },
    { to: "/manager/settings", label: "Pengaturan Sistem", icon: Percent },
    MESSAGES_ITEM,
  ],
  manager: [
    { to: "/admin/mis", label: "MIS Dashboard", icon: TrendingUp },
    { to: "/admin/events", label: "Approval Katalog Produk", icon: CalendarCheck },
    { to: "/manager/po", label: "Approval Restock PO", icon: FileCheck },
    { to: "/manager/settings", label: "Pengaturan Platform", icon: Percent },
    MESSAGES_ITEM,
  ],
  finance: [
    { to: "/finance/dashboard", label: "Laporan Keuangan", icon: BarChart3 },
    { to: "/finance/po", label: "Pembayaran PO Supplier", icon: Wallet },
    { to: "/finance/refunds", label: "Refund Pesanan Retur", icon: RotateCcw },
    { to: "/finance/transactions", label: "Audit Transaksi", icon: CreditCard },
    MESSAGES_ITEM,
  ],
  warehouse_staff: [
    { to: "/warehouse", label: "Dashboard Gudang", icon: BarChart3 },
    { to: "/warehouse/inventory", label: "Stok & Serial Number", icon: Boxes },
    { to: "/warehouse/po", label: "Pengadaan Restock (PO)", icon: FileText },
    { to: "/warehouse/orders", label: "Pesanan Ekspedisi (Resi)", icon: Truck },
    { to: "/warehouse/logs", label: "Kartu Mutasi Stok", icon: PackageCheck },
    MESSAGES_ITEM,
  ],
  warehouse: [
    { to: "/warehouse", label: "Dashboard Gudang", icon: BarChart3 },
    { to: "/warehouse/inventory", label: "Stok & Serial Number", icon: Boxes },
    { to: "/warehouse/po", label: "Pengadaan Restock (PO)", icon: FileText },
    { to: "/warehouse/orders", label: "Pesanan Ekspedisi (Resi)", icon: Truck },
    { to: "/warehouse/logs", label: "Kartu Mutasi Stok", icon: PackageCheck },
    MESSAGES_ITEM,
  ],
  store_staff: [
    { to: "/store/catalog", label: "Katalog & Varian SKU", icon: Tag },
    { to: "/store/pickups", label: "Ambil di Showroom", icon: Store },
    { to: "/store/support", label: "Bantuan Pelanggan", icon: Headphones },
    MESSAGES_ITEM,
  ],
  promoter: [
    { to: "/store/catalog", label: "Katalog & Varian SKU", icon: Tag },
    { to: "/store/pickups", label: "Ambil di Showroom", icon: Store },
    { to: "/store/support", label: "Bantuan Pelanggan", icon: Headphones },
    MESSAGES_ITEM,
  ],
  staff: [
    { to: "/store/catalog", label: "Katalog & Varian SKU", icon: Tag },
    { to: "/store/pickups", label: "Ambil di Showroom", icon: Store },
    { to: "/store/support", label: "Bantuan Pelanggan", icon: Headphones },
    MESSAGES_ITEM,
  ],
  user: [
    { to: "/products", label: "Katalog Alat Musik", icon: Home },
    { to: "/tickets", label: "Pesanan Saya", icon: ShoppingBag },
    { to: "/saved-events", label: "Wishlist Produk", icon: Tag },
    { to: "/help", label: "Pusat Bantuan & Showroom", icon: BookOpen },
    MESSAGES_ITEM,
  ],
  customer: [
    { to: "/products", label: "Katalog Alat Musik", icon: Home },
    { to: "/tickets", label: "Pesanan Saya", icon: ShoppingBag },
    { to: "/saved-events", label: "Wishlist Produk", icon: Tag },
    { to: "/help", label: "Pusat Bantuan & Showroom", icon: BookOpen },
    MESSAGES_ITEM,
  ],
};

const ROLE_LABELS = {
  super_admin: "Super Admin (Overtone)",
  manager: "Retail Manager",
  finance: "Finance Specialist",
  warehouse_staff: "Warehouse & Logistics",
  warehouse: "Warehouse & Logistics",
  store_staff: "Showroom Store Staff",
  user: "Pelanggan Overtone",
  customer: "Pelanggan Overtone",
};

export default function Sidebar() {
  const { role } = useAuth();
  const items = MENU[role] || MENU.customer;
  const roleLabel = ROLE_LABELS[role] || role || "Staff";

  return (
    <aside className="w-full shrink-0 border-b border-ts-subtle bg-white p-5 dark:border-white/10 dark:bg-surface-container md:min-h-[calc(100vh-76px)] md:w-64 md:border-b-0 md:border-r">
      <div className="mb-4 rounded-xl border border-ts-primary/20 bg-ts-primary/5 px-3.5 py-2.5 dark:border-brand-400/20 dark:bg-brand-400/5">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-ts-muted dark:text-slate-400">
          Role Akses Aktif
        </p>
        <p className="mt-0.5 font-jakarta text-xs font-bold text-ts-primary dark:text-brand-400 truncate">
          {roleLabel}
        </p>
      </div>

      <nav className="flex flex-row gap-1.5 overflow-x-auto md:flex-col">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-ts-primary font-bold text-white shadow-md shadow-ts-primary/25 dark:bg-brand-500"
                  : "text-ts-muted hover:bg-ts-low hover:text-ts-primary dark:text-slate-300 dark:hover:bg-surface-high dark:hover:text-white"
              }`
            }
          >
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

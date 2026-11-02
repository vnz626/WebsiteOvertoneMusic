import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import InternalLayout from "./components/layout/InternalLayout";
import ProtectedRoute from "./auth/ProtectedRoute";

import Login from "./pages/Login";
import InternalLogin from "./pages/InternalLogin";
import Register from "./pages/Register";
import NotificationsInbox from "./pages/notifications/Inbox";
import Home from "./pages/customer/Home";
import Catalog from "./pages/customer/Catalog";
import ProductDetail from "./pages/customer/ProductDetail";
import Checkout from "./pages/customer/Checkout";
import MyOrders from "./pages/customer/MyOrders";
import OrderTracking from "./pages/customer/OrderTracking";
import Knowledge from "./pages/customer/Knowledge";
import Wishlist from "./pages/customer/Wishlist";
import Showrooms from "./pages/customer/Showrooms";
import CustomerReturns from "./pages/customer/CustomerReturns";

// Warehouse Pages
import WarehouseDashboard from "./pages/warehouse/WarehouseDashboard";
import WarehouseInventory from "./pages/warehouse/Inventory";
import WarehousePO from "./pages/warehouse/PurchaseOrders";
import WarehouseDelivery from "./pages/warehouse/DeliveryOrders";
import WarehouseLogs from "./pages/warehouse/InventoryLogs";
import WarehouseReturns from "./pages/warehouse/WarehouseReturns";

// Manager Pages
import ManagerPoApproval from "./pages/manager/PoApproval";
import ManagerCatalog from "./pages/manager/ManagerCatalog";
import ManagerSuppliers from "./pages/manager/ManagerSuppliers";
import ManagerBundles from "./pages/manager/ManagerBundles";
import ManagerShifts from "./pages/manager/ManagerShifts";
import StaffShiftRecap from "./pages/manager/StaffShiftRecap";
import MISDashboard from "./pages/MIS/Dashboard";
import ProductAnalytics from "./pages/MIS/ProductAnalytics";

// Store Staff & POS Pages
import StoreDashboard from "./pages/store/StoreDashboard";
import StoreCatalog from "./pages/store/StoreCatalog";
import StoreClickAndCollect from "./pages/store/ClickAndCollect";
import StoreSupport from "./pages/store/SupportHelpdesk";
import StoreReturns from "./pages/store/StoreReturns";
import ShowroomPOS from "./pages/store/ShowroomPOS";
import StoreStockLookup from "./pages/store/StoreStockLookup";

// Warehouse Transfers
import WarehouseTransfers from "./pages/warehouse/WarehouseTransfers";

// DSS Subsystem (Decision Support System)
import SmartRestockDSS from "./pages/dss/SmartRestockDSS";

// Finance Pages (Dedicated Standalone Pages)
import FinanceReports from "./pages/finance/FinanceReports";
import FinancePoPayments from "./pages/finance/FinancePoPayments";
import FinanceRefunds from "./pages/finance/FinanceRefunds";
import FinanceTransactions from "./pages/finance/FinanceTransactions";

// Clearance Simulator Page (New: MIS x Finance x TPS)
import DeadstockClearanceSimulator from "./pages/clearance/DeadstockClearanceSimulator";

// Super Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import ProductApproval from "./pages/admin/ProductApproval";
import AdminKmsManager from "./pages/admin/KmsManager";
import UserManagement from "./pages/admin/UserManagement";
import AuditLogs from "./pages/admin/AuditLogs";
import InternalSopPortal from "./pages/internal/InternalSopPortal";
import FloatingConciergeWidget from "./components/support/FloatingConciergeWidget";

import "./styles/globals.css";

export default function App() {
  const location = useLocation();
  const isInternalRoute = [
    "/admin",
    "/manager",
    "/finance",
    "/warehouse",
    "/dashboard/warehouse",
    "/store",
    "/internal/notifications",
    "/internal",
  ].some((prefix) => location.pathname.startsWith(prefix));

  const isHomeRoute = location.pathname === "/";

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink antialiased font-sans">
      {!isInternalRoute && !isHomeRoute && <Navbar />}
      <main id="main-content" className="flex-1">
        <Routes>
          {/* Publik Retail Musik Overtone */}
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Catalog />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/events" element={<Catalog />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/events/:id" element={<ProductDetail />} />
          <Route path="/offline-stores" element={<Showrooms />} />
          <Route path="/offline-store" element={<Showrooms />} />
          <Route path="/showrooms" element={<Navigate to="/offline-stores" replace />} />
          <Route path="/showroom" element={<Navigate to="/offline-stores" replace />} />
          <Route path="/help" element={<Knowledge />} />
          <Route path="/track" element={<OrderTracking isGuest={true} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Internal Portal Login */}
          <Route path="/internal/portal" element={<InternalLogin />} />

          {/* Notifikasi (Semua pengguna login) */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsInbox />
              </ProtectedRoute>
            }
          />

          {/* Musisi / Customer */}
          <Route
            path="/checkout"
            element={
              <ProtectedRoute roles={["user", "customer", "store_staff", "super_admin"]}>
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets"
            element={
              <ProtectedRoute roles={["user", "customer", "store_staff", "super_admin"]}>
                <MyOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute roles={["user", "customer", "store_staff", "super_admin"]}>
                <MyOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:invoice"
            element={
              <ProtectedRoute roles={["user", "customer", "store_staff", "super_admin"]}>
                <OrderTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/returns"
            element={
              <ProtectedRoute roles={["user", "customer", "store_staff", "super_admin"]}>
                <CustomerReturns />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute roles={["user", "customer", "super_admin"]}>
                <Wishlist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved-events"
            element={
              <ProtectedRoute roles={["user", "customer", "super_admin"]}>
                <Wishlist />
              </ProtectedRoute>
            }
          />

          {/* ======================================================== */}
          {/* INTERNAL DASHBOARDS (WRAPPED IN Clean InternalLayout)      */}
          {/* ======================================================== */}
          <Route element={<InternalLayout />}>
            {/* Role 4: Warehouse Staff (Gudang & Ekspedisi) */}
            <Route
              path="/warehouse"
              element={
                <ProtectedRoute roles={["warehouse_staff", "warehouse", "super_admin", "admin"]}>
                  <WarehouseDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/warehouse"
              element={
                <ProtectedRoute roles={["warehouse_staff", "warehouse", "super_admin", "admin"]}>
                  <WarehouseDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/inventory"
              element={
                <ProtectedRoute roles={["warehouse_staff", "warehouse", "super_admin", "admin", "manager", "store_staff", "promoter", "staff"]}>
                  <WarehouseInventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/po"
              element={
                <ProtectedRoute roles={["warehouse_staff", "warehouse", "super_admin", "admin"]}>
                  <WarehousePO />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/orders"
              element={
                <ProtectedRoute roles={["warehouse_staff", "warehouse", "super_admin", "admin"]}>
                  <WarehouseDelivery />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/dss"
              element={
                <ProtectedRoute roles={["warehouse_staff", "warehouse", "super_admin", "admin", "manager"]}>
                  <SmartRestockDSS />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/logs"
              element={
                <ProtectedRoute roles={["warehouse_staff", "warehouse", "super_admin", "admin"]}>
                  <WarehouseLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/returns"
              element={
                <ProtectedRoute roles={["warehouse_staff", "warehouse", "super_admin", "admin"]}>
                  <WarehouseReturns />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouse/transfers"
              element={
                <ProtectedRoute roles={["warehouse_staff", "warehouse", "super_admin", "admin"]}>
                  <WarehouseTransfers />
                </ProtectedRoute>
              }
            />

            {/* Role 5: Store Staff (Showroom POS, Multi-Branch Stock Lookup, Pickups & Support) */}
            <Route
              path="/store"
              element={
                <ProtectedRoute roles={["store_staff", "super_admin", "promoter"]}>
                  <StoreDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store/pos"
              element={
                <ProtectedRoute roles={["store_staff", "super_admin"]}>
                  <ShowroomPOS />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store/stock-lookup"
              element={
                <ProtectedRoute roles={["store_staff", "super_admin", "manager", "staff"]}>
                  <StoreStockLookup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store/returns"
              element={
                <ProtectedRoute roles={["store_staff", "staff", "promoter", "super_admin", "admin"]}>
                  <StoreReturns />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store/catalog"
              element={
                <ProtectedRoute roles={["store_staff", "super_admin", "promoter", "manager"]}>
                  <StoreStockLookup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store/pickups"
              element={
                <ProtectedRoute roles={["store_staff", "super_admin"]}>
                  <StoreClickAndCollect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store/support"
              element={
                <ProtectedRoute roles={["store_staff", "super_admin", "manager", "admin"]}>
                  <StoreSupport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store/helpdesk"
              element={
                <ProtectedRoute roles={["store_staff", "super_admin", "manager", "admin"]}>
                  <StoreSupport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store/live-chat"
              element={
                <ProtectedRoute roles={["store_staff", "super_admin", "manager", "admin"]}>
                  <StoreSupport />
                </ProtectedRoute>
              }
            />

            {/* Role 2: Manager (Master Catalog, Suppliers, Starter Rig Bundles, Shift Monitoring, Approval PO, MIS Dashboard, DSS & Deadstock Simulator) */}
            <Route
              path="/manager/catalog"
              element={
                <ProtectedRoute roles={["manager", "super_admin"]}>
                  <ManagerCatalog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/suppliers"
              element={
                <ProtectedRoute roles={["manager", "super_admin"]}>
                  <ManagerSuppliers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/bundles"
              element={
                <ProtectedRoute roles={["manager", "super_admin"]}>
                  <ManagerBundles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/shifts"
              element={
                <ProtectedRoute roles={["manager", "super_admin"]}>
                  <StaffShiftRecap />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/dss"
              element={
                <ProtectedRoute roles={["manager", "super_admin", "admin"]}>
                  <SmartRestockDSS />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/po"
              element={
                <ProtectedRoute roles={["manager", "super_admin"]}>
                  <ManagerPoApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/clearance"
              element={
                <ProtectedRoute roles={["manager", "finance", "super_admin", "admin"]}>
                  <DeadstockClearanceSimulator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/mis"
              element={
                <ProtectedRoute roles={["manager", "super_admin", "owner", "management"]}>
                  <MISDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/mis"
              element={
                <ProtectedRoute roles={["manager", "super_admin", "owner", "management"]}>
                  <MISDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/mis/events/:id"
              element={
                <ProtectedRoute roles={["manager", "super_admin", "owner", "management"]}>
                  <ProductAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/mis/products/:id"
              element={
                <ProtectedRoute roles={["manager", "super_admin", "owner", "management"]}>
                  <ProductAnalytics />
                </ProtectedRoute>
              }
            />

            {/* Role 3: Finance Controller (Laporan P&L, Deadstock Simulator, PO Payments, Refunds, Audit) */}
            <Route
              path="/finance/dashboard"
              element={
                <ProtectedRoute roles={["finance", "super_admin", "manager"]}>
                  <FinanceReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/laporan"
              element={
                <ProtectedRoute roles={["finance", "super_admin", "manager"]}>
                  <FinanceReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/pnl"
              element={
                <ProtectedRoute roles={["finance", "super_admin", "manager"]}>
                  <FinanceReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/clearance"
              element={
                <ProtectedRoute roles={["finance", "manager", "super_admin", "admin"]}>
                  <DeadstockClearanceSimulator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/po"
              element={
                <ProtectedRoute roles={["finance", "super_admin", "manager"]}>
                  <FinancePoPayments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/refunds"
              element={
                <ProtectedRoute roles={["finance", "super_admin", "manager"]}>
                  <FinanceRefunds />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/transactions"
              element={
                <ProtectedRoute roles={["finance", "super_admin", "manager"]}>
                  <FinanceTransactions />
                </ProtectedRoute>
              }
            />

            {/* Role 1: Super Admin */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <ProtectedRoute roles={["manager", "super_admin"]}>
                  <ProductApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events"
              element={
                <ProtectedRoute roles={["manager", "super_admin"]}>
                  <ProductApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/kms"
              element={
                <ProtectedRoute roles={["super_admin", "admin", "manager"]}>
                  <AdminKmsManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />

            {/* SOP & Panduan Kerja Operasional Internal (KMS) */}
            <Route
              path="/warehouse/sop"
              element={
                <ProtectedRoute roles={["warehouse_staff", "warehouse", "super_admin", "admin"]}>
                  <InternalSopPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store/sop"
              element={
                <ProtectedRoute roles={["store_staff", "staff", "promoter", "super_admin", "admin"]}>
                  <InternalSopPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/sop"
              element={
                <ProtectedRoute roles={["manager", "super_admin", "admin"]}>
                  <InternalSopPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/sop"
              element={
                <ProtectedRoute roles={["finance", "super_admin", "admin", "manager"]}>
                  <InternalSopPortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sop"
              element={
                <ProtectedRoute roles={["super_admin", "admin"]}>
                  <InternalSopPortal />
                </ProtectedRoute>
              }
            />

            {/* Pusat Notifikasi Internal Staf (Bungkus di InternalLayout) */}
            <Route
              path="/internal/notifications"
              element={
                <ProtectedRoute roles={["super_admin", "admin", "manager", "finance", "warehouse_staff", "warehouse", "store_staff", "promoter", "staff"]}>
                  <NotificationsInbox />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 404 Not Found */}
          <Route
            path="*"
            element={
              <div className="p-16 text-center text-ink-secondary">
                <h1 className="font-display text-2xl font-bold text-ink mb-2">404 — Halaman Tidak Ditemukan</h1>
                <p className="text-sm">Halaman yang Anda tuju tidak tersedia di katalog Overtone Music Store.</p>
              </div>
            }
          />
        </Routes>
      </main>
      {!isInternalRoute && <Footer />}
      {!isInternalRoute && <FloatingConciergeWidget />}
    </div>
  );
}

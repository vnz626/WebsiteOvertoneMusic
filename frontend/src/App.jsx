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
import MyTickets from "./pages/customer/MyTickets";
import Knowledge from "./pages/customer/Knowledge";
import SavedEvents from "./pages/customer/SavedEvents";
import Showrooms from "./pages/customer/Showrooms";

// Warehouse Pages
import WarehouseDashboard from "./pages/warehouse/WarehouseDashboard";
import WarehouseInventory from "./pages/warehouse/Inventory";
import WarehousePO from "./pages/warehouse/PurchaseOrders";
import WarehouseDelivery from "./pages/warehouse/DeliveryOrders";
import WarehouseLogs from "./pages/warehouse/InventoryLogs";

// Store Staff Pages
import StoreDashboard from "./pages/store/StoreDashboard";
import StoreCatalog from "./pages/store/StoreCatalog";
import StoreClickAndCollect from "./pages/store/ClickAndCollect";
import StoreSupport from "./pages/store/SupportHelpdesk";

// Manager Pages
import ManagerPoApproval from "./pages/manager/PoApproval";
import MISDashboard from "./pages/MIS/Dashboard";
import MISEventAnalytics from "./pages/MIS/EventAnalytics";

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
import AdminEventApproval from "./pages/admin/EventApproval";
import AdminKmsManager from "./pages/admin/KmsManager";
import UserManagement from "./pages/admin/UserManagement";
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
  ].some((prefix) => location.pathname.startsWith(prefix));

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 antialiased">
      {!isInternalRoute && <Navbar />}
      <div className="flex-1">
        <Routes>
          {/* Publik Retail Musik Overtone */}
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Catalog />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/events" element={<Catalog />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/events/:id" element={<ProductDetail />} />
          <Route path="/showrooms" element={<Showrooms />} />
          <Route path="/showroom" element={<Showrooms />} />
          <Route path="/help" element={<Knowledge />} />
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
                <MyTickets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved-events"
            element={
              <ProtectedRoute roles={["user", "customer", "super_admin"]}>
                <SavedEvents />
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

            {/* Role 5: Store Staff (Showroom & Click and Collect) */}
            <Route
              path="/store"
              element={
                <ProtectedRoute roles={["store_staff", "super_admin", "promoter"]}>
                  <StoreDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store/catalog"
              element={
                <ProtectedRoute roles={["store_staff", "super_admin", "promoter"]}>
                  <StoreCatalog />
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

            {/* Role 2: Manager (Approval PO, MIS Dashboard, DSS & Deadstock Simulator) */}
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
              path="/admin/mis/events/:id"
              element={
                <ProtectedRoute roles={["manager", "super_admin", "owner", "management"]}>
                  <MISEventAnalytics />
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
              path="/admin/events"
              element={
                <ProtectedRoute roles={["manager", "super_admin"]}>
                  <AdminEventApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/kms"
              element={
                <ProtectedRoute roles={["super_admin"]}>
                  <AdminKmsManager />
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
          </Route>

          {/* 404 Not Found */}
          <Route
            path="*"
            element={
              <div className="p-16 text-center text-gray-500">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">404 — Halaman Tidak Ditemukan</h1>
                <p className="text-sm">Halaman yang Anda tuju tidak tersedia di katalog Overtone Music Store.</p>
              </div>
            }
          />
        </Routes>
      </div>
      {!isInternalRoute && <Footer />}
      {!isInternalRoute && <FloatingConciergeWidget />}
    </div>
  );
}

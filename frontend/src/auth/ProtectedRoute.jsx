import { Navigate, useLocation } from "react-router-dom";
import { useAuth, homeForRole } from "./AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="p-8">
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Normalisasi alias role agar tidak ada redirect salah
  const normalizedRole = role === "warehouse" ? "warehouse_staff" : (role === "customer" ? "user" : (role === "admin" ? "super_admin" : role));

  if (roles && roles.length > 0) {
    const isAllowed = roles.includes(role) || roles.includes(normalizedRole) || role === "super_admin" || role === "admin";
    if (!isAllowed) {
      return <Navigate to={homeForRole(role)} replace />;
    }
  }

  return children;
}

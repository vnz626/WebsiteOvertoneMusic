import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);

function readStored(key) {
  const raw = localStorage.getItem(key);
  if (!raw || raw === "undefined") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => readStored("user"));
  const [role, setRole] = useState(() => localStorage.getItem("role"));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("token")));

  // Perbaikan bug #6: state login sekarang benar-benar disimpan di context,
  // jadi ProtectedRoute langsung melihat token baru setelah submit login.
  const login = useCallback(({ access_token, user: nextUser, role: nextRole }) => {
    localStorage.setItem("token", access_token);
    localStorage.setItem("user", JSON.stringify(nextUser ?? null));
    localStorage.setItem("role", nextRole ?? "");
    setToken(access_token);
    setUser(nextUser ?? null);
    setRole(nextRole ?? null);
    return nextRole;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    setToken(null);
    setUser(null);
    setRole(null);
  }, []);

  // Pulihkan sesi setelah halaman di-refresh (token di localStorage divalidasi ulang).
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    api
      .get("/auth/me")
      .then((res) => {
        if (!active) return;
        const u = res?.data?.user;
        const r = res?.data?.role;
        if (u) {
          setUser(u);
          localStorage.setItem("user", JSON.stringify(u));
        }
        if (r) {
          setRole(r);
          localStorage.setItem("role", r);
        }
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // sengaja hanya dijalankan saat token berubah
  }, [token]);

  const updateUser = useCallback((updatedUserData) => {
    setUser((prev) => {
      const next = { ...prev, ...updatedUserData };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ token, user, role, loading, login, logout, updateUser, isAuthenticated: Boolean(token) }),
    [token, user, role, loading, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}

/** Halaman default tiap role setelah login. */
export function homeForRole(role) {
  if (role === "super_admin" || role === "admin") return "/admin/dashboard";
  if (role === "manager" || role === "owner" || role === "management") return "/admin/mis";
  if (role === "finance") return "/finance/dashboard";
  if (role === "warehouse_staff" || role === "warehouse") return "/warehouse";
  if (role === "store_staff" || role === "promoter" || role === "staff") return "/store/catalog";
  return "/products";
}

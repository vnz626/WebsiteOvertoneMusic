import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ShieldCheck, Zap, UserCheck } from "lucide-react";
import api from "../api";
import { useAuth, homeForRole } from "../auth/AuthContext";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { errorMessage } from "../utils/format";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", form);
      const role = login(res.data);
      toast.success("Login berhasil! Selamat datang di Overtone Music Store.");
      navigate(location.state?.from || homeForRole(role), { replace: true });
    } catch (err) {
      const msg = errorMessage(err, "Login gagal. Periksa email/username dan password.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center p-4 sm:p-6 bg-canvas text-ink">
      <Card className="w-full max-w-md border border-line bg-surface p-6 sm:p-8">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex flex-col items-center group mb-3">
            <span className="font-display text-2xl font-bold tracking-tight text-ink leading-none">
              OVERTONE
            </span>
            <span className="text-[10px] font-bold tracking-[0.26em] uppercase text-accent mt-1">
              MUSIC STORE
            </span>
          </Link>
          <h1 className="mt-2 text-lg font-display font-bold text-ink">Masuk ke Akun Pelanggan &amp; Staf</h1>
          <p className="mt-1 text-xs text-ink-secondary">
            Masuk dengan email atau username untuk mengakses katalog, pesanan instrumen, atau portal operasional internal.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-sm border border-status-danger/30 bg-status-danger-bg px-3.5 py-2.5 text-xs text-status-danger font-medium">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="login-email-input" className="block text-xs font-semibold text-ink mb-1.5">
              Email atau Username
            </label>
            <input
              id="login-email-input"
              type="text"
              className="ot-input"
              placeholder="Contoh: customer@overtone.id"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="login-password-input" className="block text-xs font-semibold text-ink mb-1.5">
              Password
            </label>
            <input
              id="login-password-input"
              type="password"
              className="ot-input"
              placeholder="Masukkan password akun"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading} disabled={loading}>
            {loading ? "Memproses Autentikasi..." : "Masuk Sekarang"}
          </Button>
        </form>

        {/* Quick Demo Login (1-Click) */}
        <div className="mt-6 rounded-sm border border-line bg-surface-muted p-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Zap size={13} className="text-accent" aria-hidden="true" /> Quick Demo Login (1-Click)
            </p>
            <span className="text-[10px] text-ink-muted font-mono tabular-nums">pwd: password123</span>
          </div>

          {/* Featured Demo Customer Button */}
          <div className="mb-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setForm({ email: "customer@overtone.id", password: "password123" });
                setError("");
                setLoading(true);
                try {
                  const res = await api.post("/auth/login", {
                    email: "customer@overtone.id",
                    password: "password123",
                  });
                  const role = login(res.data);
                  toast.success("Login berhasil sebagai Demo Customer!");
                  navigate(location.state?.from || homeForRole(role), { replace: true });
                } catch (err) {
                  const msg = errorMessage(err, "Login Customer gagal.");
                  setError(msg);
                  toast.error(msg);
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full flex items-center justify-between rounded-sm border border-line-strong bg-surface px-3.5 py-2.5 text-xs font-semibold text-ink hover:border-ink transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-1.5">
                <UserCheck size={14} className="text-accent" aria-hidden="true" /> Demo Customer (Musisi)
              </span>
              <span className="text-[11px] font-mono text-ink-muted">customer@overtone.id</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Admin", email: "admin@overtone.id" },
              { label: "Manager", email: "manager@overtone.id" },
              { label: "Finance", email: "finance@overtone.id" },
              { label: "Warehouse", email: "warehouse@overtone.id" },
              { label: "Store", email: "store@overtone.id" },
            ].map((d) => (
              <button
                key={d.label}
                type="button"
                disabled={loading}
                onClick={async () => {
                  setForm({ email: d.email, password: "password123" });
                  setError("");
                  setLoading(true);
                  try {
                    const res = await api.post("/auth/login", {
                      email: d.email,
                      password: "password123",
                    });
                    const role = login(res.data);
                    toast.success(`Login berhasil sebagai ${d.label}!`);
                    navigate(location.state?.from || homeForRole(role), { replace: true });
                  } catch (err) {
                    const msg = errorMessage(err, `Login ${d.label} gagal.`);
                    setError(msg);
                    toast.error(msg);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="rounded-xs border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-secondary hover:border-line-strong hover:text-ink transition-colors disabled:opacity-50"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-4 text-center">
          <p className="text-xs text-ink-secondary">
            Belum memiliki akun musisi?{" "}
            <Link to="/register" className="font-bold text-ink underline hover:text-accent">
              Daftar Akun Baru
            </Link>
          </p>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink-muted">
            <ShieldCheck size={13} className="text-status-success" aria-hidden="true" /> Authorized Official Music Retailer
          </div>
        </div>
      </Card>
    </div>
  );
}

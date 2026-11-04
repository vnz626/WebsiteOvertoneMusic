import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ShieldCheck, Zap, UserCheck } from "lucide-react";
import api from "../api";
import { useAuth, homeForRole } from "../auth/AuthContext";
import Button from "../components/ui/Button";
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
      toast.success("Login berhasil! Selamat datang di Focalpoint Pro.");
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
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center p-4 sm:p-6 fp-home-canvas text-[#0F1B2D]">
      <div className="fp-glass-card w-full max-w-md !p-8 sm:!p-10 !rounded-3xl shadow-xl relative overflow-hidden">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex flex-col items-center group mb-3 select-none">
            <span className="font-display text-3xl font-bold tracking-tight text-[#0F1B2D] leading-none">
              Focalpoint<span className="text-[#E8622C]">.pro</span>
            </span>
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-[#64748B] mt-1.5">
              CINEMA · BROADCAST · PRO
            </span>
          </Link>
          <h1 className="mt-2 text-lg font-display font-bold text-[#0F1B2D]">
            Masuk ke Akun Pelanggan &amp; Staf
          </h1>
          <p className="mt-1 text-xs text-[#64748B] leading-relaxed">
            Akses katalog cinema gear, riwayat pesanan produksi, atau portal kerja operasional.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50/80 backdrop-blur-md px-3.5 py-2.5 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="login-email-input" className="block text-xs font-semibold text-[#0F1B2D] mb-1.5">
              Email atau Username
            </label>
            <input
              id="login-email-input"
              type="text"
              className="w-full rounded-full border border-[#0F1B2D]/15 bg-white/75 backdrop-blur-md px-4 py-2.5 text-xs text-[#0F1B2D] placeholder:text-[#94A3B8] focus:border-[#E8622C] focus:bg-white focus:outline-none transition-all"
              placeholder="Contoh: customer@overtone.id"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="login-password-input" className="block text-xs font-semibold text-[#0F1B2D] mb-1.5">
              Password
            </label>
            <input
              id="login-password-input"
              type="password"
              className="w-full rounded-full border border-[#0F1B2D]/15 bg-white/75 backdrop-blur-md px-4 py-2.5 text-xs text-[#0F1B2D] placeholder:text-[#94A3B8] focus:border-[#E8622C] focus:bg-white focus:outline-none transition-all"
              placeholder="Masukkan password akun"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full !rounded-full !bg-[#E8622C] hover:!bg-[#d45522] !shadow-lg text-white font-bold" loading={loading} disabled={loading}>
            {loading ? "Memproses Autentikasi..." : "Masuk Sekarang"}
          </Button>
        </form>

        {/* Quick Demo Login (1-Click) */}
        <div className="mt-6 rounded-2xl border border-white/80 bg-white/50 backdrop-blur-md p-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F1B2D] flex items-center gap-1.5">
              <Zap size={13} className="text-[#E8622C]" aria-hidden="true" /> Quick Demo Login (1-Click)
            </p>
            <span className="text-[10px] text-[#64748B] font-mono tabular-nums">pwd: password123</span>
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
                  toast.success("Login berhasil sebagai Demo Filmmaker!");
                  navigate(location.state?.from || homeForRole(role), { replace: true });
                } catch (err) {
                  const msg = errorMessage(err, "Login Customer gagal.");
                  setError(msg);
                  toast.error(msg);
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full flex items-center justify-between rounded-full border border-white/80 bg-white/80 px-3.5 py-2 text-xs font-semibold text-[#0F1B2D] hover:border-[#E8622C] hover:bg-white transition-all shadow-xs disabled:opacity-50"
            >
              <span className="flex items-center gap-1.5">
                <UserCheck size={14} className="text-[#E8622C]" aria-hidden="true" /> Demo Creator / Filmmaker
              </span>
              <span className="text-[11px] font-mono text-[#64748B]">customer@overtone.id</span>
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
                className="rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-[#475569] hover:border-[#E8622C] hover:text-[#0F1B2D] hover:bg-white transition-all disabled:opacity-50"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-[#0F1B2D]/10 pt-4 text-center">
          <p className="text-xs text-[#64748B]">
            Belum memiliki akun filmmaker?{" "}
            <Link to="/register" className="font-bold text-[#0F1B2D] underline hover:text-[#E8622C]">
              Daftar Akun Baru
            </Link>
          </p>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#64748B]">
            <ShieldCheck size={13} className="text-emerald-600" aria-hidden="true" /> Authorized Official Cinema Gear Retailer
          </div>
        </div>
      </div>
    </div>
  );
}

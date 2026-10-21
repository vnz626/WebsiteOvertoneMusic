import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ShieldCheck, ArrowRight } from "lucide-react";
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

  const field =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all";

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center p-6 bg-[#F9FAFB]">
      <Card className="w-full max-w-md border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center mb-6">
          <span className="block font-extrabold text-2xl tracking-tight text-gray-900 uppercase font-sans">
            OVERTONE <span className="text-gray-500 font-light text-lg">Music Store</span>
          </span>
          <h1 className="mt-2 text-base font-bold text-gray-900">Masuk ke Akun Pelanggan &amp; Staf</h1>
          <p className="mt-1 text-xs text-gray-500">
            Masuk dengan email atau username untuk mengakses katalog, pesanan instrumen, atau portal internal.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-600 font-medium">{error}</p>}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email atau Username</label>
            <input
              type="text"
              className={field}
              placeholder="Contoh: customer atau admin@overtone.id"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className={field}
              placeholder="Masukkan password akun"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full py-3 bg-[#111111] hover:bg-black text-white font-semibold text-xs rounded-xl shadow-sm transition-all" disabled={loading}>
            {loading ? "Memproses Autentikasi..." : "Masuk Sekarang"}
          </Button>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-4 text-center">
          <p className="text-xs text-gray-600">
            Belum punya akun?{" "}
            <Link to="/register" className="font-bold text-gray-900 hover:underline">
              Daftar Akun Baru
            </Link>
          </p>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
            <ShieldCheck size={13} className="text-[#16A34A]" /> Authorized Official Music Retailer
          </div>
        </div>
      </Card>
    </div>
  );
}

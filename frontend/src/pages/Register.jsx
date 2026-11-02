import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ShieldCheck } from "lucide-react";
import api from "../api";
import { useAuth, homeForRole } from "../auth/AuthContext";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { errorMessage } from "../utils/format";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/register", form);
      const role = login(res.data);
      toast.success("Akun berhasil didaftarkan! Selamat datang di Overtone Music Store.");
      navigate(homeForRole(role), { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, "Pendaftaran akun gagal"));
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
          <h1 className="mt-2 text-lg font-display font-bold text-ink">Daftar Akun Pelanggan</h1>
          <p className="mt-1 text-xs text-ink-secondary">
            Daftar untuk berbelanja instrumen musik resmi bergaransi distributor, melacak resi pengiriman, dan menggunakan layanan Pickup Pass.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label htmlFor="register-name" className="block text-xs font-semibold text-ink mb-1.5">
              Nama Lengkap <span className="text-accent">*</span>
            </label>
            <input
              id="register-name"
              type="text"
              className="ot-input"
              placeholder="Contoh: Dewa Budjana"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="block text-xs font-semibold text-ink mb-1.5">
              Alamat Email <span className="text-accent">*</span>
            </label>
            <input
              id="register-email"
              type="email"
              className="ot-input"
              placeholder="nama@email.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="register-phone" className="block text-xs font-semibold text-ink mb-1.5">
              Nomor WhatsApp / HP <span className="text-accent">*</span>
            </label>
            <input
              id="register-phone"
              type="tel"
              className="ot-input tabular-nums"
              placeholder="081234567890"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              required
              autoComplete="tel"
            />
          </div>

          <div>
            <label htmlFor="register-address" className="block text-xs font-semibold text-ink mb-1.5">
              Alamat Pengiriman Utama (Opsional)
            </label>
            <input
              id="register-address"
              type="text"
              className="ot-input"
              placeholder="Kota domisili / alamat lengkap"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              autoComplete="street-address"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="block text-xs font-semibold text-ink mb-1.5">
              Password <span className="text-accent">*</span>
            </label>
            <input
              id="register-password"
              type="password"
              className="ot-input"
              placeholder="Minimal 6 karakter"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading} disabled={loading}>
            {loading ? "Mendaftarkan Akun..." : "Daftar Akun Sekarang"}
          </Button>
        </form>

        <div className="mt-6 border-t border-line pt-4 text-center">
          <p className="text-xs text-ink-secondary">
            Sudah memiliki akun?{" "}
            <Link to="/login" className="font-bold text-ink underline hover:text-accent">
              Masuk di Sini
            </Link>
          </p>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink-muted">
            <ShieldCheck size={13} className="text-status-success" aria-hidden="true" /> 100% Data &amp; Privasi Terlindungi
          </div>
        </div>
      </Card>
    </div>
  );
}

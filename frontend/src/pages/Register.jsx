import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ShieldCheck } from "lucide-react";
import api from "../api";
import { useAuth, homeForRole } from "../auth/AuthContext";
import Button from "../components/ui/Button";
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
      toast.success("Akun berhasil didaftarkan! Selamat datang di Focalpoint Pro.");
      navigate(homeForRole(role), { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, "Pendaftaran akun gagal"));
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
            Daftar Akun Pelanggan
          </h1>
          <p className="mt-1 text-xs text-[#64748B] leading-relaxed">
            Daftar untuk membeli kamera sinema, lensa &amp; lighting resmi bergaransi, melacak resi ekspedisi, dan Pickup Pass di showroom.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label htmlFor="register-name" className="block text-xs font-semibold text-[#0F1B2D] mb-1.5">
              Nama Lengkap <span className="text-[#E8622C]">*</span>
            </label>
            <input
              id="register-name"
              type="text"
              className="w-full rounded-full border border-[#0F1B2D]/15 bg-white/75 backdrop-blur-md px-4 py-2.5 text-xs text-[#0F1B2D] placeholder:text-[#94A3B8] focus:border-[#E8622C] focus:bg-white focus:outline-none transition-all"
              placeholder="Contoh: Dewa Budjana / Tim Produksi"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="block text-xs font-semibold text-[#0F1B2D] mb-1.5">
              Alamat Email <span className="text-[#E8622C]">*</span>
            </label>
            <input
              id="register-email"
              type="email"
              className="w-full rounded-full border border-[#0F1B2D]/15 bg-white/75 backdrop-blur-md px-4 py-2.5 text-xs text-[#0F1B2D] placeholder:text-[#94A3B8] focus:border-[#E8622C] focus:bg-white focus:outline-none transition-all"
              placeholder="nama@email.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="register-phone" className="block text-xs font-semibold text-[#0F1B2D] mb-1.5">
              Nomor WhatsApp / HP <span className="text-[#E8622C]">*</span>
            </label>
            <input
              id="register-phone"
              type="tel"
              className="w-full rounded-full border border-[#0F1B2D]/15 bg-white/75 backdrop-blur-md px-4 py-2.5 text-xs text-[#0F1B2D] placeholder:text-[#94A3B8] focus:border-[#E8622C] focus:bg-white focus:outline-none transition-all tabular-nums"
              placeholder="081234567890"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              required
              autoComplete="tel"
            />
          </div>

          <div>
            <label htmlFor="register-address" className="block text-xs font-semibold text-[#0F1B2D] mb-1.5">
              Alamat Pengiriman Utama (Opsional)
            </label>
            <input
              id="register-address"
              type="text"
              className="w-full rounded-full border border-[#0F1B2D]/15 bg-white/75 backdrop-blur-md px-4 py-2.5 text-xs text-[#0F1B2D] placeholder:text-[#94A3B8] focus:border-[#E8622C] focus:bg-white focus:outline-none transition-all"
              placeholder="Studio / Kota domisili / alamat lengkap"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              autoComplete="street-address"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="block text-xs font-semibold text-[#0F1B2D] mb-1.5">
              Password <span className="text-[#E8622C]">*</span>
            </label>
            <input
              id="register-password"
              type="password"
              className="w-full rounded-full border border-[#0F1B2D]/15 bg-white/75 backdrop-blur-md px-4 py-2.5 text-xs text-[#0F1B2D] placeholder:text-[#94A3B8] focus:border-[#E8622C] focus:bg-white focus:outline-none transition-all"
              placeholder="Minimal 6 karakter"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full !rounded-full !bg-[#E8622C] hover:!bg-[#d45522] !shadow-lg text-white font-bold" loading={loading} disabled={loading}>
            {loading ? "Mendaftarkan Akun..." : "Daftar Akun Sekarang"}
          </Button>
        </form>

        <div className="mt-6 border-t border-[#0F1B2D]/10 pt-4 text-center">
          <p className="text-xs text-[#64748B]">
            Sudah memiliki akun?{" "}
            <Link to="/login" className="font-bold text-[#0F1B2D] underline hover:text-[#E8622C]">
              Masuk di Sini
            </Link>
          </p>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#64748B]">
            <ShieldCheck size={13} className="text-emerald-600" aria-hidden="true" /> 100% Data &amp; Privasi Terlindungi
          </div>
        </div>
      </div>
    </div>
  );
}

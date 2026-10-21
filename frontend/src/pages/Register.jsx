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

  const field =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all";

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center p-6 bg-[#F9FAFB]">
      <Card className="w-full max-w-md border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center mb-6">
          <span className="block font-extrabold text-2xl tracking-tight text-gray-900 uppercase font-sans">
            OVERTONE <span className="text-gray-500 font-light text-lg">Music Store</span>
          </span>
          <h1 className="mt-2 text-base font-bold text-gray-900">Daftar Akun Pelanggan</h1>
          <p className="mt-1 text-xs text-gray-500">
            Daftar untuk belanja instrumen musik resmi bergaransi distributor, melacak resi pengiriman, dan pickup showroom.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
            <input
              className={field}
              placeholder="Contoh: Dewa Budjana"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Alamat Email</label>
            <input
              type="email"
              className={field}
              placeholder="nama@email.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nomor WhatsApp / HP</label>
            <input
              type="tel"
              className={field}
              placeholder="081234567890"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Alamat Pengiriman (Opsional)</label>
            <input
              className={field}
              placeholder="Kota domisili / alamat"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className={field}
              placeholder="Minimal 6 karakter"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full py-3 bg-[#111111] hover:bg-black text-white font-semibold text-xs rounded-xl shadow-sm transition-all" disabled={loading}>
            {loading ? "Mendaftarkan Akun..." : "Daftar Akun Sekarang"}
          </Button>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-4 text-center">
          <p className="text-xs text-gray-600">
            Sudah memiliki akun?{" "}
            <Link to="/login" className="font-bold text-gray-900 hover:underline">
              Masuk di Sini
            </Link>
          </p>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
            <ShieldCheck size={13} className="text-[#16A34A]" /> 100% Data &amp; Privasi Terlindungi
          </div>
        </div>
      </Card>
    </div>
  );
}

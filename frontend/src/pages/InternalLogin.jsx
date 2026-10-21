import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ShieldCheck } from "lucide-react";
import api from "../api";
import { useAuth, homeForRole } from "../auth/AuthContext";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { errorMessage } from "../utils/format";

export default function InternalLogin() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/admin/login", form);
      const role = login(res.data);
      toast.success("Login internal berhasil!");
      navigate(homeForRole(role), { replace: true });
    } catch (err) {
      const msg = errorMessage(err, "Login gagal. Periksa username dan password staf.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const field =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all";

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[#F9FAFB] p-6">
      <Card className="w-full max-w-md border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center mb-6">
          <span className="block font-extrabold text-2xl tracking-tight text-gray-900 uppercase font-sans">
            OVERTONE <span className="text-gray-500 font-light text-lg">OAS Portal</span>
          </span>
          <h1 className="mt-2 text-base font-bold text-gray-900">Portal Staf Internal</h1>
          <p className="mt-1 text-xs text-gray-500">Khusus Super Admin, Manager, Finance, Warehouse &amp; Showroom Staff.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-600 font-medium">{error}</p>}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Username Staf</label>
            <input
              className={field}
              placeholder="Username akun internal"
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className={field}
              placeholder="Password staf"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full py-3 bg-[#111111] hover:bg-black text-white font-semibold text-xs rounded-xl shadow-sm transition-all" disabled={loading}>
            {loading ? "Memverifikasi Kredensial..." : "Masuk ke Portal Internal"}
          </Button>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
            <ShieldCheck size={13} className="text-[#16A34A]" /> OAS Secure Internal Gateway
          </div>
        </div>
      </Card>
    </div>
  );
}

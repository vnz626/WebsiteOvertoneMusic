import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ShieldCheck, Zap } from "lucide-react";
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

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-canvas p-4 sm:p-6 text-ink">
      <Card className="w-full max-w-md border border-line bg-surface p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex flex-col items-center mb-3">
            <span className="font-display text-2xl font-bold tracking-tight text-ink leading-none">
              FOCALPOINT<span className="text-accent font-extrabold">.PRO</span>
            </span>
            <span className="text-[10px] font-bold tracking-[0.26em] uppercase text-accent mt-1">
              INTERNAL OAS PORTAL
            </span>
          </div>
          <h1 className="mt-2 text-lg font-display font-bold text-ink">Portal Staf Operasional Internal</h1>
          <p className="mt-1 text-xs text-ink-secondary">
            Khusus Super Admin, General Manager, Finance Controller, Warehouse Lead &amp; Store Specialist.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-sm border border-status-danger/30 bg-status-danger-bg px-3.5 py-2.5 text-xs text-status-danger font-medium">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="internal-username" className="block text-xs font-semibold text-ink mb-1.5">
              Username Staf Internal
            </label>
            <input
              id="internal-username"
              type="text"
              className="ot-input"
              placeholder="Username akun internal"
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label htmlFor="internal-password" className="block text-xs font-semibold text-ink mb-1.5">
              Password
            </label>
            <input
              id="internal-password"
              type="password"
              className="ot-input"
              placeholder="Password staf"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading} disabled={loading}>
            {loading ? "Memverifikasi Kredensial..." : "Masuk ke Portal Internal"}
          </Button>
        </form>

        {/* Quick Demo Role Switcher (1-Click) */}
        <div className="mt-6 rounded-sm border border-line bg-surface-muted p-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Zap size={13} className="text-accent" aria-hidden="true" /> Quick Demo Role Switcher
            </p>
            <span className="text-[10px] text-ink-muted font-mono tabular-nums">pwd: password123</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {[
              { label: "Super Admin", username: "admin", email: "admin@overtone.id" },
              { label: "General Manager", username: "manager", email: "manager@overtone.id" },
              { label: "Finance Controller", username: "finance", email: "finance@overtone.id" },
              { label: "Warehouse Lead", username: "warehouse", email: "warehouse@overtone.id" },
              { label: "Operational Staff", username: "store", email: "store@overtone.id" },
            ].map((d) => (
              <button
                key={d.label}
                type="button"
                disabled={loading}
                onClick={async () => {
                  setForm({ username: d.username, password: "password123" });
                  setError("");
                  setLoading(true);
                  try {
                    const res = await api.post("/auth/admin/login", {
                      username: d.username,
                      password: "password123",
                    });
                    const role = login(res.data);
                    toast.success(`Login berhasil sebagai ${d.label}!`);
                    navigate(homeForRole(role), { replace: true });
                  } catch (err) {
                    const msg = errorMessage(err, `Login ${d.label} gagal.`);
                    setError(msg);
                    toast.error(msg);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="flex items-center justify-between rounded-xs border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:border-line-strong transition-colors disabled:opacity-50"
              >
                <span>{d.label}</span>
                <span className="text-[11px] text-ink-muted font-mono">
                  {d.email}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink-muted">
            <ShieldCheck size={13} className="text-status-success" aria-hidden="true" /> OAS Secure Internal Gateway
          </div>
        </div>
      </Card>
    </div>
  );
}

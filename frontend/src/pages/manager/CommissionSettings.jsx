import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Percent, Save, RefreshCw, Calculator, HelpCircle, ShieldAlert } from "lucide-react";
import api from "../../api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { errorMessage, formatRupiah, formatDate } from "../../utils/format";

export default function CommissionSettings() {
  const [feePercent, setFeePercent] = useState("5.0");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Simulasi kalkulator
  const [simSales, setSimSales] = useState(50000000);

  function fetchSettings() {
    setLoading(true);
    api
      .get("/admin/settings")
      .then((res) => {
        setFeePercent(res.data.platform_fee_percent || "5.0");
        setUpdatedAt(res.data.updated_at);
      })
      .catch((err) => toast.error(errorMessage(err, "Gagal memuat pengaturan komisi")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    const val = parseFloat(feePercent);
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error("Persentase komisi harus berupa angka antara 0 dan 100");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put("/admin/settings", { platform_fee_percent: val });
      toast.success(res.data.message || "Pengaturan komisi berhasil diperbarui");
      fetchSettings();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal memperbarui komisi"));
    } finally {
      setSaving(false);
    }
  }

  const currentFee = parseFloat(feePercent) || 0;
  const platformAmount = Math.round((simSales * currentFee) / 100);
  const promoterAmount = simSales - platformAmount;

  return (
    <DashboardLayout
      title="Pengaturan Komisi Platform"
      subtitle="Atur persentase bagi hasil platform Ticksy dari setiap penjualan tiket event promoter"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Pengaturan */}
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ts-primary/10 text-ts-primary">
              <Percent size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ts-ink dark:text-white">Potongan Komisi Default</h3>
              <p className="text-xs text-ts-muted">Diterapkan otomatis pada setiap pengajuan pencairan dana payout</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ts-muted">
                Persentase Komisi Platform (%)
              </label>
              <div className="relative mt-2 flex items-center">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={feePercent}
                  onChange={(e) => setFeePercent(e.target.value)}
                  className="w-full rounded-xl border border-ts-subtle bg-ts-low px-4 py-3 text-lg font-bold text-ts-ink outline-none transition focus:border-ts-primary dark:border-white/10 dark:bg-surface-container dark:text-white"
                  required
                />
                <span className="absolute right-4 font-bold text-ts-muted">%</span>
              </div>
              <p className="mt-2 text-xs text-ts-muted">
                Nilai standar industri adalah 5.0%. Sisanya ({100 - currentFee}%) akan menjadi hak bersih promotor.
              </p>
            </div>

            {updatedAt && (
              <div className="text-xs text-ts-muted">
                Terakhir diperbarui: <span className="font-semibold text-ts-ink dark:text-slate-300">{formatDate(updatedAt)}</span>
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" disabled={saving || loading} className="gap-2">
                <Save size={16} />
                {saving ? "Menyimpan..." : "Simpan Kebijakan Komisi"}
              </Button>
            </div>
          </form>
        </Card>

        {/* Simulasi Bagi Hasil */}
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ts-ink dark:text-white">Simulasi Perhitungan Payout</h3>
              <p className="text-xs text-ts-muted">Uji coba simulasi bagi hasil dengan persentase saat ini</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ts-muted">
                Contoh Total Penjualan Tiket Kotor (Gross Sales)
              </label>
              <input
                type="number"
                step="1000000"
                value={simSales}
                onChange={(e) => setSimSales(Math.max(0, parseInt(e.target.value) || 0))}
                className="mt-2 w-full rounded-xl border border-ts-subtle bg-ts-low px-4 py-2.5 text-sm font-semibold outline-none focus:border-ts-primary dark:border-white/10 dark:bg-surface-container dark:text-white"
              />
            </div>

            {/* Hasil Bagi Hasil */}
            <div className="space-y-3 rounded-xl border border-ts-subtle bg-ts-low/60 p-4 text-sm dark:border-white/5 dark:bg-surface-high/30">
              <div className="flex items-center justify-between">
                <span className="text-ts-muted">Total Penjualan Event:</span>
                <span className="font-bold text-ts-ink dark:text-white">{formatRupiah(simSales)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-ts-subtle pt-2 dark:border-white/10">
                <span className="flex items-center gap-1.5 text-ts-primary font-medium">
                  <Percent size={14} /> Komisi Platform ({currentFee}%):
                </span>
                <span className="font-bold text-ts-primary">{formatRupiah(platformAmount)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-ts-subtle pt-2 dark:border-white/10">
                <span className="text-emerald-600 font-semibold dark:text-emerald-400">
                  Dana Ditransfer ke Promoter ({100 - currentFee}%):
                </span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(promoterAmount)}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <HelpCircle size={16} className="shrink-0 mt-0.5" />
              <p>
                Perubahan komisi ini akan langsung berlaku pada setiap pengajuan pencairan dana (request payout) baru oleh promotor.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

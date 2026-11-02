import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Percent, Save, Calculator, HelpCircle } from "lucide-react";
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
      subtitle="Atur persentase komisi dan simulasi bagi hasil operasional Overtone"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-accent/30 bg-accent-subtle text-accent">
              <Percent size={18} aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">
                Potongan Komisi Default
              </h3>
              <p className="text-xs text-ink-secondary">
                Diterapkan otomatis pada setiap pengajuan pencairan dana payout
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary">
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
                  className="ot-input pr-10 text-base font-bold tabular-nums"
                  required
                />
                <span className=" absolute right-4 font-bold text-ink-muted">%</span>
              </div>
              <p className="mt-2 text-xs text-ink-secondary">
                Nilai standar industri adalah 5.0%. Sisanya ({100 - currentFee}%) akan
                menjadi hak bersih mitra.
              </p>
            </div>

            {updatedAt && (
              <div className="text-xs text-ink-muted tabular-nums">
                Terakhir diperbarui:{" "}
                <span className="font-semibold text-ink">{formatDate(updatedAt)}</span>
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" disabled={saving || loading} loading={saving}>
                <Save size={15} aria-hidden="true" />
                Simpan Kebijakan Komisi
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-line bg-surface-muted text-ink">
              <Calculator size={18} aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">
                Simulasi Perhitungan Payout
              </h3>
              <p className="text-xs text-ink-secondary">
                Uji coba simulasi bagi hasil dengan persentase saat ini
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink-secondary">
                Contoh Total Penjualan Kotor (Gross Sales)
              </label>
              <input
                type="number"
                step="1000000"
                value={simSales}
                onChange={(e) =>
                  setSimSales(Math.max(0, parseInt(e.target.value) || 0))
                }
                className="ot-input mt-2 text-sm font-semibold tabular-nums"
              />
            </div>

            <div className="space-y-3 rounded-sm border border-line bg-surface-muted p-4 text-xs tabular-nums">
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Total Penjualan:</span>
                <span className="font-bold text-ink">{formatRupiah(simSales)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2">
                <span className="flex items-center gap-1.5 font-medium text-accent">
                  <Percent size={13} aria-hidden="true" /> Komisi Platform ({currentFee}
                  %):
                </span>
                <span className="font-bold text-accent">
                  {formatRupiah(platformAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2">
                <span className="font-semibold text-status-success">
                  Dana Bersih Diterima ({100 - currentFee}%):
                </span>
                <span className="font-display text-base font-bold text-status-success">
                  {formatRupiah(promoterAmount)}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-sm border border-line bg-canvas p-3 text-xs text-ink-secondary">
              <HelpCircle
                size={15}
                className="mt-0.5 shrink-0 text-ink-muted"
                aria-hidden="true"
              />
              <p>
                Perubahan komisi ini akan langsung berlaku pada setiap pengajuan
                pencairan dana baru.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

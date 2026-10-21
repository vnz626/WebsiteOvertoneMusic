import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check, CheckCircle2, Guitar, Layers, MapPin, RefreshCw, X } from "lucide-react";
import api from "../../api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonGrid } from "../../components/ui/Skeleton";
import { errorMessage, formatDate, formatRupiah } from "../../utils/format";

const FILTERS = [
  ["pending", "Menunggu Persetujuan"],
  ["approved", "Disetujui (Tayang)"],
  ["rejected", "Ditolak"],
  ["", "Semua Produk"],
];

export default function EventApproval() {
  const [status, setStatus] = useState("pending");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/admin/events", { params: status ? { status } : {} })
      .then((res) => setEvents(res.data.data || []))
      .catch((err) => toast.error(errorMessage(err, "Gagal memuat produk")))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(load, [load]);

  async function approve(id) {
    setBusyId(id);
    try {
      await api.post(`/admin/events/${id}/approve`);
      toast.success("Produk instrumen disetujui & tayang di katalog publik!");
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id) {
    const note = window.prompt("Alasan penolakan katalog produk:");
    if (!note) return;
    setBusyId(id);
    try {
      await api.post(`/admin/events/${id}/reject`, { note });
      toast.success("Produk instrumen ditolak");
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <DashboardLayout
      title="Approval Katalog Produk Instrumen Musik"
      subtitle="Kurasi produk baru dari store staff sebelum dipublikasikan ke katalog e-commerce Swee Lee"
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <button
            key={label}
            onClick={() => setStatus(value)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              status === value
                ? "bg-ts-primary text-white shadow-md shadow-ts-primary/25 dark:bg-brand-500"
                : "bg-white text-slate-600 border border-ts-subtle hover:bg-ts-low dark:bg-surface-container dark:border-white/10 dark:text-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonGrid count={3} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={Guitar}
          title="Tidak ada produk dalam antrean"
          description="Semua produk instrumen telah dikurasi oleh Manager."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {events.map((e) => (
            <Card key={e.id} className="p-5">
              <div className="flex items-start gap-4">
                {e.image_url ? (
                  <img
                    src={e.image_url}
                    alt={e.name}
                    className="h-20 w-20 rounded-xl object-cover border border-slate-200 dark:border-white/10 shrink-0"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100 dark:bg-surface-high text-slate-400 shrink-0">
                    <Guitar size={32} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] text-ts-muted">
                        {e.sku_prefix || "SKU"} &bull; {e.organizer || "Brand"}
                      </span>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug truncate">
                        {e.name}
                      </h3>
                      <p className="text-xs font-bold text-ts-primary dark:text-brand-400 mt-0.5">
                        {formatRupiah(e.price)} &bull; {e.category}
                      </p>
                    </div>
                    <Badge status={e.status} />
                  </div>
                  <p className="text-xs text-ts-muted flex items-center gap-1 mt-1">
                    <MapPin size={12} /> {e.location || "Showroom Swee Lee"} ({e.city || "Jakarta"})
                  </p>
                </div>
              </div>

              {e.specifications && (
                <div className="mt-3 rounded-xl bg-slate-50 dark:bg-surface-high p-3 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-bold text-slate-900 dark:text-white mb-1">Spesifikasi Kayu & Elektronik:</p>
                  <p className="whitespace-pre-line text-[11px] line-clamp-3">{e.specifications}</p>
                </div>
              )}

              {e.tiers && e.tiers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {e.tiers.map((t) => (
                    <span
                      key={t.id}
                      className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-high px-2 py-1 text-[11px] font-medium"
                    >
                      {t.tier_name} ({t.sku_code}) &bull; {formatRupiah(t.price)}
                    </span>
                  ))}
                </div>
              )}

              {e.rejection_note && (
                <p className="mt-2 text-xs font-semibold text-rose-500">Alasan Penolakan: {e.rejection_note}</p>
              )}

              {(e.status === "pending" || e.approval_status === "pending_review") && (
                <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busyId === e.id}
                    onClick={() => reject(e.id)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <X size={14} /> Tolak Produk
                  </Button>
                  <Button
                    size="sm"
                    disabled={busyId === e.id}
                    onClick={() => approve(e.id)}
                    className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Check size={14} /> Setujui & Publish
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

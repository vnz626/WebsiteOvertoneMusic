import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check, Guitar, MapPin, X } from "lucide-react";
import api from "../../api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonGrid } from "../../components/ui/Skeleton";
import { errorMessage, formatRupiah } from "../../utils/format";

const FILTERS = [
  ["pending", "Menunggu Persetujuan"],
  ["approved", "Disetujui (Tayang)"],
  ["rejected", "Ditolak"],
  ["", "Semua Produk"],
];

export default function ProductApproval() {
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
      subtitle="Kurasi produk baru dari store staff sebelum dipublikasikan ke katalog e-commerce Overtone"
    >
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter status persetujuan produk">
        {FILTERS.map(([value, label]) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={status === value}
            onClick={() => setStatus(value)}
            className={`rounded-sm px-4 py-2 text-xs font-semibold transition-colors ${
              status === value
                ? "bg-ink text-canvas"
                : "bg-surface text-ink-secondary border border-line hover:border-line-strong hover:text-ink"
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
                    loading="lazy"
                    className="h-20 w-20 rounded-sm object-contain border border-line bg-surface-muted p-1 shrink-0"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-sm bg-surface-muted border border-line text-ink-muted shrink-0">
                    <Guitar size={28} aria-hidden="true" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] text-ink-muted tabular-nums">
                        {e.sku_prefix || "SKU"} &bull; {e.organizer || "Brand"}
                      </span>
                      <h2 className="font-display font-bold text-base text-ink leading-snug truncate">
                        {e.name}
                      </h2>
                      <p className="text-xs font-bold text-accent mt-0.5 tabular-nums">
                        {formatRupiah(e.price)} &bull; {e.category}
                      </p>
                    </div>
                    <Badge status={e.status} />
                  </div>
                  <p className="text-xs text-ink-muted flex items-center gap-1 mt-1">
                    <MapPin size={12} aria-hidden="true" /> {e.location || "Offline Store Overtone"} ({e.city || "Jakarta"})
                  </p>
                </div>
              </div>

              {e.specifications && (
                <div className="mt-3 rounded-sm bg-surface-muted border border-line p-3 text-xs text-ink-secondary">
                  <p className="font-bold text-ink mb-1">Spesifikasi Kayu &amp; Elektronik:</p>
                  <p className="whitespace-pre-line text-[11px] line-clamp-3">{e.specifications}</p>
                </div>
              )}

              {e.tiers && e.tiers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 tabular-nums">
                  {e.tiers.map((t) => (
                    <span
                      key={t.id}
                      className="rounded-xs border border-line bg-surface-muted px-2 py-1 text-[11px] font-medium text-ink"
                    >
                      {t.tier_name} ({t.sku_code}) &bull; {formatRupiah(t.price)}
                    </span>
                  ))}
                </div>
              )}

              {e.rejection_note && (
                <p className="mt-2 text-xs font-semibold text-status-danger">Alasan Penolakan: {e.rejection_note}</p>
              )}

              {(e.status === "pending" || e.approval_status === "pending_review") && (
                <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={busyId === e.id}
                    onClick={() => reject(e.id)}
                  >
                    <X size={14} aria-hidden="true" /> Tolak Produk
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={busyId === e.id}
                    onClick={() => approve(e.id)}
                  >
                    <Check size={14} aria-hidden="true" /> Setujui &amp; Publish
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

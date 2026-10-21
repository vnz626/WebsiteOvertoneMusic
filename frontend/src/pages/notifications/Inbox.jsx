import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonGrid } from "../../components/ui/Skeleton";
import { errorMessage } from "../../utils/format";

const CATEGORY_LABEL = {
  order_created: "Pesanan",
  payment_verified: "Pembayaran",
  payment_rejected: "Pembayaran",
  event_approved: "Event",
  event_rejected: "Event",
};

function timeAgo(iso) {
  if (!iso) return "";
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const hr = Math.floor(diffMin / 60);
  if (hr < 24) return `${hr} jam lalu`;
  return `${Math.floor(hr / 24)} hari lalu`;
}

/** Kotak masuk pesan/notifikasi di dalam dashboard. */
export default function NotificationsInbox() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/notifications")
      .then((res) => setItems(res.data.data || []))
      .catch((err) => toast.error(errorMessage(err, "Gagal memuat notifikasi")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function open(n) {
    if (!n.is_read) {
      await api.post(`/notifications/${n.id}/read`).catch(() => {});
      setItems((its) => its.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    if (n.link) navigate(n.link);
  }

  async function markAll() {
    await api.post("/notifications/read-all").catch(() => {});
    setItems((its) => its.map((x) => ({ ...x, is_read: true })));
    toast.success("Semua ditandai sudah dibaca");
  }

  return (
    <DashboardLayout
      title="Pesan & Notifikasi"
      subtitle="Riwayat pemberitahuan otomatis dari sistem Ticksy"
      actions={items.some((n) => !n.is_read) && <Button variant="ghost" onClick={markAll}>Tandai semua dibaca</Button>}
    >
      {loading ? (
        <SkeletonGrid count={4} />
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada pesan" description="Notifikasi tentang event dan pembayaranmu akan muncul di sini." />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card
              key={n.id}
              className={`cursor-pointer transition hover:border-brand-400 ${n.is_read ? "" : "border-brand-300"}`}
              onClick={() => open(n)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-ts-primary">
                    {CATEGORY_LABEL[n.category] || "Info"}
                  </span>
                  <p className="mt-1 font-semibold">{n.title}</p>
                  {n.body && <p className="mt-1 text-sm text-ts-muted">{n.body}</p>}
                </div>
                {!n.is_read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-ts-primary" />}
              </div>
              <p className="mt-2 text-xs text-slate-400">{timeAgo(n.created_at)}</p>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

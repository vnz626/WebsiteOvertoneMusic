import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Bell,
  Boxes,
  FileCheck,
  Headphones,
  Package,
  RotateCcw,
  ExternalLink,
  CheckCheck,
  Clock
} from "lucide-react";
import api from "../../api";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { errorMessage } from "../../utils/format";

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  return `${day} hari lalu`;
}

function getIconAndBadge(type, category) {
  const t = (type || category || "").toLowerCase();
  if (t.includes("stock") || t.includes("inventory")) {
    return {
      icon: <Boxes size={18} className="text-status-warning" aria-hidden="true" />,
      status: "warning",
      label: "Stok Gudang"
    };
  }
  if (t.includes("po") || t.includes("approval")) {
    return {
      icon: <FileCheck size={18} className="text-status-success" aria-hidden="true" />,
      status: "completed",
      label: "PO & Restock"
    };
  }
  if (t.includes("support") || t.includes("chat") || t.includes("ticket")) {
    return {
      icon: <Headphones size={18} className="text-status-info" aria-hidden="true" />,
      status: "info",
      label: "Live Concierge"
    };
  }
  if (t.includes("refund") || t.includes("retur")) {
    return {
      icon: <RotateCcw size={18} className="text-status-danger" aria-hidden="true" />,
      status: "danger",
      label: "Refund & Retur"
    };
  }
  if (t.includes("order")) {
    return {
      icon: <Package size={18} className="text-accent" aria-hidden="true" />,
      status: "info",
      label: "Pesanan Musik"
    };
  }
  return {
    icon: <Bell size={18} className="text-ink-muted" aria-hidden="true" />,
    status: "neutral",
    label: "Info Sistem"
  };
}

export default function NotificationsInbox() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  const loadNotifications = useCallback(() => {
    setLoading(true);
    let url = "/notifications?limit=60";
    if (activeTab === "unread") {
      url += "&unread_only=true";
    } else if (activeTab !== "all") {
      url += `&type=${activeTab}`;
    }

    api
      .get(url)
      .then((res) => setItems(res.data.data || []))
      .catch((err) => toast.error(errorMessage(err, "Gagal memuat notifikasi")))
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function handleOpen(n) {
    if (!n.is_read) {
      await api.post(`/notifications/${n.id}/read`).catch(() => {});
      setItems((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
      );
    }
    if (n.link) {
      navigate(n.link);
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.post("/notifications/read-all");
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      toast.success("Semua notifikasi ditandai sudah dibaca");
    } catch (err) {
      toast.error("Gagal menandai notifikasi");
    }
  }

  const unreadCount = items.filter((x) => !x.is_read).length;

  return (
    <div className="min-h-screen bg-canvas text-ink pb-16">
      {/* Header Banner */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent block mb-1">
                Notification Center
              </span>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                Pusat Pemberitahuan Sistem
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-ink-secondary">
                Pembaruan instan status pesanan, antrean approval PO, log inventaris kritis, dan live chat.
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleMarkAllRead}
              >
                <CheckCheck size={15} className="text-accent" aria-hidden="true" /> Tandai Semua Dibaca
              </Button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="mt-6 flex flex-wrap gap-1.5 border-t border-line pt-4" role="tablist" aria-label="Filter kategori notifikasi">
            {[
              { id: "all", label: "Semua Pemberitahuan" },
              { id: "unread", label: "Belum Dibaca" },
              { id: "stock_alert", label: "Stok Gudang" },
              { id: "po_approval", label: "Approval PO" },
              { id: "order_status", label: "Status Pesanan" },
              { id: "support_ticket", label: "Support & Chat" },
              { id: "refund", label: "Refund / Retur" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-sm px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "bg-ink text-canvas"
                    : "bg-surface-muted text-ink-secondary border border-line hover:border-line-strong hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content List */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {loading ? (
          <div className="space-y-3" role="status" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-surface rounded-md border border-line skeleton" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-md border border-dashed border-line-strong bg-surface p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-surface-muted border border-line text-ink-muted mb-3">
              <Bell size={22} aria-hidden="true" />
            </div>
            <h2 className="font-display text-base font-bold text-ink">Tidak Ada Notifikasi</h2>
            <p className="mt-1 text-xs text-ink-secondary max-w-md mx-auto">
              Saat ini tidak ada notifikasi dalam filter ini. Seluruh informasi operasional dan pesanan akan tercatat otomatis.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((n) => {
              const meta = getIconAndBadge(n.type, n.category);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleOpen(n)}
                  className={`w-full text-left group relative flex items-start gap-4 rounded-md border p-4 transition-colors ${
                    n.is_read
                      ? "border-line bg-surface hover:border-line-strong"
                      : "border-line-strong bg-surface-muted hover:border-ink"
                  }`}
                >
                  {/* Category Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-surface border border-line">
                    {meta.icon}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <Badge status={meta.status}>{meta.label}</Badge>
                        {!n.is_read && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent uppercase tracking-wider">
                            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" /> Baru
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-ink-muted tabular-nums">
                        <Clock size={12} aria-hidden="true" />
                        <span>{timeAgo(n.created_at)}</span>
                      </div>
                    </div>

                    <h2 className={`text-sm tracking-tight ${n.is_read ? "font-semibold text-ink" : "font-bold text-ink"}`}>
                      {n.title}
                    </h2>

                    {n.body && (
                      <p className="mt-1 text-xs text-ink-secondary leading-relaxed">
                        {n.body}
                      </p>
                    )}

                    {n.link && (
                      <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent group-hover:underline">
                        Buka Detail Terkait <ExternalLink size={12} aria-hidden="true" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

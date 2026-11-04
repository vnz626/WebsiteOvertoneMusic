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
  Clock,
  Sparkles
} from "lucide-react";
import api from "../../api";
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
      icon: <Boxes size={18} className="text-amber-500" aria-hidden="true" />,
      badgeCls: "bg-amber-500/10 text-amber-700 border-amber-500/30",
      label: "Stok Gudang"
    };
  }
  if (t.includes("po") || t.includes("approval")) {
    return {
      icon: <FileCheck size={18} className="text-emerald-500" aria-hidden="true" />,
      badgeCls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
      label: "PO & Restock"
    };
  }
  if (t.includes("support") || t.includes("chat") || t.includes("ticket")) {
    return {
      icon: <Headphones size={18} className="text-sky-500" aria-hidden="true" />,
      badgeCls: "bg-sky-500/10 text-sky-700 border-sky-500/30",
      label: "Live Concierge"
    };
  }
  if (t.includes("refund") || t.includes("retur")) {
    return {
      icon: <RotateCcw size={18} className="text-rose-500" aria-hidden="true" />,
      badgeCls: "bg-rose-500/10 text-rose-700 border-rose-500/30",
      label: "Refund & Retur"
    };
  }
  if (t.includes("order")) {
    return {
      icon: <Package size={18} className="text-[#E8622C]" aria-hidden="true" />,
      badgeCls: "bg-[#E8622C]/10 text-[#E8622C] border-[#E8622C]/30",
      label: "Pesanan Cinema Gear"
    };
  }
  return {
    icon: <Bell size={18} className="text-[#64748B]" aria-hidden="true" />,
    badgeCls: "bg-slate-100 text-[#64748B] border-slate-200",
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
    } catch {
      toast.error("Gagal menandai notifikasi");
    }
  }

  const unreadCount = items.filter((x) => !x.is_read).length;

  return (
    <div className="min-h-screen fp-home-canvas text-[#0F1B2D] pb-24">
      {/* Header Banner */}
      <div className="border-b border-[#0F1B2D]/10 bg-white/60 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="fp-section-pill mb-2">
                <Sparkles size={11} className="text-[#E8622C]" aria-hidden="true" />
                <span>Notification Center</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F1B2D]">
                Pusat Pemberitahuan Sistem
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[#475569]">
                Pembaruan instan status pesanan gear, konfirmasi pembayaran, dan layanan showroom.
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="fp-btn-glass-secondary !py-2 !px-4 !text-xs self-start sm:self-auto"
              >
                <CheckCheck size={14} className="text-[#E8622C]" aria-hidden="true" />
                <span>Tandai Semua Dibaca</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="mt-5 flex flex-wrap gap-1.5 border-t border-[#0F1B2D]/10 pt-3" role="tablist" aria-label="Filter kategori notifikasi">
            {[
              { id: "all", label: "Semua Pemberitahuan" },
              { id: "unread", label: "Belum Dibaca" },
              { id: "order_status", label: "Status Pesanan" },
              { id: "support_ticket", label: "Live Concierge" },
              { id: "stock_alert", label: "Stok Gudang" },
              { id: "po_approval", label: "Approval PO" },
              { id: "refund", label: "Refund / Retur" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-[#0F1B2D] text-white shadow-sm"
                    : "bg-white/70 text-[#475569] border border-white/80 hover:border-[#E8622C] hover:text-[#0F1B2D] hover:bg-white"
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
              <div key={i} className="h-24 bg-white/60 rounded-3xl border border-white skeleton" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="fp-glass-card !p-12 text-center max-w-md mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/80 border border-white text-[#64748B] mb-3 shadow-xs">
              <Bell size={24} aria-hidden="true" className="text-[#E8622C]" />
            </div>
            <h2 className="font-display text-base font-bold text-[#0F1B2D]">Tidak Ada Notifikasi</h2>
            <p className="mt-1 text-xs text-[#64748B] max-w-sm mx-auto leading-relaxed">
              Saat ini tidak ada notifikasi dalam filter ini. Seluruh informasi operasional dan pesanan akan tercatat otomatis.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((n) => {
              const meta = getIconAndBadge(n.type, n.category);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleOpen(n)}
                  className={`w-full text-left group relative flex items-start gap-4 rounded-3xl border p-4 sm:p-5 transition-all shadow-xs ${
                    n.is_read
                      ? "border-white/70 bg-white/70 hover:bg-white/90 hover:border-white"
                      : "border-[#E8622C]/30 bg-white/95 hover:border-[#E8622C] shadow-sm"
                  }`}
                >
                  {/* Category Icon */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 border border-white shadow-xs">
                    {meta.icon}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.badgeCls}`}>
                          {meta.label}
                        </span>
                        {!n.is_read && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E8622C] uppercase tracking-wider">
                            <span className="h-2 w-2 rounded-full bg-[#E8622C]" aria-hidden="true" /> Baru
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#64748B] tabular-nums">
                        <Clock size={12} aria-hidden="true" />
                        <span>{timeAgo(n.created_at)}</span>
                      </div>
                    </div>

                    <h2 className={`text-sm tracking-tight ${n.is_read ? "font-semibold text-[#0F1B2D]" : "font-bold text-[#0F1B2D]"}`}>
                      {n.title}
                    </h2>

                    {n.body && (
                      <p className="mt-1 text-xs text-[#475569] leading-relaxed">
                        {n.body}
                      </p>
                    )}

                    {n.link && (
                      <div className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-[#E8622C] group-hover:underline">
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

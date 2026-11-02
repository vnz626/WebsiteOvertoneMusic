import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Bell,
  Boxes,
  FileCheck,
  Headphones,
  Package,
  RotateCcw,
  ChevronRight,
  Info,
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../auth/AuthContext";

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Baru saja";
  if (min < 60) return `${min}m lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}j lalu`;
  return `${Math.floor(hr / 24)}h lalu`;
}

function getNotificationIcon(type, category) {
  const t = (type || category || "").toLowerCase();
  if (t.includes("stock") || t.includes("inventory")) {
    return <Boxes size={15} className="text-status-warning-text" aria-hidden="true" />;
  }
  if (t.includes("po") || t.includes("approval")) {
    return <FileCheck size={15} className="text-status-success-text" aria-hidden="true" />;
  }
  if (t.includes("support") || t.includes("chat") || t.includes("ticket")) {
    return <Headphones size={15} className="text-status-info-text" aria-hidden="true" />;
  }
  if (t.includes("refund") || t.includes("retur")) {
    return <RotateCcw size={15} className="text-status-danger-text" aria-hidden="true" />;
  }
  if (t.includes("order")) {
    return <Package size={15} className="text-accent" aria-hidden="true" />;
  }
  return <Info size={15} className="text-ink-muted" aria-hidden="true" />;
}

/** Lonceng Notifikasi Universal (Internal OAS & Public Customer) */
export default function NotificationBell() {
  const { isAuthenticated, user, role } = useAuth();
  const isStaff = Boolean(user?.is_staff) || (role && role !== "user" && role !== "customer");
  const fullHistoryPath = isStaff ? "/internal/notifications" : "/notifications";

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchUnread = () => {
      api
        .get("/notifications/unread-count")
        .then((r) => setUnread(r.data.unread || 0))
        .catch(() => {});
    };
    fetchUnread();
    const intervalId = setInterval(fetchUnread, 30000);
    return () => clearInterval(intervalId);
  }, [isAuthenticated]);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function toggle() {
    const nextState = !open;
    setOpen(nextState);
    if (nextState) {
      setLoading(true);
      api
        .get("/notifications?limit=10")
        .then((r) => {
          setItems(r.data.data || []);
          setUnread(r.data.unread || 0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }

  async function handleOpenItem(n) {
    if (!n.is_read) {
      api.post(`/notifications/${n.id}/read`).catch(() => {});
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
      );
    }
    setOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  }

  async function handleMarkAllRead() {
    await api.post("/notifications/read-all").catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  }

  if (!isAuthenticated) return null;

  return (
    <div className="relative inline-block text-left" ref={boxRef}>
      <button
        onClick={toggle}
        type="button"
        aria-label={unread > 0 ? `Pusat Notifikasi (${unread} belum dibaca)` : "Pusat Notifikasi"}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-sm border border-line bg-surface text-ink-secondary hover:border-line-strong hover:bg-surface-muted hover:text-ink transition-colors duration-fast"
      >
        <Bell size={17} aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-live="polite"
            className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-xs bg-accent px-1 text-[10px] font-bold text-accent-on tabular-nums"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Daftar notifikasi"
          className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-md border border-line-strong bg-surface p-0 shadow-lg overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-line bg-surface-muted px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-ink">
                Notifikasi
              </span>
              {unread > 0 && (
                <span className="rounded-xs bg-accent-subtle border border-accent/30 px-2 py-0.5 text-[10px] font-bold text-accent tabular-nums">
                  {unread} Baru
                </span>
              )}
            </div>
            {items.some((n) => !n.is_read) && (
              <button
                onClick={handleMarkAllRead}
                type="button"
                className="text-[11px] font-bold text-accent hover:underline"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-line">
            {loading ? (
              <div className="space-y-3 p-4" role="status" aria-busy="true">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-7 w-7 rounded-sm skeleton shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 skeleton" />
                      <div className="h-2.5 w-full skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-sm bg-surface-muted text-ink-muted mb-2">
                  <Bell size={18} aria-hidden="true" />
                </div>
                <p className="text-xs font-bold text-ink">Belum ada notifikasi baru</p>
                <p className="text-[11px] text-ink-secondary mt-0.5">
                  Pembaruan status pesanan dan operasional akan tampil di sini.
                </p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleOpenItem(n)}
                  type="button"
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-fast hover:bg-surface-muted ${
                    n.is_read ? "bg-surface" : "bg-accent-subtle/40"
                  }`}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-surface border border-line">
                    {getNotificationIcon(n.type, n.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate ${
                          n.is_read ? "font-medium text-ink-secondary" : "font-bold text-ink"
                        }`}
                      >
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-ink-muted tabular-nums">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    {n.body && (
                      <p className="mt-0.5 text-[11px] text-ink-secondary line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                    )}
                  </div>
                  {!n.is_read && (
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent"
                      aria-label="Belum dibaca"
                    />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-line bg-surface-muted p-2.5 text-center">
            <Link
              to={fullHistoryPath}
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-ink hover:text-accent transition-colors duration-fast py-0.5"
            >
              <span>Lihat Riwayat Lengkap</span>
              <ChevronRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

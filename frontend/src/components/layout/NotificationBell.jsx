import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import api from "../../api";
import { useAuth } from "../../auth/AuthContext";

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  return `${Math.floor(hr / 24)} hari lalu`;
}

/** Lonceng notifikasi in-dashboard (fitur #5 + "message dalam dashboard"). */
export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    const poll = () => api.get("/notifications/unread-count").then((r) => setUnread(r.data.unread)).catch(() => {});
    poll();
    const id = setInterval(poll, 30000); // polling sederhana tiap 30 detik
    return () => clearInterval(id);
  }, [isAuthenticated]);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      api.get("/notifications").then((r) => {
        setItems(r.data.data || []);
        setUnread(r.data.unread || 0);
      }).catch(() => {});
    }
  }

  async function openItem(n) {
    if (!n.is_read) {
      api.post(`/notifications/${n.id}/read`).catch(() => {});
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function markAllRead() {
    await api.post("/notifications/read-all").catch(() => {});
    setItems((its) => its.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  }

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={toggle}
        aria-label="Notifikasi"
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-semibold">Notifikasi</p>
            {items.some((n) => !n.is_read) && (
              <button onClick={markAllRead} className="text-xs font-medium text-brand-600">
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-400">Belum ada notifikasi</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 ${
                    n.is_read ? "" : "bg-brand-50 dark:bg-slate-700/60"
                  }`}
                >
                  <p className="font-medium">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

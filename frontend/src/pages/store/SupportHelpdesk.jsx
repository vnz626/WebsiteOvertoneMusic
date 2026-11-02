import { useEffect, useState, useRef } from "react";
import {
  Headphones,
  MessageSquare,
  RefreshCw,
  Send,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Package,
  Check,
  Loader2,
} from "lucide-react";
import api from "../../api";
import { formatDate } from "../../utils/format";
import toast from "react-hot-toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function StoreSupportHelpdesk() {
  const confirm = useConfirm();
  // 3 Filter Tabs: 'waiting' | 'live' | 'resolved'
  const [activeTab, setActiveTab] = useState("waiting");

  // Sessions Data
  const [kpis, setKpis] = useState({
    waiting_count: 0,
    live_count: 0,
    resolved_count: 0,
    total_count: 0,
  });
  const [waitingList, setWaitingList] = useState([]);
  const [liveList, setLiveList] = useState([]);
  const [resolvedList, setResolvedList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  // Chat Room Messages
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Customer Orders Info
  const [customerOrders, setCustomerOrders] = useState([]);

  const messagesEndRef = useRef(null);

  // Load Sessions
  function loadSessions(silent = false) {
    if (!silent) setLoading(true);
    api
      .get("/support/staff/sessions")
      .then((res) => {
        const d = res?.data || {};
        setKpis(d.kpis || { waiting_count: 0, live_count: 0, resolved_count: 0 });
        setWaitingList(d.waiting_agent || []);
        setLiveList(d.live_chat || []);
        setResolvedList(d.resolved || []);

        // Sinkronisasi session yang sedang dibuka jika ada update status
        if (selectedSession) {
          const all = [...(d.waiting_agent || []), ...(d.live_chat || []), ...(d.resolved || [])];
          const updated = all.find((s) => s.id === selectedSession.id);
          if (updated) setSelectedSession(updated);
        }
      })
      .catch((err) => console.error("Error loading staff sessions:", err))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }

  // Load Messages for Selected Session
  function loadSessionMessages(ticketId, silent = false) {
    if (!silent) setLoadingMessages(true);
    api
      .get(`/support/chat/${ticketId}`)
      .then((res) => {
        setMessages(res?.data?.messages || []);
      })
      .catch((err) => console.error("Error loading chat messages:", err))
      .finally(() => {
        if (!silent) setLoadingMessages(false);
      });
  }

  // Load Recent Orders if session has customer_id
  function loadCustomerOrders(customerId) {
    if (!customerId) {
      setCustomerOrders([]);
      return;
    }
    // Fetch customer's orders
    api
      .get(`/support/quick-tracker?customer_id=${customerId}`)
      .catch(() => {})
      .then((res) => {
        setCustomerOrders(res?.data?.orders || []);
      });
  }

  useEffect(() => {
    loadSessions();
  }, []);

  // Polling every 3 seconds for live queues and new incoming messages
  useEffect(() => {
    const interval = setInterval(() => {
      loadSessions(true);
      if (selectedSession?.id) {
        loadSessionMessages(selectedSession.id, true);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedSession?.id]);

  useEffect(() => {
    if (selectedSession?.id) {
      loadSessionMessages(selectedSession.id);
      loadCustomerOrders(selectedSession.customer_id);
    } else {
      setMessages([]);
      setCustomerOrders([]);
    }
  }, [selectedSession?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Accept Live Agent
  function handleAcceptSession(session) {
    setActionLoading(true);
    api
      .post(`/support/staff/sessions/${session.id}/accept`)
      .then((res) => {
        setFeedbackMsg(`Sesi #${session.ticket_number} berhasil diterima! Live Chat aktif.`);
        setSelectedSession((prev) => ({
          ...(prev || session),
          status: "live_chat",
          assigned_staff_name: res.data?.assigned_staff?.name,
        }));
        setActiveTab("live");
        loadSessions(true);
        loadSessionMessages(session.id, true);
        setTimeout(() => setFeedbackMsg(""), 4000);
      })
      .catch((err) => toast.error(err.response?.data?.message || "Gagal menerima sesi live chat"))
      .finally(() => setActionLoading(false));
  }

  // Handle Resolve Session
  async function handleResolveSession(session) {
    const ok = await confirm({
      title: "Selesaikan Sesi Live Chat",
      message: `Tandai sesi #${session.ticket_number} sebagai selesai?`,
      confirmLabel: "Selesaikan Sesi",
      danger: false,
    });
    if (!ok) return;
    setActionLoading(true);
    api
      .post(`/support/staff/sessions/${session.id}/resolve`)
      .then(() => {
        setFeedbackMsg(`Sesi #${session.ticket_number} ditandai selesai.`);
        setSelectedSession((prev) => ({ ...prev, status: "resolved" }));
        loadSessions(true);
        loadSessionMessages(session.id, true);
        setTimeout(() => setFeedbackMsg(""), 3500);
      })
      .catch((err) => toast.error(err.response?.data?.message || "Gagal menyelesaikan sesi"))
      .finally(() => setActionLoading(false));
  }

  // Handle Send Staff Reply
  function handleSendReply(e) {
    e.preventDefault();
    if (!selectedSession || !replyText.trim()) return;

    setSubmitting(true);
    api
      .post("/support/messages", {
        ticket_id: selectedSession.id,
        message: replyText.trim(),
      })
      .then((res) => {
        setReplyText("");
        const newMsg = res?.data?.message;
        if (newMsg) {
          setMessages((prev) => [...prev, newMsg]);
        }
        loadSessionMessages(selectedSession.id, true);
        loadSessions(true);
      })
      .catch((err) => toast.error(err.response?.data?.message || "Gagal mengirim balasan"))
      .finally(() => setSubmitting(false));
  }

  // Filter current list based on active tab
  const currentList =
    activeTab === "waiting"
      ? waitingList
      : activeTab === "live"
      ? liveList
      : resolvedList;

  return (
    <div className="min-h-screen bg-canvas p-5 md:p-8 font-sans text-ink">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Top Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-ink text-canvas">
                <Headphones size={18} aria-hidden="true" />
              </span>
              <h1 className="font-display text-2xl font-bold text-ink tracking-tight">
                Live Chat Console &amp; Helpdesk Showroom
              </h1>
            </div>
            <p className="mt-1 text-xs text-ink-secondary">
              Workspace interaksi 2-arah staf showroom dengan pelanggan Overtone (Handover Bot &rarr; Waiting Queue &rarr; Private Live Chat).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => loadSessions(false)}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} aria-hidden="true" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* 1. NOTIFIKASI ANTREAN BARU (Incoming Live Agent Request Banner) */}
        {kpis.waiting_count > 0 && (
          <div className="rounded-md border border-status-danger/40 bg-status-danger/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-status-danger/15 text-status-danger shrink-0">
                <AlertTriangle size={20} aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-sm font-bold text-ink">
                    Antrean Live Agent Masuk
                  </h3>
                  <Badge variant="rose">{kpis.waiting_count} Menunggu Konfirmasi</Badge>
                </div>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Terdapat filmmaker / pelanggan yang baru saja meminta bantuan staf showroom. Segera klik &quot;Terima Chat&quot; untuk memulai sesi.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setActiveTab("waiting")}
              className="shrink-0"
            >
              Lihat Antrean ({kpis.waiting_count})
            </Button>
          </div>
        )}

        {/* 2-PANE LIVE CHAT WORKSPACE */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* SIDEBAR KIRI: Daftar Percakapan dengan 3 Tab Filter (Col-Span 4) */}
          <div className="lg:col-span-4 space-y-3">
            {/* 3 Tabs Filter */}
            <div className="grid grid-cols-3 gap-1 rounded-sm border border-line bg-surface-muted p-1 text-xs font-bold tabular-nums">
              <button
                type="button"
                onClick={() => setActiveTab("waiting")}
                className={`flex items-center justify-center gap-1.5 rounded-xs py-2 px-1 text-center transition-colors ${
                  activeTab === "waiting"
                    ? "bg-surface text-accent border border-line"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                <span>Antrean</span>
                {kpis.waiting_count > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-xs bg-status-danger px-1 text-[9px] font-bold text-white">
                    {kpis.waiting_count}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("live")}
                className={`flex items-center justify-center gap-1.5 rounded-xs py-2 px-1 text-center transition-colors ${
                  activeTab === "live"
                    ? "bg-surface text-status-success border border-line"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                <span>Live Chat</span>
                {kpis.live_count > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-xs bg-status-success px-1 text-[9px] font-bold text-white">
                    {kpis.live_count}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("resolved")}
                className={`flex items-center justify-center gap-1 rounded-xs py-2 px-1 text-center transition-colors ${
                  activeTab === "resolved"
                    ? "bg-surface text-ink border border-line"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                <span>Selesai</span>
                <span className="text-[10px] text-ink-muted">({kpis.resolved_count})</span>
              </button>
            </div>

            {/* List Percakapan */}
            <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
              {loading ? (
                <div className="p-8 text-center text-xs text-ink-muted">
                  <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-ink-muted" aria-hidden="true" />
                  Memuat data percakapan...
                </div>
              ) : currentList.length === 0 ? (
                <div className="rounded-md border border-dashed border-line-strong bg-surface p-8 text-center text-xs text-ink-muted">
                  Tidak ada sesi chat pada tab {activeTab}.
                </div>
              ) : (
                currentList.map((s) => {
                  const isSelected = selectedSession?.id === s.id;
                  const isWaiting = s.status === "waiting_agent";
                  const isLive = s.status === "live_chat";

                  return (
                    <article
                      key={s.id}
                      className={`rounded-md border p-4 transition-colors ${
                        isSelected
                          ? "border-ink bg-surface-muted/60"
                          : "border-line bg-surface hover:border-line-strong"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSession(s)}
                        className="w-full text-left focus:outline-none"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold text-ink-muted tabular-nums">
                            {s.ticket_number}
                          </span>

                          {isWaiting ? (
                            <Badge variant="rose">
                              <Clock size={10} className="mr-1 inline" aria-hidden="true" />
                              {s.wait_label}
                            </Badge>
                          ) : isLive ? (
                            <Badge variant="teal">Live Active</Badge>
                          ) : (
                            <Badge variant="neutral">{s.status}</Badge>
                          )}
                        </div>

                        <h4 className="mt-1.5 font-display font-bold text-xs text-ink line-clamp-1">
                          {s.customer_name}
                        </h4>

                        <p className="mt-1 text-[11px] text-ink-secondary line-clamp-2">
                          {s.latest_message}
                        </p>
                      </button>

                      <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-[10px] tabular-nums">
                        <span className="text-ink-muted flex items-center gap-1">
                          <MessageSquare size={10} aria-hidden="true" /> {s.messages_count} pesan
                        </span>

                        {isWaiting ? (
                          <Button
                            type="button"
                            variant="danger"
                            size="xs"
                            onClick={() => handleAcceptSession(s)}
                            disabled={actionLoading}
                          >
                            Terima Chat
                          </Button>
                        ) : isLive ? (
                          <span className="text-status-success font-bold flex items-center gap-1">
                            <ShieldCheck size={11} aria-hidden="true" /> {s.assigned_staff_name || "Staf Toko"}
                          </span>
                        ) : (
                          <span className="text-ink-muted">{formatDate(s.updated_at || s.created_at)}</span>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          {/* PANEL KANAN: Ruang Private Chat Room Staff (Col-Span 8) */}
          <div className="lg:col-span-8">
            {selectedSession ? (
              <div className="rounded-md border border-line bg-surface overflow-hidden flex flex-col h-[740px]">
                {/* Header Chat Room */}
                <div className="border-b border-line bg-surface-muted p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-ink text-canvas font-bold">
                      <User size={18} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-accent tabular-nums">
                          {selectedSession.ticket_number}
                        </span>
                        <span className="text-ink-muted">&bull;</span>
                        <span className="font-display font-bold text-xs text-ink">
                          {selectedSession.customer_name}
                        </span>
                        {selectedSession.customer_email && (
                          <span className="text-[11px] text-ink-muted hidden sm:inline">
                            ({selectedSession.customer_email})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-ink-secondary mt-0.5">
                        <span className="capitalize">Kategori: {selectedSession.category || "Concierge"}</span>
                        <span>&bull;</span>
                        <span>
                          Status:{" "}
                          <strong
                            className={
                              selectedSession.status === "waiting_agent"
                                ? "text-status-danger"
                                : selectedSession.status === "live_chat"
                                ? "text-status-success"
                                : "text-ink-muted"
                            }
                          >
                            {selectedSession.status}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Header */}
                  <div className="flex items-center gap-2">
                    {selectedSession.status === "waiting_agent" && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleAcceptSession(selectedSession)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Check size={14} aria-hidden="true" />
                        )}
                        <span>Konfirmasi &amp; Terima Chat</span>
                      </Button>
                    )}

                    {selectedSession.status === "live_chat" && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleResolveSession(selectedSession)}
                        disabled={actionLoading}
                      >
                        <CheckCircle2 size={14} className="text-status-success" aria-hidden="true" />
                        <span>Tandai Selesai (Resolve)</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Feedback Banner */}
                {feedbackMsg && (
                  <div className="bg-status-success/10 px-4 py-2 text-xs font-bold text-status-success border-b border-status-success/20 flex items-center gap-2">
                    <CheckCircle2 size={14} aria-hidden="true" /> {feedbackMsg}
                  </div>
                )}

                {/* Customer Short Profile Ribbon (TPS Order Sync) */}
                {selectedSession.customer_id && (
                  <div className="bg-canvas px-4 py-2 text-[11px] border-b border-line flex items-center justify-between">
                    <span className="text-ink-secondary">
                      Akun Terdaftar: <strong className="text-ink">{selectedSession.customer_name}</strong>
                    </span>
                    <span className="text-accent font-semibold flex items-center gap-1">
                      <Package size={12} aria-hidden="true" /> TPS Order Sync Aktif
                    </span>
                  </div>
                )}

                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-canvas">
                  {loadingMessages ? (
                    <div className="flex h-full items-center justify-center text-xs text-ink-muted">
                      <RefreshCw size={16} className="animate-spin mr-2" aria-hidden="true" /> Memuat percakapan...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center p-8 text-xs text-ink-muted">
                      <MessageSquare size={32} className="text-ink-muted/50 mb-2" aria-hidden="true" />
                      Belum ada pesan dalam sesi ini.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isStaff = m.sender_type === "staff";
                      const isSystem = m.sender_type === "system";
                      const isBot = m.sender_type === "bot";

                      if (isSystem) {
                        return (
                          <div key={m.id} className="mx-auto my-1.5 max-w-[85%] text-center">
                            <span className="inline-block rounded-xs border border-line bg-surface-muted px-3 py-1 text-[10px] font-semibold text-ink-secondary">
                              {m.message}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-ink-muted tabular-nums">
                            {isStaff ? (
                              <>
                                <span className="font-bold text-accent flex items-center gap-1">
                                  <ShieldCheck size={11} aria-hidden="true" /> {m.sender_name}
                                </span>
                                <span>&bull;</span>
                                <span>{m.created_at ? formatDate(m.created_at) : ""}</span>
                              </>
                            ) : isBot ? (
                              <>
                                <span className="font-bold text-ink-secondary flex items-center gap-1">
                                  <Sparkles size={11} className="text-accent" aria-hidden="true" /> Auto-KMS Bot
                                </span>
                                <span>&bull;</span>
                                <span>{m.created_at ? formatDate(m.created_at) : ""}</span>
                              </>
                            ) : (
                              <>
                                <span className="font-bold text-ink flex items-center gap-1">
                                  <User size={11} aria-hidden="true" /> {m.sender_name}
                                </span>
                                <span>&bull;</span>
                                <span>{m.created_at ? formatDate(m.created_at) : ""}</span>
                              </>
                            )}
                          </div>

                          <div
                            className={`max-w-[78%] rounded-md p-3.5 text-xs leading-relaxed ${
                              isStaff
                                ? "bg-ink text-canvas"
                                : isBot
                                ? "bg-surface-muted border border-line-strong text-ink"
                                : "bg-surface border border-line text-ink"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.message}</p>
                            {m.attachment_url && (
                              <div className="mt-2.5">
                                <a
                                  href={m.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block overflow-hidden rounded-sm border border-line"
                                >
                                  <img
                                    src={m.attachment_url}
                                    alt="Lampiran"
                                    className="max-h-48 rounded-xs object-cover"
                                  />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Bottom Action Area: Acceptance Callout or Reply Form */}
                <div className="border-t border-line bg-surface p-4">
                  {selectedSession.status === "waiting_agent" ? (
                    <div className="rounded-sm bg-accent-soft border border-accent/20 p-4 text-center space-y-2.5">
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-ink">
                        <Headphones size={16} className="text-accent" aria-hidden="true" />
                        <span>Filmmaker sedang menunggu konfirmasi staf toko di widget!</span>
                      </div>
                      <p className="text-xs text-ink-secondary max-w-md mx-auto">
                        Klik tombol di bawah untuk menyetujui sesi private live chat. Begitu diklik, widget pelanggan akan langsung terhubung secara real-time.
                      </p>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handleAcceptSession(selectedSession)}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Check size={14} aria-hidden="true" />
                        )}
                        <span>Konfirmasi &amp; Mulai Live Chat</span>
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSendReply} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Ketik balasan live ke widget pelanggan..."
                        disabled={submitting}
                        className="ot-input flex-1 px-4 py-2.5 text-xs"
                      />

                      <Button
                        type="submit"
                        variant="primary"
                        disabled={submitting || !replyText.trim()}
                        className="shrink-0"
                      >
                        {submitting ? (
                          <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Send size={13} aria-hidden="true" />
                        )}
                        <span>Kirim Balasan</span>
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-[740px] flex-col items-center justify-center rounded-md border border-dashed border-line-strong bg-surface p-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-surface-muted text-ink mb-3 border border-line">
                  <Headphones size={22} aria-hidden="true" />
                </div>
                <h3 className="font-display text-base font-bold text-ink">
                  Pilih Percakapan Pelanggan
                </h3>
                <p className="mt-1 max-w-sm text-xs text-ink-secondary">
                  Pilih sesi di sebelah kiri untuk melihat riwayat tanya-jawab, menerima antrean Live Agent, atau membalas chat pelanggan secara real-time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

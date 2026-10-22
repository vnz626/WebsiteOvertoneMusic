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
  Store,
  Truck,
  Check,
  UserCheck,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
} from "lucide-react";
import api from "../../api";
import { formatDate, formatRupiah } from "../../utils/format";

export default function StoreSupportHelpdesk() {
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
      .catch((err) => alert(err.response?.data?.message || "Gagal menerima sesi live chat"))
      .finally(() => setActionLoading(false));
  }

  // Handle Resolve Session
  function handleResolveSession(session) {
    if (!window.confirm(`Tandai sesi #${session.ticket_number} sebagai selesai?`)) return;
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
      .catch((err) => alert(err.response?.data?.message || "Gagal menyelesaikan sesi"))
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
      .catch((err) => alert(err.response?.data?.message || "Gagal mengirim balasan"))
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
    <div className="min-h-screen bg-[#FDFBF7] p-5 md:p-8 font-sans">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Top Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
                <Headphones size={20} />
              </span>
              <h1 className="font-jakarta text-2xl font-black text-gray-900 tracking-tight">
                Live Chat Console &amp; Helpdesk Showroom
              </h1>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Workspace interaksi 2-arah staf showroom dengan pelanggan Overtone (Handover Bot → Waiting Queue → Private Live Chat).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadSessions(false)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* 1. NOTIFIKASI ANTREAN BARU (Incoming Live Agent Request Banner) */}
        {kpis.waiting_count > 0 && (
          <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 via-amber-50 to-white p-4 shadow-sm flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 animate-pulse">
                <AlertTriangle size={20} />
              </span>
              <div>
                <h3 className="font-jakarta text-sm font-extrabold text-red-950 flex items-center gap-2">
                  <span>Antrean Live Agent Masuk</span>
                  <span className="rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                    {kpis.waiting_count} Menunggu Konfirmasi
                  </span>
                </h3>
                <p className="text-xs text-red-800/90 mt-0.5">
                  Terdapat musisi yang baru saja meminta bantuan staf showroom. Segera klik &quot;Terima Chat&quot; untuk memulai sesi.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("waiting")}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition shrink-0"
            >
              Lihat Antrean ({kpis.waiting_count})
            </button>
          </div>
        )}

        {/* 2-PANE LIVE CHAT WORKSPACE */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* SIDEBAR KIRI: Daftar Percakapan dengan 3 Tab Filter (Col-Span 4) */}
          <div className="lg:col-span-4 space-y-3">
            {/* 3 Tabs Filter */}
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-gray-100 p-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("waiting")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-center transition ${
                  activeTab === "waiting"
                    ? "bg-white text-red-700 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <span>Antrean</span>
                {kpis.waiting_count > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-black text-white">
                    {kpis.waiting_count}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("live")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-center transition ${
                  activeTab === "live"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <span>Live Chat</span>
                {kpis.live_count > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-black text-white">
                    {kpis.live_count}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("resolved")}
                className={`flex items-center justify-center gap-1 rounded-xl py-2 px-1 text-center transition ${
                  activeTab === "resolved"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <span>Selesai</span>
                <span className="text-[10px] text-gray-400">({kpis.resolved_count})</span>
              </button>
            </div>

            {/* List Percakapan */}
            <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {loading ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-gray-300" />
                  Memuat data percakapan...
                </div>
              ) : currentList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-xs text-gray-400">
                  Tidak ada sesi chat pada tab {activeTab}.
                </div>
              ) : (
                currentList.map((s) => {
                  const isSelected = selectedSession?.id === s.id;
                  const isWaiting = s.status === "waiting_agent";
                  const isLive = s.status === "live_chat";

                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSession(s)}
                      className={`cursor-pointer rounded-2xl border p-4 transition text-left ${
                        isSelected
                          ? "border-amber-600 bg-amber-50/50 shadow-sm ring-1 ring-amber-600/30"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-gray-400">
                          {s.ticket_number}
                        </span>

                        {isWaiting ? (
                          <span className="flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-red-700 animate-pulse">
                            <Clock size={10} /> {s.wait_label}
                          </span>
                        ) : isLive ? (
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                            Live Active
                          </span>
                        ) : (
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500">
                            {s.status}
                          </span>
                        )}
                      </div>

                      <h4 className="mt-1 font-bold text-xs text-gray-900 line-clamp-1">
                        {s.customer_name}
                      </h4>

                      <p className="mt-1 text-[11px] text-gray-500 line-clamp-2">
                        {s.latest_message}
                      </p>

                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-[10px]">
                        <span className="text-gray-400 flex items-center gap-1">
                          <MessageSquare size={10} /> {s.messages_count} pesan
                        </span>

                        {isWaiting ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptSession(s);
                            }}
                            disabled={actionLoading}
                            className="rounded-lg bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs hover:bg-red-700 transition"
                          >
                            Terima Chat
                          </button>
                        ) : isLive ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <ShieldCheck size={11} /> {s.assigned_staff_name || "Staf Toko"}
                          </span>
                        ) : (
                          <span className="text-gray-400">{formatDate(s.updated_at || s.created_at)}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* PANEL KANAN: Ruang Private Chat Room Staff (Col-Span 8) */}
          <div className="lg:col-span-8">
            {selectedSession ? (
              <div className="rounded-3xl border border-gray-200 bg-white shadow-xs overflow-hidden flex flex-col h-[740px]">
                {/* Header Chat Room */}
                <div className="border-b border-gray-100 bg-[#FAF9F5] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 font-bold">
                      <User size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-700">
                          {selectedSession.ticket_number}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="font-bold text-xs text-gray-900">
                          {selectedSession.customer_name}
                        </span>
                        {selectedSession.customer_email && (
                          <span className="text-[11px] text-gray-400 hidden sm:inline">
                            ({selectedSession.customer_email})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                        <span className="capitalize">Kategori: {selectedSession.category || "Concierge"}</span>
                        <span>•</span>
                        <span>
                          Status:{" "}
                          <strong
                            className={
                              selectedSession.status === "waiting_agent"
                                ? "text-red-600"
                                : selectedSession.status === "live_chat"
                                ? "text-emerald-600"
                                : "text-gray-500"
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
                      <button
                        type="button"
                        onClick={() => handleAcceptSession(selectedSession)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition"
                      >
                        {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                        Konfirmasi &amp; Terima Chat
                      </button>
                    )}

                    {selectedSession.status === "live_chat" && (
                      <button
                        type="button"
                        onClick={() => handleResolveSession(selectedSession)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-xs"
                      >
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        Tandai Selesai (Resolve)
                      </button>
                    )}
                  </div>
                </div>

                {/* Feedback Banner */}
                {feedbackMsg && (
                  <div className="bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 border-b border-emerald-100 flex items-center gap-2">
                    <CheckCircle2 size={14} /> {feedbackMsg}
                  </div>
                )}

                {/* Customer Short Profile Ribbon (TPS Order Sync) */}
                {selectedSession.customer_id && (
                  <div className="bg-[#F8F7F2] px-4 py-2 text-[11px] border-b border-gray-100 flex items-center justify-between">
                    <span className="text-gray-500">
                      Akun Terdaftar: <strong className="text-gray-800">{selectedSession.customer_name}</strong>
                    </span>
                    <span className="text-amber-800 font-semibold flex items-center gap-1">
                      <Package size={12} /> TPS Order Sync Aktif
                    </span>
                  </div>
                )}

                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FCFBF8] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {loadingMessages ? (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">
                      <RefreshCw size={16} className="animate-spin mr-2" /> Memuat percakapan...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center p-8 text-xs text-gray-400">
                      <MessageSquare size={32} className="text-gray-300 mb-2" />
                      Belum ada pesan dalam sesi ini.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isStaff = m.sender_type === "staff";
                      const isSystem = m.sender_type === "system";
                      const isBot = m.sender_type === "bot";
                      const isCustomer = m.sender_type === "customer";

                      if (isSystem) {
                        return (
                          <div key={m.id} className="mx-auto my-1.5 max-w-[85%] text-center">
                            <span className="inline-block rounded-full bg-gray-200/80 px-3 py-1 text-[10px] font-semibold text-gray-700">
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
                          <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-gray-400">
                            {isStaff ? (
                              <>
                                <span className="font-bold text-amber-700 flex items-center gap-1">
                                  <ShieldCheck size={11} /> {m.sender_name}
                                </span>
                                <span>•</span>
                                <span>{m.created_at ? formatDate(m.created_at) : ""}</span>
                              </>
                            ) : isBot ? (
                              <>
                                <span className="font-bold text-gray-500 flex items-center gap-1">
                                  <Sparkles size={11} className="text-amber-500" /> Auto-KMS Bot
                                </span>
                                <span>•</span>
                                <span>{m.created_at ? formatDate(m.created_at) : ""}</span>
                              </>
                            ) : (
                              <>
                                <span className="font-bold text-gray-700 flex items-center gap-1">
                                  <User size={11} /> {m.sender_name}
                                </span>
                                <span>•</span>
                                <span>{m.created_at ? formatDate(m.created_at) : ""}</span>
                              </>
                            )}
                          </div>

                          <div
                            className={`max-w-[78%] rounded-2xl p-3.5 text-xs shadow-xs leading-relaxed ${
                              isStaff
                                ? "bg-[#111827] text-white rounded-tr-xs"
                                : isBot
                                ? "bg-amber-50 border border-amber-200 text-amber-950 rounded-tl-xs"
                                : "bg-white border border-gray-200 text-gray-900 rounded-tl-xs"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.message}</p>
                            {m.attachment_url && (
                              <div className="mt-2.5">
                                <a
                                  href={m.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block overflow-hidden rounded-xl border border-white/20"
                                >
                                  <img
                                    src={m.attachment_url}
                                    alt="Lampiran"
                                    className="max-h-48 rounded-lg object-cover hover:scale-105 transition"
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
                <div className="border-t border-gray-200 bg-white p-4">
                  {selectedSession.status === "waiting_agent" ? (
                    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center space-y-2.5">
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-900">
                        <Headphones size={16} className="text-amber-700" />
                        Musisi sedang menunggu konfirmasi staf toko di widget!
                      </div>
                      <p className="text-[11px] text-amber-800/90 max-w-md mx-auto">
                        Klik tombol di bawah untuk menyetujui sesi private live chat. Begitu diklik, widget pelanggan akan langsung terhubung secara real-time.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleAcceptSession(selectedSession)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-6 py-2.5 text-xs font-bold text-amber-200 shadow-md hover:bg-black transition"
                      >
                        {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Konfirmasi &amp; Mulai Live Chat
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSendReply} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Ketik balasan live ke widget pelanggan..."
                        disabled={submitting}
                        className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs text-gray-900 outline-none transition focus:border-amber-600 focus:bg-white focus:ring-1 focus:ring-amber-600"
                      />

                      <button
                        type="submit"
                        disabled={submitting || !replyText.trim()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#111827] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-black transition disabled:opacity-50 shrink-0"
                      >
                        {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        Kirim Balasan
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-[740px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 mb-3">
                  <Headphones size={26} />
                </div>
                <h3 className="font-jakarta text-base font-bold text-gray-800">
                  Pilih Percakapan Pelanggan
                </h3>
                <p className="mt-1 max-w-sm text-xs text-gray-400">
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

import { useState, useEffect, useRef } from "react";
import {
  Package,
  X,
  ImagePlus,
  Send,
  Loader2,
  Headphones,
  CheckCircle2,
  Truck,
  Store,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  UserCheck,
  Clock,
  RotateCcw,
} from "lucide-react";
import api from "../../api";
import { formatRupiah } from "../../utils/format";

const QUICK_TOPICS = [
  {
    key: "pengiriman",
    label: "Pengiriman & Packing Kayu",
  },
  {
    key: "click_collect",
    label: "Click & Collect Showroom",
  },
  {
    key: "garansi",
    label: "Garansi & Setup Luthier",
  },
  {
    key: "konsultasi",
    label: "Konsultasi Spesifikasi Gear",
  },
];

export default function FloatingConciergeWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState("chat"); // 'chat' | 'tracker'

  // Session Token & Ticket State
  const [sessionToken, setSessionToken] = useState(() => {
    let tok = localStorage.getItem("overtone_concierge_session_token");
    if (!tok) {
      tok = "sess_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now();
      localStorage.setItem("overtone_concierge_session_token", tok);
    }
    return tok;
  });

  const [ticketId, setTicketId] = useState(() => {
    return localStorage.getItem("overtone_concierge_ticket_id") || null;
  });

  // Ticket Status: 'bot_active' | 'waiting_agent' | 'live_chat' | 'resolved'
  const [sessionStatus, setSessionStatus] = useState("bot_active");
  const [assignedStaff, setAssignedStaff] = useState(null);

  // Chat Messages
  const [messages, setMessages] = useState(() => {
    return [
      {
        id: "welcome",
        sender_type: "bot",
        sender_name: "KMS Auto-Assistant",
        message:
          "Hai musisi! Selamat datang di Overtone Music Store. Ada yang bisa kami bantu seputar pemilihan instrumen, garansi luthier, ketersediaan stok, atau pengiriman?",
        created_at: new Date().toISOString(),
      },
    ];
  });

  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [requestingAgent, setRequestingAgent] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState(null);

  // Tracker State
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [recentOrders, setRecentOrders] = useState([]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Scroll bottom on new message
  useEffect(() => {
    if (isOpen && view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, view]);

  // Initial fetch of active session
  useEffect(() => {
    fetchSessionData();
  }, [sessionToken]);

  // Real-time Polling every 3 seconds while widget is open
  useEffect(() => {
    if (!isOpen || view !== "chat") return;
    const interval = setInterval(() => {
      fetchSessionData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, view, sessionToken, ticketId]);

  // Fetch recent orders when opening tracker
  useEffect(() => {
    if (isOpen && view === "tracker") {
      api
        .get("/support/my-recent-orders")
        .then((res) => {
          setRecentOrders(res?.data?.data || []);
        })
        .catch(() => {});
    }
  }, [isOpen, view]);

  function fetchSessionData(silent = false) {
    const params = new URLSearchParams();
    if (ticketId) params.append("ticket_id", ticketId);
    if (sessionToken) params.append("session_token", sessionToken);

    api
      .get(`/support/my-session?${params.toString()}`, {
        headers: { "X-Session-Token": sessionToken },
      })
      .then((res) => {
        const ticket = res?.data?.ticket;
        const serverMsgs = res?.data?.messages || [];

        if (ticket) {
          setTicketId(ticket.id);
          localStorage.setItem("overtone_concierge_ticket_id", ticket.id);
          setSessionStatus(ticket.status || "bot_active");
          setAssignedStaff(ticket.assigned_staff || null);
        }

        if (serverMsgs.length > 0) {
          setMessages(serverMsgs);
        }
      })
      .catch((err) => {
        if (!silent) console.error("Error fetching session:", err);
      });
  }

  // 1. Handle Quick Topic Pill click (ATOMIC KMS SAVE: User message + Bot answer saved to DB in 1 request)
  function handleQuickTopic(topic) {
    setSending(true);
    api
      .post("/support/quick-kms", {
        topic_key: topic.key,
        label: topic.label,
        session_token: sessionToken,
        ticket_id: ticketId,
      })
      .then((res) => {
        const newTicketId = res?.data?.ticket_id;
        const newMsgs = res?.data?.messages || [];

        if (newTicketId && newTicketId !== ticketId) {
          setTicketId(newTicketId);
          localStorage.setItem("overtone_concierge_ticket_id", newTicketId);
        }
        if (res?.data?.status) {
          setSessionStatus(res.data.status);
        }

        // Simpan pesan baru langsung ke list agar responsif seketika
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const toAdd = newMsgs.filter((m) => !existingIds.has(m.id));
          return [...prev, ...toAdd];
        });
      })
      .catch((err) => {
        console.error("Error executing quick KMS:", err);
      })
      .finally(() => setSending(false));
  }

  // 2. Handle "Hubungi Live Agent"
  function handleRequestLiveAgent() {
    setRequestingAgent(true);
    api
      .post("/support/request-agent", {
        ticket_id: ticketId,
        session_token: sessionToken,
      })
      .then((res) => {
        setSessionStatus("waiting_agent");
        const sysMsg = res?.data?.message;
        if (sysMsg) {
          setMessages((prev) => [...prev, sysMsg]);
        }
        fetchSessionData(true);
      })
      .catch((err) => {
        alert(err.response?.data?.message || "Gagal menghubungkan dengan live agent");
      })
      .finally(() => setRequestingAgent(false));
  }

  // 3. Handle Send Message (User or Staff)
  function handleSendMessage(e) {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text && !attachmentUrl) return;

    setSending(true);
    const sentAttachment = attachmentUrl;
    setInputText("");
    setAttachmentUrl(null);

    // Kirim pesan ke server
    api
      .post("/support/messages", {
        ticket_id: ticketId,
        session_token: sessionToken,
        message: text,
        attachment_url: sentAttachment,
      })
      .then((res) => {
        const newTicketId = res?.data?.ticket_id;
        const createdMsg = res?.data?.message;

        if (newTicketId && newTicketId !== ticketId) {
          setTicketId(newTicketId);
          localStorage.setItem("overtone_concierge_ticket_id", newTicketId);
        }
        if (res?.data?.status) {
          setSessionStatus(res.data.status);
        }
        if (createdMsg) {
          setMessages((prev) => [...prev, createdMsg]);
        }
        fetchSessionData(true);
      })
      .catch((err) => {
        console.error("Error sending message:", err);
      })
      .finally(() => setSending(false));
  }

  // 4. Handle Image Select & Upload
  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    api
      .post("/support/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => {
        const url = res?.data?.url;
        if (url) {
          setAttachmentUrl(url);
        }
      })
      .catch((err) => {
        alert(err.response?.data?.message || "Gagal mengunggah gambar");
      })
      .finally(() => {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  }

  // 5. Handle End Session
  function handleResolveSession() {
    if (!ticketId) return;
    if (!window.confirm("Apakah Anda ingin menyelesaikan sesi live chat ini?")) return;

    api
      .post(`/support/staff/sessions/${ticketId}/resolve`)
      .then(() => {
        setSessionStatus("resolved");
        fetchSessionData(true);
      })
      .catch((err) => console.error("Error resolving session:", err));
  }

  // Reset/Start New Chat Session
  function handleStartNewSession() {
    const newTok = "sess_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now();
    localStorage.setItem("overtone_concierge_session_token", newTok);
    localStorage.removeItem("overtone_concierge_ticket_id");
    setSessionToken(newTok);
    setTicketId(null);
    setSessionStatus("bot_active");
    setAssignedStaff(null);
    setMessages([
      {
        id: "welcome-new",
        sender_type: "bot",
        sender_name: "KMS Auto-Assistant",
        message:
          "Sesi baru dimulai! Ada yang bisa kami bantu seputar gitar, instrumen, showroom, atau garansi?",
        created_at: new Date().toISOString(),
      },
    ]);
  }

  // Track Order in View 2
  function handleTrackOrder(codeToTrack) {
    const query = (codeToTrack || invoiceQuery).trim();
    if (!query) return;

    setTrackingLoading(true);
    setTrackingError("");
    setTrackedOrder(null);

    api
      .get(`/support/quick-tracker?invoice=${encodeURIComponent(query)}`)
      .then((res) => {
        setTrackedOrder(res?.data?.data || null);
      })
      .catch((err) => {
        setTrackingError(err.response?.data?.message || "Pesanan tidak ditemukan");
      })
      .finally(() => setTrackingLoading(false));
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      {/* 2. Expanded Chat Card (Persis Referensi Swee Lee / Warm Olive Gradient) */}
      {isOpen && (
        <div
          className="mb-4 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-6 rounded-[28px] w-[360px] sm:w-[380px] h-[530px] bg-gradient-to-b from-[#9E9156] to-[#7D723D] text-white border border-[#BDB486]/40"
          style={{
            boxShadow:
              "0 20px 45px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.15)",
          }}
        >
          {/* Header Atas */}
          <div className="pt-4 px-5 pb-2.5 border-b border-white/10">
            <div className="flex items-center justify-between">
              {view === "tracker" ? (
                <button
                  type="button"
                  onClick={() => setView("chat")}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DCD6BC] text-[#111827] shadow-xs hover:bg-[#EAE5CE] transition"
                  title="Kembali ke Chat"
                  aria-label="Kembali ke Chat"
                >
                  <ArrowLeft size={16} />
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  {/* Status Indicator Pill */}
                  {sessionStatus === "live_chat" ? (
                    <div className="flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white border border-amber-300/40">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                      <span className="uppercase text-amber-200">
                        LIVE AGENT: {assignedStaff?.name || "Store Specialist"}
                      </span>
                    </div>
                  ) : sessionStatus === "waiting_agent" ? (
                    <div className="flex items-center gap-1.5 rounded-full bg-amber-500/30 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-100 border border-amber-300/30">
                      <Clock size={11} className="animate-spin text-amber-300" />
                      <span>MENUNGGU LIVE AGENT...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#EAE5CE]">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
                      OVERTONE CONCIERGE
                    </div>
                  )}
                </div>
              )}

              {/* Top Right Action Buttons: Package Tracker & Close */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView((prev) => (prev === "tracker" ? "chat" : "tracker"))}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition shadow-xs ${
                    view === "tracker"
                      ? "bg-white text-gray-900 font-bold"
                      : "bg-[#DCD6BC] text-[#111827] hover:bg-[#EAE5CE]"
                  }`}
                  title="Cek Status Pesanan / Resi"
                  aria-label="Cek Status Pesanan"
                >
                  <Package size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DCD6BC] text-[#111827] shadow-xs hover:bg-[#EAE5CE] transition"
                  title="Tutup Widget"
                  aria-label="Tutup"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Title Tengah Atas */}
            <div className="mt-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white tracking-tight">
                {view === "tracker"
                  ? "Lacak Pesanan Anda"
                  : sessionStatus === "live_chat"
                  ? "Private Live Session"
                  : "Hai, ada yang ingin ditanyakan?"}
              </h2>

              {sessionStatus === "live_chat" && (
                <button
                  type="button"
                  onClick={handleResolveSession}
                  className="text-[10px] font-bold text-amber-200/90 underline hover:text-white transition"
                >
                  Akhiri Chat
                </button>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* VIEW 1: LIVE CHAT & HANDOVER EXPERIENCE                  */}
          {/* ======================================================== */}
          {view === "chat" && (
            <>
              {/* TAHAP 2 BANNER: Waiting for Live Agent */}
              {sessionStatus === "waiting_agent" && (
                <div className="mx-4 mt-2 rounded-2xl bg-black/25 border border-amber-300/30 p-2.5 text-center text-xs text-amber-100 shadow-inner animate-pulse">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-[11px] text-amber-200">
                    <Headphones size={13} /> Menghubungkan dengan Gear Specialist...
                  </div>
                  <p className="mt-0.5 text-[10px] text-amber-100/90 leading-tight">
                    Mohon tunggu konfirmasi staf toko. Anda tetap bisa mengetik detail pertanyaan di bawah.
                  </p>
                </div>
              )}

              {/* Scrollable Conversation Stream (Clean scrollbar hidden) */}
              <div className="flex-1 overflow-y-auto px-4 py-2.5 space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {messages.map((m) => {
                  const isUser = m.sender_type === "customer";
                  const isSystem = m.sender_type === "system";
                  const isStaff = m.sender_type === "staff";
                  const isBot = m.sender_type === "bot";

                  if (isSystem) {
                    return (
                      <div key={m.id} className="mx-auto my-1 max-w-[92%] text-center">
                        <span className="inline-block rounded-full bg-black/25 px-3 py-1 text-[10px] font-medium text-[#EFEBD8]/95 backdrop-blur-xs border border-white/10 leading-normal">
                          {m.message}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      {/* Sender Label */}
                      {!isUser && (
                        <span className="mb-1 text-[10px] font-semibold text-[#EFEBD8]/90 pl-1 flex items-center gap-1">
                          {isStaff ? (
                            <>
                              <span className="rounded-md bg-amber-400 text-black px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider">
                                Live Agent
                              </span>
                              <span className="font-bold text-white">{m.sender_name}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={11} className="text-[#FDE047]" />
                              <span className="rounded-md bg-white/20 text-white px-1.5 py-0.2 text-[9px] font-bold">
                                Auto-KMS
                              </span>
                              <span>{m.sender_name}</span>
                            </>
                          )}
                        </span>
                      )}

                      {/* Bubble Text */}
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs transition ${
                          isUser
                            ? "bg-[#DCD6BC] text-[#1F2937] rounded-tr-xs ml-auto max-w-[85%] font-medium"
                            : isStaff
                            ? "bg-[#111827] text-white rounded-tl-xs mr-auto max-w-[88%] shadow-md border border-white/10 font-normal"
                            : "bg-white/95 text-gray-900 rounded-tl-xs mr-auto max-w-[88%] backdrop-blur-xs font-normal"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.message}</p>
                        {m.attachment_url && (
                          <div className="mt-2 overflow-hidden rounded-xl border border-white/20">
                            <a
                              href={m.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={m.attachment_url}
                                alt="Lampiran"
                                className="max-h-40 w-full object-cover hover:scale-105 transition"
                              />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Area: Handover Actions + Quick Pills + Input Bar */}
              <div className="p-3 pt-1 space-y-2">
                {/* TAHAP 1: Mode Bot -> Quick Pills & Tombol "Hubungi Live Agent" */}
                {sessionStatus === "bot_active" && (
                  <div className="space-y-1.5">
                    {/* Live Agent Button Prominent Callout */}
                    <button
                      type="button"
                      onClick={handleRequestLiveAgent}
                      disabled={requestingAgent}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#111827] py-2 px-3.5 text-xs font-bold text-amber-200 shadow-md hover:bg-black transition active:scale-98 border border-amber-300/30"
                    >
                      {requestingAgent ? (
                        <Loader2 size={13} className="animate-spin text-amber-300" />
                      ) : (
                        <Headphones size={13} className="text-amber-300" />
                      )}
                      <span>🎧 Hubungi Live Agent (Staf Showroom)</span>
                    </button>

                    {/* Horizontal Quick Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {QUICK_TOPICS.map((topic) => (
                        <button
                          key={topic.key}
                          type="button"
                          onClick={() => handleQuickTopic(topic)}
                          disabled={sending}
                          className="shrink-0 rounded-full bg-[#D8D2B7] px-3.5 py-1.5 text-[11px] font-medium text-[#1F2937] shadow-xs hover:bg-[#EAE5CE] transition active:scale-95 disabled:opacity-60"
                        >
                          {topic.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sesi Selesai (Resolved) -> Tampilkan opsi mulai sesi baru */}
                {sessionStatus === "resolved" && (
                  <div className="rounded-2xl bg-black/30 p-2.5 text-center text-xs">
                    <p className="text-amber-200 font-semibold mb-1.5">Sesi chat telah selesai.</p>
                    <button
                      type="button"
                      onClick={handleStartNewSession}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#DCD6BC] px-3 py-1.5 text-[11px] font-bold text-gray-900 hover:bg-white transition"
                    >
                      <RotateCcw size={12} /> Mulai Pertanyaan Baru
                    </button>
                  </div>
                )}

                {/* Thumbnail Preview If Image Uploaded */}
                {attachmentUrl && (
                  <div className="relative inline-block rounded-xl border border-white/40 bg-white/20 p-1">
                    <img
                      src={attachmentUrl}
                      alt="Thumbnail"
                      className="h-11 w-11 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setAttachmentUrl(null)}
                      className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Input Bar Kapsul */}
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2 rounded-full bg-[#D8D2B7] px-3.5 py-2 shadow-md"
                >
                  {/* Glowing Green Dot */}
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]" />

                  {/* Input Text */}
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      sessionStatus === "live_chat"
                        ? "Ketik pesan ke Live Agent..."
                        : sessionStatus === "waiting_agent"
                        ? "Ketik pertanyaan detail Anda..."
                        : "Chat with us"
                    }
                    disabled={sending}
                    className="flex-1 bg-transparent text-xs text-[#1F2937] placeholder-gray-600 outline-none font-medium"
                  />

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  {/* Attach Image Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="shrink-0 text-gray-700 hover:text-black transition"
                    title="Lampirkan Gambar"
                    aria-label="Lampirkan Gambar"
                  >
                    {uploading ? (
                      <Loader2 size={16} className="animate-spin text-gray-600" />
                    ) : (
                      <ImagePlus size={16} />
                    )}
                  </button>

                  {/* Send Button */}
                  {(inputText.trim() || attachmentUrl) && (
                    <button
                      type="submit"
                      disabled={sending}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white shadow-xs hover:bg-black transition active:scale-95"
                      aria-label="Kirim Pesan"
                    >
                      {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    </button>
                  )}
                </form>
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: QUICK ORDER TRACKER                              */}
          {/* ======================================================== */}
          {view === "tracker" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {/* Search Form */}
              <div className="rounded-2xl bg-white/95 p-3.5 text-gray-900 shadow-md">
                <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                  Cari Nomor Invoice / Resi / Kode Pickup:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={invoiceQuery}
                    onChange={(e) => setInvoiceQuery(e.target.value)}
                    placeholder="Contoh: SWL-20261022-... atau PICKUP-..."
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-amber-600"
                    onKeyDown={(e) => e.key === "Enter" && handleTrackOrder()}
                  />
                  <button
                    type="button"
                    onClick={() => handleTrackOrder()}
                    disabled={trackingLoading || !invoiceQuery.trim()}
                    className="rounded-xl bg-gray-900 px-3.5 py-2 font-bold text-white hover:bg-black transition disabled:opacity-50"
                  >
                    {trackingLoading ? <Loader2 size={14} className="animate-spin" /> : "Lacak"}
                  </button>
                </div>
                {trackingError && (
                  <p className="mt-2 text-[11px] text-red-600 font-semibold">{trackingError}</p>
                )}
              </div>

              {/* Tracked Order Result Card */}
              {trackedOrder && (
                <div className="rounded-2xl bg-white/95 p-4 text-gray-900 shadow-md space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="font-mono text-xs font-bold text-amber-800">
                      {trackedOrder.invoice_code}
                    </span>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800">
                      {trackedOrder.order_status?.replace("_", " ")}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-gray-900">
                      {trackedOrder.product_name}
                    </h4>
                    {trackedOrder.variant_name && (
                      <p className="text-[11px] text-gray-500">
                        Varian: {trackedOrder.variant_name} ({trackedOrder.quantity} unit)
                      </p>
                    )}
                    <p className="text-xs font-mono font-bold text-gray-800 mt-1">
                      Total: {formatRupiah(trackedOrder.total_amount)}
                    </p>
                  </div>

                  {trackedOrder.fulfillment_method === "click_and_collect" ? (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <Store size={14} /> Ambil di Showroom Overtone
                      </div>
                      <div>
                        Kode Ambil: <strong className="font-mono">{trackedOrder.pickup_code || "Menunggu verifikasi"}</strong>
                      </div>
                      {trackedOrder.pickup_branch_name && (
                        <div className="text-[10px] text-gray-600 mt-0.5">
                          Lokasi: {trackedOrder.pickup_branch_name}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-2.5 text-[11px] text-blue-900">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <Truck size={14} /> Ekspedisi Berasuransi
                      </div>
                      <div>Kurir: {trackedOrder.courier || "JNE Trucking (Kayu)"}</div>
                      <div>
                        No. Resi: <strong className="font-mono">{trackedOrder.tracking_number || "Sedang disiapkan di gudang"}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recent Orders of User */}
              {recentOrders.length > 0 && !trackedOrder && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#EFEBD8]/90">
                    Pesanan Terakhir Anda:
                  </p>
                  {recentOrders.map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => handleTrackOrder(ord.invoice_code)}
                      className="cursor-pointer rounded-2xl bg-white/95 p-3 text-gray-900 shadow-xs hover:bg-white transition flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono text-[10px] font-bold text-gray-500">
                          {ord.invoice_code}
                        </div>
                        <div className="font-bold text-xs text-gray-900 line-clamp-1">
                          {ord.product_name}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {formatRupiah(ord.total_amount)}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 1. Collapsed Floating Button (Foto Avatar Ramah Specialist / Warm Olive ✕ saat terbuka) */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
            isOpen
              ? "bg-[#8F834B] text-white border-2 border-white/60 shadow-xl"
              : "border-2 border-white overflow-hidden bg-gray-900"
          }`}
          aria-label={isOpen ? "Tutup chat concierge" : "Buka chat gear concierge"}
          title={isOpen ? "Tutup chat" : "Chat dengan Gear Specialist Overtone"}
        >
          {isOpen ? (
            <X size={24} className="stroke-[2.5]" />
          ) : (
            <>
              <img
                src="/concierge_avatar.jpg"
                alt="Overtone Gear Specialist"
                className="h-full w-full object-cover object-top"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              {/* Online Green Glow Dot */}
              <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#10B981] shadow-xs" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

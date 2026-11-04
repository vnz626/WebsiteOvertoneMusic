import { useState, useEffect, useRef } from "react";
import {
  Package,
  X,
  ImagePlus,
  Send,
  Loader2,
  Headphones,
  Truck,
  Store,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Clock,
  RotateCcw,
} from "lucide-react";
import api from "../../api";
import { formatRupiah } from "../../utils/format";
import toast from "react-hot-toast";
import { useConfirm } from "../ui/ConfirmDialog";

const QUICK_TOPICS = [
  {
    key: "pengiriman",
    label: "Pengiriman & Flightcase",
  },
  {
    key: "click_collect",
    label: "Click & Collect Showroom",
  },
  {
    key: "garansi",
    label: "Garansi & Sensor QC",
  },
  {
    key: "konsultasi",
    label: "Konsultasi Rig Cinema",
  },
];

export default function FloatingConciergeWidget() {
  const confirm = useConfirm();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState("chat"); // 'chat' | 'tracker'

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

  const [messages, setMessages] = useState(() => [
    {
      id: "welcome",
      sender_type: "bot",
      sender_name: "KMS Auto-Assistant",
      message:
        "Halo! Selamat datang di Focalpoint Pro. Pilih topik bantuan cepat di bawah atau tanyakan spesifikasi kamera sinema, lensa prime, sensor calibration QC, ketersediaan unit showroom, maupun pengiriman ekspedisi.",
      created_at: new Date().toISOString(),
    },
  ]);

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

  useEffect(() => {
    if (isOpen && view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, view]);

  useEffect(() => {
    fetchSessionData();
  }, [sessionToken]);

  useEffect(() => {
    if (!isOpen || view !== "chat") return;
    const interval = setInterval(() => {
      fetchSessionData(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, view, sessionToken, ticketId]);

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
        toast.error(err.response?.data?.message || "Gagal menghubungkan dengan konsultan toko.");
      })
      .finally(() => setRequestingAgent(false));
  }

  function handleSendMessage(e) {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text && !attachmentUrl) return;

    setSending(true);
    const sentAttachment = attachmentUrl;
    setInputText("");
    setAttachmentUrl(null);

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
        toast.error(err.response?.data?.message || "Gagal mengunggah lampiran foto.");
      })
      .finally(() => {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  }

  async function handleResolveSession() {
    if (!ticketId) return;
    const ok = await confirm({
      title: "Selesaikan Sesi Konsultasi",
      message: "Apakah pertanyaan Anda sudah terjawab dan ingin menutup sesi chat ini?",
      confirmText: "Ya, Selesaikan",
      isDanger: false,
    });
    if (!ok) return;

    api
      .post(`/support/staff/sessions/${ticketId}/resolve`)
      .then(() => {
        setSessionStatus("resolved");
        fetchSessionData(true);
      })
      .catch((err) => console.error("Error resolving session:", err));
  }

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
          "Sesi baru dimulai. Silakan pilih topik panduan atau ajukan pertanyaan seputar gear produksi dan pesanan Anda.",
        created_at: new Date().toISOString(),
      },
    ]);
  }

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
        setTrackingError(
          err.response?.data?.message ||
            "Nomor invoice atau kode Pickup tidak ditemukan. Pastikan format kode sesuai faktur."
        );
      })
      .finally(() => setTrackingLoading(false));
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen && (
        <section
          aria-label="Konsultasi Gear & Pelacakan Pesanan Focalpoint Pro"
          className="mb-3 flex flex-col justify-between overflow-hidden rounded-3xl w-[350px] sm:w-[390px] h-[550px] fp-glass-card !bg-white/95 !border-white/90 shadow-2xl text-[#0F1B2D]"
        >
          {/* Header Atas */}
          <div className="pt-4 px-4 pb-3.5 bg-gradient-to-r from-[#0F1B2D] to-[#1A2D4A] text-white border-b border-white/10">
            <div className="flex items-center justify-between">
              {view === "tracker" ? (
                <button
                  type="button"
                  onClick={() => setView("chat")}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors duration-fast"
                  title="Kembali ke Ruang Percakapan"
                  aria-label="Kembali ke Ruang Percakapan"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  {sessionStatus === "live_chat" ? (
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold tracking-wide text-emerald-300 border border-emerald-500/40">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
                      <span className="uppercase">
                        LIVE: {assignedStaff?.name || "Gear Specialist"}
                      </span>
                    </div>
                  ) : sessionStatus === "waiting_agent" ? (
                    <div className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-[10px] font-bold tracking-wide text-amber-300 border border-amber-500/40">
                      <Clock size={11} className="animate-spin" aria-hidden="true" />
                      <span>MENUNGGU STAF...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
                      <span className="w-2 h-2 rounded-full bg-[#E8622C]" aria-hidden="true" />
                      <span>FOCALPOINT CONCIERGE</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tombol Kanan Atas: Lacak Pesanan & Tutup */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setView((prev) => (prev === "tracker" ? "chat" : "tracker"))}
                  aria-pressed={view === "tracker"}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-fast ${
                    view === "tracker"
                      ? "bg-[#E8622C] text-white"
                      : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                  title="Lacak Status Pesanan / Resi"
                  aria-label="Lacak Status Pesanan"
                >
                  <Package size={15} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors duration-fast"
                  title="Tutup Jendela Konsultasi"
                  aria-label="Tutup Jendela Konsultasi"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-white tracking-tight">
                {view === "tracker"
                  ? "Lacak Status Pesanan & Resi"
                  : sessionStatus === "live_chat"
                  ? "Sesi Konsultasi Langsung"
                  : "Konsultasi Cinema Gear & QC"}
              </h2>

              {sessionStatus === "live_chat" && (
                <button
                  type="button"
                  onClick={handleResolveSession}
                  className="text-[11px] font-bold text-white/80 underline hover:text-white transition-opacity duration-fast"
                >
                  Akhiri Sesi
                </button>
              )}
            </div>
          </div>

          {/* VIEW 1: LIVE CHAT & KMS BOT */}
          {view === "chat" && (
            <>
              {sessionStatus === "waiting_agent" && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mx-3 mt-2.5 rounded-sm bg-status-warning-bg border border-status-warning-border p-2.5 text-center text-xs text-status-warning-text"
                >
                  <div className="flex items-center justify-center gap-1.5 font-bold text-[11px]">
                    <Headphones size={13} aria-hidden="true" />
                    <span>Menghubungkan dengan Spesialis Toko...</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-tight">
                    Mohon tunggu konfirmasi staf. Anda tetap dapat menuliskan detail pertanyaan di bawah.
                  </p>
                </div>
              )}

              {/* Daftar Pesan */}
              <div
                role="log"
                aria-live="polite"
                className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 bg-canvas no-scrollbar"
              >
                {messages.map((m) => {
                  const isUser = m.sender_type === "customer";
                  const isSystem = m.sender_type === "system";
                  const isStaff = m.sender_type === "staff";

                  if (isSystem) {
                    return (
                      <div key={m.id} className="mx-auto my-1 max-w-[92%] text-center">
                        <span className="inline-block rounded-xs bg-surface-muted px-3 py-1 text-[10px] font-bold text-ink-secondary border border-line leading-normal">
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
                      {!isUser && (
                        <span className="mb-1 text-[10px] font-bold text-ink-secondary pl-0.5 flex items-center gap-1.5">
                          {isStaff ? (
                            <>
                              <span className="rounded-xs bg-accent text-accent-on px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider">
                                Staf Toko
                              </span>
                              <span className="font-bold text-ink">{m.sender_name}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={11} className="text-accent" aria-hidden="true" />
                              <span className="rounded-xs bg-surface-muted border border-line text-ink px-1.5 py-0.5 text-[9px] font-bold">
                                Auto-KMS
                              </span>
                              <span>{m.sender_name}</span>
                            </>
                          )}
                        </span>
                      )}

                      <div
                        className={`rounded-md px-3.5 py-2.5 text-xs leading-relaxed border ${
                          isUser
                            ? "bg-ink text-surface border-ink ml-auto max-w-[85%] font-medium"
                            : isStaff
                            ? "bg-accent-subtle text-ink border-accent/40 mr-auto max-w-[88%]"
                            : "bg-surface text-ink border-line mr-auto max-w-[88%]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.message}</p>
                        {m.attachment_url && (
                          <div className="mt-2 overflow-hidden rounded-sm border border-line">
                            <a
                              href={m.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={m.attachment_url}
                                alt="Lampiran percakapan"
                                className="max-h-40 w-full object-cover"
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

              {/* Area Bawah: Handover + Topik Cepat + Input */}
              <div className="p-3 bg-white/90 border-t border-[#0F1B2D]/10 space-y-2">
                {sessionStatus === "bot_active" && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleRequestLiveAgent}
                      disabled={requestingAgent}
                      className="w-full flex items-center justify-center gap-2 rounded-full bg-[#E8622C] hover:bg-[#d45522] py-2 px-3.5 text-xs font-bold text-white transition-all shadow-md disabled:opacity-55"
                    >
                      {requestingAgent ? (
                        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Headphones size={14} aria-hidden="true" />
                      )}
                      <span>Hubungi Live Agent (Spesialis Kamera)</span>
                    </button>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {QUICK_TOPICS.map((topic) => (
                        <button
                          key={topic.key}
                          type="button"
                          onClick={() => handleQuickTopic(topic)}
                          disabled={sending}
                          className="shrink-0 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-bold text-[#0F1B2D] hover:border-[#E8622C] hover:bg-white transition-all shadow-xs disabled:opacity-55"
                        >
                          {topic.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {sessionStatus === "resolved" && (
                  <div className="rounded-2xl bg-white/70 border border-[#0F1B2D]/10 p-2.5 text-center text-xs">
                    <p className="text-[#0F1B2D] font-bold mb-1.5">Sesi konsultasi telah selesai.</p>
                    <button
                      type="button"
                      onClick={handleStartNewSession}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#0F1B2D] px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-black transition-all shadow-xs"
                    >
                      <RotateCcw size={12} aria-hidden="true" />
                      <span>Mulai Pertanyaan Baru</span>
                    </button>
                  </div>
                )}

                {attachmentUrl && (
                  <div className="relative inline-block rounded-xl border border-white/80 bg-white/80 p-1">
                    <img
                      src={attachmentUrl}
                      alt="Pratinjau lampiran"
                      className="h-11 w-11 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setAttachmentUrl(null)}
                      aria-label="Hapus lampiran gambar"
                      className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white"
                    >
                      <X size={10} aria-hidden="true" />
                    </button>
                  </div>
                )}

                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2 rounded-full border border-[#0F1B2D]/15 bg-white/90 px-3.5 py-1.5 shadow-xs"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    aria-label="Tulis pesan konsultasi"
                    placeholder={
                      sessionStatus === "live_chat"
                        ? "Tulis pesan ke Spesialis..."
                        : sessionStatus === "waiting_agent"
                        ? "Tulis detail pertanyaan Anda..."
                        : "Tanyakan kamera, lensa, atau stok..."
                    }
                    disabled={sending}
                    className="flex-1 border-0 bg-transparent p-0 text-xs text-[#0F1B2D] placeholder:text-[#94A3B8] focus:outline-none focus:ring-0"
                  />

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="sr-only"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="shrink-0 text-[#64748B] hover:text-[#0F1B2D] transition-colors p-1"
                    title="Lampirkan Foto"
                    aria-label="Lampirkan Foto"
                  >
                    {uploading ? (
                      <Loader2 size={16} className="animate-spin text-[#E8622C]" aria-hidden="true" />
                    ) : (
                      <ImagePlus size={16} aria-hidden="true" />
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={sending || (!inputText.trim() && !attachmentUrl)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E8622C] text-white hover:bg-[#d45522] transition-colors disabled:opacity-40"
                    aria-label="Kirim Pesan"
                  >
                    {sending ? (
                      <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Send size={12} aria-hidden="true" />
                    )}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* VIEW 2: QUICK ORDER TRACKER */}
          {view === "tracker" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-canvas no-scrollbar">
              <div className="rounded-md bg-surface border border-line p-3.5 text-ink">
                <label
                  htmlFor="concierge-invoice-input"
                  className="block text-[11px] font-bold text-ink mb-1.5"
                >
                  Nomor Faktur / Resi / Kode Pickup:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="concierge-invoice-input"
                    type="text"
                    value={invoiceQuery}
                    onChange={(e) => setInvoiceQuery(e.target.value)}
                    placeholder="Contoh: INV-... atau PICKUP-..."
                    className="ot-input flex-1 py-1.5 text-xs tabular-nums"
                    onKeyDown={(e) => e.key === "Enter" && handleTrackOrder()}
                  />
                  <button
                    type="button"
                    onClick={() => handleTrackOrder()}
                    disabled={trackingLoading || !invoiceQuery.trim()}
                    className="rounded-sm bg-accent px-3.5 py-2 font-bold text-accent-on hover:bg-accent-hover transition-colors duration-fast disabled:opacity-50"
                  >
                    {trackingLoading ? (
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    ) : (
                      "Lacak"
                    )}
                  </button>
                </div>
                {trackingError && (
                  <p role="alert" className="mt-2 text-[11px] text-status-danger-text font-bold">
                    {trackingError}
                  </p>
                )}
              </div>

              {trackedOrder && (
                <div className="rounded-md bg-surface border border-line-strong p-4 text-ink space-y-2.5">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="tabular-nums text-xs font-bold text-accent">
                      {trackedOrder.invoice_code}
                    </span>
                    <span className="rounded-xs bg-status-success-bg border border-status-success-border px-2 py-0.5 text-[10px] font-bold uppercase text-status-success-text">
                      {trackedOrder.order_status?.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-display font-bold text-xs text-ink">
                      {trackedOrder.product_name}
                    </h4>
                    {trackedOrder.variant_name && (
                      <p className="text-[11px] text-ink-secondary">
                        Varian: {trackedOrder.variant_name} ({trackedOrder.quantity} unit)
                      </p>
                    )}
                    <p className="text-xs tabular-nums font-bold text-ink mt-1">
                      Total: {formatRupiah(trackedOrder.total_amount)}
                    </p>
                  </div>

                  {trackedOrder.fulfillment_method === "click_and_collect" ? (
                    <div className="rounded-sm bg-status-warning-bg border border-status-warning-border p-2.5 text-[11px] text-status-warning-text">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <Store size={14} aria-hidden="true" />
                        <span>Click &amp; Collect di Offline Store</span>
                      </div>
                      <div>
                        Kode Ambil:{" "}
                        <strong className="tabular-nums">
                          {trackedOrder.pickup_code || "Menunggu verifikasi"}
                        </strong>
                      </div>
                      {trackedOrder.pickup_branch_name && (
                        <div className="text-[10px] mt-0.5">
                          Cabang: {trackedOrder.pickup_branch_name}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-sm bg-status-info-bg border border-status-info-border p-2.5 text-[11px] text-status-info-text">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <Truck size={14} aria-hidden="true" />
                        <span>Pengiriman Ekspedisi Berasuransi</span>
                      </div>
                      <div>Kurir: {trackedOrder.courier || "JNE Trucking (Packing Kayu)"}</div>
                      <div>
                        No. Resi:{" "}
                        <strong className="tabular-nums">
                          {trackedOrder.tracking_number || "Sedang disiapkan di gudang"}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {recentOrders.length > 0 && !trackedOrder && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
                    Pesanan Terakhir Anda:
                  </p>
                  {recentOrders.map((ord) => (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => handleTrackOrder(ord.invoice_code)}
                      className="w-full text-left rounded-md bg-surface border border-line p-3 text-ink hover:border-line-strong hover:bg-surface-muted transition-colors duration-fast flex items-center justify-between"
                    >
                      <div>
                        <div className="tabular-nums text-[10px] font-bold text-ink-muted">
                          {ord.invoice_code}
                        </div>
                        <div className="font-bold text-xs text-ink line-clamp-1">
                          {ord.product_name}
                        </div>
                        <div className="text-[11px] tabular-nums font-semibold text-ink-secondary">
                          {formatRupiah(ord.total_amount)}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-ink-muted shrink-0" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Tombol Pemicu Mengambang Glassmorphism */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-xl transition-all duration-300 border ${
            isOpen
              ? "bg-[#E8622C] text-white border-white/60 rotate-90"
              : "bg-[#0F1B2D]/90 backdrop-blur-md text-white border-white/40 hover:bg-[#E8622C] hover:scale-105"
          }`}
          aria-label={isOpen ? "Tutup konsultasi concierge" : "Buka konsultasi spesialis cinema gear"}
          title={isOpen ? "Tutup konsultasi" : "Konsultasi Gear & Sensor Calibration"}
        >
          {isOpen ? (
            <X size={22} aria-hidden="true" />
          ) : (
            <>
              <Headphones size={22} aria-hidden="true" />
              <span
                className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500"
                aria-hidden="true"
              />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

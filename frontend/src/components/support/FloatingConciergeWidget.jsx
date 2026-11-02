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
    label: "Pengiriman & Packing Kayu",
  },
  {
    key: "click_collect",
    label: "Click & Collect Offline Store",
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
        "Halo! Selamat datang di Overtone Music Store. Pilih topik bantuan cepat di bawah atau tanyakan spesifikasi instrumen, garansi setup luthier, ketersediaan stok cabang, maupun pengiriman.",
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
          "Sesi baru dimulai. Silakan pilih topik panduan atau ajukan pertanyaan seputar instrumen dan pesanan Anda.",
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
          aria-label="Konsultasi Gear & Pelacakan Pesanan Overtone"
          className="mb-3 flex flex-col justify-between overflow-hidden rounded-lg w-[350px] sm:w-[380px] h-[530px] bg-surface text-ink border border-line-strong shadow-lg"
        >
          {/* Header Atas */}
          <div className="pt-3.5 px-4 pb-3 bg-ink text-surface border-b border-line">
            <div className="flex items-center justify-between">
              {view === "tracker" ? (
                <button
                  type="button"
                  onClick={() => setView("chat")}
                  className="flex h-8 w-8 items-center justify-center rounded-sm bg-surface text-ink hover:bg-surface-muted transition-colors duration-fast"
                  title="Kembali ke Ruang Percakapan"
                  aria-label="Kembali ke Ruang Percakapan"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  {sessionStatus === "live_chat" ? (
                    <div className="flex items-center gap-1.5 rounded-xs bg-status-success-bg px-2.5 py-1 text-[10px] font-bold tracking-wide text-status-success-text border border-status-success-border">
                      <span className="w-2 h-2 rounded-full bg-status-success-text" aria-hidden="true" />
                      <span className="uppercase">
                        LIVE AGENT: {assignedStaff?.name || "Spesialis Instrumen"}
                      </span>
                    </div>
                  ) : sessionStatus === "waiting_agent" ? (
                    <div className="flex items-center gap-1.5 rounded-xs bg-status-warning-bg px-2.5 py-1 text-[10px] font-bold tracking-wide text-status-warning-text border border-status-warning-border">
                      <Clock size={11} className="animate-spin" aria-hidden="true" />
                      <span>MENUNGGU RESPON STAF...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-surface">
                      <span className="w-2 h-2 rounded-full bg-accent" aria-hidden="true" />
                      <span>OVERTONE CONCIERGE</span>
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
                  className={`flex h-8 w-8 items-center justify-center rounded-sm transition-colors duration-fast ${
                    view === "tracker"
                      ? "bg-accent text-accent-on"
                      : "bg-surface/15 text-surface hover:bg-surface/25"
                  }`}
                  title="Lacak Status Pesanan / Resi"
                  aria-label="Lacak Status Pesanan"
                >
                  <Package size={15} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-sm bg-surface/15 text-surface hover:bg-surface/25 transition-colors duration-fast"
                  title="Tutup Jendela Konsultasi"
                  aria-label="Tutup Jendela Konsultasi"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-surface tracking-tight">
                {view === "tracker"
                  ? "Lacak Status Pesanan & Resi"
                  : sessionStatus === "live_chat"
                  ? "Sesi Konsultasi Langsung"
                  : "Konsultasi Instrumen & Layanan"}
              </h2>

              {sessionStatus === "live_chat" && (
                <button
                  type="button"
                  onClick={handleResolveSession}
                  className="text-[11px] font-bold text-surface underline hover:opacity-80 transition-opacity duration-fast"
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
              <div className="p-3 bg-surface border-t border-line space-y-2">
                {sessionStatus === "bot_active" && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleRequestLiveAgent}
                      disabled={requestingAgent}
                      className="w-full flex items-center justify-center gap-2 rounded-sm bg-accent hover:bg-accent-hover py-2 px-3.5 text-xs font-bold text-accent-on transition-colors duration-fast disabled:opacity-55"
                    >
                      {requestingAgent ? (
                        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Headphones size={14} aria-hidden="true" />
                      )}
                      <span>Hubungi Live Agent (Staf Toko)</span>
                    </button>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {QUICK_TOPICS.map((topic) => (
                        <button
                          key={topic.key}
                          type="button"
                          onClick={() => handleQuickTopic(topic)}
                          disabled={sending}
                          className="shrink-0 rounded-sm border border-line-strong bg-surface-muted px-3 py-1 text-[11px] font-bold text-ink hover:border-ink hover:bg-surface-subtle transition-colors duration-fast disabled:opacity-55"
                        >
                          {topic.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {sessionStatus === "resolved" && (
                  <div className="rounded-sm bg-surface-muted border border-line p-2.5 text-center text-xs">
                    <p className="text-ink font-bold mb-1.5">Sesi konsultasi telah selesai.</p>
                    <button
                      type="button"
                      onClick={handleStartNewSession}
                      className="inline-flex items-center gap-1.5 rounded-sm bg-ink px-3 py-1.5 text-[11px] font-bold text-surface hover:opacity-90 transition-opacity duration-fast"
                    >
                      <RotateCcw size={12} aria-hidden="true" />
                      <span>Mulai Pertanyaan Baru</span>
                    </button>
                  </div>
                )}

                {attachmentUrl && (
                  <div className="relative inline-block rounded-sm border border-line-strong bg-surface-muted p-1">
                    <img
                      src={attachmentUrl}
                      alt="Pratinjau lampiran"
                      className="h-11 w-11 rounded-xs object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setAttachmentUrl(null)}
                      aria-label="Hapus lampiran gambar"
                      className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-status-danger-text text-surface"
                    >
                      <X size={10} aria-hidden="true" />
                    </button>
                  </div>
                )}

                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2 rounded-sm border border-line-strong bg-canvas px-3 py-1.5"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    aria-label="Tulis pesan konsultasi"
                    placeholder={
                      sessionStatus === "live_chat"
                        ? "Tulis pesan ke Spesialis Toko..."
                        : sessionStatus === "waiting_agent"
                        ? "Tulis detail pertanyaan Anda..."
                        : "Tanyakan spesifikasi atau stok..."
                    }
                    disabled={sending}
                    className="flex-1 border-0 bg-transparent p-0 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-0"
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
                    className="shrink-0 text-ink-secondary hover:text-ink transition-colors duration-fast p-1"
                    title="Lampirkan Foto"
                    aria-label="Lampirkan Foto"
                  >
                    {uploading ? (
                      <Loader2 size={16} className="animate-spin text-accent" aria-hidden="true" />
                    ) : (
                      <ImagePlus size={16} aria-hidden="true" />
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={sending || (!inputText.trim() && !attachmentUrl)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-accent text-accent-on hover:bg-accent-hover transition-colors duration-fast disabled:opacity-40"
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

      {/* Tombol Pemicu Mengambang (Bebas Pergeseran Layout) */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-md shadow-md transition-colors duration-fast border-2 ${
            isOpen
              ? "bg-accent text-accent-on border-surface"
              : "border-surface overflow-hidden bg-ink text-surface hover:border-accent"
          }`}
          aria-label={isOpen ? "Tutup konsultasi concierge" : "Buka konsultasi spesialis instrumen"}
          title={isOpen ? "Tutup konsultasi" : "Konsultasi dengan Spesialis Instrumen Overtone"}
        >
          {isOpen ? (
            <X size={22} aria-hidden="true" />
          ) : (
            <>
              <img
                src="/concierge_avatar.jpg"
                alt=""
                aria-hidden="true"
                className="h-14 w-14 object-cover object-top"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <Headphones size={20} className="absolute -z-10" aria-hidden="true" />
              <span
                className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-status-success-text"
                aria-hidden="true"
              />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { CheckCircle2, Headphones, MessageSquare, RefreshCw, Send, User } from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import Badge from "../../components/ui/Badge";

export default function StoreSupportHelpdesk() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [newStatus, setNewStatus] = useState("answered");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  function loadTickets() {
    setLoading(true);
    api
      .get("/store/tickets")
      .then((res) => setTickets(res.data.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTickets();
  }, []);

  function handleReply(e) {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;
    setSubmitting(true);
    api
      .post(`/store/tickets/${selectedTicket.id}/reply`, {
        message: replyMessage,
        status: newStatus,
      })
      .then(() => {
        setMsg("Balasan berhasil dikirim ke pelanggan!");
        setReplyMessage("");
        loadTickets();
        setTimeout(() => setMsg(""), 3000);
      })
      .catch((err) => alert(err.response?.data?.message || "Gagal membalas tiket"))
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ts-primary/10 text-ts-primary dark:bg-brand-400/10 dark:text-brand-400">
                  <Headphones size={20} />
                </span>
                <h1 className="font-jakarta text-2xl font-extrabold text-ts-ink dark:text-white">
                  Helpdesk & Tiket Bantuan Pelanggan
                </h1>
              </div>
              <p className="mt-1 text-sm text-ts-muted dark:text-slate-400">
                Layanan konsultasi pemilihan instrumen, kendala order, setup gitar, dan pertanyaan customer Swee Lee.
              </p>
            </div>
            <button
              onClick={loadTickets}
              className="inline-flex items-center gap-2 rounded-xl border border-ts-subtle bg-white px-4 py-2 text-xs font-bold text-ts-ink shadow-sm hover:bg-ts-low dark:border-white/10 dark:bg-surface-container dark:text-white"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* List Tiket */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="font-jakarta text-sm font-extrabold text-ts-ink dark:text-white">
                Daftar Tiket Masuk ({tickets.length})
              </h3>
              {loading ? (
                <div className="p-8 text-center text-xs text-ts-muted">Memuat tiket...</div>
              ) : tickets.length === 0 ? (
                <div className="rounded-xl border border-ts-subtle bg-white p-6 text-center text-xs text-ts-muted dark:border-white/10 dark:bg-surface-container">
                  Tidak ada tiket pertanyaan pelanggan.
                </div>
              ) : (
                tickets.map((t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTicket(t);
                        setMsg("");
                      }}
                      className={`cursor-pointer rounded-2xl border p-4 transition ${
                        isSelected
                          ? "border-ts-primary bg-ts-primary/5 shadow-md dark:border-brand-400 dark:bg-brand-400/5"
                          : "border-ts-subtle bg-white hover:border-ts-primary/40 dark:border-white/10 dark:bg-surface-container"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-ts-muted">#{t.id}</span>
                        <Badge variant={t.status === "open" ? "amber" : t.status === "answered" ? "blue" : "teal"}>
                          {t.status.toUpperCase()}
                        </Badge>
                      </div>
                      <h4 className="mt-1 font-bold text-sm text-ts-ink dark:text-white line-clamp-1">{t.subject}</h4>
                      <p className="mt-1 text-xs text-ts-muted line-clamp-2">{t.description}</p>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-ts-muted">
                        <span className="font-bold flex items-center gap-1">
                          <User size={12} /> {t.customer_name}
                        </span>
                        <span>{t.created_at ? new Date(t.created_at).toLocaleDateString("id-ID") : "-"}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Detail & Reply Panel */}
            <div className="lg:col-span-7">
              {selectedTicket ? (
                <div className="rounded-2xl border border-ts-subtle bg-white p-6 shadow-sm dark:border-white/10 dark:bg-surface-container">
                  <div className="border-b border-ts-subtle pb-4 dark:border-white/10">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-xs text-ts-muted">Tiket #{selectedTicket.id}</span>
                        <h3 className="font-jakarta text-lg font-extrabold text-ts-ink dark:text-white">
                          {selectedTicket.subject}
                        </h3>
                        <p className="text-xs text-ts-muted">
                          Dari: <strong>{selectedTicket.customer_name}</strong> ({selectedTicket.customer_email})
                        </p>
                      </div>
                      <Badge variant={selectedTicket.status === "open" ? "amber" : "teal"}>
                        {selectedTicket.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-ts-low p-4 dark:bg-surface-high">
                    <p className="text-xs font-bold text-ts-muted mb-1">Pertanyaan / Pesan Pelanggan:</p>
                    <p className="text-xs text-ts-ink dark:text-white whitespace-pre-wrap">
                      {selectedTicket.description}
                    </p>
                  </div>

                  {msg && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={16} /> {msg}
                    </div>
                  )}

                  {/* Form Reply */}
                  <form onSubmit={handleReply} className="mt-5 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-ts-ink dark:text-white mb-1">
                        Tulis Pesan Balasan Staff:
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        className="w-full rounded-xl border border-ts-subtle bg-white p-3 text-xs text-ts-ink outline-none transition focus:border-ts-primary dark:border-white/10 dark:bg-surface-high dark:text-white"
                        placeholder="Ketik solusi atau panduan teknis untuk pelanggan..."
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-ts-muted">Ubah Status Tiket:</span>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="rounded-lg border border-ts-subtle bg-white p-1.5 text-xs outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                        >
                          <option value="answered">Answered (Dijawab)</option>
                          <option value="closed">Closed (Terselesaikan)</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-ts-primary px-5 py-2 text-xs font-bold text-white shadow-md shadow-ts-primary/25 hover:bg-ts-container transition disabled:opacity-50 dark:bg-brand-500"
                      >
                        <Send size={14} /> {submitting ? "Mengirim..." : "Kirim Balasan"}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-ts-subtle p-8 text-center text-xs text-ts-muted dark:border-white/10">
                  Pilih salah satu tiket di sebelah kiri untuk melihat pesan dan mengirim balasan.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

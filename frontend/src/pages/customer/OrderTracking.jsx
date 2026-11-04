import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Truck,
  Store,
  CheckCircle2,
  Clock,
  Search,
  Copy,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Printer
} from "lucide-react";
import api from "../../api";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { formatRupiah, formatDate, errorMessage } from "../../utils/format";
import { printInvoice } from "../../utils/printInvoice";

export default function OrderTracking({ isGuest = false }) {
  const { invoice } = useParams();
  const [searchParams] = useSearchParams();

  // State untuk form input tamu
  const [invoiceInput, setInvoiceInput] = useState(invoice || searchParams.get("invoice") || "");
  const [contactInput, setContactInput] = useState(searchParams.get("contact") || "");
  
  // Data State
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto fetch jika ada param invoice di URL
  useEffect(() => {
    const targetInvoice = invoice || searchParams.get("invoice");
    const targetContact = searchParams.get("contact");
    if (targetInvoice) {
      setInvoiceInput(targetInvoice);
      if (targetContact) setContactInput(targetContact);
      fetchTracking(targetInvoice, targetContact);
    }
  }, [invoice, searchParams]);

  async function fetchTracking(inv, contact) {
    if (!inv) return;
    setLoading(true);
    setHasSearched(true);
    try {
      let res;
      if (isGuest || contact) {
        res = await api.get(`/orders/track?invoice=${encodeURIComponent(inv)}&contact=${encodeURIComponent(contact || "")}`);
      } else {
        res = await api.get(`/orders/${encodeURIComponent(inv)}/timeline`);
      }
      setTrackingData(res.data);
    } catch (err) {
      setTrackingData(null);
      toast.error(errorMessage(err, "Pesanan tidak ditemukan"));
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!invoiceInput.trim()) {
      toast.error("Masukkan nomor invoice pesanan");
      return;
    }
    fetchTracking(invoiceInput.trim(), contactInput.trim());
  }

  function handleCopy(txt, label = "Nomor") {
    navigator.clipboard?.writeText(txt);
    toast.success(`${label} berhasil disalin!`);
  }

  const order = trackingData?.order || trackingData;
  const isClickAndCollect = order?.fulfillment_method === "click_and_collect";
  const timeline = trackingData?.timeline || [];

  // Tahapan Stepper
  const deliverySteps = [
    { key: "created", label: "Pesanan Dibuat", desc: "Verifikasi sistem" },
    { key: "paid", label: "Pembayaran Lunas", desc: "Alokasi serial number" },
    { key: "packed", label: "Packing Kayu & QC", desc: "10-Point Sensor Check" },
    { key: "shipped", label: "Dalam Pengiriman", desc: "Kurir kargo logistik" },
    { key: "delivered", label: "Pesanan Diterima", desc: "Garansi resmi aktif" },
  ];

  const pickupSteps = [
    { key: "created", label: "Pesanan Dibuat", desc: "Reservasi unit" },
    { key: "paid", label: "Pembayaran Lunas", desc: "Terbit Pickup Pass" },
    { key: "ready", label: "Siap di Showroom", desc: "Cleanroom bench ready" },
    { key: "collected", label: "Selesai Diuji & Diambil", desc: "Test bay handover" },
  ];

  const steps = isClickAndCollect ? pickupSteps : deliverySteps;

  function getStepStatus(stepKey, stepIdx) {
    if (!order) return "upcoming";
    const status = (order.status || order.order_status || "").toLowerCase();
    
    // Delivery Logic
    if (!isClickAndCollect) {
      if (status === "delivered" || status === "completed") return "completed";
      if (status === "shipped") {
        if (stepIdx <= 3) return stepIdx === 3 ? "active" : "completed";
        return "upcoming";
      }
      if (status === "packed") {
        if (stepIdx <= 2) return stepIdx === 2 ? "active" : "completed";
        return "upcoming";
      }
      if (status === "paid" || order.payment_status === "paid") {
        if (stepIdx <= 1) return stepIdx === 1 ? "active" : "completed";
        return "upcoming";
      }
      return stepIdx === 0 ? "active" : "upcoming";
    }

    // Click & Collect Logic
    if (order.ticket_status === "used" || order.pickup_status === "collected" || status === "completed") {
      return "completed";
    }
    if (order.pickup_status === "ready" || status === "packed") {
      if (stepIdx <= 2) return stepIdx === 2 ? "active" : "completed";
      return "upcoming";
    }
    if (status === "paid" || order.payment_status === "paid") {
      if (stepIdx <= 1) return stepIdx === 1 ? "active" : "completed";
      return "upcoming";
    }
    return stepIdx === 0 ? "active" : "upcoming";
  }

  return (
    <div className="min-h-screen fp-home-canvas pb-24">
      {/* Header Frosted Glass Bar */}
      <div className="fp-glass-bar py-8 sm:py-10 mb-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="fp-section-pill">
              <Truck size={13} className="text-[#E8622C]" aria-hidden="true" />
              <span>Live Omnichannel Order Stepper</span>
            </div>
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0F1B2D]">
            Lacak Status &amp; Timeline Pesanan
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-[#3A4A63] max-w-xl">
            Pantau proses pengemasan kayu, kalibrasi sensor, pengiriman ekspedisi, atau akses kode pengambilan unit (Pickup Pass) di showroom Focalpoint Pro.
          </p>

          {/* Form Pencarian untuk Tamu (Guest) */}
          {(isGuest || !trackingData) && (
            <form onSubmit={handleSearchSubmit} className="mt-6 fp-glass-card !p-5 sm:!p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="track-invoice-input" className="block text-xs font-semibold text-[#0F1B2D] mb-1.5">
                    Nomor Invoice Pesanan <span className="text-[#E8622C]">*</span>
                  </label>
                  <input
                    id="track-invoice-input"
                    type="text"
                    required
                    value={invoiceInput}
                    onChange={(e) => setInvoiceInput(e.target.value)}
                    placeholder="Contoh: INV-20261022-XXXXXX"
                    className="w-full rounded-full border border-white/80 bg-white/70 px-4 py-2.5 text-xs font-mono uppercase tabular-nums text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none"
                  />
                </div>
                {isGuest && (
                  <div>
                    <label htmlFor="track-contact-input" className="block text-xs font-semibold text-[#0F1B2D] mb-1.5">
                      Email / Nomor WhatsApp Pemesan <span className="text-[#E8622C]">*</span>
                    </label>
                    <input
                      id="track-contact-input"
                      type="text"
                      required
                      value={contactInput}
                      onChange={(e) => setContactInput(e.target.value)}
                      placeholder="Email atau No. HP saat checkout"
                      className="w-full rounded-full border border-white/80 bg-white/70 px-4 py-2.5 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none"
                    />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="fp-btn-glass-primary !py-2.5 !px-5 !text-xs w-full sm:w-auto"
              >
                <Search size={14} aria-hidden="true" />
                <span>{loading ? "Melacak Pesanan..." : "Lacak Status Pesanan"}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Konten Pelacakan Pesanan */}
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        {loading ? (
          <div className="space-y-4" role="status" aria-busy="true">
            <div className="h-44 rounded-3xl bg-white/60 skeleton" />
            <div className="h-64 rounded-3xl bg-white/60 skeleton" />
          </div>
        ) : trackingData && order ? (
          <div className="space-y-6">
            {/* Header Status Card */}
            <section className="fp-glass-card p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#0F1B2D]/10 pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-[#0F1B2D] bg-white/80 px-3 py-1 rounded-full border border-white/90 tabular-nums shadow-2xs">
                      {order.invoice_code}
                    </span>
                    <span className="rounded-full bg-[#0F1B2D]/[0.06] border border-[#0F1B2D]/12 px-3 py-1 text-xs font-bold text-[#3A4A63]">
                      {isClickAndCollect ? "Click & Collect Showroom" : "Ekspedisi Delivery"}
                    </span>
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0F1B2D]">
                    {order.product_title || order.product?.name || "Cinema Equipment"}
                  </h2>
                  <p className="text-xs text-[#3A4A63] mt-1 tabular-nums">
                    Total Transaksi: <strong className="text-[#0F1B2D] font-bold">{formatRupiah(order.total_price)}</strong> &bull; Dipesan: {formatDate(order.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => printInvoice(order)}
                    className="fp-btn-glass-secondary !py-2 !px-4 !text-xs"
                  >
                    <Printer size={14} aria-hidden="true" />
                    <span>Cetak Invoice PDF</span>
                  </button>
                </div>
              </div>

              {/* Stepper Timeline Visual */}
              <div className="py-8">
                <div className="relative">
                  <div className="hidden sm:block absolute top-5 left-8 right-8 h-0.5 bg-[#0F1B2D]/10" aria-hidden="true" />
                  <ol className={`grid grid-cols-1 ${isClickAndCollect ? "sm:grid-cols-4" : "sm:grid-cols-5"} gap-4 sm:gap-2`}>
                    {steps.map((st, idx) => {
                      const state = getStepStatus(st.key, idx);
                      return (
                        <li
                          key={st.key}
                          aria-current={state === "active" ? "step" : undefined}
                          className="relative flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2 text-left sm:text-center"
                        >
                          {/* Dot Circle */}
                          <div
                            className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all tabular-nums shadow-xs ${
                              state === "completed"
                                ? "border-[#0F1B2D] bg-[#0F1B2D] text-white"
                                : state === "active"
                                ? "border-[#E8622C] bg-white text-[#E8622C] ring-4 ring-[#E8622C]/20"
                                : "border-white/80 bg-white/70 text-[#3A4A63]"
                            }`}
                          >
                            {state === "completed" ? (
                              <CheckCircle2 size={18} aria-hidden="true" />
                            ) : (
                              <span className="text-xs font-bold">{idx + 1}</span>
                            )}
                          </div>
                          <div>
                            <p className={`text-xs font-bold leading-tight ${state === "upcoming" ? "text-[#3A4A63]" : "text-[#0F1B2D]"}`}>
                              {st.label}
                            </p>
                            <p className="text-[11px] text-[#3A4A63] mt-0.5 hidden sm:block">{st.desc}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>

              {/* Ekspedisi Resi Card ATAU Click & Collect Pickup Pass Card */}
              <div className="mt-2 rounded-2xl border border-white/80 bg-white/60 p-5 shadow-xs">
                {!isClickAndCollect ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#3A4A63]">
                        Ekspedisi &amp; Nomor Resi Pengiriman
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3">
                        <span className="text-base font-bold text-[#0F1B2D]">
                          {trackingData?.shipping_courier || order.shipping_courier || "JNE Trucking"}
                        </span>
                        {trackingData?.tracking_number ? (
                          <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white px-3.5 py-1 shadow-2xs">
                            <code className="text-xs font-bold text-[#0F1B2D] tracking-wider tabular-nums">
                              {trackingData.tracking_number}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopy(trackingData.tracking_number, "Nomor Resi")}
                              className="text-[#3A4A63] hover:text-[#0F1B2D] transition-colors p-1 cursor-pointer"
                              aria-label="Salin Nomor Resi"
                            >
                              <Copy size={13} aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <span className="rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-800 px-3 py-1 text-xs font-bold">
                            Menunggu Penjemputan Kurir
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-[#3A4A63]">
                        Alamat Tujuan: <span className="text-[#0F1B2D] font-medium">{order.shipping_address || "Alamat terdaftar"}</span>
                      </p>
                    </div>

                    {trackingData?.tracking_number && (
                      <a
                        href="https://berdu.id/cek-resi"
                        target="_blank"
                        rel="noreferrer"
                        className="fp-btn-glass-secondary !py-2 !px-4 !text-xs self-start sm:self-auto"
                      >
                        <span>Cek Resi Ekspedisi</span>
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#E8622C] flex items-center gap-1.5">
                        <Store size={14} aria-hidden="true" /> Showroom Pickup Pass
                      </div>
                      <p className="mt-1 text-xs text-[#3A4A63]">
                        Lokasi Pengambilan: <strong className="text-[#0F1B2D]">{trackingData?.branch?.name || "Focalpoint Pro Showroom"}</strong>
                      </p>
                      <p className="text-[11px] text-[#3A4A63] mt-0.5">
                        {trackingData?.branch?.address || "Jakarta Selatan"}
                      </p>
                    </div>

                    {trackingData?.pickup_code ? (
                      <div className="rounded-2xl border border-white/80 bg-white px-5 py-3 text-center shadow-xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#3A4A63]">
                          Kode Verifikasi Pickup
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <span className="font-mono text-lg font-extrabold tracking-widest text-[#0F1B2D] tabular-nums">
                            {trackingData.pickup_code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(trackingData.pickup_code, "Kode Pickup")}
                            className="text-[#3A4A63] hover:text-[#0F1B2D] transition-colors p-1 cursor-pointer"
                            aria-label="Salin Kode Pickup"
                          >
                            <Copy size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 px-3 py-1 text-xs font-bold">
                        Kode aktif setelah pembayaran lunas
                      </span>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Riwayat Kronologis Status History */}
            <section className="fp-glass-card p-6 sm:p-8">
              <h2 className="font-display text-base font-bold text-[#0F1B2D] mb-5 flex items-center gap-2">
                <Clock size={16} className="text-[#E8622C]" aria-hidden="true" /> Log Kronologis Perjalanan Pesanan
              </h2>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-[#0F1B2D]/10">
                {timeline.map((entry, idx) => (
                  <div key={entry.id || idx} className="relative">
                    <div className="absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F1B2D]">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-xs font-bold text-[#0F1B2D] uppercase tracking-wide">
                          {entry.status.replace(/_/g, " ")}
                        </p>
                        <span className="text-[11px] text-[#3A4A63] font-mono tabular-nums">
                          {formatDate(entry.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#3A4A63] leading-relaxed">
                        {entry.note || "Status pesanan telah diperbarui."}
                      </p>
                      {entry.actor && (
                        <p className="mt-0.5 text-[11px] text-[#3A4A63]/80">
                          Petugas: <span className="font-medium text-[#0F1B2D]">{entry.actor}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Help / Concierge Support Card */}
            <div className="fp-glass-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F1B2D] text-white shadow-xs">
                  <ShieldCheck size={20} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#0F1B2D]">Butuh Bantuan Pengiriman atau Klaim Garansi?</h3>
                  <p className="text-xs text-[#3A4A63] mt-0.5">
                    Tim Gear Concierge &amp; Teknisi Focalpoint Pro siap membantu verifikasi pesanan atau setup kamera Anda.
                  </p>
                </div>
              </div>
              <Link
                to="/help"
                className="fp-btn-glass-secondary !py-2 !px-4 !text-xs shrink-0"
              >
                <span>Pusat Bantuan</span>
                <ChevronRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : hasSearched ? (
          <div className="fp-glass-card !p-12 text-center" role="alert">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-3 border border-rose-200">
              <AlertCircle size={24} aria-hidden="true" />
            </div>
            <h2 className="font-display text-base font-bold text-[#0F1B2D]">Pesanan Tidak Ditemukan</h2>
            <p className="mt-1 text-xs text-[#3A4A63] max-w-sm mx-auto">
              Periksa kembali nomor invoice dan email atau nomor WhatsApp yang Anda masukkan saat checkout.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

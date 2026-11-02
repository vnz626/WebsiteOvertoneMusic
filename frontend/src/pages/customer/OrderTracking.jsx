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
      toast.error(errorMessage(err, "Pesanan tidak ditemukan atau kontak tidak cocok"));
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
    if (isGuest && !contactInput.trim()) {
      toast.error("Masukkan email atau nomor WhatsApp untuk verifikasi");
      return;
    }
    fetchTracking(invoiceInput.trim(), contactInput.trim());
  }

  function handleCopy(text, type) {
    navigator.clipboard.writeText(text);
    if (type === "resi") {
      toast.success("Nomor resi berhasil disalin!");
    } else {
      toast.success("Kode pickup berhasil disalin!");
    }
  }

  const order = trackingData?.order;
  const timeline = trackingData?.timeline || [];
  const fulfillment = trackingData?.fulfillment_method || order?.fulfillment_method || "delivery";
  const isClickAndCollect = fulfillment === "click_and_collect";
  const currentStatus = (trackingData?.current_status || order?.order_status || "processing").toLowerCase();

  // Helper urutan tahapan stepper
  const steps = isClickAndCollect
    ? [
        { key: "created", label: "Pesanan Dibuat", desc: "Invoice diterbitkan" },
        { key: "paid", label: "Pembayaran Lunas", desc: "Inspeksi instrumen" },
        { key: "ready_for_pickup", label: "Siap Diambil", desc: "Tersedia di Offline Store" },
        { key: "completed", label: "Selesai", desc: "Instrumen diserahterimakan" },
      ]
    : [
        { key: "created", label: "Pesanan Dibuat", desc: "Invoice diterbitkan" },
        { key: "paid", label: "Pembayaran Lunas", desc: "Inspeksi luthier" },
        { key: "packed", label: "Packing Kayu QC", desc: "Proteksi hardbox aman" },
        { key: "shipped", label: "Dalam Pengiriman", desc: "Diserahkan ke kurir" },
        { key: "completed", label: "Terkirim", desc: "Pesanan diterima" },
      ];

  function getStepStatus(stepKey, idx) {
    const statusOrderDelivery = ["pending", "processing", "packed", "shipped", "delivered", "completed"];
    const statusOrderPickup = ["pending", "processing", "ready_for_pickup", "completed"];

    const currentOrder = isClickAndCollect ? statusOrderPickup : statusOrderDelivery;
    let normalizedCurrent = currentStatus;
    if (normalizedCurrent === "delivered") normalizedCurrent = "completed";

    let currentIdx = currentOrder.indexOf(normalizedCurrent);
    if (currentIdx === -1) currentIdx = 1;

    if (idx < currentIdx) return "completed";
    if (idx === currentIdx) return "active";
    return "upcoming";
  }

  return (
    <div className="min-h-screen bg-canvas text-ink pb-20">
      {/* Top Breadcrumb & Title */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-ink-muted mb-2">
            <Link to="/" className="hover:text-ink transition-colors">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link to="/orders" className="hover:text-ink transition-colors">Pesanan</Link>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-ink">Lacak Pengiriman</span>
          </nav>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent block mb-1">
            Live Fulfillment Status
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            Pelacakan Pesanan &amp; Status Pemenuhan
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-secondary max-w-[65ch]">
            Pantau perjalanan instrumen musik Anda secara real-time dari meja inspeksi luthier hingga serah terima.
          </p>

          {/* Form Pencarian Tamu / Manual Lookup */}
          {(isGuest || !trackingData) && (
            <form onSubmit={handleSearchSubmit} className="mt-6 rounded-md border border-line bg-surface-muted p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="track-invoice-input" className="block text-xs font-semibold text-ink mb-1.5">
                    Nomor Invoice Pesanan <span className="text-accent">*</span>
                  </label>
                  <input
                    id="track-invoice-input"
                    type="text"
                    required
                    value={invoiceInput}
                    onChange={(e) => setInvoiceInput(e.target.value)}
                    placeholder="Contoh: INV-20261022-XXXXXX"
                    className="ot-input font-mono uppercase tabular-nums"
                  />
                </div>
                {isGuest && (
                  <div>
                    <label htmlFor="track-contact-input" className="block text-xs font-semibold text-ink mb-1.5">
                      Email / Nomor WhatsApp Pemesan <span className="text-accent">*</span>
                    </label>
                    <input
                      id="track-contact-input"
                      type="text"
                      required
                      value={contactInput}
                      onChange={(e) => setContactInput(e.target.value)}
                      placeholder="Email atau No. HP saat checkout"
                      className="ot-input"
                    />
                  </div>
                )}
              </div>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <Search size={14} aria-hidden="true" />
                {loading ? "Melacak Pesanan..." : "Lacak Status Pesanan"}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Konten Pelacakan Pesanan */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {loading ? (
          <div className="space-y-4" role="status" aria-busy="true">
            <div className="h-44 rounded-md bg-surface border border-line p-6 skeleton" />
            <div className="h-64 rounded-md bg-surface border border-line p-6 skeleton" />
          </div>
        ) : trackingData && order ? (
          <div className="space-y-6">
            {/* Header Status Card */}
            <section className="rounded-md border border-line bg-surface p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-ink bg-surface-muted px-2.5 py-1 rounded-xs border border-line tabular-nums">
                      {order.invoice_code}
                    </span>
                    <Badge status="info">
                      {isClickAndCollect ? "Click & Collect Offline Store" : "Ekspedisi Delivery"}
                    </Badge>
                  </div>
                  <h2 className="font-display text-xl font-bold text-ink">
                    {order.product_title || order.product?.name || "Instrumen Musik"}
                  </h2>
                  <p className="text-xs text-ink-secondary mt-1 tabular-nums">
                    Total Transaksi: <strong className="text-ink font-bold">{formatRupiah(order.total_price)}</strong> &bull; Dipesan: {formatDate(order.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => printInvoice(order)}
                  >
                    <Printer size={14} aria-hidden="true" /> Cetak Invoice PDF
                  </Button>
                </div>
              </div>

              {/* Stepper Timeline Visual */}
              <div className="py-6">
                <div className="relative">
                  <div className="hidden sm:block absolute top-5 left-6 right-6 h-px bg-line" aria-hidden="true" />
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
                            className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors tabular-nums ${
                              state === "completed"
                                ? "border-ink bg-ink text-canvas"
                                : state === "active"
                                ? "border-accent bg-surface text-accent ring-4 ring-accent-soft"
                                : "border-line bg-surface text-ink-muted"
                            }`}
                          >
                            {state === "completed" ? (
                              <CheckCircle2 size={18} aria-hidden="true" />
                            ) : (
                              <span className="text-xs font-bold">{idx + 1}</span>
                            )}
                          </div>
                          <div>
                            <p className={`text-xs font-bold leading-tight ${state === "upcoming" ? "text-ink-muted" : "text-ink"}`}>
                              {st.label}
                            </p>
                            <p className="text-[11px] text-ink-muted mt-0.5 hidden sm:block">{st.desc}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>

              {/* Ekspedisi Resi Card ATAU Click & Collect Pickup Pass Card */}
              <div className="mt-2 rounded-sm border border-line bg-surface-muted p-5">
                {!isClickAndCollect ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Ekspedisi &amp; Nomor Resi Pengiriman
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3">
                        <span className="text-base font-bold text-ink">
                          {trackingData?.shipping_courier || order.shipping_courier || "JNE Trucking"}
                        </span>
                        {trackingData?.tracking_number ? (
                          <div className="flex items-center gap-2 rounded-xs border border-line-strong bg-surface px-3 py-1">
                            <code className="text-xs font-bold text-ink tracking-wider tabular-nums">
                              {trackingData.tracking_number}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopy(trackingData.tracking_number, "resi")}
                              className="text-ink-muted hover:text-ink transition-colors"
                              aria-label="Salin Nomor Resi"
                            >
                              <Copy size={13} aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <Badge status="processing">Menunggu Penjemputan Kurir</Badge>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-ink-secondary">
                        Alamat Tujuan: <span className="text-ink font-medium">{order.shipping_address || "Alamat terdaftar"}</span>
                      </p>
                    </div>

                    {trackingData?.tracking_number && (
                      <a
                        href="https://berdu.id/cek-resi"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-sm bg-surface border border-line px-4 py-2 text-xs font-semibold text-ink hover:border-line-strong transition-colors self-start sm:self-auto"
                      >
                        Cek Resi Ekspedisi <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                        <Store size={14} aria-hidden="true" /> Offline Store Pickup Pass
                      </div>
                      <p className="mt-1 text-xs text-ink-secondary">
                        Lokasi Pengambilan: <strong className="text-ink">{trackingData?.branch?.name || "Overtone Offline Store"}</strong>
                      </p>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        {trackingData?.branch?.address || "Jakarta Selatan"}
                      </p>
                    </div>

                    {trackingData?.pickup_code ? (
                      <div className="rounded-sm border border-line-strong bg-surface px-4 py-3 text-center">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                          Kode Verifikasi Pickup
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <span className="font-mono text-lg font-bold tracking-widest text-ink tabular-nums">
                            {trackingData.pickup_code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(trackingData.pickup_code, "pickup")}
                            className="text-ink-muted hover:text-ink transition-colors p-1"
                            aria-label="Salin Kode Pickup"
                          >
                            <Copy size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Badge status="warning">Kode aktif setelah pembayaran lunas</Badge>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Riwayat Kronologis Status History */}
            <section className="rounded-md border border-line bg-surface p-6 sm:p-7">
              <h2 className="font-display text-base font-bold text-ink mb-5 flex items-center gap-2">
                <Clock size={16} className="text-accent" aria-hidden="true" /> Log Kronologis Perjalanan Pesanan
              </h2>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-line">
                {timeline.map((entry, idx) => (
                  <div key={entry.id || idx} className="relative">
                    <div className="absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink">
                      <div className="h-1.5 w-1.5 rounded-full bg-canvas" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-xs font-bold text-ink uppercase tracking-wide">
                          {entry.status.replace(/_/g, " ")}
                        </p>
                        <span className="text-[11px] text-ink-muted font-mono tabular-nums">
                          {formatDate(entry.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink-secondary leading-relaxed">
                        {entry.note || "Status pesanan telah diperbarui."}
                      </p>
                      {entry.actor && (
                        <p className="mt-0.5 text-[11px] text-ink-muted">
                          Petugas: <span className="font-medium text-ink-secondary">{entry.actor}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Help / Concierge Support Card */}
            <div className="rounded-md border border-line bg-surface p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-ink text-canvas">
                  <ShieldCheck size={20} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-ink">Butuh Bantuan Pengiriman atau Klaim Garansi?</h3>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    Tim Gear Concierge &amp; Luthier siap membantu verifikasi pesanan atau setup instrumen Anda.
                  </p>
                </div>
              </div>
              <Link
                to="/help"
                className="inline-flex items-center gap-1 rounded-sm border border-line bg-surface-muted px-4 py-2 text-xs font-semibold text-ink hover:border-line-strong transition-colors shrink-0"
              >
                Pusat Bantuan <ChevronRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : hasSearched ? (
          <div className="rounded-md border border-dashed border-line-strong bg-surface p-12 text-center" role="alert">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-status-danger-bg text-status-danger mb-3">
              <AlertCircle size={24} aria-hidden="true" />
            </div>
            <h2 className="font-display text-base font-bold text-ink">Pesanan Tidak Ditemukan</h2>
            <p className="mt-1 text-xs text-ink-secondary max-w-sm mx-auto">
              Periksa kembali nomor invoice dan email atau nomor WhatsApp yang Anda masukkan saat checkout.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

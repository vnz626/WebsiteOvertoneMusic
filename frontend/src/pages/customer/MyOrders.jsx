import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Package, Truck, Store, CreditCard, Copy,
  Clock, RotateCcw, Printer, ArrowRight
} from "lucide-react";
import api from "../../api";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonGrid } from "../../components/ui/Skeleton";
import { errorMessage, fileUrl, formatDate, formatRupiah } from "../../utils/format";
import { printInvoice } from "../../utils/printInvoice";

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMethod, setFilterMethod] = useState("all"); // 'all' | 'delivery' | 'click_and_collect'
  const [payingCode, setPayingCode] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  function fetchOrders() {
    api
      .get("/orders/my")
      .then((res) => setOrders(res.data.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }

  async function handleSimulatePayment(invoiceCode) {
    setPayingCode(invoiceCode);
    try {
      const res = await api.post(`/orders/${invoiceCode}/pay`);
      toast.success(res.data.message || "Pembayaran lunas! Pesanan segera disiapkan.");
      fetchOrders();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal memproses simulasi"));
    } finally {
      setPayingCode(null);
    }
  }

  function copyText(txt, label = "Teks") {
    navigator.clipboard?.writeText(txt);
    toast.success(`${label} berhasil disalin!`);
  }

  const filteredOrders = orders.filter((o) => {
    if (filterMethod === "delivery") return o.fulfillment_method === "delivery";
    if (filterMethod === "click_and_collect") return o.fulfillment_method === "click_and_collect";
    return true;
  });

  return (
    <div className="min-h-screen fp-home-canvas pb-24 px-4 sm:px-6 lg:px-12 pt-8">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#0F1B2D]/10 pb-6">
          <div>
            <div className="fp-section-pill mb-2">
              <span className="fp-section-pill-dot" aria-hidden="true" />
              <span>Riwayat Transaksi &amp; Garansi</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F1B2D] tracking-tight">
              Pesanan Saya &amp; E-Invoice Resmi
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#3A4A63] max-w-2xl">
              Pantau status pengiriman ekspedisi, cetak e-invoice resmi ber-serial number, dan simpan kode ambil unit (Click &amp; Collect) di Showroom Focalpoint Pro.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/returns"
              className="fp-btn-glass-secondary !py-2.5 !px-4 !text-xs"
            >
              <RotateCcw size={14} className="text-[#E8622C]" aria-hidden="true" />
              <span>Klaim Retur / Garansi</span>
            </Link>
            <Link
              to="/products"
              className="fp-btn-glass-primary !py-2.5 !px-4 !text-xs"
            >
              <span>Belanja Gear Lain</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#0F1B2D]/10 pb-4" role="tablist" aria-label="Filter metode pesanan">
          <button
            type="button"
            role="tab"
            aria-selected={filterMethod === "all"}
            onClick={() => setFilterMethod("all")}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all tabular-nums cursor-pointer ${
              filterMethod === "all"
                ? "bg-[#0F1B2D] text-white shadow-xs"
                : "bg-white/70 border border-white/80 text-[#3A4A63] hover:bg-white hover:text-[#0F1B2D]"
            }`}
          >
            Semua Pesanan ({orders.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterMethod === "delivery"}
            onClick={() => setFilterMethod("delivery")}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 tabular-nums cursor-pointer ${
              filterMethod === "delivery"
                ? "bg-[#0F1B2D] text-white shadow-xs"
                : "bg-white/70 border border-white/80 text-[#3A4A63] hover:bg-white hover:text-[#0F1B2D]"
            }`}
          >
            <Truck size={14} aria-hidden="true" /> Dikirim Ekspedisi ({orders.filter(o => o.fulfillment_method === "delivery").length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterMethod === "click_and_collect"}
            onClick={() => setFilterMethod("click_and_collect")}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 tabular-nums cursor-pointer ${
              filterMethod === "click_and_collect"
                ? "bg-[#0F1B2D] text-white shadow-xs"
                : "bg-white/70 border border-white/80 text-[#3A4A63] hover:bg-white hover:text-[#0F1B2D]"
            }`}
          >
            <Store size={14} aria-hidden="true" /> Showroom Pickup ({orders.filter(o => o.fulfillment_method === "click_and_collect").length})
          </button>
        </div>

        {/* Orders List */}
        <div>
          {loading ? (
            <SkeletonGrid />
          ) : filteredOrders.length === 0 ? (
            <div className="fp-glass-card !p-12 text-center">
              <EmptyState
                title="Belum Ada Pesanan"
                description="Anda belum memiliki riwayat pesanan cinema gear pada kategori pemenuhan ini."
                action={
                  <Link to="/products" className="fp-btn-glass-primary !py-2.5 !px-5 mt-4">
                    Buka Katalog Focalpoint Pro
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredOrders.map((o) => {
                const isPaid = o.status === "paid" || o.payment_status === "paid";
                const isClickAndCollect = o.fulfillment_method === "click_and_collect";
                const isHandedOver = o.ticket_status === "used" || o.order_status === "completed" || o.pickup_status === "collected";
                const hasTracking = Boolean(o.tracking_number);

                return (
                  <article
                    key={o.id}
                    className="fp-glass-card p-6 flex flex-col justify-between"
                  >
                    <div>
                      {/* Header Card */}
                      <div className="flex items-start justify-between gap-3 border-b border-[#0F1B2D]/10 pb-3">
                        <div>
                          <div className="flex items-center gap-2 tabular-nums">
                            <span className="font-mono text-xs font-bold text-[#0F1B2D]">
                              {o.invoice_code}
                            </span>
                            <span className="text-[11px] text-[#3A4A63]">&bull; {formatDate(o.created_at)}</span>
                          </div>
                          <p className="text-[11px] text-[#3A4A63] mt-0.5">
                            Pembeli: <span className="font-semibold text-[#0F1B2D]">{o.buyer_name || o.buyer_email}</span>
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            isPaid
                              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-800"
                              : "bg-amber-500/15 border border-amber-500/30 text-amber-800"
                          }`}
                        >
                          {isPaid ? "Lunas / Paid" : "Menunggu Pembayaran"}
                        </span>
                      </div>

                      {/* Product Preview */}
                      <div className="py-4 flex gap-3.5 border-b border-[#0F1B2D]/10">
                        <div className="h-16 w-16 shrink-0 fp-glass-stage flex items-center justify-center p-1 overflow-hidden">
                          {o.product?.image_url || o.event?.image_url ? (
                            <img
                              src={fileUrl(o.product?.image_url || o.event?.image_url)}
                              alt={o.product_name || o.event_title || "Hardware"}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Package size={22} className="text-[#3A4A63]" aria-hidden="true" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#E8622C]">
                            {o.product?.brand?.name || o.product?.brand || "Focalpoint Pro Authorized"}
                          </p>
                          <h3 className="text-sm font-bold text-[#0F1B2D] truncate mt-0.5">
                            {o.product_name || o.event_title || "Cinema Gear"}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[#3A4A63]">
                            <span>Varian: <strong className="text-[#0F1B2D]">{o.variant_name || o.tier_name || "Standar"}</strong></span>
                            <span>&bull;</span>
                            <span className="tabular-nums font-semibold text-[#0F1B2D]">{o.quantity} unit</span>
                          </div>
                        </div>
                      </div>

                      {/* Fulfillment Method Box */}
                      <div className="py-3 text-xs">
                        {isClickAndCollect ? (
                          <div className="rounded-2xl border border-white/80 bg-white/60 p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold flex items-center gap-1.5 text-[#0F1B2D]">
                                <Store size={14} className="text-[#E8622C]" aria-hidden="true" />
                                Click &amp; Collect di Showroom
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                  isHandedOver
                                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-800"
                                    : "bg-blue-500/15 border border-blue-500/30 text-blue-800"
                                }`}
                              >
                                {isHandedOver ? "Unit Sudah Diambil" : "Siap Diambil di Showroom"}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#3A4A63]">
                              Lokasi: <strong className="text-[#0F1B2D]">{o.store_branch?.name || o.venue?.name || "Showroom Resmi"}</strong> ({o.store_branch?.city || o.venue?.city || "Kota Showroom"})
                            </p>
                            {o.pickup_code && (
                              <div className="flex items-center justify-between rounded-xl bg-white/80 border border-white px-3 py-1.5 mt-1">
                                <span className="text-[11px] text-[#3A4A63]">Kode Pickup:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-extrabold text-[#0F1B2D] text-xs tracking-wider">
                                    {o.pickup_code}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyText(o.pickup_code, "Kode Pickup")}
                                    className="text-[#3A4A63] hover:text-[#0F1B2D] p-1 cursor-pointer"
                                    title="Salin Kode Pickup"
                                  >
                                    <Copy size={12} aria-hidden="true" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-white/80 bg-white/60 p-3.5 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold flex items-center gap-1.5 text-[#0F1B2D]">
                                <Truck size={14} className="text-[#E8622C]" aria-hidden="true" />
                                Ekspedisi {o.courier_name || "Kargo Berasuransi"}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border border-white text-[#3A4A63]">
                                Packing Kayu Aman
                              </span>
                            </div>
                            <p className="text-[11px] text-[#3A4A63] line-clamp-1">
                              Alamat: {o.shipping_address || "Alamat Sesuai Profil"}
                            </p>
                            {hasTracking ? (
                              <div className="flex items-center justify-between rounded-xl bg-white/80 border border-white px-3 py-1.5 mt-1">
                                <span className="text-[11px] text-[#3A4A63]">No. Resi:</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-[#0F1B2D] text-xs">{o.tracking_number}</span>
                                  <button
                                    type="button"
                                    onClick={() => copyText(o.tracking_number, "Nomor Resi")}
                                    className="text-[#3A4A63] hover:text-[#0F1B2D] p-1 cursor-pointer"
                                    title="Salin No Resi"
                                  >
                                    <Copy size={12} aria-hidden="true" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[11px] text-amber-700 italic">
                                Sedang proses packing kayu &amp; inspeksi sensor di gudang pusat.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Total Price & Actions */}
                    <div className="mt-4 pt-3 border-t border-[#0F1B2D]/10 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] text-[#3A4A63] block">Total Transaksi</span>
                        <span className="font-display font-extrabold text-base text-[#0F1B2D] tabular-nums">
                          {formatRupiah(o.total_price || o.total_amount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Tombol Cetak Invoice PDF */}
                        <button
                          type="button"
                          onClick={() => printInvoice(o)}
                          className="fp-btn-glass-secondary !py-2 !px-3 !text-xs"
                          title="Cetak E-Invoice Resmi PDF"
                        >
                          <Printer size={13} aria-hidden="true" />
                          <span>PDF</span>
                        </button>

                        {!isPaid ? (
                          <button
                            type="button"
                            onClick={() => handleSimulatePayment(o.invoice_code)}
                            disabled={payingCode === o.invoice_code}
                            className="fp-btn-glass-primary !py-2 !px-3.5 !text-xs"
                          >
                            <CreditCard size={13} aria-hidden="true" />
                            <span>{payingCode === o.invoice_code ? "Memproses..." : "Bayar Sekarang"}</span>
                          </button>
                        ) : (
                          <Link
                            to={`/orders/${o.invoice_code}`}
                            className="fp-btn-glass-primary !py-2 !px-3.5 !text-xs"
                          >
                            <span>Lacak Timeline</span>
                            <ArrowRight size={13} aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

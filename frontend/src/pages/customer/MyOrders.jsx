import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Package, Truck, Store, CreditCard, Copy,
  Clock, RotateCcw, Printer
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
    <div className="min-h-screen bg-canvas text-ink py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-line pb-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent block mb-1">
              Riwayat Pembelian &amp; Garansi
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              Riwayat Pesanan Instrumen
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-secondary max-w-[65ch]">
              Pantau status pengiriman ekspedisi, cetak e-invoice resmi, dan simpan kode ambil barang (Click &amp; Collect) di Offline Store Overtone.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/returns"
              className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-ink hover:border-line-strong transition-colors"
            >
              <RotateCcw size={14} className="text-accent" aria-hidden="true" /> Klaim Retur / Garansi
            </Link>
            <Button
              onClick={() => navigate("/products")}
              variant="primary"
              size="md"
            >
              Belanja Instrumen Lain
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-line pb-3" role="tablist" aria-label="Filter metode pesanan">
          <button
            type="button"
            role="tab"
            aria-selected={filterMethod === "all"}
            onClick={() => setFilterMethod("all")}
            className={`rounded-sm px-4 py-2 text-xs font-semibold transition-colors tabular-nums ${
              filterMethod === "all"
                ? "bg-ink text-canvas"
                : "bg-surface border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
            }`}
          >
            Semua Pesanan ({orders.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterMethod === "delivery"}
            onClick={() => setFilterMethod("delivery")}
            className={`rounded-sm px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 tabular-nums ${
              filterMethod === "delivery"
                ? "bg-ink text-canvas"
                : "bg-surface border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
            }`}
          >
            <Truck size={14} aria-hidden="true" /> Dikirim Ekspedisi ({orders.filter(o => o.fulfillment_method === "delivery").length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterMethod === "click_and_collect"}
            onClick={() => setFilterMethod("click_and_collect")}
            className={`rounded-sm px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1.5 tabular-nums ${
              filterMethod === "click_and_collect"
                ? "bg-ink text-canvas"
                : "bg-surface border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
            }`}
          >
            <Store size={14} aria-hidden="true" /> Offline Store Pickup ({orders.filter(o => o.fulfillment_method === "click_and_collect").length})
          </button>
        </div>

        {/* Orders List */}
        <div>
          {loading ? (
            <SkeletonGrid />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              title="Belum Ada Pesanan"
              description="Anda belum memiliki riwayat pesanan instrumen musik pada kategori pemenuhan ini."
              action={
                <Button onClick={() => navigate("/products")} variant="primary" size="sm">
                  Buka Katalog Overtone
                </Button>
              }
            />
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
                    className="relative overflow-hidden rounded-md border border-line bg-surface p-5 transition-colors hover:border-line-strong flex flex-col justify-between"
                  >
                    <div>
                      {/* Header Card */}
                      <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
                        <div>
                          <div className="flex items-center gap-2 tabular-nums">
                            <span className="font-mono text-xs font-bold text-ink">
                              {o.invoice_code}
                            </span>
                            <span className="text-[11px] text-ink-muted">&bull; {formatDate(o.created_at)}</span>
                          </div>
                          <p className="text-[11px] text-ink-secondary mt-0.5">
                            Pembeli: <span className="font-semibold text-ink">{o.buyer_name || o.buyer_email}</span>
                          </p>
                        </div>
                        <Badge status={isPaid ? "paid" : "pending"}>
                          {isPaid ? "Lunas / Paid" : "Menunggu Pembayaran"}
                        </Badge>
                      </div>

                      {/* Product Preview */}
                      <div className="py-4 border-b border-line flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {o.product?.image_url ? (
                            <img
                              src={fileUrl(o.product.image_url)}
                              alt={o.product?.name || "Instrumen"}
                              loading="lazy"
                              className="h-14 w-14 rounded-sm object-contain border border-line shrink-0 bg-surface-muted p-1"
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-sm bg-surface-muted border border-line flex items-center justify-center shrink-0 text-ink-muted">
                              <Package size={20} aria-hidden="true" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                              {o.product?.brand?.name || o.product?.organizer || "Overtone Official"}
                            </p>
                            <h2 className="font-display font-bold text-sm text-ink truncate">
                              {o.product?.name || "Instrumen Musik"}
                            </h2>
                            <p className="text-xs text-ink-secondary tabular-nums">
                              Varian: <span className="font-semibold text-ink">{o.variant?.variant_name || o.tier_name || o.variant_name || "Standard Model"}</span> &bull; {o.quantity || 1} Unit
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 tabular-nums">
                          <p className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">Total Tagihan</p>
                          <p className="text-sm font-bold text-ink">
                            {formatRupiah(o.total_price)}
                          </p>
                        </div>
                      </div>

                      {/* Fulfillment Details */}
                      <div className="py-3">
                        {isClickAndCollect ? (
                          <div className="rounded-sm border border-line bg-surface-muted p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 font-bold text-ink text-xs">
                                <Store size={14} className="text-accent" aria-hidden="true" /> Ambil di Offline Store Overtone
                              </span>
                              <Badge status={isHandedOver ? "completed" : "info"}>
                                {isHandedOver ? "Sudah Diambil" : "Siap Diambil"}
                              </Badge>
                            </div>

                            <div className="text-xs text-ink-secondary font-medium">
                              Lokasi: <strong className="text-ink">{o.pickup_branch?.name || "Overtone Offline Store — Senayan City"}</strong>
                            </div>

                            {/* Pickup Code Display (Tactile Pass Card) */}
                            {(o.pickup_code || o.ticket_code) && (
                              <div className="flex items-center justify-between bg-surface rounded-sm p-3 border border-line-strong">
                                <div>
                                  <p className="text-[10px] text-accent font-bold uppercase tracking-wider">OFFLINE STORE PICKUP PASS</p>
                                  <p className="font-mono text-sm font-bold text-ink tracking-widest tabular-nums mt-0.5">
                                    {o.pickup_code || o.ticket_code}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => copyText(o.pickup_code || o.ticket_code, "Kode Pickup")}
                                  className="inline-flex items-center gap-1.5 text-xs text-ink font-semibold hover:bg-surface-muted bg-canvas border border-line px-2.5 py-1.5 rounded-xs transition-colors"
                                >
                                  <Copy size={12} aria-hidden="true" /> Salin Kode
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-sm border border-line bg-surface-muted p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 font-bold text-ink text-xs">
                                <Truck size={14} className="text-accent" aria-hidden="true" /> Ekspedisi: {o.shipping_courier || "JNE Trucking"}
                              </span>
                              <Badge status={hasTracking ? "shipped" : "processing"}>
                                {hasTracking ? "Sedang Dikirim" : "Inspeksi & Packing"}
                              </Badge>
                            </div>

                            {hasTracking ? (
                              <div className="flex items-center justify-between bg-surface rounded-sm p-2.5 border border-line">
                                <div>
                                  <p className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">NOMOR RESI PENGIRIMAN</p>
                                  <p className="font-mono text-xs font-bold text-ink tracking-wider tabular-nums mt-0.5">
                                    {o.tracking_number}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => copyText(o.tracking_number, "Nomor Resi")}
                                  className="inline-flex items-center gap-1.5 text-xs text-ink font-semibold hover:bg-surface-muted bg-canvas border border-line px-2.5 py-1.5 rounded-xs transition-colors"
                                >
                                  <Copy size={12} aria-hidden="true" /> Salin Resi
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs text-ink-secondary flex items-center gap-1.5">
                                <Clock size={13} className="text-status-warning shrink-0" aria-hidden="true" /> Proses quality check luthier &amp; packing kayu di Gudang Pusat.
                              </p>
                            )}

                            {o.shipping_address && (
                              <p className="text-[11px] text-ink-muted truncate">
                                Tujuan: {o.shipping_address}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-line flex flex-wrap gap-2">
                      <Link
                        to={`/orders/${o.invoice_code}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-sm border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-muted transition-colors"
                      >
                        <Truck size={13} className="text-accent" aria-hidden="true" /> Lacak Timeline
                      </Link>

                      <button
                        type="button"
                        onClick={() => printInvoice(o)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-sm border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-muted transition-colors"
                        title="Cetak E-Invoice PDF Resmi"
                      >
                        <Printer size={13} aria-hidden="true" /> Cetak Invoice
                      </button>

                      {(["delivered", "completed"].includes(o.order_status) || isHandedOver) && (
                        <Link
                          to="/returns"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-sm border border-line bg-surface-muted text-ink hover:border-line-strong transition-colors"
                        >
                          <RotateCcw size={13} className="text-accent" aria-hidden="true" /> Klaim Retur
                        </Link>
                      )}

                      {!isPaid && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          disabled={payingCode === o.invoice_code}
                          loading={payingCode === o.invoice_code}
                          onClick={() => handleSimulatePayment(o.invoice_code)}
                        >
                          <CreditCard size={13} aria-hidden="true" /> {payingCode === o.invoice_code ? "Memproses..." : "Bayar Sekarang"}
                        </Button>
                      )}
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

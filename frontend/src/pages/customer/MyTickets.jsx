import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FileText, Package, Truck, Store, Zap, QrCode, Copy,
  CheckCircle2, Clock, AlertCircle, ExternalLink
} from "lucide-react";
import api from "../../api";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonGrid } from "../../components/ui/Skeleton";
import { errorMessage, fileUrl, formatDate, formatRupiah } from "../../utils/format";

async function downloadPdf(path, filename) {
  try {
    const res = await api.get(path, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast.error(errorMessage(err, "Gagal mengunduh dokumen"));
  }
}

export default function MyTickets() {
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
    <div className="min-h-screen bg-white text-gray-900 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl tracking-tight">
              Pesanan Instrumen Saya
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-600">
              Pantau status pengiriman ekspedisi, nomor resi kurir, dan kode ambil barang (Click &amp; Collect) di Showroom Overtone.
            </p>
          </div>
          <Button
            onClick={() => navigate("/products")}
            className="bg-[#111111] hover:bg-black text-white font-medium text-xs px-5 py-2.5 rounded-xl shadow-sm"
          >
            + Belanja Instrumen Lain
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="mt-6 flex gap-2 border-b border-gray-100 pb-3">
          <button
            onClick={() => setFilterMethod("all")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              filterMethod === "all"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Semua ({orders.length})
          </button>
          <button
            onClick={() => setFilterMethod("delivery")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterMethod === "delivery"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Truck size={13} /> Dikirim Ekspedisi ({orders.filter(o => o.fulfillment_method === "delivery").length})
          </button>
          <button
            onClick={() => setFilterMethod("click_and_collect")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
              filterMethod === "click_and_collect"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Store size={13} /> Showroom Pickup ({orders.filter(o => o.fulfillment_method === "click_and_collect").length})
          </button>
        </div>

        {/* Orders List */}
        <div className="mt-6">
          {loading ? (
            <SkeletonGrid />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              title="Belum Ada Pesanan"
              description="Anda belum memiliki riwayat pesanan instrumen musik di kategori ini."
              action={
                <Button onClick={() => navigate("/products")} className="bg-black text-white font-medium text-xs mt-3">
                  Buka Katalog Overtone
                </Button>
              }
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredOrders.map((o) => {
                const isPaid = o.status === "paid";
                const isClickAndCollect = o.fulfillment_method === "click_and_collect";
                const isHandedOver = o.ticket_status === "used" || o.order_status === "completed";
                const hasTracking = Boolean(o.tracking_number);

                return (
                  <div
                    key={o.id}
                    className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition-all hover:border-gray-900"
                  >
                    {/* Status accent bar */}
                    <div
                      className={`absolute top-0 inset-x-0 h-1 ${
                        isPaid ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />

                    {/* Header Card */}
                    <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-900">
                            {o.invoice_code}
                          </span>
                          <span className="text-[11px] text-gray-400">&bull; {formatDate(o.created_at)}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Metode: <b className="text-gray-800">{isClickAndCollect ? "Click & Collect (Showroom)" : "Pengiriman Ekspedisi"}</b>
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {isPaid ? "Lunas (Paid)" : "Menunggu Pembayaran"}
                        </span>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="py-3.5 flex gap-3 border-b border-gray-100">
                      <div className="h-16 w-16 shrink-0 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden p-1">
                        {o.event?.image_url ? (
                          <img src={fileUrl(o.event.image_url)} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <Package size={22} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-gray-900 truncate">
                          {o.event?.name || "Instrumen Musik"}
                        </h3>
                        {o.ticket_tier && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Finishing: <span className="text-gray-800 font-medium">{o.ticket_tier.color_finish || o.ticket_tier.tier_name}</span>
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {o.quantity} unit &times; <span className="text-gray-900 font-bold">{formatRupiah(o.total_price)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Fulfillment Specific Display */}
                    <div className="py-3 text-xs">
                      {isClickAndCollect ? (
                        /* Click & Collect Card */
                        <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-3.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-bold text-cyan-800">
                              <Store size={15} /> Showroom Pickup Pass
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isHandedOver
                                  ? "bg-gray-200 text-gray-600"
                                  : "bg-cyan-100 text-cyan-800"
                              }`}
                            >
                              {isHandedOver ? "Sudah Diambil" : "Siap Diambil di Showroom"}
                            </span>
                          </div>

                          {/* Pickup Code Display */}
                          {(o.pickup_code || o.ticket_code) && (
                            <div className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-cyan-200 shadow-2xs">
                              <div>
                                <p className="text-[10px] text-gray-500 font-medium">KODE AMBIL BARANG</p>
                                <p className="font-mono text-base font-extrabold text-gray-900 tracking-widest">
                                  {o.pickup_code || o.ticket_code}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyText(o.pickup_code || o.ticket_code, "Kode Ambil")}
                                className="flex items-center gap-1 text-[11px] text-gray-800 font-semibold hover:bg-gray-100 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg transition"
                              >
                                <Copy size={12} /> Salin
                              </button>
                            </div>
                          )}

                          <p className="text-[11px] text-gray-500 leading-tight">
                            Tunjukkan kode di atas ke Store Staff saat tiba di Showroom Overtone.
                          </p>
                        </div>
                      ) : (
                        /* Delivery Order Card */
                        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-bold text-gray-800">
                              <Truck size={15} className="text-gray-700" /> Ekspedisi: {o.shipping_courier || "JNE Trucking"}
                            </span>
                            <span className="text-[11px]">
                              {hasTracking ? (
                                <span className="text-emerald-700 font-semibold">Sedang Dikirim</span>
                              ) : (
                                <span className="text-amber-700 font-semibold">Menyiapkan Paket</span>
                              )}
                            </span>
                          </div>

                          {hasTracking ? (
                            <div className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-gray-200 shadow-2xs">
                              <div>
                                <p className="text-[10px] text-gray-500 font-medium">NOMOR RESI PENGIRIMAN</p>
                                <p className="font-mono text-sm font-extrabold text-gray-900 tracking-wider">
                                  {o.tracking_number}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyText(o.tracking_number, "Nomor Resi")}
                                className="flex items-center gap-1 text-[11px] text-gray-800 font-semibold hover:bg-gray-100 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg transition"
                              >
                                <Copy size={12} /> Salin Resi
                              </button>
                            </div>
                          ) : (
                            <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                              <Clock size={12} className="text-amber-600" /> Sedang proses quality check &amp; packing kayu di Warehouse.
                            </p>
                          )}

                          {o.shipping_address && (
                            <p className="text-[11px] text-gray-500 truncate">
                              Tujuan: {o.shipping_address}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        className="flex-1 px-3 py-2 text-xs border border-slate-800 text-slate-300 hover:border-slate-700"
                        onClick={() => downloadPdf(`/orders/${o.invoice_code}/invoice`, `invoice-${o.invoice_code}.pdf`)}
                      >
                        <FileText size={13} /> E-Invoice PDF
                      </Button>

                      {!isPaid && (
                        <Button
                          className="flex-1 px-3 py-2 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                          disabled={payingCode === o.invoice_code}
                          onClick={() => handleSimulatePayment(o.invoice_code)}
                        >
                          <Zap size={13} /> {payingCode === o.invoice_code ? "Memproses..." : "Bayar Instan"}
                        </Button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Package, Truck, Store, ShieldCheck, CheckCircle2,
  MapPin, AlertCircle, ArrowLeft, CreditCard, Sparkles
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/ui/Button";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { errorMessage, fileUrl, formatRupiah } from "../../utils/format";

const COURIER_OPTIONS = [
  { id: "JNE Trucking", name: "JNE Trucking (Asuransi & Packing Kayu)", cost: 45000, etd: "2-4 hari" },
  { id: "SiCepat Cargo", name: "SiCepat Cargo (Berasuransi)", cost: 50000, etd: "1-3 hari" },
  { id: "Overtone Express", name: "Overtone White Glove Express (Setup & Tuning)", cost: 75000, etd: "1 hari" },
];

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const eventId = location.state?.eventId || location.state?.productId || searchParams.get("productId") || searchParams.get("eventId");
  const tierId = location.state?.tierId || location.state?.variantId || searchParams.get("variantId") || searchParams.get("tierId");
  const initialQuantity = location.state?.quantity || 1;

  const [instrument, setInstrument] = useState(location.state?.instrument || location.state?.product || null);
  const [tier, setTier] = useState(location.state?.tier || location.state?.variant || null);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(Boolean(!instrument));
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [quantity, setQuantity] = useState(initialQuantity);
  const [fulfillmentMethod, setFulfillmentMethod] = useState("delivery"); // 'delivery' | 'click_and_collect'
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [selectedCourier, setSelectedCourier] = useState(COURIER_OPTIONS[0]);
  const [buyerName, setBuyerName] = useState(user?.name || "");
  const [buyerEmail, setBuyerEmail] = useState(user?.email || "");
  const [buyerPhone, setBuyerPhone] = useState(user?.phone || "");
  const [paymentMethod, setPaymentMethod] = useState("Overtone Pay (Simulasi Otomatis)");
  const [simulatePayment, setSimulatePayment] = useState(true);

  // Prefill user data
  useEffect(() => {
    if (user) {
      if (!buyerName && user.name) setBuyerName(user.name);
      if (!buyerEmail && user.email) setBuyerEmail(user.email);
      if (!buyerPhone && user.phone) setBuyerPhone(user.phone);
      if (!shippingAddress && user.address) setShippingAddress(user.address);
    }
  }, [user]);

  // Fetch branches and product if missing
  useEffect(() => {
    // Fetch showroom branches
    api.get("/products/branches")
      .catch(() => api.get("/events/venues"))
      .then((res) => {
        const list = Array.isArray(res?.data?.data) ? res.data.data : [];
        setVenues(list);
        if (list.length > 0 && !selectedVenueId) {
          setSelectedVenueId(list[0].id);
        }
      })
      .catch(() => {});

    // If instrument not in state, load by id or fetch first available
    if (!instrument) {
      setLoading(true);
      const targetId = eventId || 1;
      Promise.all([
        api.get(`/products/${targetId}`).catch(() => api.get(`/events/${targetId}`)),
        api.get(`/products/${targetId}/variants`).catch(() => api.get(`/events/${targetId}/tiers`)),
      ])
        .then(([prodRes, varRes]) => {
          const prodData = prodRes?.data?.data || null;
          setInstrument(prodData);
          const variantsList = Array.isArray(varRes?.data?.data) ? varRes.data.data : [];
          if (variantsList.length > 0) {
            const matched = tierId ? variantsList.find((v) => String(v.id) === String(tierId)) : variantsList[0];
            setTier(matched || variantsList[0]);
          }
        })
        .catch((err) => {
          console.error("Gagal mengambil data instrumen:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [eventId, tierId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!instrument) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <EmptyState
          title="Instrumen Belum Dipilih"
          description="Silakan buka katalog Overtone Music Store untuk memilih instrumen dan varian warna yang diinginkan."
          action={
            <Button onClick={() => navigate("/products")} className="mt-4 bg-[#111111] hover:bg-black text-white font-medium">
              Jelajahi Katalog Musik
            </Button>
          }
        />
      </div>
    );
  }

  const isClearance = Boolean(tier?.is_clearance_active);
  const normalPrice = Number(tier?.price || instrument?.price || 0);
  const unitPrice = (isClearance && tier?.clearance_price)
    ? Number(tier.clearance_price)
    : normalPrice;
  const subtotal = unitPrice * Number(quantity || 1);
  const totalSavings = isClearance ? (normalPrice - unitPrice) * Number(quantity || 1) : 0;
  const shippingCost = fulfillmentMethod === "delivery" ? selectedCourier.cost : 0;
  const grandTotal = subtotal + shippingCost;

  async function handleCheckout(e) {
    e.preventDefault();
    if (!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim()) {
      toast.error("Nama, email, dan nomor HP wajib diisi");
      return;
    }

    if (fulfillmentMethod === "delivery" && !shippingAddress.trim()) {
      toast.error("Alamat pengiriman wajib diisi untuk ekspedisi");
      return;
    }

    if (fulfillmentMethod === "click_and_collect" && !selectedVenueId) {
      toast.error("Pilih cabang showroom Overtone untuk pengambilan barang");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        product_id: instrument.id,
        event_id: instrument.id,
        variant_id: tier?.id || null,
        tier_id: tier?.id || null,
        quantity: Number(quantity),
        buyer_name: buyerName.trim(),
        buyer_email: buyerEmail.trim(),
        buyer_phone: buyerPhone.trim(),
        fulfillment_method: fulfillmentMethod,
        pickup_branch_id: fulfillmentMethod === "click_and_collect" ? selectedVenueId : null,
        pickup_venue_id: fulfillmentMethod === "click_and_collect" ? selectedVenueId : null,
        shipping_address: fulfillmentMethod === "delivery" ? shippingAddress.trim() : null,
        shipping_courier: fulfillmentMethod === "delivery" ? selectedCourier.id : null,
        shipping_cost: shippingCost,
        payment_method: paymentMethod,
        simulate_payment: true,
      };

      const res = await api.post("/orders", payload);
      const data = res?.data?.data || {};

      toast.success(
        fulfillmentMethod === "click_and_collect"
          ? `Pesanan berhasil! Kode Ambil: ${data.pickup_code || "Diterbitkan"}`
          : `Pesanan berhasil! No. Invoice: ${data.invoice_code || "Terbit"}`,
        { duration: 5000 }
      );

      navigate("/tickets", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, "Gagal memproses pesanan instrumen"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24">
      {/* Editorial Breadcrumb / Top Bar */}
      <div className="border-b border-gray-200 bg-[#FBFBFB]">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link
            to={`/products/${instrument.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-black transition-colors"
          >
            <ArrowLeft size={14} /> Kembali ke Detail Produk
          </Link>
          <div className="flex items-center gap-2 text-xs text-gray-700 font-semibold tracking-wider uppercase">
            <ShieldCheck size={14} className="text-[#16A34A]" /> Overtone Secure Retail Checkout
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 pt-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Checkout Pembelian
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-gray-600">
          Pilih metode pengambilan (Kirim Ekspedisi bergaransi atau Click &amp; Collect di Showroom), lalu selesaikan pembayaran.
        </p>

        <form onSubmit={handleCheckout} className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Kolom Kiri: Form Data & Pengiriman (col 7) */}
          <div className="space-y-6 lg:col-span-7">
            
            {/* Card 1: Data Pembeli */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                1. Identitas Pembeli &amp; Garansi
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
                    placeholder="Nama sesuai KTP/Identitas"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email (E-Invoice &amp; Resi)</label>
                  <input
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
                    placeholder="nama@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nomor Handphone / WhatsApp</label>
                  <input
                    type="tel"
                    required
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
                    placeholder="081234567890"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Metode Pemenuhan (Fulfillment) */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                2. Metode Pengambilan &amp; Pengiriman
              </h2>

              {/* Selector Tabs */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => setFulfillmentMethod("delivery")}
                  className={`flex items-center justify-center gap-2.5 rounded-xl border p-3.5 text-xs font-bold transition-all ${
                    fulfillmentMethod === "delivery"
                      ? "border-black bg-black text-white shadow-sm"
                      : "border-gray-200 bg-[#F5F5F5] text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <Truck size={17} /> Kirim Ekspedisi
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillmentMethod("click_and_collect")}
                  className={`flex items-center justify-center gap-2.5 rounded-xl border p-3.5 text-xs font-bold transition-all ${
                    fulfillmentMethod === "click_and_collect"
                      ? "border-black bg-black text-white shadow-sm"
                      : "border-gray-200 bg-[#F5F5F5] text-gray-700 hover:border-gray-400"
                  }`}
                >
                  <Store size={17} /> Click &amp; Collect Showroom
                </button>
              </div>

              {/* Delivery Details */}
              {fulfillmentMethod === "delivery" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Alamat Lengkap Pengiriman (Kota, Kecamatan, Kode Pos)
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Contoh: Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan 12190"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Pilihan Ekspedisi Berasuransi &amp; Packing Kayu
                    </label>
                    <div className="space-y-2">
                      {COURIER_OPTIONS.map((c) => (
                        <label
                          key={c.id}
                          className={`flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition-all ${
                            selectedCourier.id === c.id
                              ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="courier"
                              checked={selectedCourier.id === c.id}
                              onChange={() => setSelectedCourier(c)}
                              className="text-black focus:ring-black"
                            />
                            <div>
                              <p className="text-xs font-bold text-gray-900">{c.name}</p>
                              <p className="text-[11px] text-gray-500">Estimasi sampai {c.etd}</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-gray-900">{formatRupiah(c.cost)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Click and Collect Showroom Picker */}
              {fulfillmentMethod === "click_and_collect" && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-gray-200 bg-[#F7F7F7] p-3.5 text-xs text-gray-700">
                    <p className="font-semibold flex items-center gap-1.5 text-gray-900">
                      <Store size={15} /> Bebas Biaya Kirim (Rp 0) &amp; Siap Ambil di Toko
                    </p>
                    <p className="mt-1 text-gray-600 text-[11px] leading-relaxed">
                      Instrumen akan disiapkan dan di-setup oleh tim Store Staff. Anda akan menerima <b>Kode Pengambilan (Pickup Code)</b> setelah pembayaran selesai. Tunjukkan kode tersebut saat mengambil instrumen di showroom Overtone.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Pilih Lokasi Showroom Overtone Music Store
                    </label>
                    <select
                      value={selectedVenueId}
                      onChange={(e) => setSelectedVenueId(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-black focus:outline-none"
                    >
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.city}) - {v.address || "Showroom Resmi"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

            </div>

            {/* Card 3: Pembayaran & Simulator Instan */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                3. Kanal Pembayaran
              </h2>

              <div className="space-y-3">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-black focus:outline-none"
                >
                  <option value="Overtone Pay (Simulasi Otomatis)">⚡ Pembayaran Simulator (Langsung Lunas / Paid)</option>
                  <option value="BCA Virtual Account">BCA Virtual Account</option>
                  <option value="Mandiri Virtual Account">Mandiri Virtual Account</option>
                  <option value="QRIS Dynamic">QRIS Instant Payment</option>
                </select>

                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-[#16A34A] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-900">Simulator Pembayaran Otomatis Aktif</p>
                    <p className="text-emerald-700 text-[11px] mt-0.5 leading-relaxed">
                      Pesanan Anda akan langsung diverifikasi dan berstatus <b>Paid</b>. Stok fisik akan otomatis didecrement dan invoice resmi langsung diterbitkan.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Kolom Kanan: Ringkasan Pesanan & Tombol Checkout (col 5) */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3">
                Ringkasan Pesanan
              </h3>

              {/* Item Card */}
              <div className="py-4 flex gap-3 border-b border-gray-100">
                <div className="h-20 w-20 shrink-0 rounded-xl bg-white border border-gray-200 flex items-center justify-center p-1 overflow-hidden">
                  {instrument?.image_url ? (
                    <img src={fileUrl(instrument.image_url)} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <Package size={24} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A5B]">
                    {instrument?.brand?.name || instrument?.brand || instrument?.organizer || "Overtone"}
                  </p>
                  <h4 className="text-xs font-bold text-gray-900 truncate mt-0.5">{instrument?.name}</h4>
                  {tier && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-gray-600">
                        Varian: <span className="text-gray-900 font-medium">{tier.color_finish || tier.variant_name || tier.tier_name}</span>
                      </span>
                      {isClearance && (
                        <span className="rounded bg-red-100 text-red-700 text-[9px] font-black uppercase px-1.5 py-0.2 border border-red-200">
                          CLEARANCE -{tier.discount_percent}%
                        </span>
                      )}
                    </div>
                  )}
                  {isClearance ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-black text-red-600">{formatRupiah(unitPrice)}</span>
                      <span className="text-[11px] text-gray-400 line-through">{formatRupiah(normalPrice)}</span>
                      <span className="text-[11px] font-normal text-gray-500">x {quantity} unit</span>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-gray-900 mt-1">
                      {formatRupiah(unitPrice)} <span className="text-[11px] font-normal text-gray-500">x {quantity} unit</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Price Calculation breakdown */}
              <div className="py-4 space-y-2 border-b border-gray-100 text-xs">
                {isClearance && totalSavings > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 font-bold">
                    <span>Diskon Cuci Gudang</span>
                    <span>-{formatRupiah(totalSavings)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-gray-600">
                  <span>Subtotal ({quantity} unit)</span>
                  <span className="text-gray-900 font-semibold">{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>Metode Pengambilan</span>
                  <span className="text-gray-900 font-medium">
                    {fulfillmentMethod === "delivery" ? "Kirim Ekspedisi" : "Showroom Pickup"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span>Biaya Pengiriman</span>
                  <span className="text-gray-900 font-semibold">
                    {shippingCost === 0 ? (
                      <span className="text-[#16A34A] font-bold">GRATIS (Rp 0)</span>
                    ) : (
                      formatRupiah(shippingCost)
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-500">
                  <span>PPN 11%</span>
                  <span className="text-emerald-700 text-[11px]">Termasuk dalam harga</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="py-4 flex items-baseline justify-between">
                <span className="font-bold text-sm text-gray-700">Total Pembayaran</span>
                <span className="font-extrabold text-xl sm:text-2xl text-gray-900">
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 font-bold text-sm bg-[#111111] hover:bg-black text-white rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {submitting ? "Memproses Transaksi..." : "Bayar Sekarang (Payment Simulator)"}
              </Button>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
                <ShieldCheck size={13} className="text-[#16A34A]" /> Garansi Resmi Distributor &amp; Overtone Music Store
              </div>
            </div>
          </div>

        </form>
      </main>
    </div>
  );
}

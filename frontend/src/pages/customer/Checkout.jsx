import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Package, Truck, Store, ShieldCheck, CheckCircle2,
  ArrowLeft, CreditCard, ArrowRight
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/ui/Button";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import Badge from "../../components/ui/Badge";
import { errorMessage, fileUrl, formatRupiah } from "../../utils/format";

const COURIER_OPTIONS = [
  { id: "JNE Trucking", name: "JNE Trucking (Asuransi & Packing Kayu)", cost: 45000, etd: "2-4 hari kerja" },
  { id: "SiCepat Cargo", name: "SiCepat Cargo (Berasuransi Penuh)", cost: 50000, etd: "1-3 hari kerja" },
  { id: "Focalpoint Express", name: "Focalpoint White Glove Express (Setup & Tuning)", cost: 75000, etd: "1 hari kerja" },
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
  const [paymentMethod, setPaymentMethod] = useState("Focalpoint Pay (Simulasi Otomatis)");
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
    api
      .get("/store/branches")
      .then((res) => {
        const list = res.data.data || [];
        setVenues(list);
        if (list.length > 0 && !selectedVenueId) {
          setSelectedVenueId(String(list[0].id));
        }
      })
      .catch(() => {});

    if (!instrument && eventId) {
      setLoading(true);
      api
        .get(`/products/${eventId}`)
        .catch(() => api.get(`/events/${eventId}`))
        .then((res) => {
          const prod = res.data.data;
          setInstrument(prod);
          const vList = prod.variants || prod.tiers || [];
          if (vList.length > 0) {
            const targetTier = tierId ? vList.find((v) => String(v.id) === String(tierId)) : vList[0];
            setTier(targetTier || vList[0]);
          }
        })
        .catch(() => setInstrument(null))
        .finally(() => setLoading(false));
    }
  }, [eventId, tierId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  if (!instrument) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Tidak Ada Produk yang Dipilih"
          description="Silakan buka katalog produk untuk memilih kamera atau lensa yang ingin Anda beli."
          action={
            <Link to="/products" className="fp-btn-glass-primary !py-2.5 !px-5">
              Jelajahi Katalog Cinema Gear
            </Link>
          }
        />
      </div>
    );
  }

  // Price Calculation
  const isClearance = Boolean(tier?.is_clearance_active);
  const normalPrice = tier?.price || instrument.price || 0;
  const unitPrice = isClearance && tier?.clearance_price ? Number(tier.clearance_price) : normalPrice;
  const subtotal = unitPrice * quantity;
  const shippingCost = fulfillmentMethod === "delivery" ? selectedCourier.cost : 0;
  const grandTotal = subtotal + shippingCost;
  const totalSavings = isClearance ? (normalPrice - unitPrice) * quantity : 0;

  async function handleCheckout(e) {
    e.preventDefault();
    if (fulfillmentMethod === "delivery" && !shippingAddress.trim()) {
      toast.error("Alamat pengiriman wajib diisi untuk opsi Ekspedisi");
      return;
    }
    if (fulfillmentMethod === "click_and_collect" && !selectedVenueId) {
      toast.error("Pilih cabang Focalpoint Pro Offline Store untuk pengambilan unit");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        product_id: instrument.id,
        variant_id: tier?.id,
        quantity,
        fulfillment_method: fulfillmentMethod,
        shipping_address: fulfillmentMethod === "delivery" ? shippingAddress : undefined,
        courier_name: fulfillmentMethod === "delivery" ? selectedCourier.name : undefined,
        shipping_cost: shippingCost,
        store_branch_id: fulfillmentMethod === "click_and_collect" ? Number(selectedVenueId) : undefined,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone,
        payment_method: paymentMethod,
        simulate_payment: simulatePayment,
      };

      const res = await api.post("/orders", payload);
      const invoiceCode = res.data.data?.invoice_code || res.data.invoice_code;

      toast.success(res.data.message || "Pesanan berhasil dibuat!");
      if (invoiceCode) {
        navigate(`/orders/${invoiceCode}`, {
          state: { orderCreated: true, invoiceCode },
        });
      } else {
        navigate("/tickets");
      }
    } catch (err) {
      toast.error(errorMessage(err, "Gagal memproses pesanan cinema gear"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen fp-home-canvas pb-24">
      {/* Header Frosted Glass Bar */}
      <div className="fp-glass-bar py-3.5 mb-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between">
          <Link
            to={`/products/${instrument.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3A4A63] hover:text-[#0F1B2D] transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Kembali ke Detail Produk
          </Link>
          <div className="flex items-center gap-2 text-xs text-[#0F1B2D] font-bold tracking-wider uppercase">
            <ShieldCheck size={14} className="text-emerald-600" aria-hidden="true" /> Focalpoint Pro Secure Retail Checkout
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="fp-section-pill mb-2">
          <span className="fp-section-pill-dot" aria-hidden="true" />
          <span>Konfirmasi Pembelian</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F1B2D] tracking-tight">
          Checkout Pembelian Cinema Gear
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#3A4A63] max-w-2xl">
          Pilih metode pemenuhan pesanan (Kirim Ekspedisi packing kayu anti-statis atau Click &amp; Collect di Pro Cinema Store), lalu selesaikan pembayaran.
        </p>

        <form onSubmit={handleCheckout} className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          
          {/* Kolom Kiri: Form Data & Pengiriman (col 7) */}
          <div className="space-y-6 lg:col-span-7">
            
            {/* Card 1: Data Pembeli */}
            <section className="fp-glass-card p-6 sm:p-7">
              <h2 className="font-display text-sm font-bold text-[#0F1B2D] uppercase tracking-wider mb-4 pb-3 border-b border-[#0F1B2D]/10">
                1. Identitas Pembeli &amp; Registrasi Garansi
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="checkout-buyer-name" className="block text-xs font-semibold text-[#0F1B2D] mb-1.5">
                    Nama Lengkap Sesuai Identitas <span className="text-[#E8622C]">*</span>
                  </label>
                  <input
                    id="checkout-buyer-name"
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none"
                    placeholder="Contoh: Hendra Wijaya"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-buyer-email" className="block text-xs font-semibold text-[#0F1B2D] mb-1.5">
                    Email (E-Invoice &amp; Garansi) <span className="text-[#E8622C]">*</span>
                  </label>
                  <input
                    id="checkout-buyer-email"
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="w-full rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none"
                    placeholder="nama@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-buyer-phone" className="block text-xs font-semibold text-[#0F1B2D] mb-1.5">
                    Nomor WhatsApp <span className="text-[#E8622C]">*</span>
                  </label>
                  <input
                    id="checkout-buyer-phone"
                    type="tel"
                    required
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs text-[#0F1B2D] tabular-nums focus:border-[#E8622C] focus:outline-none"
                    placeholder="081234567890"
                  />
                </div>
              </div>
            </section>

            {/* Card 2: Metode Pemenuhan (Fulfillment) */}
            <section className="fp-glass-card p-6 sm:p-7">
              <h2 className="font-display text-sm font-bold text-[#0F1B2D] uppercase tracking-wider mb-4 pb-3 border-b border-[#0F1B2D]/10">
                2. Metode Pengambilan &amp; Pengiriman
              </h2>

              {/* Selector Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5" role="radiogroup" aria-label="Metode pemenuhan pesanan">
                <button
                  type="button"
                  role="radio"
                  aria-checked={fulfillmentMethod === "delivery"}
                  onClick={() => setFulfillmentMethod("delivery")}
                  className={`flex items-center justify-center gap-2.5 rounded-full p-3.5 text-xs font-bold transition-all cursor-pointer ${
                    fulfillmentMethod === "delivery"
                      ? "bg-[#0F1B2D] text-white shadow-xs"
                      : "bg-white/70 border border-white/80 text-[#3A4A63] hover:bg-white hover:text-[#0F1B2D]"
                  }`}
                >
                  <Truck size={16} aria-hidden="true" /> Kirim Ekspedisi Berasuransi
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={fulfillmentMethod === "click_and_collect"}
                  onClick={() => setFulfillmentMethod("click_and_collect")}
                  className={`flex items-center justify-center gap-2.5 rounded-full p-3.5 text-xs font-bold transition-all cursor-pointer ${
                    fulfillmentMethod === "click_and_collect"
                      ? "bg-[#0F1B2D] text-white shadow-xs"
                      : "bg-white/70 border border-white/80 text-[#3A4A63] hover:bg-white hover:text-[#0F1B2D]"
                  }`}
                >
                  <Store size={16} aria-hidden="true" /> Click &amp; Collect (Ambil di Toko)
                </button>
              </div>

              {/* Delivery Details */}
              {fulfillmentMethod === "delivery" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="checkout-shipping-address" className="block text-xs font-semibold text-[#0F1B2D] mb-1.5">
                      Alamat Lengkap Pengiriman (Jalan, Kota, Kode Pos) <span className="text-[#E8622C]">*</span>
                    </label>
                    <textarea
                      id="checkout-shipping-address"
                      required
                      rows={3}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Contoh: Jl. Senopati No. 45, Kebayoran Baru, Jakarta Selatan 12190"
                      className="w-full rounded-2xl border border-white/80 bg-white/70 p-3 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-[#0F1B2D] mb-2">
                      Pilihan Kurir Berasuransi &amp; Packing Kayu
                    </span>
                    <div className="space-y-2">
                      {COURIER_OPTIONS.map((c) => {
                        const checked = selectedCourier.id === c.id;
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer transition-all ${
                              checked
                                ? "border-[#E8622C] bg-[#E8622C]/10 ring-1 ring-[#E8622C]"
                                : "border-white/80 bg-white/70 hover:bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="courier"
                                checked={checked}
                                onChange={() => setSelectedCourier(c)}
                                className="h-4 w-4 accent-[#E8622C]"
                              />
                              <div>
                                <p className="text-xs font-bold text-[#0F1B2D]">{c.name}</p>
                                <p className="text-[11px] text-[#3A4A63]">Estimasi tiba: {c.etd}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-[#0F1B2D] tabular-nums">{formatRupiah(c.cost)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Click and Collect Showroom Picker */}
              {fulfillmentMethod === "click_and_collect" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/80 bg-white/60 p-4 text-xs text-[#3A4A63] shadow-xs">
                    <p className="font-bold flex items-center gap-1.5 text-[#0F1B2D]">
                      <Store size={15} className="text-[#E8622C]" aria-hidden="true" /> Bebas Biaya Kirim (Rp 0) &amp; 10-Point Sensor QC Siap Ambil
                    </p>
                    <p className="mt-1 text-[#3A4A63] text-xs leading-relaxed">
                      Kamera dan perlengkapan cinema akan disiapkan dan diinspeksi oleh teknisi. Anda akan menerima <strong className="text-[#0F1B2D]">Kode Pengambilan (Pickup Pass)</strong> setelah pembayaran selesai.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="checkout-pickup-branch" className="block text-xs font-semibold text-[#0F1B2D] mb-1.5">
                      Pilih Lokasi Showroom Focalpoint Pro <span className="text-[#E8622C]">*</span>
                    </label>
                    <select
                      id="checkout-pickup-branch"
                      value={selectedVenueId}
                      onChange={(e) => setSelectedVenueId(e.target.value)}
                      className="w-full rounded-full border border-white/80 bg-white/70 px-4 py-2.5 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none"
                    >
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.city}) — {v.address || "Showroom Resmi"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </section>

            {/* Card 3: Pembayaran & Simulator Instan */}
            <section className="fp-glass-card p-6 sm:p-7">
              <h2 className="font-display text-sm font-bold text-[#0F1B2D] uppercase tracking-wider mb-4 pb-3 border-b border-[#0F1B2D]/10 flex items-center gap-2">
                <CreditCard size={16} className="text-[#E8622C]" aria-hidden="true" /> 3. Metode Pembayaran
              </h2>

              <div className="space-y-3">
                <div>
                  <label htmlFor="checkout-payment-method" className="block text-xs font-semibold text-[#0F1B2D] mb-1.5">
                    Pilih Kanal Pembayaran Resmi
                  </label>
                  <select
                    id="checkout-payment-method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-full border border-white/80 bg-white/70 px-4 py-2.5 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none"
                  >
                    <option value="Focalpoint Pay (Simulasi Otomatis)">Focalpoint Pay — Simulator Pembayaran Instan (Langsung Lunas)</option>
                    <option value="BCA Virtual Account">BCA Virtual Account</option>
                    <option value="Mandiri Virtual Account">Mandiri Virtual Account</option>
                    <option value="QRIS Dynamic">QRIS Dynamic Instant Payment</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3.5 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-900">Simulator Pembayaran Otomatis Aktif</p>
                    <p className="text-[#3A4A63] text-[11px] mt-0.5 leading-relaxed">
                      Pesanan Anda akan langsung diverifikasi berstatus <strong>Paid</strong>. Stok fisik otomatis dipotong dan E-Invoice resmi diterbitkan seketika.
                    </p>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Kolom Kanan: Ringkasan Pesanan & Tombol Checkout (col 5) */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 fp-glass-card p-6 sm:p-7">
              <h2 className="font-display font-bold text-sm text-[#0F1B2D] uppercase tracking-wider border-b border-[#0F1B2D]/10 pb-3">
                Ringkasan Pesanan
              </h2>

              {/* Item Card */}
              <div className="py-4 flex gap-3.5 border-b border-[#0F1B2D]/10">
                <div className="h-20 w-20 shrink-0 fp-glass-stage flex items-center justify-center p-1.5 overflow-hidden">
                  {instrument?.image_url ? (
                    <img
                      src={fileUrl(instrument.image_url)}
                      alt={`${instrument?.name || "Hardware"}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Package size={24} className="text-[#3A4A63]" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#E8622C]">
                    {instrument?.brand?.name || instrument?.brand || instrument?.organizer || "Focalpoint Pro"}
                  </p>
                  <h3 className="text-sm font-bold text-[#0F1B2D] truncate mt-0.5">{instrument?.name}</h3>
                  {tier && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-xs text-[#3A4A63]">
                        Varian: <strong className="text-[#0F1B2D] font-semibold">{tier.color_finish || tier.variant_name || tier.tier_name}</strong>
                      </span>
                      {isClearance && (
                        <span className="rounded-full bg-[#E8622C] text-white px-2 py-0.5 text-[10px] font-bold">
                          Clearance -{tier.discount_percent}%
                        </span>
                      )}
                    </div>
                  )}
                  {isClearance ? (
                    <div className="flex items-center gap-2 mt-1.5 tabular-nums">
                      <span className="text-xs font-bold text-[#E8622C]">{formatRupiah(unitPrice)}</span>
                      <span className="text-[11px] text-[#3A4A63] line-through">{formatRupiah(normalPrice)}</span>
                      <span className="text-[11px] text-[#3A4A63]">&times; {quantity} unit</span>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-[#0F1B2D] mt-1.5 tabular-nums">
                      {formatRupiah(unitPrice)} <span className="text-[11px] font-normal text-[#3A4A63]">&times; {quantity} unit</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Price Calculation breakdown */}
              <div className="py-4 space-y-2.5 border-b border-[#0F1B2D]/10 text-xs tabular-nums">
                {isClearance && totalSavings > 0 && (
                  <div className="flex items-center justify-between text-emerald-900 bg-emerald-500/15 px-3 py-2 rounded-xl border border-emerald-400/30 font-bold">
                    <span>Penghematan Clearance</span>
                    <span>-{formatRupiah(totalSavings)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[#3A4A63]">
                  <span>Subtotal Cinema Gear ({quantity} unit)</span>
                  <span className="text-[#0F1B2D] font-semibold">{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[#3A4A63]">
                  <span>Metode Pemenuhan</span>
                  <span className="text-[#0F1B2D] font-medium">
                    {fulfillmentMethod === "delivery" ? "Ekspedisi Berasuransi" : "Click & Collect Showroom"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#3A4A63]">
                  <span>Biaya Pengiriman &amp; Packing Kayu</span>
                  <span className="text-[#0F1B2D] font-semibold">
                    {shippingCost === 0 ? (
                      <span className="text-emerald-700 font-bold">GRATIS (Rp 0)</span>
                    ) : (
                      formatRupiah(shippingCost)
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#3A4A63]">
                  <span>PPN 11%</span>
                  <span className="text-emerald-700 font-medium">Termasuk dalam harga</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="py-4 flex items-baseline justify-between tabular-nums">
                <span className="font-bold text-sm text-[#0F1B2D]">Total Pembayaran</span>
                <span className="font-display font-extrabold text-xl sm:text-2xl text-[#0F1B2D]">
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="fp-btn-glass-primary w-full !py-3.5 !text-sm !font-bold"
              >
                <span>{submitting ? "Memproses Transaksi..." : "Bayar Sekarang"}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>

              <div className="mt-4 pt-3 border-t border-[#0F1B2D]/10 flex items-center justify-center gap-1.5 text-[11px] text-[#3A4A63] text-center">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" aria-hidden="true" />
                <span>Dilindungi Garansi Resmi Distributor &amp; Retur 7 Hari Focalpoint Pro</span>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

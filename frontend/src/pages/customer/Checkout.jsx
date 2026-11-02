import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Package, Truck, Store, ShieldCheck, CheckCircle2,
  ArrowLeft, CreditCard
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
  { id: "Overtone Express", name: "Overtone White Glove Express (Setup & Tuning)", cost: 75000, etd: "1 hari kerja" },
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
        <Skeleton className="h-96 w-full rounded-md" />
      </div>
    );
  }

  if (!instrument) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 text-center">
        <EmptyState
          title="Cinema Gear Belum Dipilih"
          description="Silakan buka katalog Overtone Pro Cinema Store untuk memilih kamera, lensa, atau rig yang diinginkan."
          action={
            <Button onClick={() => navigate("/products")} variant="primary">
              Jelajahi Katalog Cinema
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
      toast.error("Pilih cabang offline store Overtone untuk pengambilan barang");
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
      toast.error(errorMessage(err, "Gagal memproses pesanan cinema gear"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink pb-24">
      {/* Editorial Breadcrumb / Top Bar */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link
            to={`/products/${instrument.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Kembali ke Detail Produk
          </Link>
          <div className="flex items-center gap-2 text-xs text-ink font-semibold tracking-wider uppercase">
            <ShieldCheck size={14} className="text-status-success" aria-hidden="true" /> Overtone Secure Retail Checkout
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent block mb-1">
          Konfirmasi Pembelian
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
          Checkout Pembelian Cinema Gear
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-ink-secondary max-w-[65ch]">
          Pilih metode pemenuhan pesanan (Kirim Ekspedisi packing kayu anti-statis atau Click &amp; Collect di Pro Cinema Store), lalu selesaikan pembayaran.
        </p>

        <form onSubmit={handleCheckout} className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Kolom Kiri: Form Data & Pengiriman (col 7) */}
          <div className="space-y-6 lg:col-span-7">
            
            {/* Card 1: Data Pembeli */}
            <section className="rounded-md border border-line bg-surface p-6">
              <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wider mb-4 pb-3 border-b border-line">
                1. Identitas Pembeli &amp; Registrasi Garansi
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="checkout-buyer-name" className="block text-xs font-semibold text-ink mb-1.5">
                    Nama Lengkap Sesuai Identitas <span className="text-accent">*</span>
                  </label>
                  <input
                    id="checkout-buyer-name"
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="ot-input"
                    placeholder="Contoh: Hendra Wijaya"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-buyer-email" className="block text-xs font-semibold text-ink mb-1.5">
                    Email (E-Invoice &amp; Sertifikat Garansi) <span className="text-accent">*</span>
                  </label>
                  <input
                    id="checkout-buyer-email"
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="ot-input"
                    placeholder="nama@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-buyer-phone" className="block text-xs font-semibold text-ink mb-1.5">
                    Nomor Handphone / WhatsApp <span className="text-accent">*</span>
                  </label>
                  <input
                    id="checkout-buyer-phone"
                    type="tel"
                    required
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="ot-input tabular-nums"
                    placeholder="081234567890"
                  />
                </div>
              </div>
            </section>

            {/* Card 2: Metode Pemenuhan (Fulfillment) */}
            <section className="rounded-md border border-line bg-surface p-6">
              <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wider mb-4 pb-3 border-b border-line">
                2. Metode Pengambilan &amp; Pengiriman
              </h2>

              {/* Selector Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5" role="radiogroup" aria-label="Metode pemenuhan pesanan">
                <button
                  type="button"
                  role="radio"
                  aria-checked={fulfillmentMethod === "delivery"}
                  onClick={() => setFulfillmentMethod("delivery")}
                  className={`flex items-center justify-center gap-2.5 rounded-sm border p-3.5 text-xs font-bold transition-colors ${
                    fulfillmentMethod === "delivery"
                      ? "border-ink bg-ink text-canvas"
                      : "border-line bg-surface-muted text-ink-secondary hover:border-line-strong hover:text-ink"
                  }`}
                >
                  <Truck size={16} aria-hidden="true" /> Kirim Ekspedisi Berasuransi
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={fulfillmentMethod === "click_and_collect"}
                  onClick={() => setFulfillmentMethod("click_and_collect")}
                  className={`flex items-center justify-center gap-2.5 rounded-sm border p-3.5 text-xs font-bold transition-colors ${
                    fulfillmentMethod === "click_and_collect"
                      ? "border-ink bg-ink text-canvas"
                      : "border-line bg-surface-muted text-ink-secondary hover:border-line-strong hover:text-ink"
                  }`}
                >
                  <Store size={16} aria-hidden="true" /> Click &amp; Collect (Ambil di Offline Store)
                </button>
              </div>

              {/* Delivery Details */}
              {fulfillmentMethod === "delivery" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="checkout-shipping-address" className="block text-xs font-semibold text-ink mb-1.5">
                      Alamat Lengkap Pengiriman (Jalan, Kelurahan/Kecamatan, Kota, Kode Pos) <span className="text-accent">*</span>
                    </label>
                    <textarea
                      id="checkout-shipping-address"
                      required
                      rows={3}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Contoh: Jl. Senopati No. 45, Kel. Selong, Kec. Kebayoran Baru, Jakarta Selatan 12190"
                      className="ot-input"
                    />
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-ink mb-2">
                      Pilihan Kurir Berasuransi &amp; Packing Kayu
                    </span>
                    <div className="space-y-2">
                      {COURIER_OPTIONS.map((c) => {
                        const checked = selectedCourier.id === c.id;
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center justify-between rounded-sm border p-3.5 cursor-pointer transition-colors ${
                              checked
                                ? "border-ink bg-surface-muted"
                                : "border-line bg-surface hover:border-line-strong"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="courier"
                                checked={checked}
                                onChange={() => setSelectedCourier(c)}
                                className="h-4 w-4 accent-[#B83A14]"
                              />
                              <div>
                                <p className="text-xs font-bold text-ink">{c.name}</p>
                                <p className="text-[11px] text-ink-muted">Estimasi tiba: {c.etd}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-ink tabular-nums">{formatRupiah(c.cost)}</span>
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
                  <div className="rounded-sm border border-line bg-surface-muted p-4 text-xs text-ink-secondary">
                    <p className="font-bold flex items-center gap-1.5 text-ink">
                      <Store size={15} className="text-accent" aria-hidden="true" /> Bebas Biaya Kirim (Rp 0) &amp; 10-Point Sensor QC Siap Ambil
                    </p>
                    <p className="mt-1 text-ink-secondary text-xs leading-relaxed">
                      Kamera dan perlengkapan cinema akan disiapkan dan diinspeksi oleh tim Store Staff. Anda akan menerima <strong className="text-ink">Kode Pengambilan (Pickup Pass)</strong> setelah pembayaran selesai.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="checkout-pickup-branch" className="block text-xs font-semibold text-ink mb-1.5">
                      Pilih Lokasi Cabang Overtone Offline Store <span className="text-accent">*</span>
                    </label>
                    <select
                      id="checkout-pickup-branch"
                      value={selectedVenueId}
                      onChange={(e) => setSelectedVenueId(e.target.value)}
                      className="ot-input"
                    >
                      {venues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.city}) — {v.address || "Offline Store Resmi"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </section>

            {/* Card 3: Pembayaran & Simulator Instan */}
            <section className="rounded-md border border-line bg-surface p-6">
              <h2 className="font-display text-sm font-bold text-ink uppercase tracking-wider mb-4 pb-3 border-b border-line flex items-center gap-2">
                <CreditCard size={16} className="text-accent" aria-hidden="true" /> 3. Metode Pembayaran
              </h2>

              <div className="space-y-3">
                <div>
                  <label htmlFor="checkout-payment-method" className="block text-xs font-semibold text-ink mb-1.5">
                    Pilih Kanal Pembayaran Resmi
                  </label>
                  <select
                    id="checkout-payment-method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="ot-input"
                  >
                    <option value="Overtone Pay (Simulasi Otomatis)">Overtone Pay — Simulator Pembayaran Instan (Langsung Lunas)</option>
                    <option value="BCA Virtual Account">BCA Virtual Account</option>
                    <option value="Mandiri Virtual Account">Mandiri Virtual Account</option>
                    <option value="QRIS Dynamic">QRIS Dynamic Instant Payment</option>
                  </select>
                </div>

                <div className="rounded-sm border border-status-success/30 bg-status-success-bg p-3.5 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-status-success shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="text-xs">
                    <p className="font-bold text-status-success">Simulator Pembayaran Otomatis Aktif</p>
                    <p className="text-ink-secondary text-[11px] mt-0.5 leading-relaxed">
                      Pesanan Anda akan langsung diverifikasi berstatus <strong>Paid</strong>. Stok fisik otomatis dipotong dan E-Invoice resmi diterbitkan seketika.
                    </p>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Kolom Kanan: Ringkasan Pesanan & Tombol Checkout (col 5) */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 rounded-md border border-line bg-surface p-6">
              <h2 className="font-display font-bold text-sm text-ink uppercase tracking-wider border-b border-line pb-3">
                Ringkasan Pesanan
              </h2>

              {/* Item Card */}
              <div className="py-4 flex gap-3.5 border-b border-line">
                <div className="h-20 w-20 shrink-0 rounded-sm bg-surface-muted border border-line flex items-center justify-center p-1.5 overflow-hidden">
                  {instrument?.image_url ? (
                    <img
                      src={fileUrl(instrument.image_url)}
                      alt={`${instrument?.name || "Instrumen"}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Package size={24} className="text-ink-muted" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    {instrument?.brand?.name || instrument?.brand || instrument?.organizer || "Overtone"}
                  </p>
                  <h3 className="text-sm font-bold text-ink truncate mt-0.5">{instrument?.name}</h3>
                  {tier && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-xs text-ink-secondary">
                        Varian: <strong className="text-ink font-semibold">{tier.color_finish || tier.variant_name || tier.tier_name}</strong>
                      </span>
                      {isClearance && (
                        <Badge status="danger">Clearance -{tier.discount_percent}%</Badge>
                      )}
                    </div>
                  )}
                  {isClearance ? (
                    <div className="flex items-center gap-2 mt-1.5 tabular-nums">
                      <span className="text-xs font-bold text-accent">{formatRupiah(unitPrice)}</span>
                      <span className="text-[11px] text-ink-muted line-through">{formatRupiah(normalPrice)}</span>
                      <span className="text-[11px] text-ink-muted">&times; {quantity} unit</span>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-ink mt-1.5 tabular-nums">
                      {formatRupiah(unitPrice)} <span className="text-[11px] font-normal text-ink-muted">&times; {quantity} unit</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Price Calculation breakdown */}
              <div className="py-4 space-y-2.5 border-b border-line text-xs tabular-nums">
                {isClearance && totalSavings > 0 && (
                  <div className="flex items-center justify-between text-status-success bg-status-success-bg px-3 py-2 rounded-xs border border-status-success/30 font-bold">
                    <span>Penghematan Clearance</span>
                    <span>-{formatRupiah(totalSavings)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-ink-secondary">
                  <span>Subtotal Cinema Gear ({quantity} unit)</span>
                  <span className="text-ink font-semibold">{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-ink-secondary">
                  <span>Metode Pemenuhan</span>
                  <span className="text-ink font-medium">
                    {fulfillmentMethod === "delivery" ? "Ekspedisi Berasuransi" : "Click & Collect Offline Store"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-ink-secondary">
                  <span>Biaya Pengiriman &amp; Packing Kayu</span>
                  <span className="text-ink font-semibold">
                    {shippingCost === 0 ? (
                      <span className="text-status-success font-bold">GRATIS (Rp 0)</span>
                    ) : (
                      formatRupiah(shippingCost)
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-ink-muted">
                  <span>PPN 11%</span>
                  <span className="text-status-success font-medium">Termasuk dalam harga</span>
                </div>
              </div>

              {/* Grand Total */}
              <div className="py-4 flex items-baseline justify-between tabular-nums">
                <span className="font-bold text-sm text-ink">Total Pembayaran</span>
                <span className="font-display font-bold text-xl sm:text-2xl text-ink">
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                disabled={submitting}
                className="w-full py-3.5 font-bold text-sm"
              >
                {submitting ? "Memproses Transaksi..." : "Bayar Sekarang"}
              </Button>

              <div className="mt-4 pt-3 border-t border-line flex items-center justify-center gap-1.5 text-[11px] text-ink-muted text-center">
                <ShieldCheck size={14} className="text-status-success shrink-0" aria-hidden="true" />
                <span>Dilindungi Garansi Resmi 1 Tahun &amp; Retur 7 Hari Overtone</span>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

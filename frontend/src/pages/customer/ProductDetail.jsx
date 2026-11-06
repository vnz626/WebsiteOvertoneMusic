import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Share2,
  Heart,
  MapPin,
  ShieldCheck,
  Package,
  Truck,
  Store,
  Sparkles,
  Layers,
  Award,
  CheckCircle2,
  Star,
  MessageSquare,
  BellRing,
  ArrowRight,
  Cpu,
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../auth/AuthContext";
import Button from "../../components/ui/Button";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import { fileUrl, formatRupiah } from "../../utils/format";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [instrument, setInstrument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [saved, setSaved] = useState(false);
  const [notifyRequested, setNotifyRequested] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [bundles, setBundles] = useState([]);

  // Review states
  const [reviewsList, setReviewsList] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newTitle, setNewTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newVariantName, setNewVariantName] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotifyRequested(false);
    api
      .get(`/products/${id}`)
      .catch(() => api.get(`/events/${id}`))
      .then((res) => {
        const prod = res.data.data;
        setInstrument(prod);

        if (prod.reviews && prod.reviews.length > 0) {
          setReviewsList(prod.reviews);
        } else {
          api
            .get(`/products/${id}/reviews`)
            .then((r) => setReviewsList(r.data?.data || []))
            .catch(() => {});
        }

        const vList = prod.variants || prod.tiers || [];
        if (vList.length > 0) {
          setVariants(vList);
          setSelectedVariant(vList[0]);
        } else {
          api
            .get(`/products/${id}/variants`)
            .catch(() => api.get(`/events/${id}/tiers`))
            .then((r) => {
              const list = r.data.data || [];
              setVariants(list);
              if (list.length > 0) setSelectedVariant(list[0]);
            })
            .catch(() => {});
        }
      })
      .catch(() => setInstrument(null))
      .finally(() => setLoading(false));

    fetch("/api/store/bundles")
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success" && Array.isArray(d.data)) {
          setBundles(d.data.slice(0, 2));
        }
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (isAuthenticated) {
      api
        .get("/users/saved-events")
        .then((r) => {
          const list = r.data.data || [];
          setSaved(list.some((it) => it.id === Number(id)));
        })
        .catch(() => {});
    }
  }, [id, isAuthenticated]);

  async function toggleSave() {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/products/${id}` } });
      return;
    }
    try {
      if (saved) {
        await api.delete(`/users/saved-events/${id}`);
        setSaved(false);
        toast.success("Dihapus dari Wishlist");
      } else {
        await api.post("/users/saved-events", { event_id: id });
        setSaved(true);
        toast.success("Disimpan ke Wishlist");
      }
    } catch {
      toast.error("Gagal memperbarui wishlist");
    }
  }

  function goCheckout() {
    if (!selectedVariant) {
      toast.error("Silakan pilih konfigurasi / varian kamera terlebih dahulu");
      return;
    }
    navigate("/checkout", {
      state: {
        productId: instrument.id,
        variantId: selectedVariant.id,
        quantity,
        product: instrument,
        variant: selectedVariant,
      },
    });
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/products/${id}` } });
      return;
    }
    if (!newComment.trim()) {
      toast.error("Silakan tulis ulasan teknis Anda");
      return;
    }
    setSubmittingReview(true);
    try {
      const payload = {
        rating: newRating,
        title: newTitle.trim() || undefined,
        comment: newComment.trim(),
        variant_name: newVariantName || selectedVariant?.variant_name || selectedVariant?.color_finish || undefined,
      };
      const res = await api.post(`/products/${id}/reviews`, payload);
      toast.success("Ulasan berhasil dipublikasikan! Terima kasih atas masukan Anda.");
      setReviewsList((prev) => [res.data.data, ...prev]);
      setNewTitle("");
      setNewComment("");
      setNewRating(5);
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal mengirimkan ulasan";
      toast.error(msg);
    } finally {
      setSubmittingReview(false);
    }
  }

  function handleNotifyRestock(e) {
    e.preventDefault();
    if (!notifyEmail) {
      toast.error("Masukkan alamat email valid");
      return;
    }
    setNotifyRequested(true);
    toast.success(
      `Permintaan tercatat. Kami akan memberi tahu ${notifyEmail} saat stok varian ini tersedia kembali.`
    );
  }

  function share() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: instrument?.name, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      toast.success("Tautan halaman produk berhasil disalin.");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  if (!instrument) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-12">
        <EmptyState
          title="Cinema Gear Tidak Ditemukan"
          description="Produk yang Anda cari mungkin telah diarsipkan atau tautan tidak valid."
          action={
            <Link
              to="/products"
              className="fp-btn-glass-primary !py-2.5 !px-5"
            >
              Kembali ke Katalog Cinema Gear
            </Link>
          }
        />
      </div>
    );
  }

  const isClearance = Boolean(selectedVariant?.is_clearance_active);
  const normalPrice = selectedVariant?.price || instrument.price || 0;
  const activePrice =
    isClearance && selectedVariant?.clearance_price
      ? Number(selectedVariant.clearance_price)
      : normalPrice;

  const activeStock = selectedVariant
    ? selectedVariant.stock !== undefined
      ? selectedVariant.stock
      : selectedVariant.remaining_quota
    : instrument.remaining_quota;
  const isSoldOut = (activeStock ?? 0) <= 0;
  const total = activePrice * quantity;
  const brandName = instrument.brand?.name || instrument.organizer || "Focalpoint Pro Authorized";
  const displayImage = selectedVariant?.image_url || instrument.image_url;

  return (
    <div className="min-h-screen fp-home-canvas pb-24">
      {/* Header Breadcrumb Bar */}
      <div className="fp-glass-bar py-4 mb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#3A4A63]">
            <Link to="/products" className="hover:text-[#0F1B2D] transition-colors font-medium">
              Katalog Cinema Gear
            </Link>
            <span aria-hidden="true" className="text-white/60">/</span>
            <Link
              to={`/products?brand=${encodeURIComponent(brandName)}`}
              className="text-[#E8622C] font-bold uppercase tracking-wider hover:underline"
            >
              {brandName}
            </Link>
            <span aria-hidden="true" className="text-white/60">/</span>
            <span className="text-[#0F1B2D] font-bold line-clamp-1 max-w-[200px] sm:max-w-md">
              {instrument.name}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-[#0F1B2D] hover:bg-white hover:border-[#E8622C]/40 transition-all shadow-xs cursor-pointer"
            >
              <Share2 size={13} aria-hidden="true" />
              <span>Bagikan</span>
            </button>
            <button
              type="button"
              onClick={toggleSave}
              aria-pressed={saved}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer ${
                saved
                  ? "border-rose-300 bg-rose-50 text-rose-600"
                  : "border-white/80 bg-white/70 backdrop-blur-md text-[#0F1B2D] hover:bg-white hover:border-[#E8622C]/40"
              }`}
            >
              <Heart
                size={13}
                aria-hidden="true"
                className={saved ? "fill-current" : ""}
              />
              <span>{saved ? "Tersimpan di Wishlist" : "Simpan ke Wishlist"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Konten Utama */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Kolom Kiri (7 Kolom): Galeri Foto 1:1, Deskripsi, Spesifikasi Sensor, Bundling */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            {/* Stage Foto Hardware Frosted Glass */}
            <div className="relative overflow-hidden fp-glass-card !p-6 lg:!p-10 flex items-center justify-center aspect-square max-h-[500px]">
              <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/85 backdrop-blur-md border border-white/90 px-3 py-1 text-xs font-bold text-[#0F1B2D] uppercase tracking-wider shadow-xs">
                  {brandName}
                </span>
                {instrument.instrument_type && (
                  <span className="rounded-full bg-[#0F1B2D]/[0.06] border border-[#0F1B2D]/12 px-3 py-1 text-xs font-bold text-[#3A4A63]">
                    {instrument.instrument_type}
                  </span>
                )}
                {(selectedVariant?.sku_code || instrument.sku_prefix) && (
                  <span className="rounded-full bg-white/70 border border-[#0F1B2D]/10 px-3 py-1 text-[11px] tabular-nums font-bold text-[#3A4A63]">
                    SKU: {selectedVariant?.sku_code || instrument.sku_prefix}
                  </span>
                )}
              </div>

              {displayImage ? (
                <img
                  src={fileUrl(displayImage)}
                  alt={`Foto hardware ${instrument.name} varian ${
                    selectedVariant?.color_finish || selectedVariant?.variant_name || "utama"
                  }`}
                  className="max-h-[380px] w-auto max-w-full object-contain transition-transform duration-300 hover:scale-[1.03]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-[#3A4A63]">
                  <Package size={64} aria-hidden="true" className="mb-3 opacity-60" />
                  <p className="text-sm font-medium">Foto cinema gear belum tersedia</p>
                </div>
              )}

              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white px-3.5 py-1 text-[11px] font-bold text-[#0F1B2D] shadow-xs">
                <ShieldCheck size={14} className="text-emerald-600" aria-hidden="true" />
                <span>Unit Orisinal &amp; Terinspeksi Sensor QC</span>
              </div>
            </div>

            {/* Deskripsi & Fakta Spesifik Hardware */}
            <section className="fp-glass-card p-6 lg:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-[#0F1B2D]/10 pb-3">
                <h2 className="font-display font-bold text-base text-[#0F1B2D] flex items-center gap-2 uppercase tracking-wider">
                  <Sparkles size={16} className="text-[#E8622C]" aria-hidden="true" />
                  <span>Deskripsi &amp; Karakter Cinema Gear</span>
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-500/12 border border-emerald-500/25 px-3 py-1 rounded-full font-bold tabular-nums">
                  <Award size={13} aria-hidden="true" />
                  <span>Garansi Resmi {instrument.warranty_months || 12} Bulan</span>
                </div>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[#3A4A63] editorial-measure">
                {instrument.description ||
                  "Kamera bioskop & perangkat broadcast dengan konstruksi presisi pabrik dan kalibrasi sensor oleh teknisi Focalpoint Pro."}
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md p-4 shadow-xs">
                  <Award className="text-[#E8622C] mb-2" size={18} aria-hidden="true" />
                  <p className="text-xs font-bold text-[#0F1B2D]">Kondisi: 100% Baru (BNIB)</p>
                  <p className="text-[11px] text-[#3A4A63] mt-0.5">
                    Garansi distributor resmi {instrument.warranty_months || 12} bulan
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md p-4 shadow-xs">
                  <Store className="text-[#E8622C] mb-2" size={18} aria-hidden="true" />
                  <p className="text-xs font-bold text-[#0F1B2D]">Click &amp; Collect 5 Cabang</p>
                  <p className="text-[11px] text-[#3A4A63] mt-0.5">
                    Uji coba fisik di Cleanroom Bench dengan Pickup Pass
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md p-4 shadow-xs">
                  <Truck className="text-[#E8622C] mb-2" size={18} aria-hidden="true" />
                  <p className="text-xs font-bold text-[#0F1B2D]">Packing Kayu Anti-Statis</p>
                  <p className="text-[11px] text-[#3A4A63] mt-0.5">
                    Estimasi tiba 1–4 hari kerja dengan asuransi penuh
                  </p>
                </div>
              </div>
            </section>

            {/* Spesifikasi Teknis Sensor & Hardware */}
            <section className="fp-glass-card p-6 lg:p-7">
              <h2 className="font-display font-bold text-base text-[#0F1B2D] mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Layers size={16} className="text-[#E8622C]" aria-hidden="true" />
                <span>Spesifikasi Teknis &amp; Sensor</span>
              </h2>
              <div className="rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md p-4 shadow-xs">
                <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-[#3A4A63] leading-relaxed">
                  {instrument.specifications ||
                    `Merek: ${brandName}\nKategori: ${
                      instrument.category || instrument.instrument_type || "Cinema Equipment"
                    }\nKode SKU: ${
                      selectedVariant?.sku_code || instrument.sku_prefix || "-"
                    }\nBobot Pengiriman: ${selectedVariant?.weight_kg || 2.5} kg\nInspeksi QC: Kalibrasi Sensor, Uji Back-Focus, & Firmware Terverifikasi`}
                </pre>
              </div>
            </section>

            {/* Widget Analisis Pakar Kompatibilitas Rig (ES Subsystem) */}
            <section className="fp-glass-card p-6 lg:p-7 border-l-4 border-l-[#E8622C]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8622C] text-white shadow-sm">
                    <Cpu size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-sm text-[#0F1B2D] uppercase tracking-wider flex items-center gap-2">
                      <span>Analisis Pakar Kompatibilitas Rig (ES)</span>
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                        Forward Chaining Active
                      </span>
                    </h2>
                    <p className="text-[11px] text-[#64748B]">
                      Validasi kecocokan flange mount optik, sensor coverage, dan kapasitas torsi gimbal
                    </p>
                  </div>
                </div>
                <Link
                  to="/rig-advisor"
                  className="rounded-full bg-white/90 border border-white hover:border-[#E8622C] px-3.5 py-1.5 text-xs font-bold text-[#E8622C] transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
                >
                  <Sparkles size={13} />
                  <span>Uji di Rig Advisor</span>
                </Link>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/70 p-4 text-xs text-[#3A4A63] leading-relaxed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-[#0F1B2D]">
                    Rekomendasi Integrasi Rig:
                  </p>
                  <p className="text-[11px]">
                    Kompatibel dengan ekosistem mount resmi Focalpoint Pro. Memerlukan media berkecepatan tinggi VPG-400 untuk perekaman All-Intra dan daya V-Mount untuk operasional di atas 3 jam.
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="rounded-xl bg-emerald-100 text-emerald-800 px-3 py-1.5 font-bold font-mono text-xs">
                    96.0% CF Verified
                  </span>
                </div>
              </div>
            </section>

            {/* Ketersediaan Lintas Cabang Showroom */}
            <section className="fp-glass-card p-6 lg:p-7">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-display font-bold text-base text-[#0F1B2D] flex items-center gap-2 uppercase tracking-wider">
                  <MapPin size={16} className="text-[#E8622C]" aria-hidden="true" />
                  <span>Ketersediaan di Showroom Resmi</span>
                </h2>
                <Link
                  to="/offline-stores"
                  className="text-xs font-bold text-[#E8622C] hover:underline"
                >
                  Lihat 5 Lokasi Cabang
                </Link>
              </div>
              <p className="text-xs text-[#3A4A63] mb-3">
                Pilih opsi Click &amp; Collect pada tahap Checkout untuk mengambil dan menguji unit ini di showroom resmi Focalpoint Pro:
              </p>
              <div className="rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div>
                  <h3 className="font-display font-bold text-[#0F1B2D] text-sm">
                    {instrument.branch?.name ||
                      instrument.location ||
                      "Focalpoint Pro Flagship — Senayan City & Cabang Mitra"}
                  </h3>
                  <p className="text-xs text-[#3A4A63] mt-0.5">
                    {instrument.branch?.city ||
                      instrument.city ||
                      "Jakarta • Bandung • Surabaya • Bali"}
                  </p>
                </div>
                <span className="text-[11px] bg-emerald-500/12 border border-emerald-500/25 text-emerald-800 font-bold px-3 py-1 rounded-full">
                  Mendukung Click &amp; Collect
                </span>
              </div>
            </section>

            {/* Paket Bundling Hemat */}
            {bundles.length > 0 && (
              <section className="fp-dark-glass-section !rounded-3xl p-6 lg:p-7 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-base text-white uppercase tracking-wider">
                    Rekomendasi Paket Bundling Rig
                  </h2>
                  <span className="text-[11px] font-bold text-[#E8622C]">Harga Paket Khusus</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {bundles.map((b) => (
                    <div
                      key={b.id}
                      className="fp-glass-card-dark p-4 flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-[#E8622C] uppercase tracking-wider">
                          {b.bundle_code}
                        </span>
                        <h3 className="font-display text-xs font-bold text-white mt-0.5">
                          {b.name}
                        </h3>
                        <p className="text-[11px] text-white/70 mt-1 line-clamp-2">
                          {b.description}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-white/10 flex items-baseline justify-between">
                        <span className="tabular-nums font-display text-sm font-extrabold text-white">
                          {formatRupiah(b.bundle_price)}
                        </span>
                        <Link
                          to="/offline-stores"
                          className="text-[11px] font-bold text-[#E8622C] hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>Info Paket</span>
                          <ArrowRight size={11} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Kolom Kanan (5 Kolom): Pemilih Varian, Harga, Info Pengiriman, & Satu CTA Utama */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 fp-glass-card p-6 lg:p-7">
              <div className="mb-4">
                <p className="text-xs font-bold text-[#E8622C] uppercase tracking-widest">
                  {brandName}
                </p>
                <h1 className="mt-1 font-display font-extrabold text-xl sm:text-2xl text-[#0F1B2D] tracking-tight">
                  {instrument.name}
                </h1>

                {reviewsList.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 text-[#E8622C] text-sm font-bold tabular-nums">
                      <span aria-hidden="true">★</span>
                      <span>
                        {(
                          reviewsList.reduce((acc, r) => acc + (r.rating || 5), 0) /
                          reviewsList.length
                        ).toFixed(1)}
                      </span>
                    </div>
                    <span className="text-xs text-[#0F1B2D]/20" aria-hidden="true">
                      •
                    </span>
                    <a
                      href="#reviews-section"
                      className="text-xs font-bold text-[#3A4A63] hover:text-[#E8622C] underline underline-offset-2 transition-colors"
                    >
                      Lihat {reviewsList.length} Ulasan Terverifikasi
                    </a>
                  </div>
                )}
              </div>

              {/* Harga & Diskon Clearance */}
              <div className="border-y border-[#0F1B2D]/10 py-4 my-4">
                {isClearance && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center rounded-full bg-[#E8622C] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Diskon Clearance -{selectedVariant.discount_percent}%
                    </span>
                    {selectedVariant.clearance_note && (
                      <span className="text-xs text-[#E8622C] font-bold">
                        {selectedVariant.clearance_note}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-baseline gap-2.5 tabular-nums">
                  {isClearance ? (
                    <>
                      <span className="font-display text-2xl sm:text-3xl font-extrabold text-[#E8622C]">
                        {formatRupiah(activePrice)}
                      </span>
                      <span className="text-sm font-bold text-[#3A4A63] line-through">
                        {formatRupiah(normalPrice)}
                      </span>
                    </>
                  ) : (
                    <span className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F1B2D]">
                      {formatRupiah(activePrice)}
                    </span>
                  )}
                  <span className="text-xs text-[#3A4A63] font-normal">/ unit (Termasuk PPN)</span>
                </div>
                {selectedVariant?.sku_code && (
                  <p className="mt-1.5 text-xs text-[#3A4A63] tabular-nums">
                    Kode SKU Varian:{" "}
                    <strong className="text-[#0F1B2D] font-bold">{selectedVariant.sku_code}</strong>
                  </p>
                )}
              </div>

              {/* Pemilih Varian / Finishing */}
              {variants.length > 0 && (
                <div className="mb-6">
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#0F1B2D] mb-2.5">
                    Pilih Varian Finishing / Konfigurasi
                  </span>
                  <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Pilih varian instrumen">
                    {variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      const stock =
                        v.stock !== undefined ? v.stock : v.remaining_quota || 0;
                      const soldOut = stock <= 0;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => {
                            setSelectedVariant(v);
                            setQuantity(1);
                            setNotifyRequested(false);
                          }}
                          className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border-[#E8622C] bg-[#E8622C]/10 ring-1 ring-[#E8622C]"
                              : soldOut
                              ? "border-white/80 bg-white/40 opacity-70 hover:border-[#0F1B2D]/20"
                              : "border-white/80 bg-white/70 hover:bg-white hover:border-[#E8622C]/40"
                          }`}
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-[#0F1B2D]">
                                {v.color_finish || v.variant_name || v.tier_name}
                              </span>
                              {v.is_clearance_active ? (
                                <span className="text-[10px] font-bold uppercase text-[#E8622C] bg-[#E8622C]/15 border border-[#E8622C]/30 px-2 py-0.5 rounded-full">
                                  -{v.discount_percent}%
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-[#3A4A63] tabular-nums">
                              {v.is_clearance_active && v.clearance_price ? (
                                <>
                                  <span className="font-bold text-[#E8622C]">
                                    {formatRupiah(v.clearance_price)}
                                  </span>
                                  <span className="line-through text-[#3A4A63]/60">
                                    {formatRupiah(v.price)}
                                  </span>
                                </>
                              ) : (
                                <span className="font-bold text-[#0F1B2D]">
                                  {formatRupiah(v.price)}
                                </span>
                              )}
                              {v.weight_kg && <span>• {v.weight_kg} kg</span>}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {soldOut ? (
                              <span className="text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                                Stok Habis
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full tabular-nums">
                                Tersedia ({stock} unit)
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pemilih Kuantitas */}
              {!isSoldOut && (
                <div className="mb-5">
                  <label
                    htmlFor="qty-display"
                    className="block text-xs font-bold uppercase tracking-wider text-[#0F1B2D] mb-2"
                  >
                    Jumlah Unit
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center rounded-full border border-white/80 bg-white/75 backdrop-blur-md shadow-xs p-0.5">
                      <button
                        type="button"
                        aria-label="Kurangi jumlah unit"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#0F1B2D] hover:bg-[#0F1B2D]/[0.06] disabled:opacity-30 font-bold transition-all cursor-pointer"
                      >
                        −
                      </button>
                      <span
                        id="qty-display"
                        aria-live="polite"
                        className="px-3 py-1 text-sm font-bold text-[#0F1B2D] min-w-[36px] text-center tabular-nums"
                      >
                        {quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Tambah jumlah unit"
                        onClick={() => setQuantity((q) => Math.min(activeStock || 10, q + 1))}
                        disabled={quantity >= activeStock}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[#0F1B2D] hover:bg-[#0F1B2D]/[0.06] disabled:opacity-30 font-bold transition-all cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs text-[#3A4A63] tabular-nums">
                      Maksimal {activeStock} unit tersedia
                    </span>
                  </div>
                </div>
              )}

              {/* Ringkasan Sebelum Membeli */}
              <div className="mb-6 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md p-4 space-y-2 text-xs shadow-xs">
                <div className="flex items-center justify-between text-[#3A4A63]">
                  <span>Subtotal ({quantity} unit)</span>
                  <span className="font-bold text-[#0F1B2D] tabular-nums">{formatRupiah(total)}</span>
                </div>
                <div className="flex items-center justify-between text-[#3A4A63]">
                  <span>Opsi Pemenuhan</span>
                  <span className="text-[#0F1B2D] font-bold">
                    Click &amp; Collect (Rp 0) / Kargo Kayu
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#3A4A63]">
                  <span>Kebijakan Retur</span>
                  <span className="text-[#0F1B2D] font-medium">Jaminan Retur 7 Hari &amp; Asuransi</span>
                </div>
                <div className="border-t border-[#0F1B2D]/10 pt-2 flex items-center justify-between">
                  <span className="font-bold text-sm text-[#0F1B2D]">Estimasi Total Barang</span>
                  <span className="font-display font-extrabold text-base text-[#0F1B2D] tabular-nums">
                    {formatRupiah(total)}
                  </span>
                </div>
              </div>

              {/* Satu CTA Utama */}
              {!isSoldOut ? (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={goCheckout}
                    className="fp-btn-glass-primary w-full !py-3.5 !text-sm !font-bold"
                  >
                    <span>Lanjut ke Checkout / Ambil di Cabang</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                  <p className="text-center text-[11px] text-[#3A4A63]">
                    Pembayaran mendukung QRIS, Virtual Account Bank, atau E-Wallet.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md p-4 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0F1B2D]">
                    <BellRing size={15} className="text-[#E8622C] shrink-0" aria-hidden="true" />
                    <span>Varian Ini Sedang Habis — Beritahu Saya Saat Tersedia</span>
                  </div>
                  {notifyRequested ? (
                    <p
                      role="status"
                      className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl"
                    >
                      Permintaan notifikasi restock untuk {notifyEmail} telah aktif.
                    </p>
                  ) : (
                    <form onSubmit={handleNotifyRestock} className="flex gap-2">
                      <label htmlFor="restock-email" className="sr-only">
                        Alamat Email untuk Notifikasi Stok
                      </label>
                      <input
                        id="restock-email"
                        type="email"
                        required
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder="Masukkan alamat email Anda..."
                        className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs text-[#0F1B2D] flex-1 focus:border-[#E8622C] focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="fp-btn-glass-primary !py-2 !px-4 !text-xs shrink-0"
                      >
                        Beritahu Saya
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SEKSI ULASAN & RATING FILMMAKER TERVERIFIKASI */}
        <section
          id="reviews-section"
          aria-labelledby="reviews-heading"
          className="mt-16 border-t border-[#0F1B2D]/10 pt-12"
        >
          <div className="mb-8">
            <div className="fp-section-pill mb-3">
              <Star className="w-3.5 h-3.5 text-[#E8622C] fill-current" aria-hidden="true" />
              <span>Ulasan Pembelian Terverifikasi</span>
            </div>
            <h2
              id="reviews-heading"
              className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0F1B2D]"
            >
              Catatan &amp; Penilaian Filmmaker
            </h2>
            <p className="text-xs sm:text-sm text-[#3A4A63] mt-1">
              Ulasan langsung dari sineas dan videografer yang telah menggunakan hardware ini di set produksi.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Kolom Kiri: Ringkasan Rating & Formulir Ulasan */}
            <div className="lg:col-span-5 space-y-6">
              <div className="fp-glass-card p-6">
                <div className="flex items-center gap-4 border-b border-[#0F1B2D]/10 pb-5">
                  <div className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[#0F1B2D] tabular-nums">
                    {reviewsList.length > 0
                      ? (
                          reviewsList.reduce((acc, r) => acc + (r.rating || 5), 0) /
                          reviewsList.length
                        ).toFixed(1)
                      : instrument.avg_rating
                      ? Number(instrument.avg_rating).toFixed(1)
                      : "—"}
                  </div>
                  <div>
                    <div className="flex items-center text-[#E8622C] text-lg" aria-hidden="true">
                      {"★".repeat(5)}
                    </div>
                    <p className="text-xs font-bold text-[#3A4A63] mt-1 tabular-nums">
                      Berdasarkan {reviewsList.length} ulasan tercatat
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mt-5">
                  {[5, 4, 3, 2, 1].map((sVal) => {
                    const count = reviewsList.filter((r) => (r.rating || 5) === sVal).length;
                    const pct =
                      reviewsList.length > 0
                        ? Math.round((count / reviewsList.length) * 100)
                        : 0;
                    return (
                      <div
                        key={sVal}
                        className="flex items-center gap-2 text-xs font-medium text-[#3A4A63] tabular-nums"
                      >
                        <span className="w-7 text-right font-bold text-[#0F1B2D]">{sVal} ★</span>
                        <div className="flex-1 h-2 bg-white/70 rounded-full overflow-hidden border border-white">
                          <div
                            className="h-full bg-[#E8622C] transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-[11px] text-[#3A4A63]">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Tulis Ulasan */}
              <div className="fp-glass-card p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-[#0F1B2D]/10 pb-3">
                  <MessageSquare className="w-4 h-4 text-[#E8622C]" aria-hidden="true" />
                  <h3 className="font-display font-bold text-sm text-[#0F1B2D]">
                    Bagikan Ulasan Cinema Gear Ini
                  </h3>
                </div>

                {isAuthenticated ? (
                  <form onSubmit={submitReview} className="space-y-4">
                    <fieldset>
                      <legend className="block text-xs font-bold uppercase tracking-wider text-[#0F1B2D] mb-1.5">
                        Penilaian Bintang (1 – 5)
                      </legend>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            aria-label={`Beri nilai ${star} bintang`}
                            aria-pressed={newRating === star}
                            onClick={() => setNewRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="px-1.5 py-0.5 text-2xl rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
                          >
                            <span
                              aria-hidden="true"
                              className={
                                (hoverRating || newRating) >= star
                                  ? "text-[#E8622C]"
                                  : "text-[#3A4A63]/30"
                              }
                            >
                              ★
                            </span>
                          </button>
                        ))}
                        <span className="text-xs font-bold text-[#0F1B2D] ml-2 tabular-nums">
                          {hoverRating || newRating} / 5
                        </span>
                      </div>
                    </fieldset>

                    {variants.length > 0 && (
                      <div>
                        <label
                          htmlFor="review-variant"
                          className="block text-xs font-bold uppercase tracking-wider text-[#0F1B2D] mb-1"
                        >
                          Varian / Finishing yang Digunakan
                        </label>
                        <select
                          id="review-variant"
                          value={newVariantName}
                          onChange={(e) => setNewVariantName(e.target.value)}
                          className="w-full rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none"
                        >
                          <option value="">Pilih Varian (Opsional)</option>
                          {variants.map((v) => (
                            <option key={v.id} value={v.color_finish || v.variant_name}>
                              {v.color_finish || v.variant_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="review-title"
                        className="block text-xs font-bold uppercase tracking-wider text-[#0F1B2D] mb-1"
                      >
                        Judul Ulasan
                      </label>
                      <input
                        id="review-title"
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Contoh: Sensor Bersih, Dynamic Range Luas & Warna Sinematik Mantap"
                        className="w-full rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="review-comment"
                        className="block text-xs font-bold uppercase tracking-wider text-[#0F1B2D] mb-1"
                      >
                        Detail Pengalaman Penggunaan Hardware *
                      </label>
                      <textarea
                        id="review-comment"
                        rows={4}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Jelaskan kualitas gambar, performa sensor, ketajaman optik, kestabilan gimbal, dan kondisi saat pengiriman..."
                        className="w-full rounded-2xl border border-white/80 bg-white/70 p-3 text-xs text-[#0F1B2D] leading-relaxed focus:border-[#E8622C] focus:outline-none"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="fp-btn-glass-primary w-full !py-2.5 !text-xs"
                    >
                      {submittingReview ? "Mengirim Ulasan..." : "Publikasikan Ulasan"}
                    </button>
                  </form>
                ) : (
                  <div className="p-5 bg-white/50 backdrop-blur-md rounded-2xl border border-white/80 text-center space-y-3">
                    <p className="text-xs text-[#3A4A63]">
                      Masuk ke akun Anda untuk membagikan ulasan pengalaman menggunakan hardware sinema ini.
                    </p>
                    <button
                      type="button"
                      className="fp-btn-glass-primary !py-2 !px-4 !text-xs"
                      onClick={() => navigate("/login", { state: { from: `/products/${id}` } })}
                    >
                      Masuk untuk Menulis Ulasan
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Kolom Kanan: Daftar Ulasan */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#0F1B2D]/10">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-[#0F1B2D]">
                  Daftar Ulasan Filmmaker ({reviewsList.length})
                </span>
                <span className="text-[11px] text-emerald-800 font-bold inline-flex items-center gap-1">
                  <CheckCircle2 size={12} aria-hidden="true" />
                  <span>Terverifikasi Sistem</span>
                </span>
              </div>

              {reviewsList.length === 0 ? (
                <div className="fp-glass-card !p-10 text-center space-y-2">
                  <Star className="w-7 h-7 text-[#3A4A63] mx-auto opacity-50" aria-hidden="true" />
                  <p className="font-display text-sm font-bold text-[#0F1B2D]">
                    Belum Ada Ulasan Tercatat
                  </p>
                  <p className="text-xs text-[#3A4A63] max-w-sm mx-auto">
                    Jadilah filmmaker pertama yang menulis ulasan teknis untuk hardware ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {reviewsList.map((rev) => (
                    <article
                      key={rev.id}
                      className="fp-glass-card !p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[#0F1B2D] text-white flex items-center justify-center font-display font-bold text-xs shrink-0 shadow-xs">
                            {(rev.customer_name || "F").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-[#0F1B2D]">
                                {rev.customer_name || "Filmmaker Focalpoint"}
                              </p>
                              {rev.is_verified_purchase && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/12 text-emerald-800 font-bold text-[10px] border border-emerald-400/25">
                                  Pembelian Terverifikasi
                                </span>
                              )}
                            </div>
                            {rev.variant_name && (
                              <p className="text-[11px] text-[#3A4A63] mt-0.5">
                                Varian:{" "}
                                <span className="text-[#0F1B2D] font-bold">
                                  {rev.variant_name}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className="text-[#E8622C] text-sm font-bold"
                            aria-label={`Rating ${rev.rating || 5} dari 5 bintang`}
                          >
                            {"★".repeat(rev.rating || 5)}
                            {"☆".repeat(Math.max(0, 5 - (rev.rating || 5)))}
                          </div>
                          <time className="block text-[10px] text-[#3A4A63] mt-0.5 tabular-nums">
                            {rev.created_at
                              ? new Date(rev.created_at).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "Baru saja"}
                          </time>
                        </div>
                      </div>

                      <div>
                        {rev.title && (
                          <h4 className="font-display font-bold text-xs text-[#0F1B2D] mb-1">
                            {rev.title}
                          </h4>
                        )}
                        <p className="text-xs text-[#3A4A63] leading-relaxed whitespace-pre-line">
                          {rev.comment}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

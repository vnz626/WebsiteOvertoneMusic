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
    if (user?.email) setNotifyEmail(user.email);
  }, [user]);

  async function submitReview(e) {
    e.preventDefault();
    if (!isAuthenticated) {
      toast("Silakan masuk ke akun Anda untuk menulis ulasan.");
      navigate("/login", { state: { from: `/products/${id}` } });
      return;
    }
    if (!newComment.trim()) {
      toast.error("Mohon tuliskan ulasan pengalaman Anda sebelum mengirim.");
      return;
    }
    try {
      setSubmittingReview(true);
      const res = await api.post(`/products/${id}/reviews`, {
        rating: newRating,
        title: newTitle.trim(),
        comment: newComment.trim(),
        variant_name:
          newVariantName ||
          selectedVariant?.variant_name ||
          selectedVariant?.color_finish ||
          "",
      });
      toast.success("Terima kasih! Ulasan musisi berhasil dipublikasikan.");
      if (res.data?.data) {
        setReviewsList((prev) => [res.data.data, ...prev]);
      }
      setNewTitle("");
      setNewComment("");
      setNewRating(5);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mengirim ulasan.");
    } finally {
      setSubmittingReview(false);
    }
  }

  async function toggleSave() {
    if (!isAuthenticated) {
      toast("Silakan masuk terlebih dahulu untuk menyimpan ke Wishlist.");
      navigate("/login", { state: { from: `/products/${id}` } });
      return;
    }
    try {
      if (saved) {
        await api.delete(`/events/${id}/save`);
        setSaved(false);
        toast.success("Instrumen dihapus dari Wishlist.");
      } else {
        await api.post(`/events/${id}/save`);
        setSaved(true);
        toast.success("Instrumen disimpan ke Wishlist.");
      }
    } catch {
      toast.error("Gagal memperbarui Wishlist.");
    }
  }

  function goCheckout() {
    if (!isAuthenticated) {
      toast("Silakan masuk ke akun Anda untuk melanjutkan pembelian.");
      navigate("/login", { state: { from: `/products/${id}` } });
      return;
    }
    if (!selectedVariant) {
      toast.error("Pilih varian atau finishing instrumen terlebih dahulu.");
      return;
    }
    const currentStock =
      selectedVariant.stock !== undefined
        ? selectedVariant.stock
        : selectedVariant.remaining_quota || 0;
    if (currentStock <= 0) {
      toast.error("Varian ini sedang habis stok.");
      return;
    }
    navigate("/checkout", {
      state: {
        eventId: instrument.id,
        productId: instrument.id,
        tierId: selectedVariant.id,
        variantId: selectedVariant.id,
        quantity,
        tier: selectedVariant,
        variant: selectedVariant,
        instrument,
        product: instrument,
      },
    });
  }

  function handleNotifyRestock(e) {
    e.preventDefault();
    if (!notifyEmail.trim()) {
      toast.error("Masukkan alamat email untuk menerima pemberitahuan stok.");
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
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-12">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!instrument) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-12">
        <EmptyState
          title="Instrumen Musik Tidak Ditemukan"
          description="Produk yang Anda cari mungkin telah diarsipkan atau tautan tidak valid."
          action={
            <Link
              to="/products"
              className="rounded-sm bg-accent px-4 py-2 text-xs font-bold text-accent-on hover:bg-accent-hover"
            >
              Kembali ke Katalog Instrumen
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
  const brandName = instrument.brand?.name || instrument.organizer || "Overtone Authorized";
  const displayImage = selectedVariant?.image_url || instrument.image_url;

  return (
    <div className="min-h-screen bg-canvas text-ink pb-20">
      {/* Header Breadcrumb */}
      <div className="border-b border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 lg:px-12 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-ink-muted">
            <Link to="/products" className="hover:text-ink transition-colors duration-fast">
              Katalog Instrumen
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              to={`/products?brand=${encodeURIComponent(brandName)}`}
              className="text-accent font-bold uppercase tracking-wider hover:underline"
            >
              {brandName}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-ink font-medium line-clamp-1 max-w-[200px] sm:max-w-md">
              {instrument.name}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-sm border border-line-strong bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted transition-colors duration-fast"
            >
              <Share2 size={13} aria-hidden="true" />
              <span>Bagikan</span>
            </button>
            <button
              type="button"
              onClick={toggleSave}
              aria-pressed={saved}
              className={`inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-bold transition-colors duration-fast ${
                saved
                  ? "border-status-danger-border bg-status-danger-bg text-status-danger-text"
                  : "border-line-strong bg-surface text-ink hover:bg-surface-muted"
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
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Kolom Kiri (7 Kolom): Galeri Foto 1:1, Spesifikasi Luthier, Lokasi Cabang, Bundling */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            {/* Galeri Foto Instrumen */}
            <div className="relative overflow-hidden rounded-md border border-line-strong bg-surface p-6 lg:p-10 flex items-center justify-center aspect-square max-h-[500px]">
              <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                <span className="rounded-xs bg-surface-muted border border-line-strong px-2.5 py-1 text-xs font-bold text-ink uppercase tracking-wider">
                  {brandName}
                </span>
                {instrument.instrument_type && (
                  <span className="rounded-xs bg-canvas border border-line px-2.5 py-1 text-xs font-bold text-ink-secondary">
                    {instrument.instrument_type}
                  </span>
                )}
                {(selectedVariant?.sku_code || instrument.sku_prefix) && (
                  <span className="rounded-xs bg-canvas border border-line px-2.5 py-1 text-[11px] tabular-nums font-bold text-ink-muted">
                    SKU: {selectedVariant?.sku_code || instrument.sku_prefix}
                  </span>
                )}
              </div>

              {displayImage ? (
                <img
                  src={fileUrl(displayImage)}
                  alt={`Foto instrumen ${instrument.name} varian ${
                    selectedVariant?.color_finish || selectedVariant?.variant_name || "utama"
                  }`}
                  className="max-h-[380px] w-auto max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-ink-muted">
                  <Package size={64} aria-hidden="true" className="mb-3" />
                  <p className="text-sm font-medium">Foto cinema gear belum tersedia</p>
                </div>
              )}

              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-xs bg-surface border border-line-strong px-3 py-1 text-[11px] font-bold text-ink">
                <ShieldCheck size={14} className="text-status-success-text" aria-hidden="true" />
                <span>Unit Orisinal &amp; Terinspeksi Sensor QC</span>
              </div>
            </div>

            {/* Deskripsi & Fakta Spesifik Produk (Aturan G & K) */}
            <section className="rounded-md border border-line bg-surface p-6 lg:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-line pb-3">
                <h2 className="font-display font-bold text-base text-ink flex items-center gap-2 uppercase tracking-wider">
                  <Sparkles size={16} className="text-accent" aria-hidden="true" />
                  <span>Deskripsi &amp; Karakter Cinema Gear</span>
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-status-success-text bg-status-success-bg border border-status-success-border px-2.5 py-1 rounded-xs font-bold tabular-nums">
                  <Award size={13} aria-hidden="true" />
                  <span>Garansi Resmi {instrument.warranty_months || 12} Bulan</span>
                </div>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-secondary editorial-measure">
                {instrument.description ||
                  "Kamera bioskop & perangkat broadcast dengan konstruksi presisi pabrik dan kalibrasi sensor oleh teknisi Overtone."}
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-sm border border-line bg-surface-muted p-3.5">
                  <Award className="text-accent mb-1.5" size={18} aria-hidden="true" />
                  <p className="text-xs font-bold text-ink">Kondisi: 100% Baru (BNIB)</p>
                  <p className="text-[11px] text-ink-secondary mt-0.5">
                    Garansi distributor resmi {instrument.warranty_months || 12} bulan
                  </p>
                </div>
                <div className="rounded-sm border border-line bg-surface-muted p-3.5">
                  <Store className="text-accent mb-1.5" size={18} aria-hidden="true" />
                  <p className="text-xs font-bold text-ink">Click &amp; Collect 5 Cabang</p>
                  <p className="text-[11px] text-ink-secondary mt-0.5">
                    Uji coba fisik di Cleanroom Bench dengan Pickup Pass
                  </p>
                </div>
                <div className="rounded-sm border border-line bg-surface-muted p-3.5">
                  <Truck className="text-accent mb-1.5" size={18} aria-hidden="true" />
                  <p className="text-xs font-bold text-ink">Packing Kayu Anti-Statis</p>
                  <p className="text-[11px] text-ink-secondary mt-0.5">
                    Estimasi tiba 1–4 hari kerja dengan asuransi penuh
                  </p>
                </div>
              </div>
            </section>

            {/* Spesifikasi Teknis Sensor & Hardware */}
            <section className="rounded-md border border-line bg-surface p-6 lg:p-7">
              <h2 className="font-display font-bold text-base text-ink mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Layers size={16} className="text-accent" aria-hidden="true" />
                <span>Spesifikasi Teknis &amp; Sensor</span>
              </h2>
              <div className="rounded-sm border border-line bg-surface-muted p-4">
                <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-ink-secondary leading-relaxed">
                  {instrument.specifications ||
                    `Merek: ${brandName}\nKategori: ${
                      instrument.category || instrument.instrument_type || "Cinema Equipment"
                    }\nKode SKU: ${
                      selectedVariant?.sku_code || instrument.sku_prefix || "-"
                    }\nBobot Pengiriman: ${selectedVariant?.weight_kg || 2.5} kg\nInspeksi QC: Kalibrasi Sensor, Uji Back-Focus, & Firmware Terverifikasi`}
                </pre>
              </div>
            </section>

            {/* Ketersediaan Lintas Cabang Offline Store */}
            <section className="rounded-md border border-line bg-surface p-6 lg:p-7">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-display font-bold text-base text-ink flex items-center gap-2 uppercase tracking-wider">
                  <MapPin size={16} className="text-accent" aria-hidden="true" />
                  <span>Informasi Audisi &amp; Cabang Offline Store</span>
                </h2>
                <Link
                  to="/offline-stores"
                  className="text-xs font-bold text-accent hover:underline"
                >
                  Lihat 5 Lokasi Cabang
                </Link>
              </div>
              <p className="text-xs text-ink-secondary mb-3">
                Anda dapat memilih opsi Click &amp; Collect pada tahap Checkout untuk mengambil dan menguji unit ini di cabang resmi Overtone:
              </p>
              <div className="rounded-sm border border-line-strong bg-surface-muted p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-ink text-sm">
                    {instrument.branch?.name ||
                      instrument.location ||
                      "Overtone Flagship Store — Senayan City & Cabang Mitra"}
                  </h3>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    {instrument.branch?.city ||
                      instrument.city ||
                      "Jakarta • Bandung • Surabaya • Bali"}
                  </p>
                </div>
                <span className="text-[11px] bg-status-success-bg border border-status-success-border text-status-success-text font-bold px-2.5 py-1 rounded-xs">
                  Mendukung Click &amp; Collect
                </span>
              </div>
            </section>

            {/* Paket Bundling Hemat */}
            {bundles.length > 0 && (
              <section className="rounded-md border border-line bg-surface p-6 lg:p-7">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-base text-ink uppercase tracking-wider">
                    Rekomendasi Paket Bundling Rig
                  </h2>
                  <span className="text-[11px] font-bold text-accent">Harga Paket Khusus</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {bundles.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-sm border border-line bg-surface-muted p-3.5 flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                          {b.bundle_code}
                        </span>
                        <h3 className="font-display text-xs font-bold text-ink mt-0.5">
                          {b.name}
                        </h3>
                        <p className="text-[11px] text-ink-secondary mt-1 line-clamp-2">
                          {b.description}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-line flex items-baseline justify-between">
                        <span className="tabular-nums font-display text-sm font-extrabold text-ink">
                          {formatRupiah(b.bundle_price)}
                        </span>
                        <Link
                          to="/offline-stores"
                          className="text-[11px] font-bold text-accent hover:underline inline-flex items-center gap-0.5"
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

          {/* Kolom Kanan (5 Kolom): Pemilih Varian, Harga, Info Pengiriman, & Satu CTA Utama (Aturan G) */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 rounded-md border border-line-strong bg-surface p-6 lg:p-7 shadow-sm">
              <div className="mb-4">
                <p className="text-xs font-bold text-accent uppercase tracking-widest">
                  {brandName}
                </p>
                <h1 className="mt-1 font-display font-extrabold text-xl sm:text-2xl text-ink tracking-tight">
                  {instrument.name}
                </h1>

                {reviewsList.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 text-accent text-sm font-bold tabular-nums">
                      <span aria-hidden="true">★</span>
                      <span>
                        {(
                          reviewsList.reduce((acc, r) => acc + (r.rating || 5), 0) /
                          reviewsList.length
                        ).toFixed(1)}
                      </span>
                    </div>
                    <span className="text-xs text-line-strong" aria-hidden="true">
                      •
                    </span>
                    <a
                      href="#reviews-section"
                      className="text-xs font-bold text-ink-secondary hover:text-accent underline underline-offset-2 transition-colors duration-fast"
                    >
                      Lihat {reviewsList.length} Ulasan Terverifikasi
                    </a>
                  </div>
                )}
              </div>

              {/* Harga & Diskon Clearance (Tabular Nums) */}
              <div className="border-y border-line py-4 my-4">
                {isClearance && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center rounded-xs bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-on">
                      Diskon Clearance -{selectedVariant.discount_percent}%
                    </span>
                    {selectedVariant.clearance_note && (
                      <span className="text-xs text-accent font-bold">
                        {selectedVariant.clearance_note}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-baseline gap-2.5 tabular-nums">
                  {isClearance ? (
                    <>
                      <span className="font-display text-2xl sm:text-3xl font-extrabold text-accent">
                        {formatRupiah(activePrice)}
                      </span>
                      <span className="text-sm font-bold text-ink-muted line-through">
                        {formatRupiah(normalPrice)}
                      </span>
                    </>
                  ) : (
                    <span className="font-display text-2xl sm:text-3xl font-extrabold text-ink">
                      {formatRupiah(activePrice)}
                    </span>
                  )}
                  <span className="text-xs text-ink-muted font-normal">/ unit (Termasuk PPN)</span>
                </div>
                {selectedVariant?.sku_code && (
                  <p className="mt-1.5 text-xs text-ink-secondary tabular-nums">
                    Kode SKU Varian:{" "}
                    <strong className="text-ink font-bold">{selectedVariant.sku_code}</strong>
                  </p>
                )}
              </div>

              {/* Pemilih Varian / Finishing (Aturan G: Mengubah harga, stok, dan gambar langsung) */}
              {variants.length > 0 && (
                <div className="mb-6">
                  <span className="block text-xs font-bold uppercase tracking-wider text-ink mb-2.5">
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
                          className={`flex items-center justify-between rounded-sm border p-3.5 text-left transition-colors duration-fast ${
                            isSelected
                              ? "border-accent bg-accent-subtle/40 ring-1 ring-accent"
                              : soldOut
                              ? "border-line bg-surface-muted opacity-75 hover:border-line-strong"
                              : "border-line bg-surface hover:border-line-strong"
                          }`}
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-ink">
                                {v.color_finish || v.variant_name || v.tier_name}
                              </span>
                              {v.is_clearance_active ? (
                                <span className="text-[10px] font-bold uppercase text-accent bg-accent-subtle border border-accent/30 px-1.5 py-0.5 rounded-xs">
                                  -{v.discount_percent}%
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-ink-secondary tabular-nums">
                              {v.is_clearance_active && v.clearance_price ? (
                                <>
                                  <span className="font-bold text-accent">
                                    {formatRupiah(v.clearance_price)}
                                  </span>
                                  <span className="line-through text-ink-muted">
                                    {formatRupiah(v.price)}
                                  </span>
                                </>
                              ) : (
                                <span className="font-bold text-ink">
                                  {formatRupiah(v.price)}
                                </span>
                              )}
                              {v.weight_kg && <span>• {v.weight_kg} kg</span>}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {soldOut ? (
                              <span className="text-[11px] font-bold text-status-danger-text bg-status-danger-bg border border-status-danger-border px-2 py-0.5 rounded-xs">
                                Stok Habis
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-status-success-text bg-status-success-bg border border-status-success-border px-2 py-0.5 rounded-xs tabular-nums">
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
                    className="block text-xs font-bold uppercase tracking-wider text-ink mb-2"
                  >
                    Jumlah Unit
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center rounded-sm border border-line-strong bg-surface">
                      <button
                        type="button"
                        aria-label="Kurangi jumlah unit"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="px-3.5 py-2 text-ink hover:bg-surface-muted disabled:opacity-40 font-bold"
                      >
                        −
                      </button>
                      <span
                        id="qty-display"
                        aria-live="polite"
                        className="px-4 py-2 text-sm font-bold text-ink min-w-[44px] text-center tabular-nums"
                      >
                        {quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Tambah jumlah unit"
                        onClick={() => setQuantity((q) => Math.min(activeStock || 10, q + 1))}
                        disabled={quantity >= activeStock}
                        className="px-3.5 py-2 text-ink hover:bg-surface-muted disabled:opacity-40 font-bold"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs text-ink-secondary tabular-nums">
                      Maksimal {activeStock} unit tersedia
                    </span>
                  </div>
                </div>
              )}

              {/* Ringkasan Sebelum Membeli (Aturan G: Info pengiriman jelas sebelum tombol Beli) */}
              <div className="mb-6 rounded-sm border border-line bg-surface-muted p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-ink-secondary">
                  <span>Subtotal ({quantity} unit)</span>
                  <span className="font-bold text-ink tabular-nums">{formatRupiah(total)}</span>
                </div>
                <div className="flex items-center justify-between text-ink-secondary">
                  <span>Opsi Pemenuhan</span>
                  <span className="text-ink font-bold">
                    Click &amp; Collect (Rp 0) / Kargo Kayu
                  </span>
                </div>
                <div className="flex items-center justify-between text-ink-secondary">
                  <span>Kebijakan Retur</span>
                  <span className="text-ink font-medium">Jaminan Retur 7 Hari &amp; Asuransi</span>
                </div>
                <div className="border-t border-line pt-2 flex items-center justify-between">
                  <span className="font-bold text-sm text-ink">Estimasi Total Barang</span>
                  <span className="font-display font-extrabold text-base text-ink tabular-nums">
                    {formatRupiah(total)}
                  </span>
                </div>
              </div>

              {/* Satu CTA Utama — atau "Beritahu Saya" yang berfungsi saat Stok Habis (Aturan G) */}
              {!isSoldOut ? (
                <div className="space-y-2.5">
                  <Button
                    onClick={goCheckout}
                    variant="primary"
                    className="w-full py-3.5 text-sm uppercase tracking-wider"
                  >
                    Lanjut ke Checkout / Ambil di Cabang
                  </Button>
                  <p className="text-center text-[11px] text-ink-muted">
                    Pembayaran mendukung QRIS, Virtual Account Bank, atau E-Wallet.
                  </p>
                </div>
              ) : (
                <div className="rounded-sm border border-line-strong bg-surface-muted p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-ink">
                    <BellRing size={15} className="text-accent shrink-0" aria-hidden="true" />
                    <span>Varian Ini Sedang Habis — Beritahu Saya Saat Tersedia</span>
                  </div>
                  {notifyRequested ? (
                    <p
                      role="status"
                      className="text-xs font-bold text-status-success-text bg-status-success-bg border border-status-success-border p-2.5 rounded-xs"
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
                        className="ot-input flex-1 py-2 text-xs"
                      />
                      <Button type="submit" variant="ink" className="shrink-0">
                        Beritahu Saya
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SEKSI ULASAN & RATING MUSISI TERVERIFIKASI */}
        <section
          id="reviews-section"
          aria-labelledby="reviews-heading"
          className="mt-16 border-t border-line pt-12"
        >
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-accent-subtle border border-accent/30 text-accent text-xs font-bold tracking-wide mb-2">
              <Star className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>Ulasan Pembelian Terverifikasi</span>
            </div>
            <h2
              id="reviews-heading"
              className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink"
            >
              Catatan &amp; Penilaian Musisi
            </h2>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1">
              Ulasan langsung dari musisi yang telah menggunakan instrumen ini di panggung maupun studio.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Kolom Kiri: Ringkasan Rating & Formulir Ulasan */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-md border border-line bg-surface p-6">
                <div className="flex items-center gap-4 border-b border-line pb-5">
                  <div className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink tabular-nums">
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
                    <div className="flex items-center text-accent text-lg" aria-hidden="true">
                      {"★".repeat(5)}
                    </div>
                    <p className="text-xs font-bold text-ink-secondary mt-1 tabular-nums">
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
                        className="flex items-center gap-2 text-xs font-medium text-ink-secondary tabular-nums"
                      >
                        <span className="w-7 text-right font-bold text-ink">{sVal} ★</span>
                        <div className="flex-1 h-2 bg-surface-muted rounded-xs overflow-hidden border border-line">
                          <div
                            className="h-full bg-accent transition-all duration-normal"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-[11px] text-ink-muted">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Tulis Ulasan */}
              <div className="rounded-md border border-line bg-surface p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-line pb-3">
                  <MessageSquare className="w-4 h-4 text-accent" aria-hidden="true" />
                  <h3 className="font-display font-bold text-sm text-ink">
                    Bagikan Ulasan Instrumen Ini
                  </h3>
                </div>

                {isAuthenticated ? (
                  <form onSubmit={submitReview} className="space-y-4">
                    <fieldset>
                      <legend className="block text-xs font-bold uppercase tracking-wider text-ink mb-1.5">
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
                            className="px-1.5 py-0.5 text-2xl rounded-xs border border-transparent hover:border-line"
                          >
                            <span
                              aria-hidden="true"
                              className={
                                (hoverRating || newRating) >= star
                                  ? "text-accent"
                                  : "text-line-strong"
                              }
                            >
                              ★
                            </span>
                          </button>
                        ))}
                        <span className="text-xs font-bold text-ink ml-2 tabular-nums">
                          {hoverRating || newRating} / 5
                        </span>
                      </div>
                    </fieldset>

                    {variants.length > 0 && (
                      <div>
                        <label
                          htmlFor="review-variant"
                          className="block text-xs font-bold uppercase tracking-wider text-ink mb-1"
                        >
                          Varian / Finishing yang Digunakan
                        </label>
                        <select
                          id="review-variant"
                          value={newVariantName}
                          onChange={(e) => setNewVariantName(e.target.value)}
                          className="ot-input"
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
                        className="block text-xs font-bold uppercase tracking-wider text-ink mb-1"
                      >
                        Judul Ulasan
                      </label>
                      <input
                        id="review-title"
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Contoh: Sensor Bersih, Dynamic Range Luas & Warna Sinematik Mantap"
                        className="ot-input"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="review-comment"
                        className="block text-xs font-bold uppercase tracking-wider text-ink mb-1"
                      >
                        Detail Pengalaman Penggunaan Hardware *
                      </label>
                      <textarea
                        id="review-comment"
                        rows={4}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Jelaskan kualitas gambar, performa sensor, ketajaman optik, kestabilan gimbal, dan kondisi saat pengiriman..."
                        className="ot-input leading-relaxed"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      loading={submittingReview}
                      className="w-full"
                    >
                      {submittingReview ? "Mengirim Ulasan..." : "Publikasikan Ulasan"}
                    </Button>
                  </form>
                ) : (
                  <div className="p-4 bg-surface-muted rounded-sm border border-line text-center space-y-2.5">
                    <p className="text-xs text-ink-secondary">
                      Masuk ke akun Anda untuk membagikan ulasan pengalaman bermain instrumen ini.
                    </p>
                    <Button
                      type="button"
                      variant="ink"
                      onClick={() => navigate("/login", { state: { from: `/products/${id}` } })}
                    >
                      Masuk untuk Menulis Ulasan
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Kolom Kanan: Daftar Ulasan */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-line">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-ink">
                  Daftar Ulasan Musisi ({reviewsList.length})
                </span>
                <span className="text-[11px] text-status-success-text font-bold inline-flex items-center gap-1">
                  <CheckCircle2 size={12} aria-hidden="true" />
                  <span>Terverifikasi Sistem</span>
                </span>
              </div>

              {reviewsList.length === 0 ? (
                <div className="rounded-md border border-dashed border-line-strong bg-surface p-10 text-center space-y-2">
                  <Star className="w-7 h-7 text-ink-muted mx-auto" aria-hidden="true" />
                  <p className="font-display text-sm font-bold text-ink">
                    Belum Ada Ulasan Tercatat
                  </p>
                  <p className="text-xs text-ink-secondary max-w-sm mx-auto">
                    Jadilah musisi pertama yang menulis ulasan teknis untuk instrumen ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {reviewsList.map((rev) => (
                    <article
                      key={rev.id}
                      className="rounded-md border border-line bg-surface p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xs bg-surface-muted text-ink border border-line-strong flex items-center justify-center font-display font-bold text-xs shrink-0">
                            {(rev.customer_name || "M").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-ink">
                                {rev.customer_name || "Musisi Overtone"}
                              </p>
                              {rev.is_verified_purchase && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-status-success-bg text-status-success-text font-bold text-[10px] border border-status-success-border">
                                  Pembelian Terverifikasi
                                </span>
                              )}
                            </div>
                            {rev.variant_name && (
                              <p className="text-[11px] text-ink-muted mt-0.5">
                                Varian:{" "}
                                <span className="text-ink-secondary font-bold">
                                  {rev.variant_name}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className="text-accent text-sm font-bold"
                            aria-label={`Rating ${rev.rating || 5} dari 5 bintang`}
                          >
                            {"★".repeat(rev.rating || 5)}
                            {"☆".repeat(Math.max(0, 5 - (rev.rating || 5)))}
                          </div>
                          <time className="block text-[10px] text-ink-muted mt-0.5 tabular-nums">
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
                          <h4 className="font-display font-bold text-xs text-ink mb-1">
                            {rev.title}
                          </h4>
                        )}
                        <p className="text-xs text-ink-secondary leading-relaxed whitespace-pre-line">
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

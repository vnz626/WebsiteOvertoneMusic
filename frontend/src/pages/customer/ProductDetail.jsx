import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Share2, Heart, MapPin, ShieldCheck, Package, Truck, Store,
  Sparkles, Layers, Award, CheckCircle2
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
  const { isAuthenticated } = useAuth();

  const [instrument, setInstrument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Fetch instrument detail (coba /products lalu fallback /events)
    api.get(`/products/${id}`)
      .catch(() => api.get(`/events/${id}`))
      .then((res) => {
        const prod = res.data.data;
        setInstrument(prod);
        // Jika detail produk sudah memuat variants / tiers
        const vList = prod.variants || prod.tiers || [];
        if (vList.length > 0) {
          setVariants(vList);
          setSelectedVariant(vList[0]);
        } else {
          // Fetch variants separately
          api.get(`/products/${id}/variants`)
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
  }, [id]);

  async function toggleSave() {
    if (!isAuthenticated) {
      toast("Silakan login untuk menyimpan ke wishlist");
      navigate("/login", { state: { from: `/products/${id}` } });
      return;
    }
    try {
      if (saved) {
        await api.delete(`/events/${id}/save`);
        setSaved(false);
        toast.success("Dihapus dari wishlist");
      } else {
        await api.post(`/events/${id}/save`);
        setSaved(true);
        toast.success("Ditambahkan ke wishlist");
      }
    } catch {
      toast.error("Gagal memperbarui wishlist");
    }
  }

  function goCheckout() {
    if (!isAuthenticated) {
      toast("Silakan login terlebih dahulu untuk checkout");
      navigate("/login", { state: { from: `/products/${id}` } });
      return;
    }
    if (!selectedVariant) {
      toast.error("Pilih varian instrumen terlebih dahulu");
      return;
    }
    const currentStock = selectedVariant.stock !== undefined ? selectedVariant.stock : (selectedVariant.remaining_quota || 0);
    if (currentStock <= 0) {
      toast.error("Varian ini sedang habis stok");
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
      }
    });
  }

  function share() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: instrument?.name, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      toast.success("Link produk berhasil disalin");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-12">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!instrument) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-12">
        <EmptyState
          title="Instrumen Musik Tidak Ditemukan"
          description="Produk mungkin belum dirilis, telah diarsipkan, atau ID tidak valid."
          action={<Link to="/events" className="text-amber-500 font-bold hover:underline">Kembali ke Katalog</Link>}
        />
      </div>
    );
  }

  const isClearance = Boolean(selectedVariant?.is_clearance_active);
  const normalPrice = selectedVariant?.price || instrument.price || 0;
  const activePrice = (isClearance && selectedVariant?.clearance_price)
    ? Number(selectedVariant.clearance_price)
    : normalPrice;

  const activeStock = selectedVariant
    ? (selectedVariant.stock !== undefined ? selectedVariant.stock : selectedVariant.remaining_quota)
    : instrument.remaining_quota;
  const isSoldOut = activeStock <= 0;
  const total = activePrice * quantity;

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-20">
      {/* Editorial Breadcrumb Header */}
      <div className="border-b border-gray-200 bg-[#FBFBFB]">
        <div className="mx-auto max-w-7xl px-6 py-3.5 lg:px-12 flex items-center justify-between">
          <nav className="flex items-center gap-2 text-xs text-gray-500">
            <Link to="/products" className="hover:text-black transition-colors">Katalog Musik</Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold uppercase tracking-wider">{instrument.brand?.name || instrument.organizer || "Brand"}</span>
            <span>/</span>
            <span className="text-gray-600 line-clamp-1 max-w-[200px] sm:max-w-md">{instrument.name}</span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-black transition-all"
            >
              <Share2 size={13} /> Bagikan
            </button>
            <button
              onClick={toggleSave}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all ${
                saved
                  ? "border-red-300 bg-red-50 text-red-600"
                  : "border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:text-red-600"
              }`}
            >
              <Heart size={13} className={saved ? "fill-red-600 text-red-600" : ""} />
              {saved ? "Disimpan" : "Wishlist"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="mx-auto max-w-7xl px-6 pt-8 lg:px-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          
          {/* Kolom Kiri: Visual & Spesifikasi Teknis (col 7) */}
          <div className="flex flex-col gap-8 lg:col-span-7">
            
            {/* Gambar Hero Produk */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 lg:p-10 flex items-center justify-center min-h-[420px] shadow-sm">
              <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                <span className="rounded-md bg-gray-100 border border-gray-200 px-3 py-1 text-xs font-bold text-gray-900 uppercase tracking-widest">
                  {instrument.brand?.name || instrument.organizer || "Overtone Authorized"}
                </span>
                {instrument.instrument_type && (
                  <span className="rounded-md bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700">
                    {instrument.instrument_type}
                  </span>
                )}
                {instrument.sku_prefix && (
                  <span className="rounded-md bg-gray-50 border border-gray-200 px-2 py-1 text-[11px] font-mono text-gray-600">
                    SKU: {instrument.sku_prefix}
                  </span>
                )}
              </div>

              {instrument.image_url ? (
                <img
                  src={fileUrl(instrument.image_url)}
                  alt={instrument.name}
                  className="max-h-[420px] w-auto max-w-full object-contain transition-transform duration-500 hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Package size={64} className="stroke-1 text-gray-300 mb-3" />
                  <p className="text-sm">Foto instrumen resmi</p>
                </div>
              )}

              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-white/95 border border-gray-200 px-3.5 py-1 text-[11px] text-gray-700 shadow-sm">
                <ShieldCheck size={14} className="text-[#16A34A]" /> 100% Original Overtone Authorized
              </div>
            </div>

            {/* Tentang & Deskripsi Produk */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 lg:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <h2 className="font-bold text-base text-gray-900 flex items-center gap-2 uppercase tracking-wider">
                  <Sparkles size={16} className="text-gray-900" /> Gambaran Produk
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-[#16A34A] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-medium">
                  <Award size={13} /> {instrument.warranty_months || 12} Bulan Garansi Resmi
                </div>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700 font-sans">
                {instrument.description || "Instrumen musik berkualitas tinggi dengan standar konstruksi dan kualitas suara profesional."}
              </p>

              {/* Value Badges */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-200 bg-[#F7F7F7] p-3.5">
                  <Award className="text-gray-900 mb-1.5" size={20} />
                  <p className="text-xs font-bold text-gray-900">Garansi Distributor</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">Jaminan {instrument.warranty_months || 12} bulan service resmi</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-[#F7F7F7] p-3.5">
                  <Store className="text-gray-900 mb-1.5" size={20} />
                  <p className="text-xs font-bold text-gray-900">Click &amp; Collect</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">Ambil langsung di Showroom Overtone</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-[#F7F7F7] p-3.5">
                  <Truck className="text-gray-900 mb-1.5" size={20} />
                  <p className="text-xs font-bold text-gray-900">Ekspedisi Berasuransi</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">Packing kayu aman ke seluruh Indonesia</p>
                </div>
              </div>
            </section>

            {/* Spesifikasi Teknis */}
            {instrument.specifications && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 lg:p-8 shadow-sm">
                <h3 className="font-bold text-base text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <Layers size={16} className="text-gray-900" /> Spesifikasi Teknis
                </h3>
                <div className="rounded-xl border border-gray-100 bg-[#F9FAFB] p-4">
                  <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-gray-700 leading-relaxed">
                    {instrument.specifications}
                  </pre>
                </div>
              </section>
            )}

            {/* Showroom Display / Cabang */}
            {(instrument.location || instrument.city || instrument.branch) && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 lg:p-8 shadow-sm">
                <h3 className="font-bold text-base text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <MapPin size={16} className="text-gray-900" /> Showroom Display
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Tersedia untuk audisi fisik dan Click &amp; Collect di showroom resmi kami:
                </p>
                <div className="rounded-xl border border-gray-200 bg-[#F7F7F7] p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{instrument.branch?.name || instrument.location || "Overtone Flagship Showroom"}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{instrument.branch?.city || instrument.city || "Jakarta Pusat"}</p>
                  </div>
                  <span className="text-[11px] bg-white border border-gray-300 text-gray-900 font-semibold px-2.5 py-1 rounded-full shadow-sm">
                    Unit Siap Audisi
                  </span>
                </div>
              </section>
            )}

          </div>

          {/* Kolom Kanan: Variant Selector & Checkout Box (col 5) */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 rounded-2xl border border-gray-200 bg-white p-6 lg:p-7 shadow-sm">
              
              <div className="mb-4">
                <p className="text-xs font-bold text-[#8C7A5B] uppercase tracking-widest">
                  {instrument.brand?.name || instrument.organizer || "Official Store"}
                </p>
                <h1 className="mt-1 font-extrabold text-xl sm:text-2xl text-gray-900">
                  {instrument.name}
                </h1>
              </div>

              {/* Price display */}
              <div className="border-y border-gray-100 py-4 my-4">
                {isClearance && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                      CLEARANCE -{selectedVariant.discount_percent}%
                    </span>
                    {selectedVariant.clearance_note && (
                      <span className="text-xs text-red-700 font-semibold">{selectedVariant.clearance_note}</span>
                    )}
                  </div>
                )}
                <div className="flex items-baseline gap-2.5">
                  {isClearance ? (
                    <>
                      <span className="text-2xl sm:text-3xl font-black text-red-600">
                        {formatRupiah(activePrice)}
                      </span>
                      <span className="text-sm font-bold text-gray-400 line-through">
                        {formatRupiah(normalPrice)}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                      {formatRupiah(activePrice)}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 font-normal">/ unit (Inc. PPN)</span>
                </div>
                {selectedVariant?.sku_code && (
                  <p className="mt-1.5 text-xs text-gray-500 font-mono">
                    SKU Varian: <span className="text-gray-800 font-medium">{selectedVariant.sku_code}</span>
                  </p>
                )}
              </div>

              {/* Variant / Finishing Selection */}
              {variants.length > 0 && (
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">
                    Pilih Varian Finishing / Warna
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      const stock = v.stock !== undefined ? v.stock : (v.remaining_quota || 0);
                      const soldOut = stock <= 0;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={soldOut}
                          onClick={() => {
                            setSelectedVariant(v);
                            setQuantity(1);
                          }}
                          className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                            isSelected
                              ? "border-black bg-gray-50 ring-1 ring-black"
                              : soldOut
                              ? "border-gray-200 bg-gray-100 opacity-40 cursor-not-allowed"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${isSelected ? "text-gray-900" : "text-gray-700"}`}>
                                {v.color_finish || v.variant_name || v.tier_name}
                              </span>
                              {v.is_clearance_active ? (
                                <span className="text-[9px] font-black uppercase text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                  CLEARANCE -{v.discount_percent}%
                                </span>
                              ) : null}
                              {v.sku_code && (
                                <span className="text-[10px] font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {v.sku_code}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2.5 text-xs text-gray-500">
                              {v.is_clearance_active && v.clearance_price ? (
                                <>
                                  <span className="font-bold text-red-600">{formatRupiah(v.clearance_price)}</span>
                                  <span className="line-through text-gray-400 font-medium">{formatRupiah(v.price)}</span>
                                </>
                              ) : (
                                <span className="font-medium text-gray-700">{formatRupiah(v.price)}</span>
                              )}
                              {v.weight_kg && <span>• {v.weight_kg} kg</span>}
                            </div>
                          </div>

                          <div className="text-right">
                            {soldOut ? (
                              <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                Habis
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-[#16A34A] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
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

              {/* Quantity selector */}
              {!isSoldOut && (
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                    Jumlah Pembelian
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-xl border border-gray-300 bg-white">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="px-3.5 py-2 text-gray-600 hover:text-black disabled:opacity-30"
                      >
                        -
                      </button>
                      <span className="px-4 py-2 text-sm font-bold text-gray-900 min-w-[40px] text-center">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(activeStock || 10, q + 1))}
                        disabled={quantity >= activeStock}
                        className="px-3.5 py-2 text-gray-600 hover:text-black disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs text-gray-500">
                      Maksimal {activeStock} unit per pesanan
                    </span>
                  </div>
                </div>
              )}

              {/* Total Calculation */}
              <div className="mb-6 rounded-xl border border-gray-200 bg-[#F7F7F7] p-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                  <span>Subtotal ({quantity} unit)</span>
                  <span className="font-semibold text-gray-900">{formatRupiah(total)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>Metode Pengambilan</span>
                  <span className="text-gray-900 font-medium">Kirim Ekspedisi / Showroom Pickup</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-800">Estimasi Total</span>
                  <span className="font-extrabold text-base text-gray-900">{formatRupiah(total)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <Button
                  onClick={goCheckout}
                  disabled={isSoldOut}
                  className="w-full py-3.5 font-bold text-sm bg-[#111111] hover:bg-black text-white rounded-xl shadow-md transition-all disabled:opacity-40"
                >
                  {isSoldOut ? "Stok Sedang Kosong" : "Beli Sekarang / Ambil di Toko"}
                </Button>

                <p className="text-center text-[11px] text-gray-500 pt-1">
                  Transaksi aman &amp; terlindungi garansi resmi Overtone Music Store
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

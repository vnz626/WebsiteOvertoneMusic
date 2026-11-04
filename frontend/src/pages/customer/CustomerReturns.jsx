import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  RotateCcw,
  Package,
  Plus,
  ExternalLink,
  ShieldCheck,
  X,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import api from "../../api";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { formatRupiah, formatDate, errorMessage } from "../../utils/format";

const REASON_OPTIONS = [
  { value: "sensor_defect", label: "Cacat Sensor / Dead Pixel / Back-Focus Misalignment" },
  { value: "optical_issue", label: "Optik Berjamur / Scratch Lensa / Autofokus Error" },
  { value: "electronic_failure", label: "Elektronik / Mainboard / Port HDMI/SDI Mati" },
  { value: "gimbal_drift", label: "Motor Gimbal Drift / Stabilizer Overheating / LiDAR Error" },
  { value: "wrong_item", label: "Varian / Mount Type / Model yang Dikirim Salah" },
  { value: "transit_damage", label: "Kerusakan Fisik Akibat Ekspedisi Pengiriman" },
  { value: "other", label: "Kendala Teknis Sinema Lainnya" },
];

export default function CustomerReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Ajukan Retur
  const [showModal, setShowModal] = useState(false);
  const [myOrders, setMyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedOrder, setSelectedOrder] = useState("");
  const [reasonCode, setReasonCode] = useState("sensor_defect");
  const [description, setDescription] = useState("");
  const [resolution, setResolution] = useState("refund");
  const [photos, setPhotos] = useState([]);
  const [photoInput, setPhotoInput] = useState("");

  // Detail Modal
  const [activeDetail, setActiveDetail] = useState(null);

  function fetchReturns() {
    setLoading(true);
    api
      .get("/returns/my")
      .then((res) => setReturns(res.data?.data || []))
      .catch((err) => {
        console.error(err);
        setReturns([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchReturns();
  }, []);

  function handleOpenModal() {
    setShowModal(true);
    setLoadingOrders(true);
    api
      .get("/orders/my")
      .then((res) => {
        const list = res.data?.data || [];
        // Filter pesanan yang sudah diterima/diambil
        const eligible = list.filter((o) =>
          ["delivered", "picked_up", "completed"].includes(o.status) ||
          ["delivered", "collected", "used"].includes(o.pickup_status) ||
          ["delivered", "collected", "used"].includes(o.ticket_status)
        );
        setMyOrders(eligible);
        if (eligible.length > 0) {
          setSelectedOrder(String(eligible[0].id));
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Gagal memuat daftar pesanan Anda");
      })
      .finally(() => setLoadingOrders(false));
  }

  function handleAddPhoto() {
    if (!photoInput.trim()) return;
    if (photos.length >= 5) {
      toast.error("Maksimal 5 foto bukti kendala");
      return;
    }
    setPhotos((prev) => [...prev, photoInput.trim()]);
    setPhotoInput("");
  }

  function handleRemovePhoto(index) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmitReturn(e) {
    e.preventDefault();
    if (!selectedOrder) {
      toast.error("Pilih pesanan yang ingin diretur");
      return;
    }
    if (!description.trim()) {
      toast.error("Jelaskan kendala teknis yang Anda alami");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        order_id: Number(selectedOrder),
        reason_code: reasonCode,
        description: description.trim(),
        resolution_preference: resolution,
        photos,
      };
      const res = await api.post("/returns", payload);
      toast.success(res.data?.message || "Pengajuan retur berhasil dikirim!");
      setShowModal(false);
      setDescription("");
      setPhotos([]);
      fetchReturns();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal mengajukan klaim retur"));
    } finally {
      setSubmitting(false);
    }
  }

  function renderStatusBadge(status) {
    switch (status) {
      case "requested":
        return <Badge status="warning">Menunggu Review Toko</Badge>;
      case "approved_by_store":
        return <Badge status="info">Disetujui — Kirim Fisik ke Gudang</Badge>;
      case "rejected_by_store":
        return <Badge status="danger">Klaim Ditolak Toko</Badge>;
      case "received_by_warehouse":
        return <Badge status="info">Diterima Gudang (Inspeksi QC)</Badge>;
      case "refund_processed":
        return <Badge status="success">Refund Telah Dicairkan</Badge>;
      case "closed":
        return <Badge status="neutral">Klaim Ditutup</Badge>;
      default:
        return <Badge status="neutral">{status}</Badge>;
    }
  }

  return (
    <div className="min-h-screen fp-home-canvas pb-24 px-4 sm:px-6 lg:px-12 pt-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#0F1B2D]/10 pb-6">
          <div>
            <div className="fp-section-pill mb-2">
              <span className="fp-section-pill-dot" aria-hidden="true" />
              <span>Garansi 7 Hari &amp; Servis Distributor</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F1B2D] tracking-tight">
              Pusat Klaim Retur &amp; Garansi
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#3A4A63] max-w-2xl">
              Focalpoint Pro memberikan garansi kepuasan &amp; perlindungan kendala teknis 7 hari setelah pesanan diterima atau diambil di showroom.
            </p>
          </div>
          <div>
            <button
              onClick={handleOpenModal}
              className="fp-btn-glass-primary !py-2.5 !px-5 !text-xs cursor-pointer"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Ajukan Klaim Retur Baru</span>
            </button>
          </div>
        </div>

        {/* Info Box SOP Garansi */}
        <div className="fp-glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 shrink-0 mt-0.5">
              <ShieldCheck size={20} aria-hidden="true" />
            </div>
            <div className="text-xs text-[#3A4A63]">
              <p className="font-bold text-[#0F1B2D] text-sm">Ketentuan Garansi 7 Hari Focalpoint Pro</p>
              <p className="mt-0.5 leading-relaxed">
                Produk yang mengalami kendala sensor, cacat optik, kerusakan mainboard, atau error firmware dapat diajukan untuk refund dana penuh atau penggantian unit baru setelah diverifikasi teknisi cleanroom kami.
              </p>
            </div>
          </div>
          <Link
            to="/help"
            className="text-xs font-bold text-[#E8622C] underline hover:text-[#0F1B2D] whitespace-nowrap shrink-0"
          >
            Baca SOP Garansi Lengkap
          </Link>
        </div>

        {/* Returns List */}
        {loading ? (
          <div className="py-20 text-center" role="status" aria-busy="true">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-solid border-[#0F1B2D] border-r-transparent" />
            <p className="mt-3 text-xs font-medium text-[#3A4A63]">Memuat riwayat pengajuan retur...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="fp-glass-card !p-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-[#3A4A63] border border-white shadow-xs">
              <Package size={24} aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-base font-bold text-[#0F1B2D]">
              Belum Ada Pengajuan Retur
            </h2>
            <p className="mt-1 text-xs text-[#3A4A63] max-w-sm mx-auto">
              Semua perlengkapan cinema yang Anda terima tercatat beroperasi normal. Jika terdapat kendala teknis pada pesanan yang telah diterima, silakan ajukan klaim retur.
            </p>
            <button onClick={handleOpenModal} className="fp-btn-glass-primary !py-2.5 !px-5 mt-5">
              <Plus size={14} aria-hidden="true" />
              <span>Ajukan Retur Pertama</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {returns.map((item) => (
              <article
                key={item.id}
                className="fp-glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3 tabular-nums">
                    <span className="font-mono text-xs font-bold bg-white/80 text-[#0F1B2D] px-3 py-1 rounded-full border border-white shadow-2xs">
                      {item.return_number}
                    </span>
                    {renderStatusBadge(item.status)}
                    <span className="text-[11px] text-[#3A4A63]">
                      Diajukan {formatDate(item.created_at)}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-display text-base font-bold text-[#0F1B2D]">
                      {item.product_name}
                      {item.variant_name && <span className="font-normal text-[#3A4A63]"> — {item.variant_name}</span>}
                    </h2>
                    <p className="mt-0.5 text-xs text-[#3A4A63] font-mono tabular-nums">
                      Invoice Pesanan: <strong className="text-[#0F1B2D]">{item.invoice_code}</strong>
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/60 p-3.5 border border-white/80 text-xs text-[#3A4A63] space-y-1 shadow-2xs">
                    <p><strong className="text-[#0F1B2D]">Alasan Klaim:</strong> {item.reason_label || item.reason_code}</p>
                    <p className="line-clamp-2"><strong className="text-[#0F1B2D]">Deskripsi Kendala:</strong> {item.description}</p>
                  </div>

                  {item.review_note && (
                    <div className="rounded-2xl bg-blue-500/10 border border-blue-500/25 p-3 text-xs text-blue-900">
                      <strong>Catatan Teknisi Toko:</strong> {item.review_note}
                    </div>
                  )}

                  {item.received_note && (
                    <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-xs text-emerald-900">
                      <strong>Catatan QC Gudang:</strong> {item.received_note}
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:items-end justify-between gap-3 border-t md:border-t-0 md:border-l border-[#0F1B2D]/10 pt-4 md:pt-0 md:pl-6 shrink-0">
                  <div className="md:text-right tabular-nums">
                    <p className="text-[10px] font-bold text-[#3A4A63] uppercase tracking-wider">Estimasi Nilai Refund</p>
                    <p className="font-display text-lg font-bold text-[#0F1B2D]">
                      {formatRupiah(item.refund_amount || 0)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveDetail(item)}
                      className="fp-btn-glass-secondary !py-2 !px-3.5 !text-xs"
                    >
                      <span>Lihat Foto &amp; Detail</span>
                    </button>
                    <Link
                      to={`/orders/${item.invoice_code}`}
                      className="fp-btn-glass-primary !py-2 !px-3.5 !text-xs"
                    >
                      <span>Cek Pesanan</span>
                      <ExternalLink size={12} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* MODAL AJUKAN RETUR */}
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title="Formulir Klaim Retur Cinema Gear"
          description="Jaminan Garansi Resmi & Kepuasan 7 Hari Focalpoint Pro"
          size="lg"
        >
          <form onSubmit={handleSubmitReturn} className="space-y-5">
            {/* Pilih Pesanan */}
            <div>
              <label htmlFor="return-order-select" className="block text-xs font-semibold text-[#0F1B2D] uppercase tracking-wider mb-1.5">
                Pilih Pesanan yang Ingin Diretur <span className="text-[#E8622C]">*</span>
              </label>
              {loadingOrders ? (
                <p className="text-xs text-[#3A4A63]">Memeriksa pesanan yang memenuhi syarat...</p>
              ) : myOrders.length === 0 ? (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 text-xs text-amber-900" role="alert">
                  Tidak ada pesanan yang memenuhi syarat retur. Hanya pesanan yang telah berstatus diterima/diambil dalam kurun waktu 7 hari terakhir yang dapat diajukan retur.
                </div>
              ) : (
                <select
                  id="return-order-select"
                  value={selectedOrder}
                  onChange={(e) => setSelectedOrder(e.target.value)}
                  className="w-full rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none tabular-nums"
                  required
                >
                  {myOrders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.invoice_code} — {ord.product?.name || ord.event?.name || "Cinema Gear"} ({formatRupiah(ord.total_price)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Alasan Retur */}
            <div>
              <label htmlFor="return-reason-select" className="block text-xs font-semibold text-[#0F1B2D] uppercase tracking-wider mb-1.5">
                Kategori Kendala / Alasan Retur <span className="text-[#E8622C]">*</span>
              </label>
              <select
                id="return-reason-select"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none"
                required
              >
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Deskripsi Kendala */}
            <div>
              <label htmlFor="return-desc-input" className="block text-xs font-semibold text-[#0F1B2D] uppercase tracking-wider mb-1.5">
                Deskripsi Rinci Kendala Teknis <span className="text-[#E8622C]">*</span>
              </label>
              <textarea
                id="return-desc-input"
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan secara spesifik gejala kendala: dead pixel pada ISO berapa, error back-focus, atau kondisi fisik saat unboxing..."
                className="w-full rounded-2xl border border-white/80 bg-white/70 p-3 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none"
              />
            </div>

            {/* Solusi yang Diinginkan */}
            <div>
              <label className="block text-xs font-semibold text-[#0F1B2D] uppercase tracking-wider mb-2">
                Preferensi Resolusi <span className="text-[#E8622C]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3" role="radiogroup">
                <label
                  className={`flex items-center gap-2.5 rounded-2xl border p-3 cursor-pointer text-xs transition-all ${
                    resolution === "refund"
                      ? "border-[#E8622C] bg-[#E8622C]/10 font-bold text-[#0F1B2D]"
                      : "border-white/80 bg-white/60 text-[#3A4A63]"
                  }`}
                >
                  <input
                    type="radio"
                    name="resolution"
                    value="refund"
                    checked={resolution === "refund"}
                    onChange={(e) => setResolution(e.target.value)}
                    className="accent-[#E8622C]"
                  />
                  <span>Pengembalian Dana Penuh (Refund)</span>
                </label>
                <label
                  className={`flex items-center gap-2.5 rounded-2xl border p-3 cursor-pointer text-xs transition-all ${
                    resolution === "replacement"
                      ? "border-[#E8622C] bg-[#E8622C]/10 font-bold text-[#0F1B2D]"
                      : "border-white/80 bg-white/60 text-[#3A4A63]"
                  }`}
                >
                  <input
                    type="radio"
                    name="resolution"
                    value="replacement"
                    checked={resolution === "replacement"}
                    onChange={(e) => setResolution(e.target.value)}
                    className="accent-[#E8622C]"
                  />
                  <span>Penggantian Unit Baru (Replacement)</span>
                </label>
              </div>
            </div>

            {/* Lampiran Foto Bukti */}
            <div>
              <label htmlFor="return-photo-url" className="block text-xs font-semibold text-[#0F1B2D] uppercase tracking-wider mb-1.5">
                Lampiran Foto Bukti Kendala / Unboxing (URL Gambar)
              </label>
              <div className="flex gap-2">
                <input
                  id="return-photo-url"
                  type="url"
                  value={photoInput}
                  onChange={(e) => setPhotoInput(e.target.value)}
                  placeholder="https://images.unsplash.com/... atau tautan foto bukti"
                  className="w-full rounded-full border border-white/80 bg-white/70 px-4 py-2 text-xs text-[#0F1B2D] focus:border-[#E8622C] focus:outline-none flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddPhoto}
                  className="fp-btn-glass-secondary !py-2 !px-4 !text-xs"
                >
                  Tambah Foto
                </button>
              </div>

              {photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {photos.map((p, idx) => (
                    <div key={idx} className="relative group h-16 w-16 rounded-xl border border-white/80 overflow-hidden bg-black/10">
                      <img src={p} alt={`Bukti ${idx + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Hapus foto"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tombol Submit */}
            <div className="pt-3 border-t border-[#0F1B2D]/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="fp-btn-glass-secondary !py-2.5 !px-5 !text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || myOrders.length === 0}
                className="fp-btn-glass-primary !py-2.5 !px-5 !text-xs"
              >
                {submitting ? "Mengirimkan Klaim..." : "Kirim Pengajuan Retur"}
              </button>
            </div>
          </form>
        </Modal>

        {/* MODAL LIHAT DETAIL & FOTO */}
        <Modal
          open={Boolean(activeDetail)}
          onClose={() => setActiveDetail(null)}
          title={`Detail Klaim Retur #${activeDetail?.return_number || ""}`}
          description={`Invoice Terkait: ${activeDetail?.invoice_code || ""}`}
          size="md"
        >
          {activeDetail && (
            <div className="space-y-4 text-xs">
              <div className="rounded-2xl bg-white/60 p-4 border border-white/80 space-y-1.5">
                <p><strong className="text-[#0F1B2D]">Produk:</strong> {activeDetail.product_name} {activeDetail.variant_name ? `(${activeDetail.variant_name})` : ""}</p>
                <p><strong className="text-[#0F1B2D]">Alasan:</strong> {activeDetail.reason_label || activeDetail.reason_code}</p>
                <p><strong className="text-[#0F1B2D]">Resolusi yang Diminta:</strong> {activeDetail.resolution_preference === "refund" ? "Pengembalian Dana (Refund)" : "Ganti Unit Baru"}</p>
                <p><strong className="text-[#0F1B2D]">Deskripsi Kendala:</strong></p>
                <p className="text-[#3A4A63] bg-white/80 p-2.5 rounded-xl border border-white mt-1 leading-relaxed">
                  {activeDetail.description}
                </p>
              </div>

              {activeDetail.photos && activeDetail.photos.length > 0 && (
                <div>
                  <p className="font-bold text-[#0F1B2D] uppercase tracking-wider text-[11px] mb-2">
                    Foto Bukti yang Dilampirkan ({activeDetail.photos.length}):
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {activeDetail.photos.map((ph, idx) => (
                      <a
                        key={idx}
                        href={ph.photo_url || ph}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-video rounded-xl border border-white/80 overflow-hidden bg-black/10 group relative"
                      >
                        <img
                          src={ph.photo_url || ph}
                          alt={`Bukti klaim ${idx + 1}`}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-[#0F1B2D]/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveDetail(null)}
                  className="fp-btn-glass-primary !py-2 !px-4 !text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </Modal>

      </div>
    </div>
  );
}

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
  ChevronRight
} from "lucide-react";
import api from "../../api";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { formatRupiah, formatDate, errorMessage } from "../../utils/format";

const REASON_OPTIONS = [
  { value: "defective_hardware", label: "Cacat Fisik / Hardware Rusak (Tuning Peg, Bridge, Nut)" },
  { value: "fret_buzz", label: "Fret Buzzing / Neck Melengkung / Setup Tidak Presisi" },
  { value: "electronic_failure", label: "Elektronik Rusak / Spul / Pickup / Preamp Mati" },
  { value: "wrong_item", label: "Varian / Model yang Dikirim Salah" },
  { value: "transit_damage", label: "Kerusakan Fisik Akibat Ekspedisi Pengiriman" },
  { value: "other", label: "Kendala Teknis Lainnya" },
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
  const [reasonCode, setReasonCode] = useState("defective_hardware");
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

  function fetchEligibleOrders() {
    setLoadingOrders(true);
    api
      .get("/orders/my")
      .then((res) => {
        const list = res.data?.data || [];
        const eligible = list.filter((o) => {
          const isCollected = o.fulfillment_method === "click_and_collect" && o.pickup_status === "collected";
          return ["delivered", "completed"].includes(o.order_status) || isCollected;
        });
        setMyOrders(eligible);
        if (eligible.length > 0 && !selectedOrder) {
          setSelectedOrder(eligible[0].id.toString());
        }
      })
      .catch((err) => {
        console.error(err);
        setMyOrders([]);
      })
      .finally(() => setLoadingOrders(false));
  }

  useEffect(() => {
    fetchReturns();
  }, []);

  function handleOpenModal() {
    fetchEligibleOrders();
    setShowModal(true);
  }

  function handleAddPhoto() {
    if (!photoInput.trim()) return;
    if (photos.length >= 5) {
      toast.error("Maksimal 5 foto bukti.");
      return;
    }
    setPhotos([...photos, photoInput.trim()]);
    setPhotoInput("");
  }

  function handleRemovePhoto(index) {
    setPhotos(photos.filter((_, i) => i !== index));
  }

  async function handleSubmitReturn(e) {
    e.preventDefault();
    if (!selectedOrder) {
      toast.error("Pilih pesanan yang ingin diretur");
      return;
    }
    if (!description.trim()) {
      toast.error("Tuliskan deskripsi kendala instrumen secara detail");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        order_id: parseInt(selectedOrder),
        reason_code: reasonCode,
        description: description.trim(),
        resolution: resolution,
        photos: photos,
      };
      const res = await api.post("/returns", payload);
      toast.success(res.data?.message || "Pengajuan retur berhasil dikirim!");
      setShowModal(false);
      setDescription("");
      setPhotos([]);
      setPhotoInput("");
      fetchReturns();
    } catch (err) {
      toast.error(errorMessage(err, "Gagal mengajukan retur"));
    } finally {
      setSubmitting(false);
    }
  }

  function renderStatusBadge(status) {
    switch (status) {
      case "requested":
        return <Badge status="pending">Menunggu Review Toko</Badge>;
      case "approved":
        return <Badge status="info">Retur Disetujui (Kirim ke Gudang)</Badge>;
      case "received":
        return <Badge status="processing">Barang Diterima di Gudang</Badge>;
      case "refunded":
        return <Badge status="completed">Selesai (Refund Dicairkan)</Badge>;
      case "rejected":
        return <Badge status="rejected">Klaim Ditolak</Badge>;
      default:
        return <Badge status={status}>{status}</Badge>;
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Breadcrumb & Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-ink-muted font-medium">
          <Link to="/orders" className="hover:text-ink transition-colors">Pesanan Saya</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span className="text-ink font-semibold">Klaim Retur &amp; Garansi Instrumen</span>
        </nav>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-line pb-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent block mb-1">
              Layanan Purna Jual Resmi
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-ink tracking-tight">
              Pusat Klaim Retur &amp; Garansi 7 Hari
            </h1>
            <p className="mt-1 text-xs md:text-sm text-ink-secondary max-w-2xl">
              Setiap pembelian instrumen di Overtone Music Store dilindungi Garansi Resmi &amp; Jaminan Kepuasan 7 Hari. Ajukan klaim jika unit Anda mengalami cacat fisik atau ketidaksesuaian setup luthier.
            </p>
          </div>

          <Button onClick={handleOpenModal} variant="primary" size="md">
            <Plus size={15} aria-hidden="true" /> Ajukan Klaim Baru
          </Button>
        </div>

        {/* Policy Highlights Card */}
        <div className="rounded-md border border-line bg-surface-muted p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-ink text-canvas">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            <div className="text-xs space-y-1">
              <h2 className="font-display font-bold text-sm text-ink">
                Ketentuan Jaminan Retur 7 Hari Overtone Music Store
              </h2>
              <p className="text-ink-secondary leading-relaxed max-w-3xl">
                Unit instrumen wajib dikembalikan lengkap beserta hardcase/gigbag, kartu garansi, dan kelengkapan bawaan tanpa modifikasi permanen. Verifikasi awal diproses oleh luthier toko dalam 1&times;24 jam kerja.
              </p>
            </div>
          </div>
          <Link
            to="/help"
            className="text-xs font-bold text-accent underline hover:text-ink whitespace-nowrap shrink-0"
          >
            Baca SOP Garansi Lengkap
          </Link>
        </div>

        {/* Returns List */}
        {loading ? (
          <div className="py-20 text-center" role="status" aria-busy="true">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-solid border-ink border-r-transparent" />
            <p className="mt-3 text-xs font-medium text-ink-secondary">Memuat riwayat pengajuan retur...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="rounded-md border border-dashed border-line-strong bg-surface p-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-surface-muted text-ink-muted border border-line">
              <Package size={24} aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-base font-bold text-ink">
              Belum Ada Pengajuan Retur
            </h2>
            <p className="mt-1 text-xs text-ink-secondary max-w-sm mx-auto">
              Semua instrumen yang Anda terima tercatat beroperasi normal. Jika terdapat kendala teknis pada pesanan yang telah diterima, silakan ajukan klaim retur.
            </p>
            <Button onClick={handleOpenModal} variant="primary" size="sm" className="mt-5">
              <Plus size={14} aria-hidden="true" /> Ajukan Retur Pertama
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {returns.map((item) => (
              <article
                key={item.id}
                className="rounded-md border border-line bg-surface p-6 hover:border-line-strong transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3 tabular-nums">
                    <span className="font-mono text-xs font-bold bg-surface-muted text-ink px-2.5 py-1 rounded-xs border border-line">
                      {item.return_number}
                    </span>
                    {renderStatusBadge(item.status)}
                    <span className="text-[11px] text-ink-muted">
                      Diajukan {formatDate(item.created_at)}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-display text-base font-bold text-ink">
                      {item.product_name}
                      {item.variant_name && <span className="font-normal text-ink-secondary"> — {item.variant_name}</span>}
                    </h2>
                    <p className="mt-0.5 text-xs text-ink-secondary font-mono tabular-nums">
                      Invoice Pesanan: <strong className="text-ink">{item.invoice_code}</strong>
                    </p>
                  </div>

                  <div className="rounded-sm bg-surface-muted p-3.5 border border-line text-xs text-ink-secondary space-y-1">
                    <p><strong className="text-ink">Alasan Klaim:</strong> {item.reason_label || item.reason_code}</p>
                    <p className="line-clamp-2"><strong className="text-ink">Deskripsi Kendala:</strong> {item.description}</p>
                  </div>

                  {item.review_note && (
                    <div className="rounded-sm bg-status-info-bg border border-status-info/30 p-3 text-xs text-status-info">
                      <strong>Catatan Luthier / Petugas Toko:</strong> {item.review_note}
                    </div>
                  )}

                  {item.received_note && (
                    <div className="rounded-sm bg-status-success-bg border border-status-success/30 p-3 text-xs text-status-success">
                      <strong>Catatan QC Gudang:</strong> {item.received_note}
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:items-end justify-between gap-3 border-t md:border-t-0 md:border-l border-line pt-4 md:pt-0 md:pl-6 shrink-0">
                  <div className="md:text-right tabular-nums">
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Estimasi Nilai Refund</p>
                    <p className="font-display text-lg font-bold text-ink">
                      {formatRupiah(item.refund_amount || 0)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveDetail(item)}
                    >
                      Lihat Foto &amp; Detail
                    </Button>
                    <Link
                      to={`/orders/${item.invoice_code}`}
                      className="inline-flex items-center gap-1 rounded-sm border border-line bg-surface-muted px-3.5 py-2 text-xs font-semibold text-ink hover:border-line-strong transition-colors"
                    >
                      Cek Pesanan <ExternalLink size={12} aria-hidden="true" />
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
          title="Formulir Klaim Retur Instrumen"
          description="Jaminan Garansi Resmi & Kepuasan 7 Hari Overtone Music Store"
          size="lg"
        >
          <form onSubmit={handleSubmitReturn} className="space-y-5">
            {/* Pilih Pesanan */}
            <div>
              <label htmlFor="return-order-select" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                Pilih Pesanan yang Ingin Diretur <span className="text-accent">*</span>
              </label>
              {loadingOrders ? (
                <p className="text-xs text-ink-secondary">Memeriksa pesanan yang memenuhi syarat...</p>
              ) : myOrders.length === 0 ? (
                <div className="rounded-sm bg-status-warning-bg border border-status-warning/30 p-4 text-xs text-status-warning" role="alert">
                  Tidak ada pesanan yang memenuhi syarat retur. Hanya pesanan yang telah berstatus diterima/diambil dalam kurun waktu 7 hari terakhir yang dapat diajukan retur.
                </div>
              ) : (
                <select
                  id="return-order-select"
                  value={selectedOrder}
                  onChange={(e) => setSelectedOrder(e.target.value)}
                  className="ot-input tabular-nums"
                  required
                >
                  {myOrders.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      {ord.invoice_code} — {ord.product?.name || ord.event?.name || "Instrumen"} ({formatRupiah(ord.total_price)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Alasan Retur */}
            <div>
              <label htmlFor="return-reason-select" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                Kategori Kendala / Alasan Retur <span className="text-accent">*</span>
              </label>
              <select
                id="return-reason-select"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="ot-input"
              >
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Deskripsi */}
            <div>
              <label htmlFor="return-description" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                Deskripsi Detail Kerusakan / Kendala <span className="text-accent">*</span>
              </label>
              <textarea
                id="return-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Terjadi fret buzz parah di fret ke-7 sampai ke-12 senar 1 & 2. Terdapat lecet finishing pada bagian neck joint saat unboxing."
                className="ot-input"
                required
              />
            </div>

            {/* Solusi yang Diharapkan */}
            <div>
              <span className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
                Solusi Penanganan yang Diharapkan
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" role="radiogroup" aria-label="Solusi retur">
                {[
                  { id: "refund", label: "Pengembalian Dana (Refund)" },
                  { id: "exchange", label: "Tukar Unit Baru" },
                  { id: "repair", label: "Setup / Servis Luthier" },
                ].map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    role="radio"
                    aria-checked={resolution === res.id}
                    onClick={() => setResolution(res.id)}
                    className={`rounded-sm border p-3 text-xs font-bold text-center transition-colors ${
                      resolution === res.id
                        ? "border-ink bg-ink text-canvas"
                        : "border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink"
                    }`}
                  >
                    {res.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Foto Bukti */}
            <div>
              <label htmlFor="return-photo-url" className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                Foto Bukti Kerusakan / Unboxing (URL Gambar)
              </label>
              <div className="flex gap-2">
                <input
                  id="return-photo-url"
                  type="url"
                  value={photoInput}
                  onChange={(e) => setPhotoInput(e.target.value)}
                  placeholder="https://... URL foto close-up kerusakan atau serial number"
                  className="ot-input flex-1"
                />
                <Button type="button" variant="secondary" onClick={handleAddPhoto}>
                  + Tambah Foto
                </Button>
              </div>

              {photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {photos.map((p, i) => (
                    <div key={i} className="relative group rounded-sm border border-line overflow-hidden bg-surface-muted h-16 w-16">
                      <img src={p} alt={`Bukti retur ${i + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(i)}
                        aria-label={`Hapus foto bukti ${i + 1}`}
                        className="absolute inset-0 bg-ink/70 text-canvas flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1.5 text-[11px] text-ink-muted">
                Sertakan foto close-up area yang mengalami kendala serta nomor seri pada headstock/neckplate.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-line pt-4 flex items-center justify-end gap-2.5">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                disabled={submitting || myOrders.length === 0}
              >
                {submitting ? "Mengirimkan..." : "Kirim Pengajuan Retur"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* MODAL DETAIL & FOTO */}
        <Modal
          open={Boolean(activeDetail)}
          onClose={() => setActiveDetail(null)}
          title={activeDetail ? `${activeDetail.product_name}` : "Detail Klaim Retur"}
          description={activeDetail ? `Nomor Retur: ${activeDetail.return_number} • Invoice: ${activeDetail.invoice_code}` : ""}
          size="md"
        >
          {activeDetail && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-muted">Status Klaim:</span>
                {renderStatusBadge(activeDetail.status)}
              </div>

              <div className="rounded-sm bg-surface-muted border border-line p-4 text-xs space-y-2 text-ink-secondary">
                <p><strong className="text-ink">Kategori Alasan:</strong> {activeDetail.reason_label || activeDetail.reason_code}</p>
                <p><strong className="text-ink">Deskripsi Lengkap:</strong> {activeDetail.description}</p>
                <p><strong className="text-ink">Solusi yang Diminta:</strong> <span className="uppercase font-semibold">{activeDetail.resolution}</span></p>
              </div>

              {activeDetail.photos && activeDetail.photos.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-ink mb-2">Foto Bukti Lampiran ({activeDetail.photos.length}):</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {activeDetail.photos.map((p, i) => (
                      <a
                        key={i}
                        href={p}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-sm overflow-hidden border border-line aspect-square block bg-surface-muted"
                      >
                        <img src={p} alt={`Foto bukti klaim ${i + 1}`} className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button type="button" variant="secondary" onClick={() => setActiveDetail(null)}>
                  Tutup Detail
                </Button>
              </div>
            </div>
          )}
        </Modal>

      </div>
    </div>
  );
}

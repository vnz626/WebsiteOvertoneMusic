import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  PackageCheck,
  QrCode,
  RefreshCw,
  Store,
} from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { formatRupiah } from "../../utils/format";
import toast from "react-hot-toast";

export default function StoreClickAndCollect() {
  const [pickupCode, setPickupCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedOrder, setVerifiedOrder] = useState(null);
  const [verifyError, setVerifyError] = useState("");
  const [handoverSuccess, setHandoverSuccess] = useState(false);

  // Pickups list
  const [pickups, setPickups] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  function loadPickups() {
    setLoadingList(true);
    api
      .get("/store/pickups")
      .then((res) => setPickups(res.data.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoadingList(false));
  }

  useEffect(() => {
    loadPickups();
  }, []);

  function handleVerify(e) {
    e?.preventDefault();
    if (!pickupCode.trim()) return;
    setVerifying(true);
    setVerifyError("");
    setVerifiedOrder(null);
    setHandoverSuccess(false);

    api
      .post("/store/pickups/verify", { code: pickupCode.trim() })
      .then((res) => {
        setVerifiedOrder(res.data.data);
      })
      .catch((err) => {
        setVerifyError(err.response?.data?.message || "Kode pengambilan tidak valid");
        if (err.response?.data?.data) {
          setVerifiedOrder(err.response.data.data);
        }
      })
      .finally(() => setVerifying(false));
  }

  function handleHandover() {
    if (!verifiedOrder) return;
    setVerifying(true);
    api
      .post(`/store/pickups/${verifiedOrder.id}/handover`)
      .then((res) => {
        setHandoverSuccess(true);
        setVerifiedOrder(res.data.data);
        loadPickups();
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Gagal memproses serah terima");
      })
      .finally(() => setVerifying(false));
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-canvas text-ink font-sans">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-line pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-ink text-canvas">
                  <Store size={18} aria-hidden="true" />
                </span>
                <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
                  Layanan Serah-Terima Click &amp; Collect (Showroom)
                </h1>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-ink-secondary">
                Verifikasi kode unik pengambilan pelanggan, cek 10-point sensor calibration &amp; kelengkapan cinema gear, dan konfirmasi serah-terima di showroom.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={loadPickups}
            >
              <RefreshCw size={14} className={loadingList ? "animate-spin" : ""} aria-hidden="true" />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Verification Box */}
          <div className="rounded-md border border-line-strong bg-surface p-6">
            <h2 className="font-display text-base font-bold text-ink flex items-center gap-2">
              <QrCode size={18} className="text-accent" aria-hidden="true" />
              <span>Verifikasi Kode Ambil Pelanggan</span>
            </h2>
            <p className="mt-1 text-xs text-ink-secondary">
              Minta pelanggan menunjukkan kode pengambilan (misal: SWL-PICKUP-XXXX) atau nomor Invoice.
            </p>

            <form onSubmit={handleVerify} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={pickupCode}
                  onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
                  placeholder="Ketik atau Scan Kode: SWL-PICKUP-XXXX atau SWL-20261021-002"
                  className="ot-input w-full py-3 pl-4 pr-10 font-mono text-sm font-bold uppercase tabular-nums"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={verifying}
                className="whitespace-nowrap px-6 py-3"
              >
                {verifying ? "Memeriksa..." : "Verifikasi Kode"}
              </Button>
            </form>

            {/* Error Message */}
            {verifyError && (
              <div className="mt-4 flex items-center gap-2 rounded-sm border border-status-danger/30 bg-status-danger/10 p-3 text-xs font-bold text-status-danger">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{verifyError}</span>
              </div>
            )}

            {/* Success Handover Banner */}
            {handoverSuccess && (
              <div className="mt-4 flex items-center gap-3 rounded-sm border border-status-success/30 bg-status-success/10 p-4 text-xs font-bold text-status-success">
                <CheckCircle2 size={20} aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold">Serah-Terima Berhasil Selesai!</p>
                  <p className="font-normal text-xs mt-0.5 text-ink-secondary">
                    Unit cinema gear telah diserahkan. Status pesanan diperbarui menjadi &apos;completed&apos; dan mutasi inventaris telah dicatat.
                  </p>
                </div>
              </div>
            )}

            {/* Order Card Result */}
            {verifiedOrder && !handoverSuccess && (
              <div className="mt-6 rounded-md border border-line bg-canvas p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
                  <div>
                    <span className="font-mono text-xs font-bold text-accent tabular-nums">
                      {verifiedOrder.invoice_code}
                    </span>
                    <h3 className="font-display text-lg font-bold text-ink mt-0.5">
                      {verifiedOrder.event?.name}
                    </h3>
                    {verifiedOrder.ticket_tier && (
                      <p className="text-xs text-status-success font-bold tabular-nums mt-0.5">
                        Varian: {verifiedOrder.ticket_tier.tier_name} ({verifiedOrder.quantity} unit)
                      </p>
                    )}
                  </div>
                  <div className="text-right tabular-nums">
                    <span className="text-xs text-ink-muted">Total Pembayaran:</span>
                    <p className="font-display text-lg font-bold text-ink">
                      {formatRupiah(verifiedOrder.total_price)}
                    </p>
                    <div className="mt-1">
                      <Badge variant={verifiedOrder.status === "paid" ? "teal" : "amber"}>
                        {verifiedOrder.status === "paid" ? "LUNAS (Verified)" : verifiedOrder.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded-sm border border-line bg-surface p-3.5">
                    <span className="font-bold text-ink-muted uppercase tracking-wider text-[10px] block mb-1">
                      Data Pelanggan:
                    </span>
                    <p className="font-bold text-ink">{verifiedOrder.buyer_name}</p>
                    <p className="text-ink-secondary">{verifiedOrder.buyer_email}</p>
                    <p className="text-ink-secondary tabular-nums">{verifiedOrder.buyer_phone}</p>
                  </div>
                  <div className="rounded-sm border border-line bg-surface p-3.5">
                    <span className="font-bold text-ink-muted uppercase tracking-wider text-[10px] block mb-1">
                      Showroom Pengambilan:
                    </span>
                    <p className="font-bold text-ink">
                      {verifiedOrder.pickup_venue?.name || "Overtone Flagship Showroom"}
                    </p>
                    <p className="text-accent font-mono font-bold mt-1 tabular-nums">
                      Kode Ambil: {verifiedOrder.ticket_code}
                    </p>
                  </div>
                </div>

                {verifiedOrder.order_status === "completed" || verifiedOrder.status === "used" ? (
                  <div className="mt-5 rounded-sm border border-line bg-surface-muted p-3 text-center text-xs font-bold text-ink-secondary">
                    Pesanan ini sudah selesai diserah-terimakan sebelumnya.
                  </div>
                ) : (
                  <div className="mt-5 flex items-center justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleHandover}
                      disabled={verifying}
                    >
                      <PackageCheck size={16} aria-hidden="true" />
                      <span>Konfirmasi Serah-Terima Barang ke Pelanggan</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* List of Click & Collect Pickups */}
          <div>
            <h3 className="font-display text-base font-bold text-ink mb-3">
              Antrean &amp; Riwayat Pesanan Click &amp; Collect
            </h3>
            <div className="overflow-hidden rounded-md border border-line bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-surface-muted font-bold uppercase tracking-wider text-ink-muted text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Invoice &amp; Kode Ambil</th>
                      <th className="py-3.5 px-4">Pelanggan</th>
                      <th className="py-3.5 px-4">Cinema Gear &amp; Varian</th>
                      <th className="py-3.5 px-4">Showroom</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-medium">
                    {loadingList ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-ink-muted">
                          Memuat data pesanan Click &amp; Collect...
                        </td>
                      </tr>
                    ) : pickups.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-ink-muted">
                          Belum ada pesanan Click &amp; Collect.
                        </td>
                      </tr>
                    ) : (
                      pickups.map((ord) => (
                        <tr key={ord.id} className="hover:bg-surface-muted/50 transition-colors">
                          <td className="py-3.5 px-4 tabular-nums">
                            <p className="font-mono font-bold text-ink">{ord.invoice_code}</p>
                            <span className="font-mono font-bold text-[11px] text-accent">
                              {ord.ticket_code || "-"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-ink">{ord.buyer_name}</p>
                            <span className="text-[11px] text-ink-secondary tabular-nums">{ord.buyer_phone}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-ink">{ord.event?.name}</p>
                            {ord.ticket_tier && (
                              <span className="text-[11px] text-status-success font-bold">
                                {ord.ticket_tier.tier_name}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-ink">{ord.pickup_venue?.name || "Showroom"}</p>
                            <span className="text-[11px] text-ink-secondary">{ord.pickup_venue?.city || "Jakarta"}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {ord.order_status === "completed" || ord.status === "used" ? (
                              <Badge variant="teal">Selesai Diambil</Badge>
                            ) : (
                              <Badge variant="amber">Siap Diambil</Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {ord.order_status !== "completed" && ord.status !== "used" && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="xs"
                                onClick={() => {
                                  setPickupCode(ord.ticket_code || ord.invoice_code);
                                  setVerifiedOrder(ord);
                                  setHandoverSuccess(false);
                                  setVerifyError("");
                                  window.scrollTo({ top: 100, behavior: "smooth" });
                                }}
                              >
                                Verifikasi &amp; Serahkan
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

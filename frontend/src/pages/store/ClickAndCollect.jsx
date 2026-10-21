import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Guitar,
  PackageCheck,
  QrCode,
  RefreshCw,
  Search,
  Store,
  User,
} from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import Badge from "../../components/ui/Badge";
import { formatRupiah } from "../../utils/format";

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
        alert(err.response?.data?.message || "Gagal memproses serah terima");
      })
      .finally(() => setVerifying(false));
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ts-primary/10 text-ts-primary dark:bg-brand-400/10 dark:text-brand-400">
                  <Store size={20} />
                </span>
                <h1 className="font-jakarta text-2xl font-extrabold text-ts-ink dark:text-white">
                  Layanan Serah-Terima Click & Collect (Showroom)
                </h1>
              </div>
              <p className="mt-1 text-sm text-ts-muted dark:text-slate-400">
                Verifikasi kode unik pengambilan pelanggan, cek kelengkapan instrumen musik, dan konfirmasi serah-terima di showroom.
              </p>
            </div>
            <button
              onClick={loadPickups}
              className="inline-flex items-center gap-2 rounded-xl border border-ts-subtle bg-white px-4 py-2 text-xs font-bold text-ts-ink shadow-sm hover:bg-ts-low dark:border-white/10 dark:bg-surface-container dark:text-white"
            >
              <RefreshCw size={14} className={loadingList ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {/* Verification Box */}
          <div className="mt-8 rounded-2xl border border-ts-primary/20 bg-gradient-to-br from-white via-white to-ts-primary/5 p-6 shadow-md dark:border-white/10 dark:bg-surface-container">
            <h2 className="font-jakarta text-base font-extrabold text-ts-ink dark:text-white flex items-center gap-2">
              <QrCode size={18} className="text-ts-primary dark:text-brand-400" />
              Verifikasi Kode Ambil Pelanggan
            </h2>
            <p className="mt-1 text-xs text-ts-muted dark:text-slate-400">
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
                  className="w-full rounded-xl border border-ts-subtle bg-white py-3 pl-4 pr-10 font-mono text-sm font-bold text-ts-ink outline-none uppercase transition focus:border-ts-primary focus:ring-2 focus:ring-ts-primary/20 dark:border-white/10 dark:bg-surface-high dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={verifying}
                className="rounded-xl bg-ts-primary px-6 py-3 text-xs font-bold text-white shadow-md shadow-ts-primary/25 hover:bg-ts-container transition disabled:opacity-50 dark:bg-brand-500 whitespace-nowrap"
              >
                {verifying ? "Memeriksa..." : "Verifikasi Kode"}
              </button>
            </form>

            {/* Error Message */}
            {verifyError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
                <AlertCircle size={16} /> {verifyError}
              </div>
            )}

            {/* Success Handover Banner */}
            {handoverSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 size={20} />
                <div>
                  <p className="text-sm font-extrabold">Serah-Terima Berhasil Selesai!</p>
                  <p className="font-normal text-[11px] mt-0.5">
                    Instrumen musik telah diserahkan. Status pesanan diperbarui menjadi 'completed' dan mutasi inventaris telah dicatat.
                  </p>
                </div>
              </div>
            )}

            {/* Order Card Result */}
            {verifiedOrder && !handoverSuccess && (
              <div className="mt-6 rounded-xl border border-ts-subtle bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-high animate-fade-up">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-ts-subtle pb-4 dark:border-white/10">
                  <div>
                    <span className="font-mono text-xs font-extrabold text-ts-primary dark:text-brand-400">
                      {verifiedOrder.invoice_code}
                    </span>
                    <h3 className="font-jakarta text-lg font-extrabold text-ts-ink dark:text-white">
                      {verifiedOrder.event?.name}
                    </h3>
                    {verifiedOrder.ticket_tier && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                        Varian: {verifiedOrder.ticket_tier.tier_name} ({verifiedOrder.quantity} unit)
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-ts-muted">Total Pembayaran:</span>
                    <p className="font-jakarta text-lg font-extrabold text-ts-ink dark:text-white">
                      {formatRupiah(verifiedOrder.total_price)}
                    </p>
                    <Badge variant={verifiedOrder.status === "paid" ? "teal" : "amber"}>
                      {verifiedOrder.status === "paid" ? "LUNAS (Verified)" : verifiedOrder.status}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded-lg bg-ts-low p-3 dark:bg-surface-container">
                    <span className="font-bold text-ts-muted block mb-1">Data Pelanggan:</span>
                    <p className="font-bold text-ts-ink dark:text-white">{verifiedOrder.buyer_name}</p>
                    <p className="text-ts-muted">{verifiedOrder.buyer_email}</p>
                    <p className="text-ts-muted">{verifiedOrder.buyer_phone}</p>
                  </div>
                  <div className="rounded-lg bg-ts-low p-3 dark:bg-surface-container">
                    <span className="font-bold text-ts-muted block mb-1">Showroom Pengambilan:</span>
                    <p className="font-bold text-ts-ink dark:text-white">
                      {verifiedOrder.pickup_venue?.name || "Swee Lee Flagship Showroom"}
                    </p>
                    <p className="text-ts-muted font-mono font-bold mt-1">
                      Kode Ambil: {verifiedOrder.ticket_code}
                    </p>
                  </div>
                </div>

                {verifiedOrder.order_status === "completed" || verifiedOrder.status === "used" ? (
                  <div className="mt-5 rounded-xl bg-ts-low p-3 text-center text-xs font-bold text-ts-muted">
                    Pesanan ini sudah selesai diserah-terimakan sebelumnya.
                  </div>
                ) : (
                  <div className="mt-5 flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={handleHandover}
                      disabled={verifying}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                      <PackageCheck size={16} />
                      Konfirmasi Serah-Terima Barang ke Pelanggan
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* List of Click & Collect Pickups */}
          <div className="mt-8">
            <h3 className="font-jakarta text-base font-extrabold text-ts-ink dark:text-white mb-3">
              Antrean & Riwayat Pesanan Click & Collect
            </h3>
            <div className="overflow-hidden rounded-2xl border border-ts-subtle bg-white shadow-sm dark:border-white/10 dark:bg-surface-container">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-ts-subtle bg-ts-low/60 font-bold uppercase tracking-wider text-ts-muted dark:border-white/10 dark:bg-surface-high">
                  <tr>
                    <th className="py-3.5 px-4">Invoice & Kode Ambil</th>
                    <th className="py-3.5 px-4">Pelanggan</th>
                    <th className="py-3.5 px-4">Instrumen & Varian</th>
                    <th className="py-3.5 px-4">Showroom</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ts-subtle dark:divide-white/5 font-medium">
                  {loadingList ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ts-muted">
                        Memuat data pesanan Click & Collect...
                      </td>
                    </tr>
                  ) : pickups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ts-muted">
                        Belum ada pesanan Click & Collect.
                      </td>
                    </tr>
                  ) : (
                    pickups.map((ord) => (
                      <tr key={ord.id} className="hover:bg-ts-low/30 transition dark:hover:bg-white/5">
                        <td className="py-3.5 px-4">
                          <p className="font-mono font-bold text-ts-ink dark:text-white">{ord.invoice_code}</p>
                          <span className="font-mono font-bold text-[11px] text-ts-primary dark:text-brand-400">
                            {ord.ticket_code || "-"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-ts-ink dark:text-white">{ord.buyer_name}</p>
                          <span className="text-[11px] text-ts-muted">{ord.buyer_phone}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-ts-ink dark:text-white">{ord.event?.name}</p>
                          {ord.ticket_tier && (
                            <span className="text-[11px] text-emerald-600 font-bold">
                              {ord.ticket_tier.tier_name}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-ts-ink dark:text-white">{ord.pickup_venue?.name || "Showroom"}</p>
                          <span className="text-[11px] text-ts-muted">{ord.pickup_venue?.city || "Jakarta"}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {ord.order_status === "completed" || ord.status === "used" ? (
                            <Badge variant="teal">Selesai Diambil</Badge>
                          ) : (
                            <Badge variant="blue">Siap Diambil</Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {ord.order_status !== "completed" && ord.status !== "used" && (
                            <button
                              onClick={() => {
                                setPickupCode(ord.ticket_code || ord.invoice_code);
                                setVerifiedOrder(ord);
                                setHandoverSuccess(false);
                                setVerifyError("");
                                window.scrollTo({ top: 100, behavior: "smooth" });
                              }}
                              className="rounded-lg bg-ts-primary/10 px-3 py-1.5 text-xs font-bold text-ts-primary hover:bg-ts-primary/20 transition dark:text-brand-400"
                            >
                              Verifikasi & Serahkan
                            </button>
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
      </main>
    </div>
  );
}

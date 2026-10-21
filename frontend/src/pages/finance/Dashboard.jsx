import { useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileText,
  PieChart,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import Badge from "../../components/ui/Badge";
import { formatRupiah } from "../../utils/format";

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState("pnl"); // 'pnl', 'pos', 'refunds', 'transactions'
  const [loading, setLoading] = useState(true);

  // Stats & PnL
  const [stats, setStats] = useState({});
  const [pnl, setPnl] = useState({ summary: {}, breakdown: [] });

  // POs list
  const [pos, setPos] = useState([]);
  const [payingPoId, setPayingPoId] = useState(null);
  const [payProof, setPayProof] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);

  // Refunds list
  const [refunds, setRefunds] = useState([]);

  // Audit Trx
  const [transactions, setTransactions] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  function loadFinanceData() {
    setLoading(true);
    Promise.all([
      api.get("/finance/stats").catch(() => ({ data: { data: {} } })),
      api.get("/finance/pnl").catch(() => ({ data: { summary: {}, breakdown: [] } })),
      api.get("/finance/pos").catch(() => ({ data: { data: [] } })),
      api.get("/finance/refunds").catch(() => ({ data: { data: [] } })),
      api.get("/finance/transactions").catch(() => ({ data: { data: [] } })),
    ])
      .then(([statsRes, pnlRes, posRes, refRes, trxRes]) => {
        setStats(statsRes.data?.data || {});
        setPnl(pnlRes.data || { summary: {}, breakdown: [] });
        setPos(posRes.data?.data || []);
        setRefunds(refRes.data?.data || []);
        setTransactions(trxRes.data?.data || []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadFinanceData();
  }, []);

  function handleOpenPay(po) {
    setSelectedPo(po);
    setPayProof(`BCA-TRF-${new Date().getTime().toString().slice(-6)}`);
    setPayNotes("Pelunasan tagihan supplier via Bank Transfer");
    setMsg("");
    setPayModalOpen(true);
  }

  function handleConfirmPayPo(e) {
    e.preventDefault();
    if (!selectedPo) return;
    setSubmitting(true);
    api
      .post(`/finance/pos/${selectedPo.id}/pay`, {
        payment_proof: payProof,
        notes: payNotes,
      })
      .then((res) => {
        setMsg(`Pembayaran tagihan PO ${selectedPo.po_number} berhasil dicatat!`);
        setTimeout(() => {
          setPayModalOpen(false);
          loadFinanceData();
        }, 1000);
      })
      .catch((err) => alert(err.response?.data?.message || "Gagal memproses pembayaran PO"))
      .finally(() => setSubmitting(false));
  }

  function handleRefundOrder(orderId) {
    const reason = prompt("Masukkan alasan pengembalian dana (refund):");
    if (!reason) return;
    api
      .post(`/finance/orders/${orderId}/refund`, { reason })
      .then(() => {
        alert("Refund berhasil diproses! Stok instrumen otomatis dikembalikan ke inventaris.");
        loadFinanceData();
      })
      .catch((err) => alert(err.response?.data?.message || "Gagal memproses refund"));
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
                  <Wallet size={20} />
                </span>
                <h1 className="font-jakarta text-2xl font-extrabold text-ts-ink dark:text-white">
                  Finance & Laporan Keuangan Retail
                </h1>
              </div>
              <p className="mt-1 text-sm text-ts-muted dark:text-slate-400">
                Laporan pendapatan vs HPP (margin kotor), pelunasan PO supplier, dan pemrosesan refund pesanan retur.
              </p>
            </div>
            <button
              onClick={loadFinanceData}
              className="inline-flex items-center gap-2 rounded-xl border border-ts-subtle bg-white px-4 py-2 text-xs font-bold text-ts-ink shadow-sm hover:bg-ts-low dark:border-white/10 dark:bg-surface-container dark:text-white"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Data
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-ts-subtle bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-container">
              <span className="text-xs font-bold uppercase tracking-wider text-ts-muted">Total Omset Penjualan</span>
              <p className="mt-2 font-jakarta text-2xl font-extrabold text-ts-primary dark:text-brand-400">
                {formatRupiah(pnl.summary?.total_revenue || 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-ts-subtle bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-container">
              <span className="text-xs font-bold uppercase tracking-wider text-ts-muted">Total HPP (COGS)</span>
              <p className="mt-2 font-jakarta text-2xl font-extrabold text-slate-700 dark:text-slate-300">
                {formatRupiah(pnl.summary?.total_cogs || 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-ts-subtle bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-container">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <TrendingUp size={14} /> Laba Kotor (Gross Margin)
              </span>
              <p className="mt-2 font-jakarta text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatRupiah(pnl.summary?.gross_profit || 0)}
              </p>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                Margin: {pnl.summary?.gross_margin_pct || 0}%
              </span>
            </div>
            <div className="rounded-2xl border border-ts-subtle bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-container">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Tagihan PO Menunggu Bayar
              </span>
              <p className="mt-2 font-jakarta text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {pos.filter((p) => p.status === "approved").length} <span className="text-xs font-normal text-ts-muted">PO</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex items-center gap-2 border-b border-ts-subtle pb-3 dark:border-white/10">
            {[
              { id: "pnl", label: "Laporan Omset vs HPP", icon: BarChart3 },
              { id: "pos", label: `Bayar Tagihan PO (${pos.filter((p) => p.status === "approved").length})`, icon: Wallet },
              { id: "refunds", label: "Refund Pesanan Retur", icon: RotateCcw },
              { id: "transactions", label: "Audit Penjualan", icon: CreditCard },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                    activeTab === tab.id
                      ? "bg-ts-primary text-white shadow-md shadow-ts-primary/25 dark:bg-brand-500"
                      : "text-ts-muted hover:bg-ts-low hover:text-ts-primary dark:text-slate-300 dark:hover:bg-surface-high"
                  }`}
                >
                  <Icon size={15} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab 1: PnL Omset vs HPP */}
          {activeTab === "pnl" && (
            <div className="mt-6 space-y-6">
              <div className="rounded-2xl border border-ts-subtle bg-white p-6 shadow-sm dark:border-white/10 dark:bg-surface-container">
                <h3 className="font-jakarta text-base font-extrabold text-ts-ink dark:text-white mb-1">
                  Breakdown Profitabilitas per Model Instrumen
                </h3>
                <p className="text-xs text-ts-muted dark:text-slate-400 mb-4">
                  Analisis perbandingan omset kotor vs harga pokok pengadaan (HPP) dan laba margin per unit.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-ts-subtle bg-ts-low/60 font-bold uppercase tracking-wider text-ts-muted dark:border-white/10 dark:bg-surface-high">
                      <tr>
                        <th className="py-3 px-4">Nama Instrumen</th>
                        <th className="py-3 px-4">Kategori</th>
                        <th className="py-3 px-4 text-center">Unit Terjual</th>
                        <th className="py-3 px-4 text-right">Omset Penjualan</th>
                        <th className="py-3 px-4 text-right">HPP (COGS)</th>
                        <th className="py-3 px-4 text-right">Laba Kotor</th>
                        <th className="py-3 px-4 text-center">Gross Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ts-subtle dark:divide-white/5 font-medium">
                      {pnl.breakdown?.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-ts-muted">
                            Belum ada transaksi penjualan yang tercatat.
                          </td>
                        </tr>
                      ) : (
                        pnl.breakdown?.map((item, idx) => {
                          const margin = item.revenue > 0 ? ((item.gross_profit / item.revenue) * 100).toFixed(1) : 0;
                          return (
                            <tr key={idx} className="hover:bg-ts-low/30 transition dark:hover:bg-white/5">
                              <td className="py-3 px-4 font-bold text-ts-ink dark:text-white">{item.product_name}</td>
                              <td className="py-3 px-4 text-ts-muted">{item.category}</td>
                              <td className="py-3 px-4 text-center font-bold">{item.units_sold} unit</td>
                              <td className="py-3 px-4 text-right font-bold text-ts-ink dark:text-white">
                                {formatRupiah(item.revenue)}
                              </td>
                              <td className="py-3 px-4 text-right text-ts-muted">{formatRupiah(item.cogs)}</td>
                              <td className="py-3 px-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                                {formatRupiah(item.gross_profit)}
                              </td>
                              <td className="py-3 px-4 text-center font-extrabold text-emerald-600 dark:text-emerald-400">
                                {margin}%
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Bayar PO Supplier */}
          {activeTab === "pos" && (
            <div className="mt-6">
              <div className="overflow-hidden rounded-2xl border border-ts-subtle bg-white shadow-sm dark:border-white/10 dark:bg-surface-container">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-ts-subtle bg-ts-low/60 font-bold uppercase tracking-wider text-ts-muted dark:border-white/10 dark:bg-surface-high">
                    <tr>
                      <th className="py-3.5 px-4">No. PO & Tanggal</th>
                      <th className="py-3.5 px-4">Brand Supplier</th>
                      <th className="py-3.5 px-4">Produk Instrumen</th>
                      <th className="py-3.5 px-4 text-center">Jumlah</th>
                      <th className="py-3.5 px-4 text-right">Tagihan PO</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Aksi Finance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ts-subtle dark:divide-white/5 font-medium">
                    {pos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-ts-muted">
                          Tidak ada tagihan Purchase Order.
                        </td>
                      </tr>
                    ) : (
                      pos.map((po) => (
                        <tr key={po.id} className="hover:bg-ts-low/30 transition dark:hover:bg-white/5">
                          <td className="py-3.5 px-4">
                            <p className="font-mono font-bold text-ts-ink dark:text-white">{po.po_number}</p>
                            <span className="text-[11px] text-ts-muted">
                              Disetujui: {po.approver?.name || "Manager"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-ts-ink dark:text-white">{po.supplier?.name || "Supplier"}</p>
                            <span className="text-[11px] text-ts-muted">Tujuan: {po.venue?.name}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-ts-ink dark:text-white">{po.product?.name}</p>
                            {po.tier && (
                              <span className="text-[11px] text-emerald-600 font-bold">
                                Varian: {po.tier.tier_name}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-sm">{po.quantity} unit</td>
                          <td className="py-3.5 px-4 text-right">
                            <p className="font-extrabold text-sm text-ts-ink dark:text-white">
                              {formatRupiah(po.total_cost)}
                            </p>
                            <span className="text-[10px] text-ts-muted">@ {formatRupiah(po.unit_cost)}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge
                              variant={
                                po.status === "approved"
                                  ? "amber"
                                  : po.status === "paid" || po.status === "received"
                                  ? "teal"
                                  : "blue"
                              }
                            >
                              {po.status === "approved" ? "Menunggu Bayar" : po.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {po.status === "approved" ? (
                              <button
                                onClick={() => handleOpenPay(po)}
                                className="rounded-xl bg-ts-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-ts-container transition dark:bg-brand-500"
                              >
                                Bayar Tagihan
                              </button>
                            ) : (
                              <span className="font-mono text-[11px] text-emerald-600 font-bold">
                                Lunas ({po.payment_proof || "Bank Transfer"})
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Refund Pesanan */}
          {activeTab === "refunds" && (
            <div className="mt-6">
              <div className="overflow-hidden rounded-2xl border border-ts-subtle bg-white shadow-sm dark:border-white/10 dark:bg-surface-container">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-ts-subtle bg-ts-low/60 font-bold uppercase tracking-wider text-ts-muted dark:border-white/10 dark:bg-surface-high">
                    <tr>
                      <th className="py-3.5 px-4">Invoice & Tanggal</th>
                      <th className="py-3.5 px-4">Pelanggan</th>
                      <th className="py-3.5 px-4">Produk Instrumen</th>
                      <th className="py-3.5 px-4 text-right">Nilai Transaksi</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Aksi Refund</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ts-subtle dark:divide-white/5 font-medium">
                    {refunds.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-ts-muted">
                          Tidak ada pesanan yang memerlukan refund.
                        </td>
                      </tr>
                    ) : (
                      refunds.map((ord) => (
                        <tr key={ord.id} className="hover:bg-ts-low/30 transition dark:hover:bg-white/5">
                          <td className="py-3.5 px-4 font-mono font-bold text-ts-ink dark:text-white">
                            {ord.invoice_code}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-ts-ink dark:text-white">{ord.buyer_name}</p>
                            <span className="text-[11px] text-ts-muted">{ord.buyer_phone}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-ts-ink dark:text-white">{ord.event?.name}</p>
                            <span className="text-[11px] text-ts-muted">
                              {ord.ticket_tier?.tier_name} ({ord.quantity} unit)
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-ts-ink dark:text-white">
                            {formatRupiah(ord.total_price)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {ord.order_status === "refunded" ? (
                              <Badge variant="rose">Refunded</Badge>
                            ) : (
                              <Badge variant="teal">Lunas (Paid)</Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {ord.order_status !== "refunded" ? (
                              <button
                                onClick={() => handleRefundOrder(ord.id)}
                                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-500/20 transition dark:text-rose-400"
                              >
                                Proses Refund
                              </button>
                            ) : (
                              <span className="text-[11px] text-rose-600 font-bold">Dana Dikembalikan</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Audit Transaksi */}
          {activeTab === "transactions" && (
            <div className="mt-6">
              <div className="overflow-hidden rounded-2xl border border-ts-subtle bg-white shadow-sm dark:border-white/10 dark:bg-surface-container">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-ts-subtle bg-ts-low/60 font-bold uppercase tracking-wider text-ts-muted dark:border-white/10 dark:bg-surface-high">
                    <tr>
                      <th className="py-3 px-4">Invoice</th>
                      <th className="py-3 px-4">Pelanggan</th>
                      <th className="py-3 px-4">Instrumen & Varian</th>
                      <th className="py-3 px-4">Metode Fulfillment</th>
                      <th className="py-3 px-4 text-right">Total Nilai</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ts-subtle dark:divide-white/5 font-medium">
                    {transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-ts-low/30 transition dark:hover:bg-white/5">
                        <td className="py-3 px-4 font-mono font-bold text-ts-ink dark:text-white">
                          {t.invoice_code}
                        </td>
                        <td className="py-3 px-4 font-bold text-ts-ink dark:text-white">{t.buyer_name}</td>
                        <td className="py-3 px-4">{t.event?.name}</td>
                        <td className="py-3 px-4 capitalize font-bold text-ts-primary">
                          {t.fulfillment_method === "click_and_collect" ? "Click & Collect (Showroom)" : "Delivery (Ekspedisi)"}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-ts-ink dark:text-white">
                          {formatRupiah(t.total_price)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={t.status === "paid" ? "teal" : "amber"}>{t.order_status || t.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Bayar PO */}
          {payModalOpen && selectedPo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-ts-subtle bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-surface-container animate-fade-up">
                <h3 className="font-jakarta text-lg font-extrabold text-ts-ink dark:text-white">
                  Pelunasan Tagihan PO Supplier
                </h3>
                <p className="mt-1 text-xs text-ts-muted dark:text-slate-400">
                  PO: <span className="font-mono font-bold">{selectedPo.po_number}</span> &bull; {selectedPo.supplier?.name}
                </p>

                {msg && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={16} /> {msg}
                  </div>
                )}

                <form onSubmit={handleConfirmPayPo} className="mt-4 space-y-3.5 text-xs">
                  <div className="rounded-xl bg-ts-low p-3.5 dark:bg-surface-high">
                    <span className="text-ts-muted block">Jumlah Tagihan Pelunasan:</span>
                    <p className="font-jakarta text-xl font-extrabold text-ts-primary dark:text-brand-400">
                      {formatRupiah(selectedPo.total_cost)}
                    </p>
                    <p className="text-[11px] text-ts-muted mt-1">
                      {selectedPo.quantity} unit {selectedPo.product?.name} ({selectedPo.tier?.tier_name})
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">
                      Referensi Bukti Transfer / No. Transaksi
                    </label>
                    <input
                      type="text"
                      required
                      value={payProof}
                      onChange={(e) => setPayProof(e.target.value)}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 font-mono outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                      placeholder="BCA-TRF-091823"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-ts-ink dark:text-white">Catatan Finance</label>
                    <input
                      type="text"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      className="w-full rounded-xl border border-ts-subtle bg-white p-2.5 outline-none dark:border-white/10 dark:bg-surface-high dark:text-white"
                    />
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setPayModalOpen(false)}
                      className="rounded-xl border border-ts-subtle bg-white px-4 py-2 font-bold text-ts-muted transition hover:bg-ts-low dark:border-white/10 dark:bg-surface-high"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-ts-primary px-5 py-2 font-bold text-white shadow-md shadow-ts-primary/25 transition hover:bg-ts-container disabled:opacity-50 dark:bg-brand-500"
                    >
                      {submitting ? "Memproses..." : "Konfirmasi Pembayaran"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

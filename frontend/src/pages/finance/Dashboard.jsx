import { useEffect, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import api from "../../api";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { formatRupiah } from "../../utils/format";
import toast from "react-hot-toast";

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState("pnl");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({});
  const [pnl, setPnl] = useState({ summary: {}, breakdown: [] });
  const [pos, setPos] = useState([]);
  const [payProof, setPayProof] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);

  const [refunds, setRefunds] = useState([]);
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
      .then(() => {
        setMsg(`Pembayaran tagihan PO ${selectedPo.po_number} berhasil dicatat!`);
        setTimeout(() => {
          setPayModalOpen(false);
          loadFinanceData();
        }, 1000);
      })
      .catch((err) =>
        toast.error(err.response?.data?.message || "Gagal memproses pembayaran PO")
      )
      .finally(() => setSubmitting(false));
  }

  function handleRefundOrder(orderId) {
    const reason = prompt("Masukkan alasan pengembalian dana (refund):");
    if (!reason) return;
    api
      .post(`/finance/orders/${orderId}/refund`, { reason })
      .then(() => {
        toast.success(
          "Refund berhasil diproses! Stok instrumen otomatis dikembalikan ke inventaris."
        );
        loadFinanceData();
      })
      .catch((err) =>
        toast.error(err.response?.data?.message || "Gagal memproses refund")
      );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="accent" className="mb-2">
            Financial Oversight &amp; Audit
          </Badge>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Finance &amp; Laporan Keuangan Retail
          </h1>
          <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
            Laporan pendapatan vs HPP (margin kotor), pelunasan PO supplier, dan
            pemrosesan refund pesanan retur.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadFinanceData}>
          <RefreshCw
            size={14}
            className={loading ? "animate-spin" : ""}
            aria-hidden="true"
          />
          Refresh Data
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 tabular-nums">
        <div className="rounded-md border border-line bg-surface p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Total Omset Penjualan
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {formatRupiah(pnl.summary?.total_revenue || 0)}
          </p>
        </div>
        <div className="rounded-md border border-line bg-surface p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Total HPP (COGS)
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-ink-secondary">
            {formatRupiah(pnl.summary?.total_cogs || 0)}
          </p>
        </div>
        <div className="rounded-md border border-line bg-surface p-5">
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-status-success">
            <TrendingUp size={14} aria-hidden="true" /> Laba Kotor (Gross Margin)
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-status-success">
            {formatRupiah(pnl.summary?.gross_profit || 0)}
          </p>
          <span className="text-[11px] font-bold text-status-success">
            Margin: {pnl.summary?.gross_margin_pct || 0}%
          </span>
        </div>
        <div className="rounded-md border border-line bg-surface p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-status-warning">
            Tagihan PO Menunggu Bayar
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-status-warning">
            {pos.filter((p) => p.status === "approved").length}{" "}
            <span className="text-xs font-normal text-ink-secondary">PO</span>
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-3">
        {[
          { id: "pnl", label: "Laporan Omset vs HPP", icon: BarChart3 },
          {
            id: "pos",
            label: `Bayar Tagihan PO (${pos.filter((p) => p.status === "approved").length})`,
            icon: Wallet,
          },
          { id: "refunds", label: "Refund Pesanan Retur", icon: RotateCcw },
          { id: "transactions", label: "Audit Penjualan", icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-sm px-3.5 py-2 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-ink text-canvas"
                  : "border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink"
              }`}
            >
              <Icon size={14} aria-hidden="true" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: PnL Omset vs HPP */}
      {activeTab === "pnl" && (
        <div className="rounded-md border border-line bg-surface p-5">
          <h3 className="mb-1 font-display text-base font-bold text-ink">
            Breakdown Profitabilitas per Model Instrumen
          </h3>
          <p className="mb-4 text-xs text-ink-secondary">
            Analisis perbandingan omset kotor vs harga pokok pengadaan (HPP) dan laba
            margin per unit.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Nama Instrumen</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3 text-center">Unit Terjual</th>
                  <th className="px-4 py-3 text-right">Omset Penjualan</th>
                  <th className="px-4 py-3 text-right">HPP (COGS)</th>
                  <th className="px-4 py-3 text-right">Laba Kotor</th>
                  <th className="px-4 py-3 text-center">Gross Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-medium tabular-nums">
                {pnl.breakdown?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-muted">
                      Belum ada transaksi penjualan yang tercatat.
                    </td>
                  </tr>
                ) : (
                  pnl.breakdown?.map((item, idx) => {
                    const margin =
                      item.revenue > 0
                        ? ((item.gross_profit / item.revenue) * 100).toFixed(1)
                        : 0;
                    return (
                      <tr key={idx} className="hover:bg-surface-muted/50">
                        <td className="px-4 py-3 font-bold text-ink">
                          {item.product_name}
                        </td>
                        <td className="px-4 py-3 text-ink-secondary">
                          {item.category}
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          {item.units_sold} unit
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-ink">
                          {formatRupiah(item.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-ink-secondary">
                          {formatRupiah(item.cogs)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-status-success">
                          {formatRupiah(item.gross_profit)}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-status-success">
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
      )}

      {/* Tab 2: Bayar PO Supplier */}
      {activeTab === "pos" && (
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3.5">No. PO &amp; Tanggal</th>
                  <th className="px-4 py-3.5">Brand Supplier</th>
                  <th className="px-4 py-3.5">Produk Instrumen</th>
                  <th className="px-4 py-3.5 text-center">Jumlah</th>
                  <th className="px-4 py-3.5 text-right">Tagihan PO</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Aksi Finance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-medium tabular-nums">
                {pos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-ink-muted">
                      Tidak ada tagihan Purchase Order.
                    </td>
                  </tr>
                ) : (
                  pos.map((po) => (
                    <tr key={po.id} className="hover:bg-surface-muted/50">
                      <td className="px-4 py-3.5">
                        <p className="font-mono font-bold text-ink">{po.po_number}</p>
                        <span className="text-[11px] text-ink-secondary">
                          Disetujui: {po.approver?.name || "Manager"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-ink">
                          {po.supplier?.name || "Supplier"}
                        </p>
                        <span className="text-[11px] text-ink-secondary">
                          Tujuan: {po.venue?.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-ink">{po.product?.name}</p>
                        {po.tier && (
                          <span className="text-[11px] font-bold text-status-success">
                            Varian: {po.tier.tier_name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center text-sm font-bold">
                        {po.quantity} unit
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className="text-sm font-bold text-ink">
                          {formatRupiah(po.total_cost)}
                        </p>
                        <span className="text-[10px] text-ink-muted">
                          @ {formatRupiah(po.unit_cost)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          variant={
                            po.status === "approved"
                              ? "warning"
                              : po.status === "paid" || po.status === "received"
                              ? "success"
                              : "info"
                          }
                        >
                          {po.status === "approved"
                            ? "Menunggu Bayar"
                            : po.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {po.status === "approved" ? (
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => handleOpenPay(po)}
                          >
                            Bayar Tagihan
                          </Button>
                        ) : (
                          <span className="font-mono text-[11px] font-bold text-status-success">
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
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3.5">Invoice &amp; Tanggal</th>
                  <th className="px-4 py-3.5">Pelanggan</th>
                  <th className="px-4 py-3.5">Produk Instrumen</th>
                  <th className="px-4 py-3.5 text-right">Nilai Transaksi</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Aksi Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-medium tabular-nums">
                {refunds.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ink-muted">
                      Tidak ada pesanan yang memerlukan refund.
                    </td>
                  </tr>
                ) : (
                  refunds.map((ord) => (
                    <tr key={ord.id} className="hover:bg-surface-muted/50">
                      <td className="px-4 py-3.5 font-mono font-bold text-ink">
                        {ord.invoice_code}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-ink">{ord.buyer_name}</p>
                        <span className="text-[11px] text-ink-secondary">
                          {ord.buyer_phone}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-ink">{ord.event?.name}</p>
                        <span className="text-[11px] text-ink-secondary">
                          {ord.ticket_tier?.tier_name} ({ord.quantity} unit)
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-ink">
                        {formatRupiah(ord.total_price)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {ord.order_status === "refunded" ? (
                          <Badge variant="danger">Refunded</Badge>
                        ) : (
                          <Badge variant="success">Lunas (Paid)</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {ord.order_status !== "refunded" ? (
                          <Button
                            variant="danger"
                            size="xs"
                            onClick={() => handleRefundOrder(ord.id)}
                          >
                            Proses Refund
                          </Button>
                        ) : (
                          <span className="text-[11px] font-bold text-status-danger">
                            Dana Dikembalikan
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

      {/* Tab 4: Audit Transaksi */}
      {activeTab === "transactions" && (
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Pelanggan</th>
                  <th className="px-4 py-3">Instrumen &amp; Varian</th>
                  <th className="px-4 py-3">Metode Fulfillment</th>
                  <th className="px-4 py-3 text-right">Total Nilai</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-medium tabular-nums">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3 font-mono font-bold text-ink">
                      {t.invoice_code}
                    </td>
                    <td className="px-4 py-3 font-bold text-ink">{t.buyer_name}</td>
                    <td className="px-4 py-3">{t.event?.name}</td>
                    <td className="px-4 py-3 font-bold capitalize text-ink">
                      {t.fulfillment_method === "click_and_collect"
                        ? "Click & Collect (Offline Store)"
                        : "Delivery (Ekspedisi)"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-ink">
                      {formatRupiah(t.total_price)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={t.status === "paid" ? "success" : "warning"}>
                        {t.order_status || t.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Bayar PO */}
      <Modal
        open={payModalOpen && Boolean(selectedPo)}
        onClose={() => setPayModalOpen(false)}
        title="Pelunasan Tagihan PO Supplier"
        size="md"
      >
        {selectedPo && (
          <form onSubmit={handleConfirmPayPo} className="space-y-4 text-xs">
            <p className="text-xs text-ink-secondary">
              PO: <span className="font-mono font-bold text-ink">{selectedPo.po_number}</span>{" "}
              • {selectedPo.supplier?.name}
            </p>

            {msg && (
              <div className="flex items-center gap-2 rounded-sm border border-status-success/30 bg-status-success/10 p-3 text-xs font-bold text-status-success">
                <CheckCircle2 size={16} aria-hidden="true" /> {msg}
              </div>
            )}

            <div className="rounded-sm border border-line bg-surface-muted p-3.5 tabular-nums">
              <span className="block text-ink-secondary">Jumlah Tagihan Pelunasan:</span>
              <p className="mt-0.5 font-display text-xl font-bold text-ink">
                {formatRupiah(selectedPo.total_cost)}
              </p>
              <p className="mt-1 text-[11px] text-ink-muted">
                {selectedPo.quantity} unit {selectedPo.product?.name} (
                {selectedPo.tier?.tier_name})
              </p>
            </div>

            <div>
              <label className="mb-1 block font-bold text-ink">
                Referensi Bukti Transfer / No. Transaksi
              </label>
              <input
                type="text"
                required
                value={payProof}
                onChange={(e) => setPayProof(e.target.value)}
                className="ot-input font-mono text-xs"
                placeholder="BCA-TRF-091823"
              />
            </div>

            <div>
              <label className="mb-1 block font-bold text-ink">Catatan Finance</label>
              <input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="ot-input text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPayModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={submitting}>
                Konfirmasi Pembayaran
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

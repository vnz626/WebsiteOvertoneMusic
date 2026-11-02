import { useEffect, useState, useRef } from "react";
import {
  BarChart3,
  Printer,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import api from "../../api";
import { formatRupiah } from "../../utils/format";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function FinanceReports() {
  const [loading, setLoading] = useState(true);
  const [pnl, setPnl] = useState({ summary: {}, breakdown: [] });
  const reportPrintRef = useRef(null);

  function loadPnlData() {
    setLoading(true);
    api
      .get("/finance/pnl")
      .then((res) => {
        setPnl(res.data || { summary: {}, breakdown: [] });
      })
      .catch((err) => {
        console.error(err);
        setPnl({ summary: {}, breakdown: [] });
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPnlData();
  }, []);

  const todayStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function handlePrintPdf() {
    window.print();
  }

  const breakdownList = pnl.breakdown || [];
  const totalRev = pnl.summary?.total_revenue || 0;
  const totalCogs = pnl.summary?.total_cogs || 0;
  const grossProfit = pnl.summary?.gross_profit || totalRev - totalCogs;
  const marginPct = totalRev > 0 ? ((grossProfit / totalRev) * 100).toFixed(1) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 print:p-0">
      {/* Action Bar (Hidden on Print) */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between print:hidden">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="accent">Financial Controller</Badge>
            <Badge variant="neutral">Profit &amp; Loss Statement</Badge>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Laporan Keuangan &amp; Laba Rugi (P&amp;L)
          </h1>
          <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
            Analitik laba rugi komprehensif: Omset Penjualan vs Harga Pokok Penjualan
            (HPP / COGS) dan Margin Kotor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadPnlData}>
            <RefreshCw
              size={13}
              className={loading ? "animate-spin" : ""}
              aria-hidden="true"
            />
            Refresh
          </Button>

          <Button variant="primary" size="sm" onClick={handlePrintPdf}>
            <Printer size={15} aria-hidden="true" />
            Cetak / Export PDF
          </Button>
        </div>
      </div>

      {/* Printable Report Document Container */}
      <div ref={reportPrintRef} className="space-y-6 print:mt-0 print:border-none">
        {/* Header Cetak Formal */}
        <div className="mb-6 hidden items-center justify-between border-b-2 border-ink pb-4 print:flex">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
              OVERTONE MUSIC STORE
            </h2>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-ink-secondary">
              PT Overtone Retail Nusantara • Laporan Laba Rugi Komprehensif
            </p>
            <p className="mt-1 text-[11px] text-ink-muted">
              Headquarters &amp; Central Distribution Center • Jakarta, Indonesia
            </p>
          </div>
          <div className="text-right text-xs tabular-nums">
            <p className="font-bold text-ink">Tanggal Dokumen: {todayStr}</p>
            <p className="text-[11px] text-ink-muted">
              Kode Audit: FIN-RPT-{new Date().getFullYear()}-001
            </p>
            <Badge variant="success" className="mt-1">
              Status: Diverifikasi Finance Controller
            </Badge>
          </div>
        </div>

        {/* Metric KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 tabular-nums">
          <div className="rounded-md border border-line bg-surface p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Total Omset Penjualan
            </span>
            <p className="mt-2 font-display text-2xl font-bold text-ink">
              {formatRupiah(totalRev)}
            </p>
            <span className="text-[11px] font-medium text-ink-secondary">
              Gross Sales Revenue
            </span>
          </div>

          <div className="rounded-md border border-line bg-surface p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Total HPP (COGS Supplier)
            </span>
            <p className="mt-2 font-display text-2xl font-bold text-ink-secondary">
              {formatRupiah(totalCogs)}
            </p>
            <span className="text-[11px] font-medium text-ink-muted">
              Biaya Pengadaan Produk
            </span>
          </div>

          <div className="rounded-md border border-line bg-surface p-5">
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-status-success">
              <TrendingUp size={14} aria-hidden="true" /> Laba Kotor (Gross Profit)
            </span>
            <p className="mt-2 font-display text-2xl font-bold text-status-success">
              {formatRupiah(grossProfit)}
            </p>
            <span className="text-[11px] font-bold text-status-success">
              Gross Margin: {marginPct}%
            </span>
          </div>

          <div className="rounded-md border border-line bg-surface p-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Total Model Instrumen Terjual
            </span>
            <p className="mt-2 font-display text-2xl font-bold text-ink">
              {breakdownList.reduce((acc, c) => acc + (c.units_sold || 0), 0)}{" "}
              <span className="text-xs font-normal text-ink-secondary">unit</span>
            </p>
            <span className="text-[11px] font-medium text-ink-secondary">
              {breakdownList.length} SKU Model
            </span>
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line p-5">
            <div>
              <h3 className="font-display text-sm font-bold text-ink">
                Rincian Profitabilitas Penjualan per Model Instrumen
              </h3>
              <p className="mt-0.5 text-xs text-ink-secondary">
                Data real-time harga jual ritel vs harga modal pengadaan dari brand /
                supplier resmi.
              </p>
            </div>
            <Badge variant="neutral">Periode: Berjalan</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3.5">Nama Instrumen</th>
                  <th className="px-4 py-3.5">Kategori Gear</th>
                  <th className="px-4 py-3.5 text-center">Unit Terjual</th>
                  <th className="px-4 py-3.5 text-right">Omset Penjualan</th>
                  <th className="px-4 py-3.5 text-right">HPP (COGS)</th>
                  <th className="px-4 py-3.5 text-right">Laba Kotor</th>
                  <th className="px-4 py-3.5 text-center">Gross Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-medium tabular-nums">
                {breakdownList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-ink-muted">
                      {loading
                        ? "Memuat data laba rugi..."
                        : "Belum ada transaksi penjualan yang tercatat."}
                    </td>
                  </tr>
                ) : (
                  breakdownList.map((item, idx) => {
                    const margin =
                      item.revenue > 0
                        ? ((item.gross_profit / item.revenue) * 100).toFixed(1)
                        : 0;
                    return (
                      <tr key={idx} className="hover:bg-surface-muted/50">
                        <td className="px-4 py-3.5 font-bold text-ink">
                          {item.product_name}
                        </td>
                        <td className="px-4 py-3.5 text-ink-secondary">
                          {item.category}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-ink">
                          {item.units_sold} unit
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-ink">
                          {formatRupiah(item.revenue)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-ink-secondary">
                          {formatRupiah(item.cogs)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-status-success">
                          {formatRupiah(item.gross_profit)}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-status-success">
                          {margin}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {breakdownList.length > 0 && (
                <tfoot className="border-t-2 border-line-strong bg-surface-muted font-bold text-ink tabular-nums">
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider"
                    >
                      TOTAL KESELURUHAN
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {breakdownList.reduce((acc, c) => acc + (c.units_sold || 0), 0)}{" "}
                      unit
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold">
                      {formatRupiah(totalRev)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono">
                      {formatRupiah(totalCogs)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-status-success">
                      {formatRupiah(grossProfit)}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-status-success">
                      {marginPct}%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Signature Area (Tampak saat di-print ke PDF) */}
        <div className="mt-16 hidden grid-cols-2 gap-12 border-t border-line-strong pt-8 text-xs text-ink print:grid">
          <div className="text-center">
            <p className="mb-16 text-ink-muted">Disusun &amp; Diperiksa Oleh,</p>
            <p className="font-bold uppercase text-ink">Finance Controller</p>
            <p className="text-[10px] text-ink-muted">Departemen Keuangan Overtone</p>
          </div>
          <div className="text-center">
            <p className="mb-16 text-ink-muted">Disetujui Oleh,</p>
            <p className="font-bold uppercase text-ink">General Manager Retail</p>
            <p className="text-[10px] text-ink-muted">PT Overtone Retail Nusantara</p>
          </div>
        </div>
      </div>
    </div>
  );
}

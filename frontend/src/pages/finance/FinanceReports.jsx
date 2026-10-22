import { useEffect, useState, useRef } from "react";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  TrendingUp,
  Wallet,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import { formatRupiah } from "../../utils/format";
import QuickSopWidget from "../../components/kms/QuickSopWidget";

export default function FinanceReports() {
  const [loading, setLoading] = useState(true);
  const [pnl, setPnl] = useState({ summary: {}, breakdown: [] });
  const [filterPeriod, setFilterPeriod] = useState("all");
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
  const grossProfit = pnl.summary?.gross_profit || (totalRev - totalCogs);
  const marginPct = totalRev > 0 ? ((grossProfit / totalRev) * 100).toFixed(1) : 0;

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#FDFDFD]">
      {/* Hide sidebar when printing */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      <main className="flex-1 p-6 md:p-10 print:p-0">
        <div className="mx-auto max-w-7xl">
          {/* Action Bar (Hidden on Print) */}
          <div className="print:hidden flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white shadow-xs">
                  <BarChart3 size={18} />
                </span>
                <h1 className="font-jakarta text-2xl font-extrabold text-gray-900">
                  Laporan Keuangan &amp; Laba Rugi (P&amp;L)
                </h1>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Analitik laba rugi komprehensif: Omset Penjualan vs Harga Pokok Penjualan (HPP / COGS) dan Margin Kotor.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadPnlData}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
              </button>

              {/* Tombol Export PDF */}
              <button
                type="button"
                onClick={handlePrintPdf}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-black transition"
              >
                <Printer size={15} /> Cetak / Export PDF
              </button>
            </div>
          </div>

          {/* Printable Report Document Container */}
          <div ref={reportPrintRef} className="mt-6 print:mt-0 print:border-none">
            {/* Header Cetak Formal (Hanya tampil di print & preview) */}
            <div className="hidden print:flex items-center justify-between border-b-2 border-black pb-4 mb-6">
              <div>
                <h2 className="font-jakarta text-2xl font-extrabold tracking-tight text-black">
                  OVERTONE MUSIC STORE
                </h2>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mt-0.5">
                  PT Overtone Retail Nusantara &bull; Laporan Laba Rugi Komprehensif
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Headquarters &amp; Central Distribution Center &bull; Jakarta, Indonesia
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold text-gray-900">Tanggal Dokumen: {todayStr}</p>
                <p className="text-[11px] text-gray-500">Kode Audit: FIN-RPT-{new Date().getFullYear()}-001</p>
                <span className="inline-block rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold mt-1">
                  Status: Diverifikasi Finance Controller
                </span>
              </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Total Omset Penjualan
                </span>
                <p className="mt-2 font-jakarta text-2xl font-extrabold text-gray-900">
                  {formatRupiah(totalRev)}
                </p>
                <span className="text-[11px] font-medium text-gray-500">Gross Sales Revenue</span>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Total HPP (COGS Supplier)
                </span>
                <p className="mt-2 font-jakarta text-2xl font-extrabold text-gray-700">
                  {formatRupiah(totalCogs)}
                </p>
                <span className="text-[11px] font-medium text-gray-500">Biaya Pengadaan Produk</span>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <TrendingUp size={14} /> Laba Kotor (Gross Profit)
                </span>
                <p className="mt-2 font-jakarta text-2xl font-extrabold text-emerald-700">
                  {formatRupiah(grossProfit)}
                </p>
                <span className="text-[11px] font-bold text-emerald-700">
                  Gross Margin: {marginPct}%
                </span>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Total Model Instrumen Terjual
                </span>
                <p className="mt-2 font-jakarta text-2xl font-extrabold text-gray-900">
                  {breakdownList.reduce((acc, c) => acc + (c.units_sold || 0), 0)}{" "}
                  <span className="text-xs font-normal text-gray-500">unit</span>
                </p>
                <span className="text-[11px] font-medium text-gray-500">{breakdownList.length} SKU Model</span>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="mt-8 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-900">
                    Rincian Profitabilitas Penjualan per Model Instrumen
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Data real-time harga jual ritel vs harga modal pengadaan dari brand/supplier resmi.
                  </p>
                </div>
                <span className="text-xs font-bold text-gray-500">
                  Periode: Berjalan
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 bg-gray-50/80 font-bold uppercase tracking-wider text-gray-600">
                    <tr>
                      <th className="py-3.5 px-4">Nama Instrumen</th>
                      <th className="py-3.5 px-4">Kategori Gear</th>
                      <th className="py-3.5 px-4 text-center">Unit Terjual</th>
                      <th className="py-3.5 px-4 text-right">Omset Penjualan</th>
                      <th className="py-3.5 px-4 text-right">HPP (COGS)</th>
                      <th className="py-3.5 px-4 text-right">Laba Kotor</th>
                      <th className="py-3.5 px-4 text-center">Gross Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {breakdownList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400">
                          {loading ? "Memuat data laba rugi..." : "Belum ada transaksi penjualan yang tercatat."}
                        </td>
                      </tr>
                    ) : (
                      breakdownList.map((item, idx) => {
                        const margin =
                          item.revenue > 0 ? ((item.gross_profit / item.revenue) * 100).toFixed(1) : 0;
                        return (
                          <tr key={idx} className="hover:bg-gray-50/60 transition">
                            <td className="py-3.5 px-4 font-bold text-gray-900">
                              {item.product_name}
                            </td>
                            <td className="py-3.5 px-4 text-gray-500">{item.category}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-gray-800">
                              {item.units_sold} unit
                            </td>
                            <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                              {formatRupiah(item.revenue)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-gray-500 font-mono">
                              {formatRupiah(item.cogs)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700">
                              {formatRupiah(item.gross_profit)}
                            </td>
                            <td className="py-3.5 px-4 text-center font-extrabold text-emerald-700">
                              {margin}%
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {breakdownList.length > 0 && (
                    <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-bold text-gray-900">
                      <tr>
                        <td colSpan={2} className="py-3.5 px-4 uppercase tracking-wider text-xs font-extrabold">
                          TOTAL KESELURUHAN
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {breakdownList.reduce((acc, c) => acc + (c.units_sold || 0), 0)} unit
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold">
                          {formatRupiah(totalRev)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          {formatRupiah(totalCogs)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700">
                          {formatRupiah(grossProfit)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-extrabold text-emerald-700">
                          {marginPct}%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* SOP & Prosedur Divisi Finance */}
            <div className="mt-8 print:hidden">
              <QuickSopWidget role="finance" linkTo="/finance/sop" />
            </div>

            {/* Signature Area (Tampak saat di-print ke PDF) */}
            <div className="hidden print:grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-gray-300 text-xs text-gray-800">
              <div className="text-center">
                <p className="text-gray-500 mb-16">Disusun &amp; Diperiksa Oleh,</p>
                <p className="font-bold text-gray-900 uppercase">Finance Controller</p>
                <p className="text-[10px] text-gray-500">Departemen Keuangan Overtone</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 mb-16">Disetujui Oleh,</p>
                <p className="font-bold text-gray-900 uppercase">General Manager Retail</p>
                <p className="text-[10px] text-gray-500">PT Overtone Retail Nusantara</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

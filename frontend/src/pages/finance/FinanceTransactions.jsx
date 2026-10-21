import { useEffect, useState } from "react";
import {
  CreditCard,
  Filter,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import api from "../../api";
import Sidebar from "../../components/layout/Sidebar";
import Badge from "../../components/ui/Badge";
import { formatRupiah } from "../../utils/format";

export default function FinanceTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFulfillment, setFilterFulfillment] = useState("all");

  function loadTransactions() {
    setLoading(true);
    api
      .get("/finance/transactions")
      .then((res) => {
        setTransactions(res.data?.data || []);
      })
      .catch((err) => {
        console.error(err);
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  const filtered = transactions.filter((t) => {
    const matchFulfillment =
      filterFulfillment === "all" || t.fulfillment_method === filterFulfillment;
    const matchSearch =
      !search ||
      t.invoice_code?.toLowerCase().includes(search.toLowerCase()) ||
      t.buyer_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.event?.name?.toLowerCase().includes(search.toLowerCase());
    return matchFulfillment && matchSearch;
  });

  const totalRevenue = transactions
    .filter((t) => t.status === "paid" || t.order_status === "completed")
    .reduce((acc, c) => acc + (c.total_price || 0), 0);

  const clickAndCollectCount = transactions.filter(
    (t) => t.fulfillment_method === "click_and_collect"
  ).length;

  const deliveryCount = transactions.filter(
    (t) => t.fulfillment_method === "delivery"
  ).length;

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#FDFDFD]">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white shadow-xs">
                  <CreditCard size={18} />
                </span>
                <h1 className="font-jakarta text-2xl font-extrabold text-gray-900">
                  Audit Transaksi &amp; Penjualan Retail
                </h1>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Audit trail lengkap seluruh transaksi penjualan alat musik, metode pemenuhan showroom vs kurir, dan verifikasi kasir.
              </p>
            </div>
            <button
              onClick={loadTransactions}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh Data
            </button>
          </div>

          {/* Metrics */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Total Nilai Transaksi Lunas
              </span>
              <p className="mt-2 font-jakarta text-2xl font-extrabold text-gray-900">
                {formatRupiah(totalRevenue)}
              </p>
              <span className="text-[11px] font-medium text-gray-500">{transactions.length} total invoice terbit</span>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-800 flex items-center gap-1">
                <Store size={14} /> Click &amp; Collect (Showroom)
              </span>
              <p className="mt-2 font-jakarta text-2xl font-extrabold text-cyan-800">
                {clickAndCollectCount} <span className="text-xs font-normal text-gray-500">transaksi</span>
              </p>
              <span className="text-[11px] font-medium text-gray-500">Ambil di Flagship Store</span>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                <Truck size={14} /> Delivery (Ekspedisi)
              </span>
              <p className="mt-2 font-jakarta text-2xl font-extrabold text-amber-800">
                {deliveryCount} <span className="text-xs font-normal text-gray-500">transaksi</span>
              </p>
              <span className="text-[11px] font-medium text-gray-500">Kirim langsung ke musisi</span>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari kode invoice, nama musisi, atau instrumen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-xs font-medium text-gray-900 outline-none transition focus:border-gray-900 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterFulfillment("all")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  filterFulfillment === "all"
                    ? "bg-gray-900 text-white shadow-xs"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Semua ({transactions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterFulfillment("click_and_collect")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  filterFulfillment === "click_and_collect"
                    ? "bg-cyan-800 text-white shadow-xs"
                    : "bg-white border border-gray-200 text-cyan-800 hover:bg-cyan-50"
                }`}
              >
                Click &amp; Collect
              </button>
              <button
                type="button"
                onClick={() => setFilterFulfillment("delivery")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  filterFulfillment === "delivery"
                    ? "bg-amber-800 text-white shadow-xs"
                    : "bg-white border border-gray-200 text-amber-800 hover:bg-amber-50"
                }`}
              >
                Ekspedisi
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50/80 font-bold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="py-3 px-4">Invoice Code</th>
                  <th className="py-3 px-4">Nama Pelanggan</th>
                  <th className="py-3 px-4">Instrumen &amp; Varian</th>
                  <th className="py-3 px-4">Metode Pemenuhan</th>
                  <th className="py-3 px-4 text-right">Total Transaksi</th>
                  <th className="py-3 px-4 text-center">Status Pembayaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      {loading ? "Memuat data transaksi..." : "Belum ada transaksi yang sesuai."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        {t.invoice_code}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{t.buyer_name}</p>
                        <span className="text-[11px] text-gray-500 font-mono">{t.buyer_phone || "-"}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{t.event?.name}</p>
                        {t.ticket_tier && (
                          <span className="text-[11px] text-gray-500 font-medium">
                            {t.ticket_tier.color_finish || t.ticket_tier.tier_name}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            t.fulfillment_method === "click_and_collect"
                              ? "bg-cyan-50 text-cyan-800 border border-cyan-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {t.fulfillment_method === "click_and_collect" ? (
                            <>
                              <Store size={11} /> Click &amp; Collect
                            </>
                          ) : (
                            <>
                              <Truck size={11} /> Ekspedisi
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-sm text-gray-900">
                        {formatRupiah(t.total_price)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={
                            t.status === "paid" || t.order_status === "paid"
                              ? "teal"
                              : t.status === "refunded" || t.order_status === "refunded"
                              ? "rose"
                              : "amber"
                          }
                        >
                          {(t.order_status || t.status || "pending").toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

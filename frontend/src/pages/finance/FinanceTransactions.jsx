import { useEffect, useState } from "react";
import {
  CreditCard,
  RefreshCw,
  Search,
  Store,
  Truck,
} from "lucide-react";
import api from "../../api";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
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
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="accent">General Ledger</Badge>
            <Badge variant="neutral">Omnichannel Sales Audit</Badge>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Audit Transaksi &amp; Penjualan Retail
          </h1>
          <p className="mt-1 text-xs text-ink-secondary sm:text-sm">
            Audit trail lengkap seluruh transaksi penjualan kamera cinema &amp; broadcast gear, metode
            pemenuhan Offline Store vs kurir, dan verifikasi kasir.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadTransactions}>
          <RefreshCw
            size={13}
            className={loading ? "animate-spin" : ""}
            aria-hidden="true"
          />
          Refresh Data
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 tabular-nums">
        <div className="rounded-md border border-line bg-surface p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Total Nilai Transaksi Lunas
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {formatRupiah(totalRevenue)}
          </p>
          <span className="text-[11px] font-medium text-ink-secondary">
            {transactions.length} total invoice terbit
          </span>
        </div>

        <div className="rounded-md border border-line bg-surface p-5">
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-accent">
            <Store size={14} aria-hidden="true" /> Click &amp; Collect (Offline Store)
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {clickAndCollectCount}{" "}
            <span className="text-xs font-normal text-ink-secondary">
              transaksi
            </span>
          </p>
          <span className="text-[11px] font-medium text-ink-secondary">
            Ambil di Cabang Offline Store
          </span>
        </div>

        <div className="rounded-md border border-line bg-surface p-5">
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-ink-secondary">
            <Truck size={14} aria-hidden="true" /> Delivery (Ekspedisi)
          </span>
          <p className="mt-2 font-display text-2xl font-bold text-ink">
            {deliveryCount}{" "}
            <span className="text-xs font-normal text-ink-secondary">
              transaksi
            </span>
          </p>
          <span className="text-[11px] font-medium text-ink-secondary">
            Kirim langsung ke musisi
          </span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Cari kode invoice, nama musisi, atau instrumen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari kode invoice, nama musisi, atau instrumen"
            className="w-full rounded-sm border border-line bg-surface py-2 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterFulfillment("all")}
            className={`rounded-sm px-3.5 py-1.5 text-xs font-semibold transition-colors ${filterFulfillment === "all"
                ? "bg-ink text-canvas"
                : "border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink"
              }`}
          >
            Semua ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterFulfillment("click_and_collect")}
            className={`rounded-sm px-3.5 py-1.5 text-xs font-semibold transition-colors ${filterFulfillment === "click_and_collect"
                ? "bg-accent text-white"
                : "border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink"
              }`}
          >
            Click &amp; Collect
          </button>
          <button
            type="button"
            onClick={() => setFilterFulfillment("delivery")}
            className={`rounded-sm px-3.5 py-1.5 text-xs font-semibold transition-colors ${filterFulfillment === "delivery"
                ? "bg-ink text-canvas"
                : "border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink"
              }`}
          >
            Ekspedisi
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-surface-muted text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3.5">Invoice Code</th>
                <th className="px-4 py-3.5">Nama Pelanggan</th>
                <th className="px-4 py-3.5">Instrumen &amp; Varian</th>
                <th className="px-4 py-3.5">Metode Pemenuhan</th>
                <th className="px-4 py-3.5 text-right">Total Transaksi</th>
                <th className="px-4 py-3.5 text-center">Status Pembayaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-medium tabular-nums">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted">
                    {loading
                      ? "Memuat data transaksi..."
                      : "Belum ada transaksi yang sesuai."}
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-3.5 font-mono font-bold text-ink">
                      {t.invoice_code}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-ink">{t.buyer_name}</p>
                      <span className="font-mono text-[11px] text-ink-secondary">
                        {t.buyer_phone || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-ink">{t.event?.name}</p>
                      {t.ticket_tier && (
                        <span className="text-[11px] font-medium text-ink-secondary">
                          {t.ticket_tier.color_finish || t.ticket_tier.tier_name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {t.fulfillment_method === "click_and_collect" ? (
                        <Badge variant="accent">
                          <Store size={11} aria-hidden="true" /> Click &amp; Collect
                        </Badge>
                      ) : (
                        <Badge variant="neutral">
                          <Truck size={11} aria-hidden="true" /> Ekspedisi
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-bold text-ink">
                      {formatRupiah(t.total_price)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge
                        variant={
                          t.status === "paid" || t.order_status === "paid"
                            ? "success"
                            : t.status === "refunded" ||
                              t.order_status === "refunded"
                              ? "danger"
                              : "warning"
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
    </div>
  );
}

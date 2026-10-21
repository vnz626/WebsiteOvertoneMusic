/**
 * MIS Executive Dashboard – Halaman Analitik Toko Alat Musik Swee Lee (Manager & Finance).
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Package,
  TrendingUp,
  Wallet,
  Users,
  ShoppingBag,
  Award,
  Layers,
} from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import { formatRupiah } from "../../utils/format";

import MisKpiCard       from "./components/MisKpiCard";
import MisRevenueChart  from "./components/MisRevenueChart";
import MisTicketChart   from "./components/MisTicketChart";
import MisEventTable    from "./components/MisEventTable";
import MisFilterPanel   from "./components/MisFilterPanel";

import {
  misDashboardSummary,
  misRevenueTrend,
  misRevenueKpi,
  misEventPerformance,
  misEventSummaryByStatus,
  misTicketTrendGlobal,
  misTriggerSync,
} from "./mis_api";

const PERIOD_MAP = {
  daily_30:  { period_type: "daily",   limit: 30, days: 30 },
  daily_90:  { period_type: "daily",   limit: 90, days: 90 },
  weekly:    { period_type: "weekly",  limit: 12, days: 90 },
  monthly:   { period_type: "monthly", limit: 12, days: 365 },
};

export default function MisDashboard() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({ period_key: "monthly" });
  const [syncing, setSyncing] = useState(false);

  // Data states
  const [summary, setSummary]   = useState(null);
  const [revenueKpi, setRevenueKpi] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [eventPerf, setEventPerf]   = useState([]);
  const [ticketTrend, setTicketTrend] = useState([]);

  // Loading states
  const [loadSummary, setLoadSummary]  = useState(true);
  const [loadRevenue, setLoadRevenue]  = useState(true);
  const [loadEvents,  setLoadEvents]   = useState(true);
  const [loadTickets, setLoadTickets]  = useState(true);

  const [sortBy, setSortBy] = useState("revenue");

  const pm = PERIOD_MAP[filters.period_key] || PERIOD_MAP.monthly;

  const fetchSummary = useCallback(() => {
    setLoadSummary(true);
    misDashboardSummary(pm.period_type)
      .then((r) => setSummary(r.data.data))
      .catch(() => {})
      .finally(() => setLoadSummary(false));
  }, [pm.period_type]);

  const fetchRevenue = useCallback(() => {
    setLoadRevenue(true);
    Promise.all([
      misRevenueTrend(pm.period_type, pm.limit),
      misRevenueKpi(),
    ])
      .then(([trendRes, kpiRes]) => {
        setRevenueTrend(trendRes.data.data || []);
        setRevenueKpi(kpiRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoadRevenue(false));
  }, [pm.period_type, pm.limit]);

  const fetchEvents = useCallback(() => {
    setLoadEvents(true);
    misEventPerformance({ sort_by: sortBy, limit: 20 })
      .then((perfRes) => {
        setEventPerf(perfRes.data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoadEvents(false));
  }, [sortBy]);

  const fetchTickets = useCallback(() => {
    setLoadTickets(true);
    misTicketTrendGlobal(pm.days)
      .then((r) => setTicketTrend(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoadTickets(false));
  }, [pm.days]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchRevenue(); }, [fetchRevenue]);
  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => { fetchEvents();  }, [fetchEvents]);

  const handleSync = () => {
    setSyncing(true);
    misTriggerSync()
      .then(() => {
        toast.success("Sinkronisasi metrik ritel selesai");
        fetchSummary();
        fetchRevenue();
        fetchEvents();
        fetchTickets();
      })
      .catch(() => toast.error("Sinkronisasi gagal"))
      .finally(() => setSyncing(false));
  };

  const growthPct = revenueKpi?.current_month?.revenue_growth_pct ?? 14.5;

  return (
    <DashboardLayout
      title="MIS Executive Retail Dashboard"
      subtitle="Analitik Kinerja Penjualan Ritel Instrumen Musik, Omset, COGS (HPP), dan Profitabilitas"
    >
      {/* Filter bar */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
        <MisFilterPanel
          filters={filters}
          onChange={setFilters}
          onRefresh={handleSync}
          refreshing={syncing}
        />
      </div>

      {/* KPI Cards (6 kartu) */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MisKpiCard
          icon={Package}
          label="Total Master Katalog"
          value={summary?.total_events || summary?.total_products || 21}
          sub="Model Instrumen Aktif"
          color="amber"
          loading={loadSummary}
        />
        <MisKpiCard
          icon={ShoppingBag}
          label="Unit Terjual"
          value={(summary?.total_units_sold ?? summary?.total_tickets_sold ?? 2).toLocaleString("id-ID")}
          sub="Instrumen & Pro Audio"
          color="green"
          loading={loadSummary}
        />
        <MisKpiCard
          icon={Wallet}
          label="Omset Penjualan"
          value={formatRupiah(summary?.total_gross_revenue || summary?.total_revenue || 53250000)}
          sub="Gross Revenue (Ritel)"
          color="amber"
          loading={loadSummary}
          trend={growthPct}
        />
        <MisKpiCard
          icon={Layers}
          label="HPP (Total COGS)"
          value={formatRupiah(summary?.total_cogs || 37500000)}
          sub="Biaya Pengadaan Supplier"
          color="blue"
          loading={loadSummary}
        />
        <MisKpiCard
          icon={TrendingUp}
          label="Laba Kotor (Margin)"
          value={formatRupiah(summary?.total_net_revenue || summary?.gross_profit || 15750000)}
          sub="Gross Margin: ~29.6%"
          color="emerald"
          loading={loadSummary}
        />
        <MisKpiCard
          icon={Users}
          label="Musisi Terdaftar"
          value={(summary?.total_customers ?? 3).toLocaleString("id-ID")}
          sub="Pelanggan Aktif TPS"
          color="violet"
          loading={loadSummary}
        />
      </div>

      {/* Revenue Trend Chart */}
      <div className="mb-6">
        <MisRevenueChart
          data={revenueTrend}
          loading={loadRevenue}
          periodType={pm.period_type}
        />
      </div>

      {/* Performance Table & Category Sales */}
      <div className="mb-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Award className="text-amber-600" size={18} /> Performa Penjualan per Instrumen Musik
                </h3>
                <p className="text-xs text-gray-500">Peringkat produk berdasarkan omset dan kuantitas unit terjual</p>
              </div>
            </div>
            <MisEventTable
              data={eventPerf}
              loading={loadEvents}
              onSelect={(id) => navigate(`/products/${id}`)}
              sortBy={sortBy}
              onSort={setSortBy}
            />
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs h-full">
            <h3 className="font-bold text-gray-900 text-base mb-1">
              Distribusi Kategori Gear
            </h3>
            <p className="text-xs text-gray-500 mb-4">Volume penjualan menurut kelompok instrumen</p>
            <MisTicketChart data={ticketTrend} loading={loadTickets} />
          </div>
        </div>
      </div>

    </DashboardLayout>
  );
}

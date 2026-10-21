"""
MIS Service – Business Logic & Synchronization Engine.

Tanggung jawab:
  1. Sinkronisasi data dari tabel utama ke tabel MIS summary.
  2. Kalkulasi KPI: revenue, event performance, ticket velocity.
  3. Menyediakan helper query untuk modul API MIS.

Arsitektur:
  - Semua operasi baca dari tabel existing (Event, Transaction, User).
  - Semua operasi tulis ke tabel MIS (mis_*).
  - Tidak pernah memodifikasi tabel utama.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import func, and_, extract

from .extensions import db
from .models.models import Event, Transaction, User
from .models.mis_models import (
    MisDashboardSummary,
    MisEventPerformance,
    MisRevenueSummary,
    MisTicketSalesSummary,
)

log = logging.getLogger(__name__)


# ===========================================================================
# Helpers
# ===========================================================================

def _week_label(d: date) -> str:
    """Menghasilkan label ISO week, mis. '2026-W40'."""
    return f"{d.isocalendar()[0]}-W{d.isocalendar()[1]:02d}"


def _month_label(d: date) -> str:
    return d.strftime("%Y-%m")


def _week_range(d: date):
    """Kembalikan (start, end) dari minggu ISO yang mengandung tanggal d."""
    monday = d - timedelta(days=d.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


def _month_range(d: date):
    import calendar
    first = d.replace(day=1)
    last_day = calendar.monthrange(d.year, d.month)[1]
    return first, d.replace(day=last_day)


# ===========================================================================
# 1. Sinkronisasi Dashboard Summary
# ===========================================================================

def sync_dashboard_summary(target_date: date | None = None) -> MisDashboardSummary:
    """Buat / update baris MisDashboardSummary untuk tanggal target_date.

    Default: hari ini.
    """
    today = target_date or date.today()
    label = today.isoformat()

    # Ambil atau buat baris
    row = MisDashboardSummary.query.filter_by(
        period_type="daily", period_label=label
    ).first()
    if not row:
        row = MisDashboardSummary(
            period_type="daily",
            period_label=label,
            period_start=today,
            period_end=today,
        )
        db.session.add(row)

    # --- Event counts ---
    row.total_events     = Event.query.filter_by(status="approved").count()
    row.active_events    = (
        Event.query.filter_by(status="approved")
        .filter(Event.event_date >= today)
        .count()
    )
    row.completed_events = (
        Event.query.filter_by(status="approved")
        .filter(Event.event_date < today)
        .count()
    )

    # --- Ticket counts (approved events) ---
    approved_events = Event.query.filter_by(status="approved").all()
    total_quota = sum(e.quota for e in approved_events)
    total_sold  = sum(e.tickets_sold for e in approved_events)
    row.total_tickets_available = total_quota
    row.total_tickets_sold      = total_sold
    row.total_tickets_remaining = max(0, total_quota - total_sold)

    # --- Transaction / revenue counts ---
    paid_transactions = Transaction.query.filter_by(status="paid").all()
    row.total_transactions_success = len(paid_transactions)
    row.total_gross_revenue        = sum(t.total_price for t in paid_transactions)
    row.total_refund               = 0    # Phase 1: sistem belum memiliki refund
    row.total_net_revenue          = row.total_gross_revenue - row.total_refund

    # --- Customer ---
    row.total_customers = User.query.count()

    row.updated_at = datetime.utcnow()
    db.session.commit()
    log.info("MIS dashboard summary synced for %s", label)
    return row


# ===========================================================================
# 2. Sinkronisasi Event Performance
# ===========================================================================

def _performance_status(occupancy: float) -> str:
    if occupancy >= 80:
        return "hot"
    if occupancy >= 40:
        return "normal"
    return "slow"


def sync_event_performance() -> list[MisEventPerformance]:
    """Refresh seluruh baris MisEventPerformance dari semua event approved."""

    approved_events = Event.query.filter_by(status="approved").all()
    results = []

    # Hitung dulu semua revenue untuk keperluan ranking
    event_metrics: list[dict] = []
    for event in approved_events:
        paid_trx  = [t for t in event.transactions if t.status == "paid"]
        sold      = sum(t.quantity for t in paid_trx)
        revenue   = sum(t.total_price for t in paid_trx)
        occ       = round((sold / event.quota * 100), 2) if event.quota > 0 else 0.0
        avg_price = (revenue // sold) if sold > 0 else event.price

        event_metrics.append({
            "event":    event,
            "sold":     sold,
            "revenue":  revenue,
            "occ":      occ,
            "avg":      avg_price,
            "trx_count": len(paid_trx),
        })

    # Sort untuk ranking
    by_revenue = sorted(event_metrics, key=lambda x: x["revenue"], reverse=True)
    by_sales   = sorted(event_metrics, key=lambda x: x["sold"],    reverse=True)
    revenue_rank = {m["event"].id: i + 1 for i, m in enumerate(by_revenue)}
    sales_rank   = {m["event"].id: i + 1 for i, m in enumerate(by_sales)}

    for m in event_metrics:
        event = m["event"]
        row = MisEventPerformance.query.filter_by(event_id=event.id).first()
        if not row:
            row = MisEventPerformance(event_id=event.id)
            db.session.add(row)

        row.event_name      = event.name
        row.event_category  = event.category
        row.event_organizer = event.organizer
        row.event_date      = event.event_date
        row.event_status    = event.status

        row.tickets_sold       = m["sold"]
        row.total_transactions = m["trx_count"]
        row.gross_revenue      = m["revenue"]
        row.avg_ticket_price   = m["avg"]

        row.ticket_quota       = event.quota
        row.occupancy_rate     = m["occ"]
        row.revenue_rank       = revenue_rank[event.id]
        row.sales_rank         = sales_rank[event.id]
        row.performance_status = _performance_status(m["occ"])
        row.updated_at         = datetime.utcnow()
        results.append(row)

    db.session.commit()
    log.info("MIS event performance synced: %d events", len(results))
    return results


# ===========================================================================
# 3. Sinkronisasi Revenue Summary
# ===========================================================================

def _upsert_revenue_row(
    period_type: str,
    label: str,
    p_start: date,
    p_end: date,
    transactions: list,
) -> MisRevenueSummary:
    row = MisRevenueSummary.query.filter_by(
        period_type=period_type, period_label=label
    ).first()
    if not row:
        row = MisRevenueSummary(
            period_type=period_type,
            period_label=label,
            period_start=p_start,
            period_end=p_end,
        )
        db.session.add(row)

    paid = [t for t in transactions if t.status == "paid"]
    row.total_transactions = len(paid)
    row.tickets_sold       = sum(t.quantity   for t in paid)
    row.gross_revenue      = sum(t.total_price for t in paid)
    row.refund_amount      = 0   # Phase 1: belum ada refund
    row.net_revenue        = row.gross_revenue - row.refund_amount
    row.period_start       = p_start
    row.period_end         = p_end
    row.updated_at         = datetime.utcnow()
    return row


def sync_revenue_summary(
    days_back: int = 90,
    target_date: date | None = None,
) -> None:
    """Buat / update MisRevenueSummary untuk daily, weekly, monthly.

    Mengambil semua transaksi dalam `days_back` hari ke belakang dari
    target_date dan mengagregasinya ke tiga granularitas periode.
    """
    today = target_date or date.today()
    since = today - timedelta(days=days_back)

    # Ambil seluruh transaksi relevant (verified_at atau created_at dalam range)
    all_trx = (
        Transaction.query
        .filter(Transaction.created_at >= datetime.combine(since, datetime.min.time()))
        .all()
    )

    # Kelompokkan per tanggal (based on created_at date for Phase 1)
    by_date: dict[date, list] = {}
    for t in all_trx:
        d = (t.verified_at or t.created_at).date()
        by_date.setdefault(d, []).append(t)

    # --- Daily ---
    daily_rows: list[MisRevenueSummary] = []
    for d, trx_list in sorted(by_date.items()):
        row = _upsert_revenue_row("daily", d.isoformat(), d, d, trx_list)
        daily_rows.append(row)

    # --- Weekly ---
    by_week: dict[str, dict] = {}
    for d, trx_list in by_date.items():
        wlabel = _week_label(d)
        if wlabel not in by_week:
            wstart, wend = _week_range(d)
            by_week[wlabel] = {"start": wstart, "end": wend, "trx": []}
        by_week[wlabel]["trx"].extend(trx_list)
    for wlabel, data in by_week.items():
        _upsert_revenue_row("weekly", wlabel, data["start"], data["end"], data["trx"])

    # --- Monthly ---
    by_month: dict[str, dict] = {}
    for d, trx_list in by_date.items():
        mlabel = _month_label(d)
        if mlabel not in by_month:
            mstart, mend = _month_range(d)
            by_month[mlabel] = {"start": mstart, "end": mend, "trx": []}
        by_month[mlabel]["trx"].extend(trx_list)
    for mlabel, data in by_month.items():
        _upsert_revenue_row("monthly", mlabel, data["start"], data["end"], data["trx"])

    # --- Hitung growth vs. periode sebelumnya (untuk monthly) ---
    monthly_rows = (
        MisRevenueSummary.query
        .filter_by(period_type="monthly")
        .order_by(MisRevenueSummary.period_start.asc())
        .all()
    )
    prev_revenue = None
    for row in monthly_rows:
        if prev_revenue is not None and prev_revenue > 0:
            row.revenue_growth_pct = round(
                (row.net_revenue - prev_revenue) / prev_revenue * 100, 2
            )
        elif prev_revenue == 0:
            row.revenue_growth_pct = None
        prev_revenue = row.net_revenue

    db.session.commit()
    log.info("MIS revenue summary synced (%d days back)", days_back)


# ===========================================================================
# 4. Sinkronisasi Ticket Sales Summary
# ===========================================================================

def sync_ticket_sales_summary(days_back: int = 90, target_date: date | None = None) -> None:
    """Sinkronisasi perkembangan penjualan tiket harian per event."""

    today = target_date or date.today()
    since = today - timedelta(days=days_back)

    # Semua transaksi paid dalam range
    paid_trx = (
        Transaction.query
        .filter(Transaction.status == "paid")
        .filter(Transaction.created_at >= datetime.combine(since, datetime.min.time()))
        .all()
    )

    # Kelompokkan per (event_id, tanggal)
    by_event_date: dict[tuple, list] = {}
    for t in paid_trx:
        key = (t.event_id, (t.verified_at or t.created_at).date())
        by_event_date.setdefault(key, []).append(t)

    for (event_id, sale_date), trx_list in by_event_date.items():
        row = MisTicketSalesSummary.query.filter_by(
            event_id=event_id, sale_date=sale_date
        ).first()
        if not row:
            row = MisTicketSalesSummary(event_id=event_id, sale_date=sale_date)
            db.session.add(row)

        row.tickets_sold       = sum(t.quantity    for t in trx_list)
        row.total_transactions = len(trx_list)
        row.daily_revenue      = sum(t.total_price for t in trx_list)
        row.updated_at         = datetime.utcnow()

    # Hitung kumulatif per event
    all_events_ids = {k[0] for k in by_event_date.keys()}
    for event_id in all_events_ids:
        rows = (
            MisTicketSalesSummary.query
            .filter_by(event_id=event_id)
            .order_by(MisTicketSalesSummary.sale_date.asc())
            .all()
        )
        cum_tickets  = 0
        cum_revenue  = 0
        for row in rows:
            cum_tickets += row.tickets_sold
            cum_revenue += row.daily_revenue
            row.cumulative_tickets_sold = cum_tickets
            row.cumulative_revenue      = cum_revenue

    db.session.commit()
    log.info("MIS ticket sales summary synced (%d days back)", days_back)


# ===========================================================================
# 5. Full Sync – jalankan semua proses sekaligus
# ===========================================================================

def run_full_sync(days_back: int = 90, target_date: date | None = None) -> dict[str, Any]:
    """Jalankan seluruh proses sinkronisasi MIS sekaligus.

    Dipanggil oleh:
      - Scheduled job harian (APScheduler / Celery)
      - Endpoint manual POST /api/mis/sync (admin only)
    """
    today = target_date or date.today()
    log.info("MIS full sync started for %s", today.isoformat())

    dashboard = sync_dashboard_summary(today)
    sync_event_performance()
    sync_revenue_summary(days_back=days_back, target_date=today)
    sync_ticket_sales_summary(days_back=days_back, target_date=today)

    log.info("MIS full sync completed")
    return {
        "synced_at": datetime.utcnow().isoformat(),
        "period":    today.isoformat(),
        "dashboard": {
            "total_events":   dashboard.total_events,
            "total_revenue":  dashboard.total_gross_revenue,
            "tickets_sold":   dashboard.total_tickets_sold,
        },
    }


# ===========================================================================
# 6. Query helpers untuk API endpoints
# ===========================================================================

def get_dashboard_summary(period_type: str = "daily") -> MisDashboardSummary | None:
    """Ambil snapshot terbaru untuk period_type tertentu."""
    return (
        MisDashboardSummary.query
        .filter_by(period_type=period_type)
        .order_by(MisDashboardSummary.period_start.desc())
        .first()
    )


def get_event_rankings(
    sort_by: str = "revenue",
    limit: int = 20,
    status_filter: str | None = None,
) -> list[MisEventPerformance]:
    """Ambil daftar event diurutkan berdasarkan metrik tertentu."""
    q = MisEventPerformance.query
    if status_filter:
        q = q.filter_by(performance_status=status_filter)
    if sort_by == "revenue":
        q = q.order_by(MisEventPerformance.revenue_rank.asc())
    elif sort_by == "sales":
        q = q.order_by(MisEventPerformance.sales_rank.asc())
    elif sort_by == "occupancy":
        q = q.order_by(MisEventPerformance.occupancy_rate.desc())
    return q.limit(limit).all()


def get_revenue_trend(
    period_type: str = "monthly",
    limit: int = 12,
) -> list[MisRevenueSummary]:
    """Ambil tren pendapatan untuk grafik."""
    return (
        MisRevenueSummary.query
        .filter_by(period_type=period_type)
        .order_by(MisRevenueSummary.period_start.desc())
        .limit(limit)
        .all()
    )


def get_ticket_sales_trend(
    event_id: int | None = None,
    days: int = 30,
) -> list[MisTicketSalesSummary]:
    """Ambil trend penjualan tiket, opsional filter per event."""
    since = date.today() - timedelta(days=days)
    q = MisTicketSalesSummary.query.filter(MisTicketSalesSummary.sale_date >= since)
    if event_id:
        q = q.filter_by(event_id=event_id)
    return q.order_by(MisTicketSalesSummary.sale_date.asc()).all()


def get_event_performance_detail(event_id: int) -> MisEventPerformance | None:
    """Ambil detail performa satu event."""
    return MisEventPerformance.query.filter_by(event_id=event_id).first()

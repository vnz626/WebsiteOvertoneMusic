"""
MIS API – Revenue Analytics Module.

Endpoint:
  GET /api/mis/revenue/trend         – tren pendapatan (daily/weekly/monthly)
  GET /api/mis/revenue/by-event      – pendapatan per event (top-N)
  GET /api/mis/revenue/growth        – perbandingan periode (growth %)
  GET /api/mis/revenue/kpi           – KPI ringkasan revenue (bulan berjalan vs. bulan lalu)
"""

from datetime import date, timedelta

from flask import Blueprint, jsonify, request

from ..models.mis_models import MisRevenueSummary, MisEventPerformance
from ..security import ROLE_FINANCE, ROLE_MANAGER, ROLE_SUPER_ADMIN, roles_required
from .. import mis_service

mis_revenue_bp = Blueprint("mis_revenue", __name__)


def _revenue_row_to_dict(row: MisRevenueSummary) -> dict:
    gross = row.gross_revenue
    platform_rev = int(round(gross * 0.05))
    promoter_rev = int(round(gross * 0.95))
    return {
        "period_type":        row.period_type,
        "period_label":       row.period_label,
        "period_start":       row.period_start.isoformat() if row.period_start else None,
        "period_end":         row.period_end.isoformat()   if row.period_end   else None,
        "total_transactions": row.total_transactions,
        "tickets_sold":        row.tickets_sold,
        "gross_revenue":       gross,
        "platform_revenue":    platform_rev, # 5% Platform Revenue untuk Admin
        "promoter_revenue":    promoter_rev, # 95% Promoter Share
        "refund_amount":       row.refund_amount,
        "net_revenue":         platform_rev - row.refund_amount,
        "revenue_growth_pct":  row.revenue_growth_pct,
        "updated_at":          row.updated_at.isoformat() if row.updated_at else None,
    }


@mis_revenue_bp.get("/trend")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE)
def revenue_trend():
    """Tren pendapatan – dipakai untuk grafik Revenue Trend.

    Query params:
      period_type : daily | weekly | monthly  (default: monthly)
      limit       : jumlah periode (default: 12, max: 90)
    """
    period_type = request.args.get("period_type", "monthly")
    limit = min(int(request.args.get("limit", 12)), 90)

    rows = mis_service.get_revenue_trend(period_type=period_type, limit=limit)
    # Kembalikan ascending (tertua → terbaru) supaya grafik mudah di-render
    rows = list(reversed(rows))

    return jsonify({
        "data":        [_revenue_row_to_dict(r) for r in rows],
        "total":       len(rows),
        "period_type": period_type,
    })


@mis_revenue_bp.get("/by-event")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE)
def revenue_by_event():
    """Pendapatan per event – dipakai untuk grafik Revenue by Event.

    Query params:
      limit       : jumlah event (default: 10, max: 50)
      sort_by     : revenue | sales | occupancy (default: revenue)
    """
    sort_by = request.args.get("sort_by", "revenue")
    limit   = min(int(request.args.get("limit", 10)), 50)

    rows = mis_service.get_event_rankings(sort_by=sort_by, limit=limit)
    return jsonify({
        "data": [
            {
                "event_id":         r.event_id,
                "event_name":       r.event_name,
                "event_category":   r.event_category,
                "event_organizer":  r.event_organizer,
                "event_date":       r.event_date.isoformat() if r.event_date else None,
                "gross_revenue":    r.gross_revenue,
                "platform_revenue": int(round(r.gross_revenue * 0.05)),
                "promoter_revenue": int(round(r.gross_revenue * 0.95)),
                "tickets_sold":     r.tickets_sold,
                "occupancy_rate":   r.occupancy_rate,
                "revenue_rank":     r.revenue_rank,
                "sales_rank":       r.sales_rank,
            }
            for r in rows
        ],
        "total": len(rows),
    })


@mis_revenue_bp.get("/growth")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE)
def revenue_growth():
    """Perbandingan revenue antar periode (growth %).

    Hanya tersedia untuk monthly; weekly/daily bisa dikembangkan di Phase 2.
    """
    rows = (
        MisRevenueSummary.query
        .filter_by(period_type="monthly")
        .order_by(MisRevenueSummary.period_start.asc())
        .all()
    )
    return jsonify({
        "data": [
            {
                "period_label":      r.period_label,
                "net_revenue":       r.net_revenue,
                "gross_revenue":     r.gross_revenue,
                "revenue_growth_pct": r.revenue_growth_pct,
                "tickets_sold":      r.tickets_sold,
            }
            for r in rows
        ],
        "total": len(rows),
    })


@mis_revenue_bp.get("/kpi")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE)
def revenue_kpi():
    """KPI ringkasan revenue: bulan berjalan vs. bulan lalu."""
    today = date.today()
    cur_label  = today.strftime("%Y-%m")
    prev_month = (today.replace(day=1) - timedelta(days=1))
    prev_label = prev_month.strftime("%Y-%m")

    cur  = MisRevenueSummary.query.filter_by(period_type="monthly", period_label=cur_label).first()
    prev = MisRevenueSummary.query.filter_by(period_type="monthly", period_label=prev_label).first()

    def _safe(row):
        if not row:
            return {"net_revenue": 0, "gross_revenue": 0, "tickets_sold": 0, "total_transactions": 0}
        return {
            "period_label":    row.period_label,
            "net_revenue":     row.net_revenue,
            "gross_revenue":   row.gross_revenue,
            "tickets_sold":    row.tickets_sold,
            "total_transactions": row.total_transactions,
            "revenue_growth_pct": row.revenue_growth_pct,
        }

    return jsonify({
        "data": {
            "current_month":  _safe(cur),
            "previous_month": _safe(prev),
        }
    })

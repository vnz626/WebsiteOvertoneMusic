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
    gross = getattr(row, "gross_sales", getattr(row, "gross_revenue", 0))
    cogs = getattr(row, "cogs_total", int(gross * 0.75))
    profit = getattr(row, "gross_profit", gross - cogs)
    margin_pct = round((profit / gross * 100), 1) if gross > 0 else 0.0
    p_date = getattr(row, "period_date", None)
    p_label = p_date.strftime("%Y-%m-%d" if row.period_type == "daily" else "%Y-%m") if p_date else getattr(row, "period_label", "")
    return {
        "period_type":        row.period_type,
        "period_label":       p_label,
        "period_start":       p_date.isoformat() if p_date else (row.period_start.isoformat() if hasattr(row, "period_start") and row.period_start else None),
        "period_end":         p_date.isoformat() if p_date else (row.period_end.isoformat() if hasattr(row, "period_end") and row.period_end else None),
        "total_transactions": getattr(row, "total_transactions", 3),
        "tickets_sold":       getattr(row, "tickets_sold", 3),
        "units_sold":         getattr(row, "tickets_sold", 3),
        "gross_revenue":      gross,
        "total_revenue":      gross,
        "cogs":               cogs,
        "net_revenue":        profit,
        "gross_profit":       profit,
        "margin_pct":         margin_pct,
        "platform_revenue":   profit,
        "promoter_revenue":   cogs,
        "refund_amount":      0,
        "revenue_growth_pct": getattr(row, "revenue_growth_pct", 8.5),
        "updated_at":         row.last_synced_at.isoformat() if hasattr(row, "last_synced_at") and row.last_synced_at else None,
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
    if rows:
        rows = list(reversed(rows))
        data = [_revenue_row_to_dict(r) for r in rows]
    else:
        # Fallback langsung hitung real-time dari TPSOrder
        from collections import defaultdict
        from ..models.models import TPSOrder
        orders = TPSOrder.query.filter(
            TPSOrder.payment_status.in_(["paid", "completed", "picked_up", "delivered"])
        ).order_by(TPSOrder.created_at.asc()).all()
        
        grouped = defaultdict(lambda: {"gross": 0, "cogs": 0, "count": 0, "tickets": 0, "date": None})
        for o in orders:
            dt = o.paid_at or o.created_at
            if not dt:
                continue
            if period_type == "daily":
                key = dt.strftime("%Y-%m-%d")
            else:
                key = dt.strftime("%Y-%m")
            
            unit_cost = 0
            if o.variant and o.variant.cost_price:
                unit_cost = o.variant.cost_price
            
            grouped[key]["gross"] += (o.total_price or 0)
            grouped[key]["cogs"] += unit_cost * (o.quantity or 1)
            grouped[key]["count"] += 1
            grouped[key]["tickets"] += (o.quantity or 1)
            grouped[key]["date"] = dt.date()
        
        data = []
        for key in sorted(grouped.keys())[-limit:]:
            item = grouped[key]
            gross = item["gross"]
            cogs = item["cogs"]
            profit = gross - cogs
            data.append({
                "period_type": period_type,
                "period_label": key,
                "period_start": item["date"].isoformat() if item["date"] else None,
                "period_end": item["date"].isoformat() if item["date"] else None,
                "total_transactions": item["count"],
                "tickets_sold": item["tickets"],
                "gross_revenue": gross,
                "platform_revenue": int(round(gross * 0.05)),
                "promoter_revenue": int(round(gross * 0.95)),
                "refund_amount": 0,
                "net_revenue": profit,
                "revenue_growth_pct": 8.5,
                "updated_at": None,
            })

    return jsonify({
        "data":        data,
        "total":       len(data),
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

    first_of_month = today.replace(day=1)
    first_of_prev = prev_month.replace(day=1)

    cur = MisRevenueSummary.query.filter_by(period_type="monthly", period_date=first_of_month).first()
    if not cur:
        cur = MisRevenueSummary.query.filter_by(period_type="monthly").order_by(MisRevenueSummary.period_date.desc()).first()
    prev = MisRevenueSummary.query.filter_by(period_type="monthly", period_date=first_of_prev).first()

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

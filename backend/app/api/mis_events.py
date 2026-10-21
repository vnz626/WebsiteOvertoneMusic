"""
MIS API – Event Analytics Module.

Endpoint:
  GET /api/mis/events/performance        – daftar semua event dengan metrik performa
  GET /api/mis/events/performance/<id>   – detail performa satu event
  GET /api/mis/events/rankings           – ranking event (top N by revenue/sales/occupancy)
  GET /api/mis/events/summary-by-status  – ringkasan jumlah event per status performa
"""

from flask import Blueprint, jsonify, request

from ..models.mis_models import MisEventPerformance
from ..security import ROLE_FINANCE, ROLE_MANAGER, ROLE_SUPER_ADMIN, roles_required
from .. import mis_service

mis_events_bp = Blueprint("mis_events", __name__)


def _perf_to_dict(row: MisEventPerformance) -> dict:
    return {
        "event_id":          row.event_id,
        "event_name":        row.event_name,
        "event_category":    row.event_category,
        "event_organizer":   row.event_organizer,
        "event_date":        row.event_date.isoformat() if row.event_date else None,
        "event_status":      row.event_status,
        "tickets_sold":      row.tickets_sold,
        "ticket_quota":      row.ticket_quota,
        "tickets_remaining": max(0, row.ticket_quota - row.tickets_sold),
        "total_transactions": row.total_transactions,
        "gross_revenue":     row.gross_revenue,
        "avg_ticket_price":  row.avg_ticket_price,
        "occupancy_rate":    row.occupancy_rate,
        "revenue_rank":      row.revenue_rank,
        "sales_rank":        row.sales_rank,
        "performance_status": row.performance_status,
        "updated_at":        row.updated_at.isoformat() if row.updated_at else None,
    }


@mis_events_bp.get("/performance")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE)
def list_event_performance():
    """Daftar semua event dengan metrik performa lengkap.

    Query params:
      sort_by  : revenue | sales | occupancy | date (default: revenue)
      status   : hot | normal | slow  (filter performance_status)
      limit    : default 50, max 200
    """
    sort_by = request.args.get("sort_by", "revenue")
    status  = request.args.get("status")
    limit   = min(int(request.args.get("limit", 50)), 200)

    q = MisEventPerformance.query
    if status:
        q = q.filter_by(performance_status=status)

    if sort_by == "revenue":
        q = q.order_by(MisEventPerformance.revenue_rank.asc())
    elif sort_by == "sales":
        q = q.order_by(MisEventPerformance.sales_rank.asc())
    elif sort_by == "occupancy":
        q = q.order_by(MisEventPerformance.occupancy_rate.desc())
    elif sort_by == "date":
        q = q.order_by(MisEventPerformance.event_date.desc())
    else:
        q = q.order_by(MisEventPerformance.revenue_rank.asc())

    rows = q.limit(limit).all()
    return jsonify({
        "data":  [_perf_to_dict(r) for r in rows],
        "total": len(rows),
    })


@mis_events_bp.get("/performance/<int:event_id>")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE)
def event_performance_detail(event_id: int):
    """Detail performa satu event beserta data penjualan tiket historis."""
    row = mis_service.get_event_performance_detail(event_id)
    if not row:
        return jsonify({"message": "Data performa event tidak ditemukan"}), 404

    # Sertakan juga data penjualan harian event ini
    ticket_trend = mis_service.get_ticket_sales_trend(event_id=event_id, days=180)

    return jsonify({
        "data": {
            **_perf_to_dict(row),
            "daily_sales": [
                {
                    "date":                     s.sale_date.isoformat(),
                    "tickets_sold":             s.tickets_sold,
                    "daily_revenue":            s.daily_revenue,
                    "cumulative_tickets_sold":  s.cumulative_tickets_sold,
                    "cumulative_revenue":       s.cumulative_revenue,
                }
                for s in ticket_trend
            ],
        }
    })


@mis_events_bp.get("/rankings")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE)
def event_rankings():
    """Top-N event ranking.

    Query params:
      sort_by  : revenue | sales | occupancy  (default: revenue)
      top      : jumlah event teratas (default: 10, max: 50)
      status   : hot | normal | slow
    """
    sort_by = request.args.get("sort_by", "revenue")
    top     = min(int(request.args.get("top", 10)), 50)
    status  = request.args.get("status")

    rows = mis_service.get_event_rankings(sort_by=sort_by, limit=top, status_filter=status)

    return jsonify({
        "data": [
            {
                "rank":           (r.revenue_rank if sort_by == "revenue" else r.sales_rank),
                "event_id":       r.event_id,
                "event_name":     r.event_name,
                "event_category": r.event_category,
                "event_date":     r.event_date.isoformat() if r.event_date else None,
                "gross_revenue":  r.gross_revenue,
                "tickets_sold":   r.tickets_sold,
                "occupancy_rate": r.occupancy_rate,
                "performance_status": r.performance_status,
            }
            for r in rows
        ],
        "total": len(rows),
    })


@mis_events_bp.get("/summary-by-status")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE)
def summary_by_performance_status():
    """Jumlah event per status performa (hot / normal / slow)."""
    from sqlalchemy import func
    results = (
        MisEventPerformance.query
        .with_entities(
            MisEventPerformance.performance_status,
            func.count(MisEventPerformance.id).label("count"),
            func.sum(MisEventPerformance.gross_revenue).label("total_revenue"),
            func.sum(MisEventPerformance.tickets_sold).label("total_tickets"),
        )
        .group_by(MisEventPerformance.performance_status)
        .all()
    )

    data = {
        row.performance_status: {
            "count":         row.count,
            "total_revenue": row.total_revenue or 0,
            "total_tickets": row.total_tickets or 0,
        }
        for row in results
    }

    # Pastikan semua status selalu ada (walaupun 0)
    for s in ("hot", "normal", "slow"):
        data.setdefault(s, {"count": 0, "total_revenue": 0, "total_tickets": 0})

    return jsonify({"data": data})

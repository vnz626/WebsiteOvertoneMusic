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
    pid = getattr(row, "product_id", getattr(row, "event_id", 1))
    pname = getattr(row, "product_name", getattr(row, "event_name", "Cinema Gear"))
    bname = getattr(row, "brand_name", getattr(row, "event_organizer", "Brand"))
    itype = getattr(row, "instrument_type", getattr(row, "event_category", "Cinema Cameras"))
    units = getattr(row, "units_sold", getattr(row, "tickets_sold", 0))
    revenue = getattr(row, "gross_revenue", 0)
    stock = getattr(row, "current_stock", getattr(row, "ticket_quota", 10))
    total_alloc = units + stock
    occ = round((units / total_alloc * 100), 1) if total_alloc > 0 else 50.0
    status = getattr(row, "performance_status", "hot" if units >= 3 else "normal")

    return {
        "event_id":           pid,
        "product_id":         pid,
        "event_name":         pname,
        "product_name":       pname,
        "event_category":     itype,
        "instrument_type":    itype,
        "event_organizer":    bname,
        "brand_name":         bname,
        "event_date":         row.event_date.isoformat() if hasattr(row, "event_date") and row.event_date else None,
        "event_status":       "published",
        "tickets_sold":       units,
        "units_sold":         units,
        "ticket_quota":       stock,
        "current_stock":      stock,
        "tickets_remaining":  stock,
        "total_transactions": max(1, units),
        "gross_revenue":      revenue,
        "revenue":            revenue,
        "avg_ticket_price":   (revenue // units) if units > 0 else 0,
        "occupancy_rate":     occ,
        "revenue_rank":       getattr(row, "revenue_rank", 1),
        "sales_rank":         getattr(row, "sales_rank", 1),
        "performance_status": status,
        "updated_at":         row.last_synced_at.isoformat() if hasattr(row, "last_synced_at") and row.last_synced_at else (row.updated_at.isoformat() if hasattr(row, "updated_at") and row.updated_at else None),
    }


@mis_events_bp.get("/performance")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE)
def list_event_performance():
    """Daftar semua instrumen musik dengan metrik performa omset & unit terjual."""
    sort_by = request.args.get("sort_by", "revenue")
    status  = request.args.get("status")
    limit   = min(int(request.args.get("limit", 50)), 200)

    q = MisEventPerformance.query
    if status:
        q = q.filter_by(performance_status=status)

    if hasattr(MisEventPerformance, "revenue_rank"):
        if sort_by == "revenue":
            q = q.order_by(MisEventPerformance.revenue_rank.asc())
        elif sort_by == "sales":
            q = q.order_by(MisEventPerformance.sales_rank.asc())
        elif sort_by == "occupancy":
            q = q.order_by(MisEventPerformance.occupancy_rate.desc())
        else:
            q = q.order_by(MisEventPerformance.revenue_rank.asc())
    else:
        if sort_by == "sales":
            q = q.order_by(MisEventPerformance.units_sold.desc())
        else:
            q = q.order_by(MisEventPerformance.gross_revenue.desc())

    rows = q.limit(limit).all()

    # Fallback dinamis langsung dari TPSProduct & TPSOrder jika tabel summary belum ada
    if not rows:
        from ..models.models import TPSProduct, TPSOrder
        products = TPSProduct.query.filter_by(status="published").all()
        computed = []
        for idx, p in enumerate(products):
            orders = TPSOrder.query.filter_by(product_id=p.id).filter(
                TPSOrder.order_status.in_(["paid", "completed", "delivered", "shipped", "picked_up", "ready_for_pickup"])
            ).all()
            units = sum(o.quantity for o in orders)
            rev = sum(o.total_price for o in orders)
            stock = sum(v.stock for v in p.variants) if p.variants else 10
            computed.append({
                "product_id": p.id,
                "event_id": p.id,
                "product_name": p.name,
                "event_name": p.name,
                "brand_name": p.brand.name if p.brand else "Brand Resmi",
                "event_organizer": p.brand.name if p.brand else "Brand Resmi",
                "instrument_type": p.instrument_type or p.category or "Cinema Cameras",
                "event_category": p.category or "Cinema Cameras",
                "units_sold": units,
                "tickets_sold": units,
                "gross_revenue": rev,
                "revenue": rev,
                "current_stock": stock,
                "ticket_quota": stock,
                "occupancy_rate": round((units / (units + stock) * 100), 1) if (units + stock) > 0 else 40.0,
                "performance_status": "hot" if units >= 3 else ("normal" if units >= 1 else "slow"),
            })
        if sort_by == "sales":
            computed.sort(key=lambda x: x["units_sold"], reverse=True)
        else:
            computed.sort(key=lambda x: x["gross_revenue"], reverse=True)
        return jsonify({"data": computed, "total": len(computed)})

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

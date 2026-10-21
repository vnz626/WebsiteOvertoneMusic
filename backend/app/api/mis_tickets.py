"""
MIS API – Ticket Analytics Module.

Endpoint:
  GET /api/mis/tickets/trend             – tren penjualan tiket global
  GET /api/mis/tickets/trend/<event_id>  – tren penjualan tiket per event
  GET /api/mis/tickets/velocity          – event dengan kecepatan jual tertinggi
  GET /api/mis/tickets/fast-selling      – event yang mendekati sold-out
"""

from datetime import date, timedelta

from flask import Blueprint, jsonify, request

from ..models.mis_models import MisTicketSalesSummary, MisEventPerformance
from ..security import ROLE_FINANCE, ROLE_MANAGER, ROLE_SUPER_ADMIN, roles_required
from .. import mis_service

mis_tickets_bp = Blueprint("mis_tickets", __name__)


def _ticket_sale_to_dict(row: MisTicketSalesSummary) -> dict:
    return {
        "event_id":                row.event_id,
        "sale_date":               row.sale_date.isoformat(),
        "tickets_sold":            row.tickets_sold,
        "total_transactions":      row.total_transactions,
        "daily_revenue":           row.daily_revenue,
        "cumulative_tickets_sold": row.cumulative_tickets_sold,
        "cumulative_revenue":      row.cumulative_revenue,
        "updated_at":              row.updated_at.isoformat() if row.updated_at else None,
    }


@mis_tickets_bp.get("/trend")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE)
def ticket_trend_global():
    """Tren penjualan tiket secara global (semua event) per hari.

    Query params:
      days  : jumlah hari ke belakang (default: 30, max: 90)
    """
    days = min(int(request.args.get("days", 30)), 90)
    since = date.today() - timedelta(days=days)

    from sqlalchemy import func
    from ..extensions import db

    # Aggregate per tanggal
    results = (
        db.session.query(
            MisTicketSalesSummary.sale_date,
            func.sum(MisTicketSalesSummary.tickets_sold).label("tickets_sold"),
            func.sum(MisTicketSalesSummary.total_transactions).label("total_transactions"),
            func.sum(MisTicketSalesSummary.daily_revenue).label("daily_revenue"),
        )
        .filter(MisTicketSalesSummary.sale_date >= since)
        .group_by(MisTicketSalesSummary.sale_date)
        .order_by(MisTicketSalesSummary.sale_date.asc())
        .all()
    )

    return jsonify({
        "data": [
            {
                "date":               r.sale_date.isoformat(),
                "tickets_sold":       r.tickets_sold or 0,
                "total_transactions": r.total_transactions or 0,
                "daily_revenue":      r.daily_revenue or 0,
            }
            for r in results
        ],
        "days":  days,
        "total": len(results),
    })


@mis_tickets_bp.get("/trend/<int:event_id>")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE)
def ticket_trend_per_event(event_id: int):
    """Tren penjualan tiket untuk satu event.

    Query params:
      days  : default 90, max 365
    """
    days  = min(int(request.args.get("days", 90)), 365)
    rows  = mis_service.get_ticket_sales_trend(event_id=event_id, days=days)

    # Sertakan juga info performa event
    perf  = mis_service.get_event_performance_detail(event_id)
    event_info = None
    if perf:
        event_info = {
            "event_id":         perf.event_id,
            "event_name":       perf.event_name,
            "ticket_quota":     perf.ticket_quota,
            "tickets_sold":     perf.tickets_sold,
            "occupancy_rate":   perf.occupancy_rate,
            "performance_status": perf.performance_status,
        }

    return jsonify({
        "event":  event_info,
        "data":   [_ticket_sale_to_dict(r) for r in rows],
        "days":   days,
        "total":  len(rows),
    })


@mis_tickets_bp.get("/velocity")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE)
def ticket_velocity():
    """Event dengan kecepatan penjualan tiket tertinggi.

    Velocity = rata-rata tiket terjual per hari sejak pertama kali ada penjualan.

    Query params:
      top   : jumlah event (default: 10, max: 50)
    """
    from sqlalchemy import func
    from ..extensions import db

    top = min(int(request.args.get("top", 10)), 50)

    # Hitung: total tiket / jumlah hari aktif penjualan
    results = (
        db.session.query(
            MisTicketSalesSummary.event_id,
            func.sum(MisTicketSalesSummary.tickets_sold).label("total_sold"),
            func.count(MisTicketSalesSummary.sale_date).label("active_days"),
        )
        .group_by(MisTicketSalesSummary.event_id)
        .all()
    )

    # Gabungkan dengan info event
    perf_map = {
        p.event_id: p
        for p in MisEventPerformance.query.all()
    }

    velocity_list = []
    for r in results:
        active_days = r.active_days or 1
        velocity = round(r.total_sold / active_days, 2)
        perf = perf_map.get(r.event_id)
        velocity_list.append({
            "event_id":     r.event_id,
            "event_name":   perf.event_name if perf else f"Event #{r.event_id}",
            "event_date":   perf.event_date.isoformat() if perf and perf.event_date else None,
            "total_sold":   r.total_sold,
            "active_days":  r.active_days,
            "velocity_per_day": velocity,
            "occupancy_rate": perf.occupancy_rate if perf else 0,
        })

    # Sort by velocity desc
    velocity_list.sort(key=lambda x: x["velocity_per_day"], reverse=True)

    return jsonify({
        "data":  velocity_list[:top],
        "total": len(velocity_list),
    })


@mis_tickets_bp.get("/fast-selling")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE)
def fast_selling_events():
    """Event yang mendekati sold-out (occupancy >= 70%).

    Berguna untuk management: event mana yang perlu diperhatikan
    (mis. perlu tambah kuota atau segera promosi).

    Query params:
      threshold  : persen minimum occupancy (default: 70, max: 100)
      limit      : jumlah event (default: 10, max: 50)
    """
    threshold = min(float(request.args.get("threshold", 70)), 100)
    limit     = min(int(request.args.get("limit", 10)), 50)

    rows = (
        MisEventPerformance.query
        .filter(MisEventPerformance.occupancy_rate >= threshold)
        .order_by(MisEventPerformance.occupancy_rate.desc())
        .limit(limit)
        .all()
    )

    return jsonify({
        "data": [
            {
                "event_id":          r.event_id,
                "event_name":        r.event_name,
                "event_date":        r.event_date.isoformat() if r.event_date else None,
                "ticket_quota":      r.ticket_quota,
                "tickets_sold":      r.tickets_sold,
                "tickets_remaining": max(0, r.ticket_quota - r.tickets_sold),
                "occupancy_rate":    r.occupancy_rate,
                "performance_status": r.performance_status,
            }
            for r in rows
        ],
        "threshold": threshold,
        "total":     len(rows),
    })

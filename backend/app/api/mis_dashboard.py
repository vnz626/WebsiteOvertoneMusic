"""
MIS API – Executive Dashboard Module.

Endpoint:
  GET  /api/mis/dashboard/summary          – KPI cards (latest snapshot)
  GET  /api/mis/dashboard/summary/history  – riwayat snapshot harian
  POST /api/mis/sync                       – trigger full sync manual (admin only)
"""

from datetime import date

from flask import Blueprint, jsonify, request

from ..models.mis_models import MisDashboardSummary
from ..security import ROLE_FINANCE, ROLE_MANAGER, ROLE_SUPER_ADMIN, roles_required
from .. import mis_service

mis_dashboard_bp = Blueprint("mis_dashboard", __name__)


def _summary_to_dict(row: MisDashboardSummary) -> dict:
    gross = row.total_gross_revenue
    platform_rev = int(round(gross * 0.05))
    promoter_rev = int(round(gross * 0.95))
    return {
        "id":           row.id,
        "period_type":  row.period_type,
        "period_label": row.period_label,
        "period_start": row.period_start.isoformat() if row.period_start else None,
        "period_end":   row.period_end.isoformat()   if row.period_end   else None,
        "updated_at":   row.updated_at.isoformat()   if row.updated_at   else None,
        # Event KPIs
        "total_events":     row.total_events,
        "active_events":    row.active_events,
        "completed_events": row.completed_events,
        # Ticket KPIs
        "total_tickets_available": row.total_tickets_available,
        "total_tickets_sold":      row.total_tickets_sold,
        "total_tickets_remaining": row.total_tickets_remaining,
        "occupancy_rate": round(
            row.total_tickets_sold / row.total_tickets_available * 100, 2
        ) if row.total_tickets_available > 0 else 0,
        # Revenue KPIs (Platform Revenue = 5%, Promoter Share = 95%)
        "total_transactions_success": row.total_transactions_success,
        "total_gross_revenue":        gross,
        "total_platform_revenue":     platform_rev, # 5% bersih untuk Admin
        "total_promoter_revenue":     promoter_rev, # 95% untuk Promotor
        "total_refund":               row.total_refund,
        "total_net_revenue":          platform_rev - row.total_refund,
        # Customer KPIs
        "total_customers": row.total_customers,
    }


@mis_dashboard_bp.get("/summary")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE)
def get_summary():
    """Ambil snapshot KPI terbaru untuk Executive Dashboard."""
    period_type = request.args.get("period_type", "daily")
    row = mis_service.get_dashboard_summary(period_type=period_type)
    if not row:
        # Kalau belum ada data, jalankan sync otomatis
        row = mis_service.sync_dashboard_summary()
    return jsonify({"data": _summary_to_dict(row)})


@mis_dashboard_bp.get("/summary/history")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE)
def get_summary_history():
    """Riwayat snapshot dashboard (untuk grafik tren KPI)."""
    period_type = request.args.get("period_type", "daily")
    limit = min(int(request.args.get("limit", 30)), 90)

    rows = (
        MisDashboardSummary.query
        .filter_by(period_type=period_type)
        .order_by(MisDashboardSummary.period_start.desc())
        .limit(limit)
        .all()
    )
    return jsonify({
        "data":  [_summary_to_dict(r) for r in rows],
        "total": len(rows),
    })


@mis_dashboard_bp.post("/sync")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER)
def trigger_sync():
    """Trigger full MIS sync secara manual (admin only).

    Body JSON opsional:
      { "days_back": 90 }   – jumlah hari ke belakang yang di-sync
    """
    body      = request.get_json(silent=True) or {}
    days_back = int(body.get("days_back", 90))
    result    = mis_service.run_full_sync(days_back=days_back)
    return jsonify({"message": "Sinkronisasi MIS selesai", "data": result})

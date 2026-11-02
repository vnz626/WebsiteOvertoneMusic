"""
API Notification Center & Outbox Tracking (Fitur 1.2 & 1.3).
Menyediakan endpoint pembacaan notifikasi in-dashboard, unread-count, marking read,
serta endpoint proses antrean outbox.
"""
from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import or_

from ..extensions import db
from ..models.models import OASNotification, OASNotificationOutbox, OASStaff
from ..security import current_user
from ..notifications import (
    notify,
    notify_po_pending_approval,
    notify_low_stock,
    notify_live_chat_queue,
    notify_refund_submitted
)
from ..services.outbox_service import process_outbox

notifications_bp = Blueprint("notifications", __name__)


def _user_notification_query(user):
    """Query notifikasi yang relevan untuk user (berdasarkan ID atau role broadcast)."""
    if not user:
        return None

    # Jika user adalah staf
    if isinstance(user, OASStaff) or getattr(user, "role", "user") != "user":
        user_role = getattr(user, "role", None)
        return OASNotification.query.filter(
            or_(
                OASNotification.recipient_id == user.id,
                OASNotification.recipient_role == user_role
            )
        )
    # Jika customer / user biasa
    return OASNotification.query.filter_by(recipient_id=user.id)


@notifications_bp.get("")
@notifications_bp.get("/")
@jwt_required()
def list_notifications():
    """Mengambil daftar notifikasi terbaru user/staf yang sedang login."""
    user = current_user()
    if not user:
        return jsonify({"message": "Akun tidak ditemukan"}), 404

    query = _user_notification_query(user)
    if query is None:
        return jsonify({"data": [], "unread": 0})

    # Filter optional
    unread_only = request.args.get("unread_only", "").lower() in ("true", "1")
    notif_type = request.args.get("type")
    limit = min(int(request.args.get("limit", 30)), 100)

    if unread_only:
        query = query.filter(OASNotification.is_read.is_(False))
    if notif_type:
        query = query.filter(or_(OASNotification.type == notif_type, OASNotification.category == notif_type))

    total_unread = _user_notification_query(user).filter(OASNotification.is_read.is_(False)).count()
    items = query.order_by(OASNotification.created_at.desc()).limit(limit).all()

    return jsonify({
        "data": [n.to_dict() for n in items],
        "unread": total_unread,
        "total": len(items)
    })


@notifications_bp.get("/unread-count")
@jwt_required()
def unread_count():
    """Mengambil jumlah notifikasi belum dibaca untuk polling lencana lonceng."""
    user = current_user()
    if not user:
        return jsonify({"unread": 0})

    query = _user_notification_query(user)
    if query is None:
        return jsonify({"unread": 0})

    count = query.filter(OASNotification.is_read.is_(False)).count()
    return jsonify({"unread": count})


@notifications_bp.post("/<int:notif_id>/read")
@jwt_required()
def mark_read(notif_id):
    """Menandai satu notifikasi sebagai telah dibaca."""
    user = current_user()
    if not user:
        return jsonify({"message": "Akun tidak ditemukan"}), 404

    query = _user_notification_query(user)
    notif = query.filter(OASNotification.id == notif_id).first()
    if not notif:
        return jsonify({"message": "Notifikasi tidak ditemukan"}), 404

    notif.is_read = True
    notif.read_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        "message": "Notifikasi ditandai sudah dibaca",
        "notification": notif.to_dict()
    })


@notifications_bp.post("/read-all")
@jwt_required()
def mark_all_read():
    """Menandai semua notifikasi milik user aktif sebagai telah dibaca."""
    user = current_user()
    if not user:
        return jsonify({"message": "Akun tidak ditemukan"}), 404

    query = _user_notification_query(user)
    if query is None:
        return jsonify({"message": "Tidak ada notifikasi"}), 200

    unread_items = query.filter(OASNotification.is_read.is_(False)).all()
    now = datetime.utcnow()
    for item in unread_items:
        item.is_read = True
        item.read_at = now

    db.session.commit()
    return jsonify({
        "message": f"Berhasil menandai {len(unread_items)} notifikasi sudah dibaca",
        "updated_count": len(unread_items)
    })


# ============================================================================
# OUTBOX INSPECTION & MANUAL TRIGGER (Fitur 1.3)
# ============================================================================

@notifications_bp.get("/outbox")
@jwt_required()
def list_outbox():
    """Melihat antrean pengiriman email & WhatsApp outbox (khusus internal staff)."""
    user = current_user()
    if not user or getattr(user, "role", "user") == "user":
        return jsonify({"message": "Akses ditolak"}), 403

    status = request.args.get("status")
    channel = request.args.get("channel")
    query = OASNotificationOutbox.query

    if status:
        query = query.filter_by(status=status)
    if channel:
        query = query.filter_by(channel=channel)

    items = query.order_by(OASNotificationOutbox.created_at.desc()).limit(50).all()
    return jsonify({
        "data": [item.to_dict() for item in items],
        "total": len(items)
    })


@notifications_bp.post("/outbox/process")
@jwt_required()
def trigger_process_outbox():
    """Manual trigger untuk memproses antrean outbox (mis. oleh cron / admin)."""
    user = current_user()
    if not user or getattr(user, "role", "user") == "user":
        return jsonify({"message": "Akses ditolak"}), 403

    limit = min(int(request.args.get("limit", 25)), 100)
    result = process_outbox(limit=limit)
    return jsonify({
        "message": "Outbox berhasil diproses",
        "result": result
    })


@notifications_bp.post("/test-trigger")
@jwt_required()
def test_trigger():
    """Endpoint pengujian untuk memicu notifikasi sesuai skenario."""
    user = current_user()
    if not user or getattr(user, "role", "user") == "user":
        return jsonify({"message": "Akses ditolak"}), 403

    data = request.get_json() or {}
    event_type = data.get("event_type", "stock_alert")

    if event_type == "stock_alert":
        result = notify_low_stock(
            variant_id=data.get("variant_id", 1),
            sku=data.get("sku", "SONY-FX3-BODY"),
            product_name=data.get("product_name", "Sony FX3 Cinema Line Camera"),
            current_stock=data.get("current_stock", 2),
            threshold=5
        )
    elif event_type == "po_approval":
        result = notify_po_pending_approval(
            po_id=data.get("po_id", 999),
            po_number=data.get("po_number", "PO-2026-TEST"),
            total_amount=data.get("total_amount", 18500000)
        )
    elif event_type == "support_ticket":
        result = notify_live_chat_queue(
            ticket_id=data.get("ticket_id", 101),
            ticket_number=data.get("ticket_number", "TCK-8821"),
            customer_name=data.get("customer_name", "Budi Filmmaker")
        )
    elif event_type == "refund":
        result = notify_refund_submitted(
            order_id=data.get("order_id", 55),
            invoice_code=data.get("invoice_code", "INV-2026-TEST"),
            total_amount=data.get("total_amount", 4200000)
        )
    else:
        result = notify(
            recipient=user,
            type="system",
            title=data.get("title", "Tes Notifikasi"),
            body=data.get("body", "Pesan pengujian sistem notifikasi terpadu."),
            link=data.get("link", "/notifications")
        )

    return jsonify({
        "message": f"Event '{event_type}' berhasil dipicu",
        "result": "success"
    })

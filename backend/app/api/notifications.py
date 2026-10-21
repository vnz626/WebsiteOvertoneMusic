"""Kotak masuk & lonceng notifikasi di dalam dashboard (semua role)."""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models.models import Notification
from ..security import current_actor

notifications_bp = Blueprint("notifications", __name__)


def _base_query():
    kind, actor = current_actor()
    if actor is None:
        return None
    return Notification.query.filter_by(recipient_kind=kind, recipient_id=actor.id)


@notifications_bp.get("")
@notifications_bp.get("/")
@jwt_required()
def list_notifications():
    query = _base_query()
    if query is None:
        return jsonify({"message": "Akun tidak ditemukan"}), 404
    items = query.order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify(
        {
            "data": [
                {
                    "id": n.id,
                    "category": n.category,
                    "title": n.title,
                    "body": n.body,
                    "link": n.link,
                    "is_read": n.is_read,
                    "created_at": n.created_at.isoformat() if n.created_at else None,
                }
                for n in items
            ],
            "unread": query.filter_by(is_read=False).count(),
        }
    )


@notifications_bp.get("/unread-count")
@jwt_required()
def unread_count():
    query = _base_query()
    if query is None:
        return jsonify({"unread": 0})
    return jsonify({"unread": query.filter_by(is_read=False).count()})


@notifications_bp.post("/<int:notif_id>/read")
@jwt_required()
def mark_read(notif_id):
    query = _base_query()
    if query is None:
        return jsonify({"message": "Akun tidak ditemukan"}), 404
    n = query.filter_by(id=notif_id).first()
    if not n:
        return jsonify({"message": "Notifikasi tidak ditemukan"}), 404
    n.is_read = True
    db.session.commit()
    return jsonify({"message": "Ditandai sudah dibaca"})


@notifications_bp.post("/read-all")
@jwt_required()
def mark_all_read():
    query = _base_query()
    if query is None:
        return jsonify({"message": "Akun tidak ditemukan"}), 404
    query.filter_by(is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "Semua ditandai sudah dibaca"})

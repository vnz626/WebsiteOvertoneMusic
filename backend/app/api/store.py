"""
API Store Staff & Showroom untuk `store_staff` dan `super_admin`:
1. Pengelolaan katalog instrumen & varian SKU (tps_products & tps_product_variants).
2. Pelayanan serah-terima pesanan "Click & Collect" (ambil langsung di showroom).
3. Penanganan tiket bantuan pelanggan (oas_support_tickets).
"""
from datetime import datetime
from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models.models import TPSProduct, TPSProductVariant, TPSOrder, OASSupportTicket, OASSupportMessage, TPSInventoryLog
from ..security import (
    ROLE_STORE_STAFF,
    ROLE_SUPER_ADMIN,
    current_user,
    roles_required,
)
from ..serializers import product_to_dict, order_to_dict

store_bp = Blueprint("store", __name__)


# ===========================================================================
# 1. Click & Collect (Ambil di Showroom)
# ===========================================================================

@store_bp.get("/pickups")
@roles_required(ROLE_STORE_STAFF, ROLE_SUPER_ADMIN)
def get_pickup_orders():
    """Daftar pesanan Click & Collect yang siap diambil / sudah diambil di showroom."""
    branch_id = request.args.get("branch_id") or request.args.get("venue_id")
    status = request.args.get("status")

    query = TPSOrder.query.filter_by(fulfillment_method="click_and_collect")
    if branch_id:
        query = query.filter_by(pickup_branch_id=int(branch_id))
    if status:
        query = query.filter_by(order_status=status)

    orders = query.order_by(TPSOrder.created_at.desc()).all()
    return jsonify({
        "data": [order_to_dict(o) for o in orders],
        "total": len(orders),
    })


@store_bp.post("/pickups/verify")
@roles_required(ROLE_STORE_STAFF, ROLE_SUPER_ADMIN)
def verify_pickup_code():
    """Verifikasi kode unik pengambilan (pickup_code / invoice_code) saat pelanggan datang ke showroom."""
    data = request.get_json(silent=True) or {}
    code = (data.get("code") or data.get("pickup_code") or data.get("ticket_code") or data.get("invoice_code") or "").strip()

    if not code:
        return jsonify({"message": "Kode pengambilan wajib dimasukkan"}), 400

    order = TPSOrder.query.filter(
        (TPSOrder.pickup_code == code) | (TPSOrder.invoice_code == code)
    ).first()

    if not order:
        return jsonify({"message": "Pesanan tidak ditemukan dengan kode tersebut", "valid": False}), 404

    if order.fulfillment_method != "click_and_collect":
        return jsonify({
            "message": "Pesanan ini menggunakan metode pengiriman ekspedisi (Delivery), bukan Click & Collect.",
            "data": order_to_dict(order),
            "valid": False,
        }), 400

    if order.pickup_status == "collected" or order.order_status == "completed":
        return jsonify({
            "message": "BARANG SUDAH DISERAHKAN SEBELUMNYA! Pesanan ini sudah selesai.",
            "data": order_to_dict(order),
            "valid": False,
        }), 400

    if order.payment_status != "paid":
        return jsonify({
            "message": f"Pesanan belum lunas (status: {order.payment_status}).",
            "data": order_to_dict(order),
            "valid": False,
        }), 400

    return jsonify({
        "message": "Kode valid! Instrumen musik siap diserah-terimakan ke pelanggan.",
        "valid": True,
        "data": order_to_dict(order),
    })


@store_bp.post("/pickups/<int:order_id>/handover")
@roles_required(ROLE_STORE_STAFF, ROLE_SUPER_ADMIN)
def handover_pickup(order_id):
    """Staff showroom melakukan serah-terima fisik instrumen musik ke pembeli."""
    order = TPSOrder.query.get(order_id)
    if not order:
        return jsonify({"message": "Pesanan tidak ditemukan"}), 404

    if order.pickup_status == "collected" or order.order_status == "completed":
        return jsonify({"message": "Pesanan ini sudah selesai diserah-terimakan"}), 400

    user = current_user()
    order.pickup_status = "collected"
    order.order_status = "completed"
    order.handled_by_staff_id = user.id

    db.session.commit()

    return jsonify({
        "message": f"Serah-terima pesanan {order.invoice_code} berhasil diselesaikan!",
        "data": order_to_dict(order),
    })


# ===========================================================================
# 2. Customer Support Ticket Helpdesk
# ===========================================================================

@store_bp.get("/tickets")
@roles_required(ROLE_STORE_STAFF, ROLE_SUPER_ADMIN, "manager", "admin")
def get_support_tickets():
    """Daftar tiket pertanyaan / kendala dari pelanggan."""
    status = request.args.get("status")
    query = OASSupportTicket.query
    if status:
        query = query.filter_by(status=status)

    tickets = query.order_by(OASSupportTicket.updated_at.desc(), OASSupportTicket.created_at.desc()).all()
    res = []
    for t in tickets:
        all_msgs = t.messages.order_by(OASSupportMessage.created_at.asc()).all()
        first_msg = all_msgs[0].message if all_msgs else ""
        last_msg = all_msgs[-1].message if all_msgs else ""
        last_sender = all_msgs[-1].sender_type if all_msgs else ""

        res.append({
            "id": t.id,
            "ticket_number": t.ticket_number,
            "subject": t.subject,
            "description": first_msg or t.subject,
            "category": t.category,
            "priority": t.priority,
            "status": t.status,
            "customer_name": t.customer.name if t.customer else "Pelanggan Overtone",
            "customer_email": t.customer.email if t.customer else "",
            "messages_count": len(all_msgs),
            "latest_message": last_msg,
            "latest_sender_type": last_sender,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        })
    return jsonify({"data": res, "total": len(res)})


@store_bp.get("/tickets/<int:ticket_id>/messages")
@roles_required(ROLE_STORE_STAFF, ROLE_SUPER_ADMIN, "manager", "admin")
def get_ticket_messages(ticket_id):
    """Mengambil seluruh riwayat pesan percakapan dalam satu tiket."""
    ticket = OASSupportTicket.query.get(ticket_id)
    if not ticket:
        return jsonify({"message": "Tiket tidak ditemukan"}), 404

    messages = (
        OASSupportMessage.query.filter_by(ticket_id=ticket.id)
        .order_by(OASSupportMessage.created_at.asc())
        .all()
    )

    return jsonify({
        "data": [
            {
                "id": m.id,
                "ticket_id": m.ticket_id,
                "sender_type": m.sender_type,
                "sender_name": m.sender_name,
                "message": m.message,
                "attachment_url": m.attachment_url,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ]
    })


@store_bp.post("/tickets/<int:ticket_id>/reply")
@roles_required(ROLE_STORE_STAFF, ROLE_SUPER_ADMIN, "manager", "admin")
def reply_support_ticket(ticket_id):
    """Staff toko membalas pesan tiket bantuan pelanggan."""
    ticket = OASSupportTicket.query.get(ticket_id)
    if not ticket:
        return jsonify({"message": "Tiket tidak ditemukan"}), 404

    data = request.get_json(silent=True) or {}
    message_text = (data.get("message") or "").strip()
    raw_status = (data.get("status") or "in_progress").lower()
    attachment_url = data.get("attachment_url")

    # Mapping status yang valid dengan DB enum ('open', 'in_progress', 'resolved', 'closed')
    status_map = {
        "answered": "in_progress",
        "in_progress": "in_progress",
        "open": "open",
        "resolved": "resolved",
        "closed": "closed",
    }
    new_status = status_map.get(raw_status, "in_progress")

    if not message_text and not attachment_url:
        return jsonify({"message": "Pesan balasan tidak boleh kosong"}), 400

    user = current_user()
    sender_name = getattr(user, "name", None) or getattr(user, "username", "Store Specialist")
    msg = OASSupportMessage(
        ticket_id=ticket.id,
        sender_type="staff",
        sender_id=user.id if user else 1,
        sender_name=f"{sender_name} (Store Specialist)",
        message=message_text,
        attachment_url=attachment_url,
    )
    ticket.status = new_status
    ticket.updated_at = datetime.utcnow()
    if user:
        ticket.assigned_staff_id = user.id

    db.session.add(msg)
    db.session.commit()

    return jsonify({
        "message": "Balasan berhasil dikirim ke pelanggan",
        "ticket_status": ticket.status,
        "data": {
            "id": msg.id,
            "ticket_id": msg.ticket_id,
            "sender_type": msg.sender_type,
            "sender_name": msg.sender_name,
            "message": msg.message,
            "attachment_url": msg.attachment_url,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        },
    })

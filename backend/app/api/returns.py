"""
API Retur & Klaim Garansi Pelanggan (Fitur 1.5).
Mendukung alur pengajuan oleh pembeli, review oleh Store Staff, penerimaan fisik di Gudang,
dan penyelesaian refund/pengembalian dana oleh Finance.
"""
from datetime import datetime, timedelta
import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models.models import (
    TPSReturnRequest,
    TPSReturnRequestPhoto,
    TPSOrder,
    TPSCustomer,
    OASStaff,
    OASSystemSetting,
    TPSInventoryLog,
)
from ..security import (
    ROLE_STORE_STAFF,
    ROLE_WAREHOUSE_STAFF,
    ROLE_FINANCE,
    ROLE_MANAGER,
    ROLE_SUPER_ADMIN,
    current_user,
    roles_required,
)
from ..audit import log_action
from ..notifications import notify, notify_role
from ..services.outbox_service import trigger_order_notifications

returns_bp = Blueprint("returns", __name__)


def _generate_return_number():
    date_str = datetime.utcnow().strftime("%Y%m")
    unique_suffix = uuid.uuid4().hex[:5].upper()
    return f"RMA-SWL-{date_str}-{unique_suffix}"


def _get_return_window_days():
    setting = OASSystemSetting.query.filter_by(setting_key="return_window_days").first()
    if setting and setting.setting_value:
        try:
            return int(setting.setting_value)
        except ValueError:
            pass
    return 7


# ============================================================================
# 1. CUSTOMER ENDPOINTS (Pengajuan & Riwayat)
# ============================================================================

@returns_bp.post("")
@returns_bp.post("/")
@jwt_required()
def create_return_request():
    """Customer mengajukan klaim retur / garansi untuk pesanan yang sudah diterima."""
    user = current_user()
    if not user:
        return jsonify({"message": "Pengguna tidak ditemukan"}), 404

    data = request.get_json(silent=True) or {}
    order_id = data.get("order_id")
    invoice_code = data.get("invoice_code")

    query = TPSOrder.query
    if order_id:
        query = query.filter_by(id=int(order_id))
    elif invoice_code:
        query = query.filter_by(invoice_code=invoice_code.strip())
    else:
        return jsonify({"message": "Order ID atau nomor invoice wajib diisi"}), 400

    order = query.first()
    if not order:
        return jsonify({"message": "Pesanan tidak ditemukan"}), 404

    # Validasi kepemilikan order
    if isinstance(user, TPSCustomer) and order.customer_id != user.id and order.buyer_email != user.email:
        return jsonify({"message": "Akses ditolak. Pesanan bukan milik akun Anda."}), 403

    # Validasi status: hanya pesanan yang sudah diterima / selesai yang boleh diretur
    allowed_statuses = ("delivered", "completed")
    is_collected = order.fulfillment_method == "click_and_collect" and order.pickup_status == "collected"
    if order.order_status not in allowed_statuses and not is_collected:
        return jsonify({
            "message": f"Retur hanya dapat diajukan untuk pesanan yang telah diterima / diambil (status saat ini: {order.order_status})."
        }), 400

    # Validasi jendela retur (return_window_days)
    window_days = _get_return_window_days()
    reference_date = order.paid_at or order.created_at or datetime.utcnow()
    max_return_date = reference_date + timedelta(days=window_days)
    if datetime.utcnow() > max_return_date:
        return jsonify({
            "message": f"Batas waktu pengajuan retur telah kedaluwarsa ({window_days} hari sejak barang diproses)."
        }), 400

    # Cek apakah sudah pernah mengajukan retur aktif untuk order ini
    existing = TPSReturnRequest.query.filter_by(order_id=order.id).filter(
        TPSReturnRequest.status.in_(["requested", "approved", "received", "refunded"])
    ).first()
    if existing:
        return jsonify({
            "message": f"Pesanan ini sudah memiliki pengajuan retur aktif ({existing.return_number} - status: {existing.status})."
        }), 400

    reason_code = (data.get("reason_code") or "defective_hardware").strip()
    description = (data.get("description") or "").strip()
    resolution = (data.get("resolution") or "refund").strip()
    photos = data.get("photos") or []

    if not description:
        return jsonify({"message": "Deskripsi kendala / alasan retur wajib diisi"}), 400

    return_req = TPSReturnRequest(
        return_number=_generate_return_number(),
        order_id=order.id,
        customer_id=user.id if isinstance(user, TPSCustomer) else None,
        reason_code=reason_code,
        description=description,
        resolution=resolution,
        status="requested",
        refund_amount=order.total_price,
        created_at=datetime.utcnow()
    )
    db.session.add(return_req)
    db.session.flush()

    # Simpan foto bukti
    for photo_url in photos[:5]:  # maksimal 5 foto
        if photo_url and isinstance(photo_url, str):
            p = TPSReturnRequestPhoto(
                return_request_id=return_req.id,
                photo_url=photo_url.strip(),
                created_at=datetime.utcnow()
            )
            db.session.add(p)

    db.session.commit()

    # Log audit
    log_action(
        action="SUBMIT_RETURN_REQUEST",
        entity_type="return_request",
        entity_id=str(return_req.id),
        after={"return_number": return_req.return_number, "order_id": order.id, "reason": reason_code}
    )

    # Trigger Notifikasi ke Store Staff & Finance
    notify_role(
        role="store_staff",
        type="refund",
        title=f"Klaim Retur Baru: {return_req.return_number}",
        body=f"Pelanggan mengajukan retur untuk invoice {order.invoice_code} ({reason_code}). Memerlukan review.",
        link="/store/returns",
        dedupe_key=f"ret-{return_req.id}-store"
    )
    notify_role(
        role="finance",
        type="refund",
        title=f"Notifikasi Pengajuan Retur: {order.invoice_code}",
        body=f"Pengajuan retur {return_req.return_number} senilai {order.total_price} masuk antrean review.",
        link="/finance/refunds",
        dedupe_key=f"ret-{return_req.id}-fin"
    )

    # Notifikasi konfirmasi ke customer
    notify(
        recipient=user,
        type="refund",
        title=f"Klaim Retur Diterima: {return_req.return_number}",
        body="Pengajuan retur Anda sedang ditinjau oleh tim spesialis Overtone dalam 1x24 jam.",
        link="/returns",
        dedupe_key=f"ret-{return_req.id}-cust"
    )

    return jsonify({
        "message": f"Pengajuan retur {return_req.return_number} berhasil dikirim!",
        "data": return_req.to_dict()
    }), 201


@returns_bp.get("/my")
@jwt_required()
def my_returns():
    """Daftar riwayat klaim retur milik customer yang sedang login."""
    user = current_user()
    if not user:
        return jsonify({"message": "Pengguna tidak ditemukan"}), 404

    query = TPSReturnRequest.query
    if isinstance(user, TPSCustomer):
        query = query.filter_by(customer_id=user.id)
    else:
        query = query.join(TPSOrder).filter(TPSOrder.buyer_email == user.email)

    items = query.order_by(TPSReturnRequest.created_at.desc()).all()
    return jsonify({
        "data": [item.to_dict() for item in items],
        "total": len(items)
    })


@returns_bp.get("/<int:return_id>")
@jwt_required()
def get_return_detail(return_id):
    """Detail satu pengajuan retur."""
    item = TPSReturnRequest.query.get(return_id)
    if not item:
        return jsonify({"message": "Pengajuan retur tidak ditemukan"}), 404

    user = current_user()
    is_staff = isinstance(user, OASStaff) or getattr(user, "role", "user") != "user"
    if not is_staff and item.customer_id != user.id and (item.order and item.order.buyer_email != user.email):
        return jsonify({"message": "Akses ditolak"}), 403

    return jsonify({"data": item.to_dict()})


# ============================================================================
# 2. STORE STAFF ENDPOINTS (Review & Persetujuan)
# ============================================================================

@returns_bp.get("/store/queue")
@roles_required(ROLE_STORE_STAFF, ROLE_SUPER_ADMIN, ROLE_MANAGER)
def store_return_queue():
    """Daftar antrean retur yang perlu direview oleh Store Staff."""
    status = request.args.get("status")
    query = TPSReturnRequest.query

    if status:
        query = query.filter_by(status=status)
    else:
        # Default: yang perlu tindakan
        query = query.filter(TPSReturnRequest.status.in_(["requested", "approved", "received"]))

    items = query.order_by(TPSReturnRequest.created_at.desc()).all()
    return jsonify({
        "data": [item.to_dict() for item in items],
        "total": len(items)
    })


@returns_bp.post("/<int:return_id>/review")
@roles_required(ROLE_STORE_STAFF, ROLE_SUPER_ADMIN, ROLE_MANAGER)
def review_return(return_id):
    """Store staff menyetujui (approve) atau menolak (reject) pengajuan retur."""
    return_req = TPSReturnRequest.query.get(return_id)
    if not return_req:
        return jsonify({"message": "Pengajuan retur tidak ditemukan"}), 404

    if return_req.status != "requested":
        return jsonify({"message": f"Retur sudah diproses sebelumnya (status: {return_req.status})"}), 400

    data = request.get_json(silent=True) or {}
    action = (data.get("action") or "approve").strip().lower()
    review_note = (data.get("review_note") or "").strip()

    user = current_user()
    old_status = return_req.status

    if action == "approve":
        return_req.status = "approved"
        return_req.reviewed_by = user.id
        return_req.reviewed_at = datetime.utcnow()
        return_req.review_note = review_note or "Pengajuan disetujui. Silakan kirimkan unit fisik instrumen ke gudang pusat."

        # Notifikasi ke customer
        if return_req.customer:
            notify(
                recipient=return_req.customer,
                type="refund",
                title=f"Retur Disetujui: {return_req.return_number}",
                body="Pengajuan retur Anda disetujui. Mohon kirimkan instrumen dengan proteksi aman ke alamat gudang pusat Overtone.",
                link=f"/returns",
                dedupe_key=f"ret-{return_req.id}-app"
            )

        # Notifikasi ke tim gudang untuk siap menerima barang
        notify_role(
            role="warehouse_staff",
            type="refund",
            title=f"Retur Disetujui Siap Masuk: {return_req.return_number}",
            body=f"Unit dari invoice {return_req.order.invoice_code} telah disetujui toko dan akan dikirim ke gudang.",
            link="/warehouse/returns",
            dedupe_key=f"ret-{return_req.id}-wh"
        )
        msg = f"Retur {return_req.return_number} berhasil disetujui"
    else:
        return_req.status = "rejected"
        return_req.reviewed_by = user.id
        return_req.reviewed_at = datetime.utcnow()
        return_req.review_note = review_note or "Pengajuan retur tidak memenuhi syarat garansi."

        # Notifikasi ke customer
        if return_req.customer:
            notify(
                recipient=return_req.customer,
                type="refund",
                title=f"Retur Ditolak: {return_req.return_number}",
                body=f"Mohon maaf, pengajuan retur Anda ditolak. Alasan: {return_req.review_note}",
                link="/returns",
                dedupe_key=f"ret-{return_req.id}-rej"
            )
        msg = f"Retur {return_req.return_number} telah ditolak"

    db.session.commit()

    log_action(
        action=f"REVIEW_RETURN_{action.upper()}",
        entity_type="return_request",
        entity_id=str(return_req.id),
        before={"status": old_status},
        after={"status": return_req.status, "note": return_req.review_note, "reviewer": user.name}
    )

    return jsonify({
        "message": msg,
        "data": return_req.to_dict()
    })


# ============================================================================
# 3. WAREHOUSE ENDPOINTS (Penerimaan Fisik & Mutasi Stok)
# ============================================================================

@returns_bp.get("/warehouse/queue")
@roles_required(ROLE_WAREHOUSE_STAFF, ROLE_SUPER_ADMIN, ROLE_MANAGER)
def warehouse_return_queue():
    """Daftar retur yang menunggu penerimaan fisik di gudang."""
    query = TPSReturnRequest.query.filter(TPSReturnRequest.status.in_(["approved", "received"]))
    items = query.order_by(TPSReturnRequest.updated_at.desc()).all()
    return jsonify({
        "data": [item.to_dict() for item in items],
        "total": len(items)
    })


@returns_bp.post("/<int:return_id>/receive")
@roles_required(ROLE_WAREHOUSE_STAFF, ROLE_SUPER_ADMIN)
def receive_return(return_id):
    """Warehouse staff menerima fisik barang retur, cek serial number, dan pulihkan stok."""
    return_req = TPSReturnRequest.query.get(return_id)
    if not return_req:
        return jsonify({"message": "Pengajuan retur tidak ditemukan"}), 404

    if return_req.status != "approved":
        return jsonify({"message": f"Barang retur tidak dapat diterima karena statusnya '{return_req.status}' (wajib approved)"}), 400

    data = request.get_json(silent=True) or {}
    received_note = (data.get("received_note") or "Unit fisik diterima lengkap dan lolos inspeksi QC sensor cleanroom gudang.").strip()
    serial_number = data.get("serial_number")

    user = current_user()
    old_status = return_req.status
    return_req.status = "received"
    return_req.received_by = user.id
    return_req.received_at = datetime.utcnow()
    return_req.received_note = received_note

    order = return_req.order
    # Kembalikan stok unit ke inventaris kartu stok jika ada varian
    if order and order.variant:
        variant = order.variant
        stock_before = variant.stock
        variant.stock += order.quantity
        stock_after = variant.stock

        inv_log = TPSInventoryLog(
            variant_id=variant.id,
            branch_id=order.pickup_branch_id or (order.product.branch_id if order.product else None),
            change_type="return_restock",
            quantity_change=order.quantity,
            stock_before=stock_before,
            stock_after=stock_after,
            serial_number=serial_number,
            reference_id=return_req.return_number,
            notes=f"Retur fisik diterima ({return_req.return_number}). Catatan: {received_note}",
            logged_by=user.id
        )
        db.session.add(inv_log)

    db.session.commit()

    log_action(
        action="RECEIVE_RETURN_GOODS",
        entity_type="return_request",
        entity_id=str(return_req.id),
        before={"status": old_status},
        after={"status": "received", "receiver": user.name, "notes": received_note}
    )

    # Notifikasi ke Finance bahwa barang sudah fisik masuk dan siap diproses refund
    formatted_amount = f"Rp {int(order.total_price):,}".replace(",", ".")
    notify_role(
        role="finance",
        type="refund",
        title=f"Barang Retur Diterima: {return_req.return_number}",
        body=f"Fisik instrumen untuk {order.invoice_code} senilai {formatted_amount} telah diterima di gudang. Siap dicairkan refund.",
        link="/finance/refunds",
        dedupe_key=f"ret-{return_req.id}-fin-ready"
    )

    # Notifikasi ke customer
    if return_req.customer:
        notify(
            recipient=return_req.customer,
            type="refund",
            title=f"Unit Retur Telah Diterima: {return_req.return_number}",
            body="Unit instrumen telah sampai di gudang kami dan lolos verifikasi. Proses pengembalian dana sedang diteruskan ke Finance.",
            link="/returns",
            dedupe_key=f"ret-{return_req.id}-cust-rec"
        )

    return jsonify({
        "message": f"Barang retur {return_req.return_number} berhasil diterima dan stok unit telah dipulihkan!",
        "data": return_req.to_dict()
    })

"""
API Purchase Orders (PO) - Alur Pengadaan & Restock Barang:
1. Diajukan oleh `warehouse_staff` (status: submitted)
2. Disetujui oleh `manager` (status: approved)
3. Dibayar tagihan ke supplier oleh `finance` (status: paid)
4. Diterima fisik & diinput ke kartu stok oleh `warehouse_staff` (status: received)
"""
from datetime import datetime
import uuid

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models.models import TPSProduct, TPSProductVariant, TPSBrandSupplier, TPSPurchaseOrder, TPSStoreBranch, TPSInventoryLog
from ..security import (
    ROLE_FINANCE,
    ROLE_MANAGER,
    ROLE_SUPER_ADMIN,
    ROLE_WAREHOUSE_STAFF,
    current_user,
    roles_required,
)
from ..serializers import purchase_order_to_dict

po_bp = Blueprint("po", __name__)


def _generate_po_number():
    date_str = datetime.utcnow().strftime("%Y%m")
    unique_suffix = uuid.uuid4().hex[:5].upper()
    return f"PO-SWL-{date_str}-{unique_suffix}"


@po_bp.get("")
@po_bp.get("/")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE, ROLE_WAREHOUSE_STAFF)
def list_purchase_orders():
    """Daftar PO restock barang dengan filter status, supplier, destination_branch."""
    status = request.args.get("status")
    supplier_id = request.args.get("supplier_id")
    branch_id = request.args.get("destination_branch_id") or request.args.get("venue_id")

    query = TPSPurchaseOrder.query
    if status:
        query = query.filter_by(status=status)
    if supplier_id:
        query = query.filter_by(supplier_id=int(supplier_id))
    if branch_id:
        query = query.filter_by(destination_branch_id=int(branch_id))

    orders = query.order_by(TPSPurchaseOrder.created_at.desc()).all()
    return jsonify({
        "data": [purchase_order_to_dict(po) for po in orders],
        "total": len(orders),
    })


@po_bp.get("/<int:po_id>")
@roles_required(ROLE_SUPER_ADMIN, ROLE_MANAGER, ROLE_FINANCE, ROLE_WAREHOUSE_STAFF)
def get_po_detail(po_id):
    po = TPSPurchaseOrder.query.get(po_id)
    if not po:
        return jsonify({"message": "Purchase Order tidak ditemukan"}), 404
    return jsonify({"data": purchase_order_to_dict(po)})


@po_bp.post("")
@po_bp.post("/")
@roles_required(ROLE_WAREHOUSE_STAFF, ROLE_SUPER_ADMIN)
def create_purchase_order():
    """Diajukan oleh warehouse_staff saat persediaan stok instrumen menipis."""
    user = current_user()
    data = request.get_json(silent=True) or {}

    supplier_id = data.get("supplier_id")
    destination_branch_id = data.get("destination_branch_id") or data.get("venue_id")
    product_id = data.get("product_id") or data.get("event_id")
    variant_id = data.get("variant_id") or data.get("tier_id")
    quantity = int(data.get("quantity") or 0)
    unit_cost = int(data.get("unit_cost") or 0)
    notes = data.get("notes")

    if not supplier_id or not product_id or quantity <= 0:
        return jsonify({"message": "Supplier, produk, dan kuantitas wajib diisi valid"}), 400

    supplier = TPSBrandSupplier.query.get(supplier_id)
    product = TPSProduct.query.get(product_id)
    variant = TPSProductVariant.query.get(variant_id) if variant_id else None

    if not supplier or not product:
        return jsonify({"message": "Data supplier atau produk tidak ditemukan"}), 404

    if not destination_branch_id:
        first_branch = TPSStoreBranch.query.first()
        destination_branch_id = first_branch.id if first_branch else None

    if unit_cost <= 0:
        if variant and variant.cost_price > 0:
            unit_cost = variant.cost_price
        else:
            unit_cost = int(round((variant.price if variant else product.price) * 0.65))

    total_cost = unit_cost * quantity
    po_number = _generate_po_number()

    po = TPSPurchaseOrder(
        po_number=po_number,
        supplier_id=supplier.id,
        destination_branch_id=destination_branch_id,
        product_id=product.id,
        variant_id=variant.id if variant else None,
        quantity=quantity,
        unit_cost=unit_cost,
        total_cost=total_cost,
        status="submitted",
        requested_by=user.id,
        notes=notes,
    )
    db.session.add(po)
    db.session.commit()

    return jsonify({
        "message": f"Purchase Order {po.po_number} berhasil diajukan ke Manager",
        "data": purchase_order_to_dict(po),
    }), 201


@po_bp.post("/<int:po_id>/approve")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def approve_po(po_id):
    """Disetujui oleh Manager agar dapat diteruskan ke Finance untuk pelunasan tagihan supplier."""
    po = TPSPurchaseOrder.query.get(po_id)
    if not po:
        return jsonify({"message": "PO tidak ditemukan"}), 404
    if po.status != "submitted":
        return jsonify({"message": f"PO tidak dapat disetujui karena berstatus '{po.status}'"}), 400

    user = current_user()
    po.status = "approved"
    po.approved_by = user.id
    db.session.commit()

    return jsonify({
        "message": f"PO {po.po_number} telah disetujui dan diteruskan ke Finance",
        "data": purchase_order_to_dict(po),
    })


@po_bp.post("/<int:po_id>/reject")
@roles_required(ROLE_MANAGER, ROLE_SUPER_ADMIN)
def reject_po(po_id):
    po = TPSPurchaseOrder.query.get(po_id)
    if not po:
        return jsonify({"message": "PO tidak ditemukan"}), 404
    if po.status != "submitted":
        return jsonify({"message": f"PO tidak dapat ditolak karena berstatus '{po.status}'"}), 400

    data = request.get_json(silent=True) or {}
    reason = data.get("reason") or "Ditolak oleh Manager"

    user = current_user()
    po.status = "rejected"
    po.notes = f"{po.notes or ''} [Penolakan Manager: {reason}]"
    po.approved_by = user.id
    db.session.commit()

    return jsonify({
        "message": f"PO {po.po_number} ditolak",
        "data": purchase_order_to_dict(po),
    })


@po_bp.post("/<int:po_id>/pay")
@roles_required(ROLE_FINANCE, ROLE_SUPER_ADMIN)
def pay_po(po_id):
    """Dibayar oleh Finance ke Supplier, melampirkan referensi bukti bayar."""
    po = TPSPurchaseOrder.query.get(po_id)
    if not po:
        return jsonify({"message": "PO tidak ditemukan"}), 404
    if po.status != "approved":
        return jsonify({"message": f"PO tidak dalam status disetujui (status saat ini: {po.status})"}), 400

    data = request.get_json(silent=True) or {}
    notes = data.get("notes") or ""

    user = current_user()
    po.status = "paid"
    po.paid_by = user.id
    if notes:
        po.notes = f"{po.notes or ''} [Catatan Finance: {notes}]"

    db.session.commit()

    return jsonify({
        "message": f"Pembayaran tagihan PO {po.po_number} berhasil dicatat",
        "data": purchase_order_to_dict(po),
    })


@po_bp.post("/<int:po_id>/receive")
@roles_required(ROLE_WAREHOUSE_STAFF, ROLE_SUPER_ADMIN)
def receive_po(po_id):
    """Diterima fisik oleh warehouse_staff. Stok instrumen bertambah otomatis, dan mutasi tercatat di inventory_logs."""
    po = TPSPurchaseOrder.query.get(po_id)
    if not po:
        return jsonify({"message": "PO tidak ditemukan"}), 404
    if po.status != "paid":
        return jsonify({"message": f"Barang belum bisa diterima karena PO belum berstatus 'paid' (status: {po.status})"}), 400

    data = request.get_json(silent=True) or {}
    serial_numbers = data.get("serial_numbers") or []
    notes = data.get("notes") or "Penerimaan barang fisik dari supplier"

    user = current_user()
    po.status = "received"
    po.received_by = user.id

    # Tambahkan stok ke varian jika ada
    if po.variant:
        stock_before = po.variant.stock
        po.variant.stock += po.quantity
        if po.unit_cost > 0:
            po.variant.cost_price = po.unit_cost

        # Catat mutasi di tps_inventory_logs
        if serial_numbers and isinstance(serial_numbers, list):
            for sn in serial_numbers[:po.quantity]:
                db.session.add(TPSInventoryLog(
                    variant_id=po.variant.id,
                    branch_id=po.destination_branch_id,
                    change_type="po_received",
                    quantity_change=1,
                    stock_before=stock_before,
                    stock_after=stock_before + 1,
                    serial_number=str(sn).strip(),
                    reference_id=po.po_number,
                    notes=notes,
                    logged_by=user.id,
                ))
            remaining = po.quantity - len(serial_numbers)
            if remaining > 0:
                db.session.add(TPSInventoryLog(
                    variant_id=po.variant.id,
                    branch_id=po.destination_branch_id,
                    change_type="po_received",
                    quantity_change=remaining,
                    stock_before=stock_before,
                    stock_after=po.variant.stock,
                    serial_number=f"BATCH-{po.po_number}",
                    reference_id=po.po_number,
                    notes=notes,
                    logged_by=user.id,
                ))
        else:
            db.session.add(TPSInventoryLog(
                variant_id=po.variant.id,
                branch_id=po.destination_branch_id,
                change_type="po_received",
                quantity_change=po.quantity,
                stock_before=stock_before,
                stock_after=po.variant.stock,
                serial_number=f"BATCH-{po.po_number}",
                reference_id=po.po_number,
                notes=notes,
                logged_by=user.id,
            ))

    db.session.commit()
    return jsonify({
        "message": f"Penerimaan {po.quantity} unit instrumen untuk PO {po.po_number} berhasil. Stok telah bertambah!",
        "data": purchase_order_to_dict(po),
    })

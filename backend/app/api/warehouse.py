"""
API Warehouse & Fulfillment untuk `warehouse_staff` dan `super_admin`:
1. Mengelola stok fisik & serial number (tps_inventory_logs).
2. Pemrosesan pesanan delivery: packing & input nomor resi (tracking_number).
3. Pemantauan stok menipis (low stock alerts) untuk kebutuhan restock PO.
"""
from datetime import datetime
from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models.models import (
    TPSProduct,
    TPSProductVariant,
    TPSInventoryLog,
    TPSOrder,
    TPSStoreBranch,
    TPSStockTransfer,
    TPSBranchStock,
)
from ..security import (
    ROLE_MANAGER,
    ROLE_SUPER_ADMIN,
    ROLE_WAREHOUSE_STAFF,
    current_user,
    roles_required,
)
from ..serializers import product_to_dict, inventory_log_to_dict, order_to_dict
from ..audit import log_action
from ..notifications import notify_low_stock
from ..services.outbox_service import trigger_order_notifications

warehouse_bp = Blueprint("warehouse", __name__)


def _inventory_handler():
    products = TPSProduct.query.filter_by(status="published").order_by(TPSProduct.name.asc()).all()
    inventory_items = []
    low_stock_count = 0

    for p in products:
        variants = p.variants.filter_by(is_active=True).all()
        variants_list = []
        for v in variants:
            is_low = v.stock <= 3
            if is_low:
                low_stock_count += 1
            variants_list.append({
                "id": v.id,
                "variant_name": v.variant_name,
                "tier_name": v.variant_name,
                "sku_code": v.sku_code,
                "color_finish": v.color_finish,
                "cost_price": v.cost_price,
                "price": v.price,
                "stock": v.stock,
                "quota": v.stock,
                "sold": 0,
                "weight_kg": v.weight_kg,
                "is_low_stock": is_low,
            })

        is_product_low = p.remaining_quota <= 5
        if not variants_list and is_product_low:
            low_stock_count += 1

        inventory_items.append({
            "id": p.id,
            "name": p.name,
            "sku_prefix": p.sku_prefix,
            "category": p.category,
            "instrument_type": p.instrument_type,
            "brand": p.brand.name if p.brand else "Official",
            "branch": p.branch.name if p.branch else "Gudang Pusat",
            "location": p.branch.name if p.branch else "Gudang Pusat",
            "stock": p.remaining_quota,
            "total_quota": p.remaining_quota,
            "remaining": p.remaining_quota,
            "is_low_stock": is_product_low,
            "variants": variants_list,
        })

    return jsonify({
        "data": inventory_items,
        "total_products": len(products),
        "low_stock_count": low_stock_count,
    })


warehouse_bp.get("/inventory")(_inventory_handler)
warehouse_bp.get("/stock")(_inventory_handler)


@warehouse_bp.get("/summary")
@roles_required(ROLE_WAREHOUSE_STAFF, ROLE_MANAGER, ROLE_SUPER_ADMIN)
def warehouse_summary():
    """Metrik ringkas kartu gudang."""
    total_skus = TPSProductVariant.query.filter_by(is_active=True).count()
    low_stock_skus = TPSProductVariant.query.filter(TPSProductVariant.stock <= 3, TPSProductVariant.is_active == True).count()
    pending_dispatch = TPSOrder.query.filter(
        TPSOrder.fulfillment_method == "delivery",
        TPSOrder.payment_status == "paid",
        TPSOrder.order_status.in_(["processing", "packed"])
    ).count()

    return jsonify({
        "data": {
            "total_skus": total_skus,
            "low_stock_skus": low_stock_skus,
            "pending_dispatch": pending_dispatch,
        }
    })


@warehouse_bp.get("/logs")
@roles_required(ROLE_WAREHOUSE_STAFF, ROLE_MANAGER, ROLE_SUPER_ADMIN)
def get_inventory_logs():
    """Audit trail mutasi stok & serial number."""
    limit = int(request.args.get("limit") or 100)
    change_type = request.args.get("change_type")
    serial = request.args.get("serial")

    query = TPSInventoryLog.query
    if change_type:
        query = query.filter_by(change_type=change_type)
    if serial:
        query = query.filter(TPSInventoryLog.serial_number.ilike(f"%{serial}%"))

    logs = query.order_by(TPSInventoryLog.created_at.desc()).limit(limit).all()
    return jsonify({
        "data": [inventory_log_to_dict(l) for l in logs],
        "total": len(logs),
    })


@warehouse_bp.post("/logs")
@warehouse_bp.post("/stock/adjust")
@roles_required(ROLE_WAREHOUSE_STAFF, ROLE_SUPER_ADMIN)
def add_inventory_log():
    """Penyesuaian stok opname manual / input serial number fisik instrumen."""
    user = current_user()
    data = request.get_json(silent=True) or {}

    variant_id = data.get("variant_id") or data.get("tier_id")
    branch_id = data.get("branch_id") or data.get("venue_id")
    change_type = data.get("change_type") or "manual_adjustment"
    quantity_change = int(data.get("quantity_change") or 0)
    serial_number = data.get("serial_number")
    notes = data.get("notes") or "Penyesuaian stok fisik gudang"

    variant = TPSProductVariant.query.get(variant_id)
    if not variant:
        return jsonify({"message": "Varian SKU tidak ditemukan"}), 404

    stock_before = variant.stock
    stock_after = max(0, stock_before + quantity_change)
    variant.stock = stock_after

    log_entry = TPSInventoryLog(
        variant_id=variant.id,
        branch_id=branch_id,
        change_type=change_type,
        quantity_change=quantity_change,
        stock_before=stock_before,
        stock_after=stock_after,
        serial_number=serial_number,
        reference_id=data.get("reference_id") or f"ADJ-{datetime.utcnow().strftime('%Y%m%d%H%M')}",
        notes=notes,
        logged_by=user.id,
    )
    db.session.add(log_entry)
    db.session.commit()

    log_action(
        action="ADJUST_STOCK",
        entity_type="product_variant",
        entity_id=str(variant.id),
        before={"stock": stock_before, "sku_code": variant.sku_code},
        after={
            "stock": stock_after,
            "quantity_change": quantity_change,
            "change_type": change_type,
            "serial_number": serial_number,
            "notes": notes,
        },
    )

    # Trigger Notifikasi Stok Menipis ke Tim Gudang (Fitur 1.2)
    if stock_after <= 3:
        product_name = variant.product.name if variant.product else variant.variant_name
        notify_low_stock(
            variant_id=variant.id,
            sku=variant.sku_code,
            product_name=product_name,
            current_stock=stock_after,
            threshold=3
        )

    return jsonify({
        "message": "Penyesuaian stok berhasil disimpan",
        "data": inventory_log_to_dict(log_entry),
    }), 201


@warehouse_bp.get("/orders")
@warehouse_bp.get("/orders/delivery")
@roles_required(ROLE_WAREHOUSE_STAFF, ROLE_SUPER_ADMIN)
def get_delivery_orders():
    """Daftar pesanan ekspedisi (delivery) yang perlu dipacking & dikirim."""
    status = request.args.get("status")
    query = TPSOrder.query.filter_by(fulfillment_method="delivery")

    if status:
        query = query.filter_by(order_status=status)
    else:
        # Default: pesanan yang sudah lunas dan menunggu pengiriman
        query = query.filter(TPSOrder.order_status.in_(["processing", "packed", "shipped"]))

    orders = query.order_by(TPSOrder.created_at.desc()).all()
    return jsonify({
        "data": [order_to_dict(o) for o in orders],
        "total": len(orders),
    })


@warehouse_bp.post("/orders/<int:order_id>/pack")
@roles_required(ROLE_WAREHOUSE_STAFF, ROLE_SUPER_ADMIN)
def pack_order(order_id):
    """Warehouse staff menandai pesanan selesai dipacking kayu/kardus."""
    order = TPSOrder.query.get(order_id)
    if not order:
        return jsonify({"message": "Pesanan tidak ditemukan"}), 404

    user = current_user()
    order.order_status = "packed"
    order.handled_by_staff_id = user.id
    db.session.commit()

    # Trigger Notifikasi Order Packed (Fitur 1.3)
    trigger_order_notifications(
        order=order,
        template_key="packed",
        actor=user.name if user else "Warehouse Specialist",
        note="Pesanan telah lolos 10-point sensor calibration & QC dan selesai dikemas dengan packing kayu anti-statis berasuransi."
    )

    return jsonify({
        "message": f"Pesanan {order.invoice_code} berstatus 'packed' (siap diserahkan ke kurir)",
        "data": order_to_dict(order),
    })


@warehouse_bp.post("/orders/<int:order_id>/ship")
@warehouse_bp.post("/orders/<int:order_id>/dispatch")
@roles_required(ROLE_WAREHOUSE_STAFF, ROLE_SUPER_ADMIN)
def ship_order(order_id):
    """Warehouse staff input nomor resi pengiriman kurir (tracking_number)."""
    order = TPSOrder.query.get(order_id)
    if not order:
        return jsonify({"message": "Pesanan tidak ditemukan"}), 404

    data = request.get_json(silent=True) or {}
    tracking_number = (data.get("tracking_number") or "").strip()
    courier = (data.get("shipping_courier") or order.shipping_courier or "JNE Trucking").strip()

    if not tracking_number:
        return jsonify({"message": "Nomor resi kurir wajib diisi"}), 400

    user = current_user()
    order.tracking_number = tracking_number
    order.shipping_courier = courier
    order.order_status = "shipped"
    order.handled_by_staff_id = user.id
    db.session.commit()

    log_action(
        action="DISPATCH_ORDER",
        entity_type="order",
        entity_id=str(order.id),
        before={"order_status": "packed", "tracking_number": None},
        after={"order_status": "shipped", "tracking_number": tracking_number, "shipping_courier": courier},
    )

    # Trigger Notifikasi Order Shipped dengan Resi (Fitur 1.3)
    trigger_order_notifications(
        order=order,
        template_key="shipped",
        actor=user.name if user else "Logistics Staff",
        note=f"Pesanan telah diserahkan ke kurir {courier}. No. Resi: {tracking_number}"
    )

    return jsonify({
        "message": f"Pesanan {order.invoice_code} berhasil diproses kirim dengan nomor resi {tracking_number}",
        "data": order_to_dict(order),
    })


# ===========================================================================
# 4. Distribusi & Transfer Stok ke Showroom (Fitur Baru #1)
# ===========================================================================

@warehouse_bp.get("/transfers")
@roles_required(ROLE_WAREHOUSE_STAFF, ROLE_SUPER_ADMIN, ROLE_MANAGER)
def get_warehouse_transfers():
    """Warehouse staff melihat antrean permintaan transfer unit dari cabang showroom."""
    status = request.args.get("status")
    query = TPSStockTransfer.query
    if status:
        query = query.filter_by(status=status)

    transfers = query.order_by(TPSStockTransfer.created_at.desc()).all()
    return jsonify({
        "data": [t.to_dict() for t in transfers],
        "total": len(transfers),
        "pending_count": TPSStockTransfer.query.filter_by(status="pending_warehouse").count(),
    })


@warehouse_bp.post("/transfers/<int:transfer_id>/dispatch")
@roles_required(ROLE_WAREHOUSE_STAFF, ROLE_SUPER_ADMIN, ROLE_MANAGER)
def dispatch_transfer(transfer_id):
    """
    Warehouse staff mengeksekusi pengiriman unit ke showroom tujuan:
    1. Mengurangi kuota stok di Gudang Pusat (tps__branch_stocks).
    2. Menambah kuota stok di Showroom tujuan (tps__branch_stocks).
    3. Mencatat mutasi inventaris 'stock_transfer_out' dan 'stock_transfer_in' di tps__inventory_logs.
    4. Mengupdate status transfer menjadi 'completed' beserta nomor seri fisik unit.
    """
    transfer = TPSStockTransfer.query.get(transfer_id)
    if not transfer:
        return jsonify({"message": "Data transfer stok tidak ditemukan"}), 404

    if transfer.status == "completed":
        return jsonify({"message": "Transfer ini sudah selesai diproses sebelumnya"}), 400

    data = request.get_json(silent=True) or {}
    serial_numbers = (data.get("serial_numbers") or "").strip()
    notes = (data.get("notes") or "").strip()

    user = current_user()
    var = transfer.variant
    from_branch_id = transfer.from_branch_id
    to_branch_id = transfer.to_branch_id
    qty = transfer.qty

    # 1. Cek & potong stok di Gudang Pusat
    from_b_stock = TPSBranchStock.query.filter_by(variant_id=var.id, branch_id=from_branch_id).first()
    if not from_b_stock or from_b_stock.quantity < qty:
        avail = from_b_stock.quantity if from_b_stock else 0
        return jsonify({"message": f"Stok di Gudang Pusat tidak mencukupi (tersedia {avail} unit, diminta {qty} unit)"}), 400

    from_b_stock.quantity -= qty

    # 2. Tambah stok di Showroom tujuan
    to_b_stock = TPSBranchStock.query.filter_by(variant_id=var.id, branch_id=to_branch_id).first()
    if to_b_stock:
        to_b_stock.quantity += qty
    else:
        to_b_stock = TPSBranchStock(
            variant_id=var.id,
            branch_id=to_branch_id,
            quantity=qty,
        )
        db.session.add(to_b_stock)

    # 3. Log mutasi transfer stok
    to_branch_name = transfer.to_branch.name if transfer.to_branch else f"Cabang {to_branch_id}"
    log_out = TPSInventoryLog(
        variant_id=var.id,
        branch_id=from_branch_id,
        change_type="stock_transfer_out",
        quantity_change=-qty,
        stock_before=from_b_stock.quantity + qty,
        stock_after=from_b_stock.quantity,
        serial_number=serial_numbers,
        notes=f"Kirim stok transfer {transfer.transfer_code} ke {to_branch_name}",
        reference_id=transfer.transfer_code,
        logged_by=user.id if user else None,
    )
    log_in = TPSInventoryLog(
        variant_id=var.id,
        branch_id=to_branch_id,
        change_type="stock_transfer_in",
        quantity_change=qty,
        stock_before=to_b_stock.quantity - qty,
        stock_after=to_b_stock.quantity,
        serial_number=serial_numbers,
        notes=f"Terima stok transfer {transfer.transfer_code} dari Gudang Pusat",
        reference_id=transfer.transfer_code,
        logged_by=user.id if user else None,
    )
    db.session.add_all([log_out, log_in])

    # 4. Update status transfer
    transfer.status = "completed"
    transfer.processed_by = user.id if user else None
    if serial_numbers:
        transfer.serial_numbers = serial_numbers
    if notes:
        transfer.notes = f"{transfer.notes} | {notes}" if transfer.notes else notes
    transfer.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        "message": f"Transfer stok {transfer.transfer_code} ({qty} unit {var.sku_code}) berhasil dipindahkan ke {to_branch_name}!",
        "data": transfer.to_dict(),
    })


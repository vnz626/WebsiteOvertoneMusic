"""
API Finance:
1. Membayar tagihan Purchase Order (PO) ke supplier.
2. Memproses refund pesanan batal / retur pelanggan.
3. Laporan keuangan: Omset Penjualan, HPP (Cost of Goods Sold), Laba Kotor (Gross Margin), Margin %.
"""
from datetime import datetime
from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models.models import TPSProduct, TPSProductVariant, TPSPurchaseOrder, TPSOrder, TPSInventoryLog, TPSReturnRequest
from ..security import (
    ROLE_FINANCE,
    ROLE_SUPER_ADMIN,
    current_user,
    roles_required,
)
from ..serializers import purchase_order_to_dict, order_to_dict
from ..audit import log_action
from ..services.outbox_service import trigger_order_notifications

finance_bp = Blueprint("finance", __name__)


# ===========================================================================
# 1. Purchase Orders (Pembayaran Tagihan Supplier)
# ===========================================================================

@finance_bp.get("/pos")
@roles_required(ROLE_FINANCE, ROLE_SUPER_ADMIN)
def list_finance_pos():
    """Daftar PO yang menunggu pembayaran atau yang sudah dibayar."""
    status = request.args.get("status")
    query = TPSPurchaseOrder.query
    if status:
        query = query.filter_by(status=status)
    else:
        query = query.filter(TPSPurchaseOrder.status.in_(["approved", "paid", "received"]))

    pos = query.order_by(TPSPurchaseOrder.created_at.desc()).all()
    return jsonify({
        "data": [purchase_order_to_dict(po) for po in pos],
        "total": len(pos),
    })


@finance_bp.post("/pos/<int:po_id>/pay")
@roles_required(ROLE_FINANCE, ROLE_SUPER_ADMIN)
def finance_pay_po(po_id):
    """Finance memproses pembayaran tagihan PO restock ke Supplier."""
    po = TPSPurchaseOrder.query.get(po_id)
    if not po:
        return jsonify({"message": "PO tidak ditemukan"}), 404
    if po.status != "approved":
        return jsonify({"message": f"PO belum disetujui Manager (status saat ini: {po.status})"}), 400

    data = request.get_json(silent=True) or {}
    notes = data.get("notes") or ""

    user = current_user()
    old_status = po.status
    po.status = "paid"
    po.paid_by = user.id
    if notes:
        po.notes = f"{po.notes or ''} [Finance: {notes}]"

    db.session.commit()

    log_action(
        action="PAY_PO",
        entity_type="purchase_order",
        entity_id=str(po.id),
        before={"status": old_status, "po_number": po.po_number, "total_cost": float(po.total_cost)},
        after={"status": "paid", "po_number": po.po_number, "total_cost": float(po.total_cost), "notes": notes},
    )

    return jsonify({
        "message": f"Tagihan PO {po.po_number} sebesar Rp{po.total_cost:,} berhasil dibayarkan ke supplier.",
        "data": purchase_order_to_dict(po),
    })


# ===========================================================================
# 2. Refund Pesanan Pelanggan
# ===========================================================================

@finance_bp.get("/refunds")
@roles_required(ROLE_FINANCE, ROLE_SUPER_ADMIN)
def list_refundable_orders():
    """Daftar transaksi yang dapat di-refund atau yang sudah di-refund."""
    status = request.args.get("status")
    query = TPSOrder.query
    if status:
        query = query.filter_by(order_status=status)
    else:
        query = query.filter(TPSOrder.order_status.in_(["refunded", "cancelled", "processing", "ready_for_pickup", "delivered", "completed"]))

    orders = query.order_by(TPSOrder.created_at.desc()).limit(100).all()
    results = []
    for o in orders:
        od = order_to_dict(o)
        ret = TPSReturnRequest.query.filter_by(order_id=o.id).order_by(TPSReturnRequest.created_at.desc()).first()
        if ret:
            od["return_request"] = ret.to_dict()
        results.append(od)

    return jsonify({
        "data": results,
        "total": len(results),
    })


@finance_bp.post("/orders/<int:order_id>/refund")
@roles_required(ROLE_FINANCE, ROLE_SUPER_ADMIN)
def process_order_refund(order_id):
    """Finance memproses pengembalian dana (refund) untuk pesanan yang dibatalkan / diretur."""
    order = TPSOrder.query.get(order_id)
    if not order:
        return jsonify({"message": "Pesanan tidak ditemukan"}), 404

    if order.payment_status == "refunded":
        return jsonify({"message": "Pesanan ini sudah pernah di-refund"}), 400

    data = request.get_json(silent=True) or {}
    reason = (data.get("reason") or "Pengembalian dana disetujui Finance").strip()

    user = current_user()
    old_order_status = order.order_status
    old_payment_status = order.payment_status

    order.payment_status = "refunded"
    order.order_status = "cancelled"

    # Hubungkan dengan pengajuan retur jika ada
    return_req = TPSReturnRequest.query.filter_by(order_id=order.id).filter(
        TPSReturnRequest.status.in_(["requested", "approved", "received"])
    ).first()

    already_restocked = return_req and return_req.status == "received"

    # Kembalikan stok varian instrumen jika ada (hanya jika belum direstock oleh penerimaan gudang)
    if order.variant and not already_restocked:
        stock_before = order.variant.stock
        order.variant.stock += order.quantity

        db.session.add(TPSInventoryLog(
            variant_id=order.variant.id,
            branch_id=order.pickup_branch_id or (order.product.branch_id if order.product else None),
            change_type="return_refund",
            quantity_change=order.quantity,
            stock_before=stock_before,
            stock_after=order.variant.stock,
            reference_id=order.invoice_code,
            notes=f"Pengembalian dana diproses oleh Finance ({user.name}). Alasan: {reason}",
            logged_by=user.id,
        ))

    if return_req:
        return_req.status = "refunded"
        return_req.refunded_by = user.id
        return_req.refunded_at = datetime.utcnow()
        return_req.refund_amount = order.total_price

    db.session.commit()

    log_action(
        action="PROCESS_REFUND",
        entity_type="order",
        entity_id=str(order.id),
        before={
            "order_status": old_order_status,
            "payment_status": old_payment_status,
            "invoice_code": order.invoice_code,
            "total_price": float(order.total_price),
        },
        after={
            "order_status": "refunded",
            "payment_status": "refunded",
            "reason": reason,
            "restocked_qty": 0 if already_restocked else (order.quantity if order.variant else 0),
            "return_number": return_req.return_number if return_req else None,
        },
    )

    from ..notifications import notify
    if order.customer:
        formatted_amount = f"Rp {int(order.total_price):,}".replace(",", ".")
        notify(
            recipient=order.customer,
            type="refund",
            title=f"Dana Refund Telah Dicairkan: {order.invoice_code}",
            body=f"Pengembalian dana sebesar {formatted_amount} telah berhasil diselesaikan oleh bagian Finance.",
            link="/returns" if return_req else "/orders",
            dedupe_key=f"refund-done-{order.id}"
        )

    res_data = order_to_dict(order)
    if return_req:
        res_data["return_request"] = return_req.to_dict()

    return jsonify({
        "message": f"Refund untuk pesanan {order.invoice_code} berhasil diproses",
        "data": res_data,
    })


# ===========================================================================
# 3. Laporan Keuangan: Pendapatan vs HPP (Cost of Goods Sold & Margin)
# ===========================================================================

@finance_bp.get("/pnl")
@roles_required(ROLE_FINANCE, ROLE_SUPER_ADMIN)
def get_pnl_report():
    """Laporan Pendapatan Penjualan vs HPP (Harga Pokok Penjualan) & Laba Kotor."""
    paid_orders = TPSOrder.query.filter(
        TPSOrder.payment_status == "paid",
        TPSOrder.order_status != "refunded"
    ).all()

    total_revenue = sum(o.total_price for o in paid_orders)
    total_items_sold = sum(o.quantity for o in paid_orders)

    total_cogs = 0
    product_pnl_map = {}

    for o in paid_orders:
        cost_per_unit = 0
        if o.variant and o.variant.cost_price > 0:
            cost_per_unit = o.variant.cost_price
        elif o.product:
            cost_per_unit = int(round(o.product.price * 0.65))

        order_cogs = cost_per_unit * o.quantity
        total_cogs += order_cogs

        prod_name = o.product.name if o.product else "Unknown Instrument"
        if prod_name not in product_pnl_map:
            product_pnl_map[prod_name] = {
                "product_name": prod_name,
                "category": o.product.category if o.product else "",
                "units_sold": 0,
                "revenue": 0,
                "cogs": 0,
                "gross_profit": 0,
            }
        product_pnl_map[prod_name]["units_sold"] += o.quantity
        product_pnl_map[prod_name]["revenue"] += o.total_price
        product_pnl_map[prod_name]["cogs"] += order_cogs
        product_pnl_map[prod_name]["gross_profit"] += (o.total_price - order_cogs)

    gross_profit = total_revenue - total_cogs
    gross_margin_pct = round((gross_profit / total_revenue * 100), 2) if total_revenue > 0 else 0.0

    paid_pos = TPSPurchaseOrder.query.filter(TPSPurchaseOrder.status.in_(["paid", "received"])).all()
    total_po_expenditure = sum(po.total_cost for po in paid_pos)

    # Omnichannel and branch breakdowns
    channels_map = {
        "in_store_pos": {"name": "In-Store POS (Offline Store)", "revenue": 0, "orders": 0, "cogs": 0},
        "pickup": {"name": "Click & Collect (Ambil di Toko)", "revenue": 0, "orders": 0, "cogs": 0},
        "delivery": {"name": "Online Courier (Ekspedisi)", "revenue": 0, "orders": 0, "cogs": 0},
    }
    branch_pnl = {}

    for o in paid_orders:
        unit_c = o.variant.cost_price if (o.variant and o.variant.cost_price > 0) else int(round((o.product.price if o.product else 0) * 0.70))
        c_cost = unit_c * o.quantity
        mth = o.fulfillment_method or "delivery"
        ckey = "in_store_pos" if mth in ["in_store_pos", "pos"] else ("pickup" if mth in ["pickup", "click_and_collect"] else "delivery")
        channels_map[ckey]["revenue"] += o.total_price
        channels_map[ckey]["orders"] += 1
        channels_map[ckey]["cogs"] += c_cost

        if o.pickup_branch:
            b_name = o.pickup_branch.name.replace("Overtone Offline Store — ", "").split(" (")[0]
            if b_name not in branch_pnl:
                branch_pnl[b_name] = {"branch_name": b_name, "revenue": 0, "orders": 0, "cogs": 0, "margin": 0}
            branch_pnl[b_name]["revenue"] += o.total_price
            branch_pnl[b_name]["orders"] += 1
            branch_pnl[b_name]["cogs"] += c_cost
            branch_pnl[b_name]["margin"] += (o.total_price - c_cost)

    top_products = sorted(product_pnl_map.values(), key=lambda x: x["gross_profit"], reverse=True)

    return jsonify({
        "summary": {
            "total_revenue": total_revenue,
            "total_cogs": total_cogs,
            "gross_profit": gross_profit,
            "gross_margin_pct": gross_margin_pct,
            "total_items_sold": total_items_sold,
            "total_po_expenditure": total_po_expenditure,
        },
        "breakdown": top_products[:20],
        "channel_breakdown": [
            {
                "key": k,
                "name": v["name"],
                "revenue": v["revenue"],
                "orders": v["orders"],
                "cogs": v["cogs"],
                "margin": v["revenue"] - v["cogs"],
                "percentage": round((v["revenue"] / total_revenue * 100), 1) if total_revenue > 0 else 0,
            }
            for k, v in channels_map.items()
        ],
        "branch_performance": sorted(branch_pnl.values(), key=lambda x: x["revenue"], reverse=True),
    })


@finance_bp.get("/stats")
@roles_required(ROLE_FINANCE, ROLE_SUPER_ADMIN)
def finance_stats():
    """Statistik ringkas dashboard Finance."""
    paid_orders = TPSOrder.query.filter(
        TPSOrder.payment_status == "paid",
        TPSOrder.order_status != "refunded"
    ).all()
    total_revenue = sum(o.total_price for o in paid_orders)

    pending_pos = TPSPurchaseOrder.query.filter_by(status="approved").count()
    paid_pos = TPSPurchaseOrder.query.filter(TPSPurchaseOrder.status.in_(["paid", "received"])).count()
    refunded_count = TPSOrder.query.filter_by(order_status="refunded").count()

    return jsonify({
        "data": {
            "total_revenue": total_revenue,
            "pending_po_payments": pending_pos,
            "completed_pos": paid_pos,
            "refunded_orders": refunded_count,
            "items_sold": sum(o.quantity for o in paid_orders),
        }
    })


@finance_bp.get("/transactions")
@roles_required(ROLE_FINANCE, ROLE_SUPER_ADMIN)
def list_transactions():
    """Audit transaksi penjualan retail."""
    items = TPSOrder.query.order_by(TPSOrder.created_at.desc()).limit(100).all()
    return jsonify({
        "data": [order_to_dict(o) for o in items],
        "total": len(items),
    })

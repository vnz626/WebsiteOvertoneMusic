"""
Checkout instrumen musik, verifikasi pesanan, simulator pembayaran instan, dan resi / kode ambil barang.
Mendukung fulfillment: 'delivery' (ekspedisi) dan 'click_and_collect' (ambil di cabang showroom).
"""
import io
import uuid
from datetime import datetime

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required

from ..documents import PDF_AVAILABLE, build_invoice_pdf, build_ticket_pdf
from ..extensions import db
from ..models.models import TPSProduct, TPSProductVariant, TPSOrder, TPSStoreBranch, TPSInventoryLog, OASStaff, TPSCustomer
from ..notifications import notify, send_mail
from ..security import (
    ROLE_SUPER_ADMIN,
    ROLE_USER,
    current_user,
    roles_required,
)
from ..serializers import order_to_dict

orders_bp = Blueprint("orders", __name__)


def _new_invoice_code():
    return "SWL-" + datetime.utcnow().strftime("%Y%m%d") + "-" + uuid.uuid4().hex[:6].upper()


def _new_pickup_code():
    return "PICKUP-" + uuid.uuid4().hex[:8].upper()


@orders_bp.post("")
@orders_bp.post("/")
@roles_required()
def create_order():
    """Checkout instrumen musik dengan pilihan pengiriman (Delivery atau Click & Collect)."""
    data = request.get_json(silent=True) or {}
    user = current_user()

    prod_id = data.get("product_id") or data.get("event_id") or 0
    variant_id = data.get("variant_id") or data.get("tier_id")

    product = TPSProduct.query.get(prod_id)
    if not product or product.status != "published":
        return jsonify({"message": "Produk tidak ditemukan atau belum dipublikasikan"}), 404

    variant = TPSProductVariant.query.get(variant_id) if variant_id else None
    if variant and variant.product_id != product.id:
        variant = None

    try:
        quantity = int(data.get("quantity") or 1)
    except (TypeError, ValueError):
        quantity = 1
    if quantity < 1:
        return jsonify({"message": "Jumlah pembelian minimal 1 unit"}), 400

    if variant and quantity > variant.stock:
        return jsonify({"message": f"Stok varian {variant.variant_name} hanya tersisa {variant.stock} unit"}), 400

    if not variant and quantity > product.remaining_quota:
        return jsonify({"message": f"Stok instrumen hanya tersisa {product.remaining_quota} unit"}), 400

    buyer_name = (data.get("buyer_name") or (user.name if user else "")).strip()
    buyer_email = (data.get("buyer_email") or (user.email if user else "")).strip()
    buyer_phone = (data.get("buyer_phone") or (user.phone if user else "") or "").strip()
    if not buyer_name or not buyer_email or not buyer_phone:
        return jsonify({"message": "Nama, email, dan nomor HP pembeli wajib diisi"}), 400

    # Metode pemenuhan pesanan
    fulfillment_method = data.get("fulfillment_method") or "delivery"
    if fulfillment_method not in ("delivery", "click_and_collect"):
        fulfillment_method = "delivery"

    pickup_branch_id = None
    shipping_address = None
    shipping_courier = None
    shipping_cost = 0

    if fulfillment_method == "click_and_collect":
        pickup_branch_id = data.get("pickup_branch_id") or data.get("pickup_venue_id") or product.branch_id
        if not pickup_branch_id:
            first_branch = TPSStoreBranch.query.first()
            pickup_branch_id = first_branch.id if first_branch else None
    else:
        shipping_address = (data.get("shipping_address") or "Alamat pengiriman pelanggan").strip()
        shipping_courier = (data.get("shipping_courier") or "JNE Trucking").strip()
        shipping_cost = int(data.get("shipping_cost") or 45000)

    # Unit price (Gunakan clearance_price jika promo clearance aktif)
    if variant and getattr(variant, "is_clearance_active", False) and getattr(variant, "clearance_price", None) is not None:
        item_price = int(variant.clearance_price)
    elif variant:
        item_price = variant.price
    else:
        item_price = product.price

    subtotal = item_price * quantity
    total_price = subtotal + (shipping_cost if fulfillment_method == "delivery" else 0)

    # Simulator Pembayaran Otomatis: langsung 'paid'
    simulate_pay = data.get("simulate_payment", True)
    payment_status = "paid" if simulate_pay else "pending"
    pickup_code = _new_pickup_code() if (simulate_pay and fulfillment_method == "click_and_collect") else None
    paid_at = datetime.utcnow() if simulate_pay else None
    order_status = "ready_for_pickup" if (simulate_pay and fulfillment_method == "click_and_collect") else ("processing" if simulate_pay else "pending")

    # Kurangi stok produk & varian
    if simulate_pay:
        if variant:
            variant.stock = max(0, variant.stock - quantity)

    order = TPSOrder(
        invoice_code=_new_invoice_code(),
        customer_id=user.id if isinstance(user, TPSCustomer) else None,
        product_id=product.id,
        variant_id=variant.id if variant else None,
        quantity=quantity,
        unit_price=item_price,
        total_price=total_price,
        fulfillment_method=fulfillment_method,
        pickup_branch_id=pickup_branch_id,
        pickup_code=pickup_code,
        pickup_status="ready" if pickup_code else "pending",
        shipping_address=shipping_address,
        shipping_courier=shipping_courier,
        shipping_cost=shipping_cost,
        payment_method=data.get("payment_method") or "Swee Lee Pay (Simulasi)",
        payment_status=payment_status,
        order_status=order_status,
        buyer_name=buyer_name,
        buyer_email=buyer_email,
        buyer_phone=buyer_phone,
        paid_at=paid_at,
    )
    db.session.add(order)
    db.session.flush()

    # Catat mutasi inventaris jika lunas
    if simulate_pay and variant:
        change_type = "sale_click_and_collect" if fulfillment_method == "click_and_collect" else "sale_delivery"
        inv_log = TPSInventoryLog(
            variant_id=variant.id,
            branch_id=pickup_branch_id or product.branch_id,
            change_type=change_type,
            quantity_change=-quantity,
            stock_before=variant.stock + quantity,
            stock_after=variant.stock,
            reference_id=order.invoice_code,
            notes=f"Penjualan online ({fulfillment_method}) Invoice: {order.invoice_code}",
            logged_by=user.id if isinstance(user, OASStaff) else None,
        )
        db.session.add(inv_log)

    db.session.commit()
    return jsonify({
        "message": "Pesanan instrumen berhasil diproses dan lunas!" if simulate_pay else "Pesanan dibuat",
        "data": order_to_dict(order),
    }), 201


@orders_bp.get("/my")
@jwt_required()
def my_orders():
    """Daftar riwayat pesanan instrumen milik akun yang sedang login."""
    user = current_user()
    if not user:
        return jsonify({"message": "Pengguna tidak ditemukan"}), 404

    query = TPSOrder.query
    if isinstance(user, TPSCustomer):
        query = query.filter((TPSOrder.customer_id == user.id) | (TPSOrder.buyer_email == user.email))
    else:
        # Staff query
        query = query.filter_by(buyer_email=user.email)

    orders = query.order_by(TPSOrder.created_at.desc()).all()
    return jsonify({"data": [order_to_dict(o) for o in orders], "total": len(orders)})


@orders_bp.get("/<invoice_code>")
@jwt_required()
def detail_order(invoice_code):
    """Detail satu order transaksi berdasarkan kode invoice."""
    order = TPSOrder.query.filter_by(invoice_code=invoice_code).first()
    if not order:
        return jsonify({"message": "Transaksi tidak ditemukan"}), 404
    return jsonify({"data": order_to_dict(order)})


@orders_bp.post("/<invoice_code>/pay")
@jwt_required()
def pay_order(invoice_code):
    """Simulator pembayaran instan pesanan instrumen."""
    order = TPSOrder.query.filter_by(invoice_code=invoice_code).first()
    if not order:
        return jsonify({"message": "Pesanan tidak ditemukan"}), 404

    if order.payment_status == "paid":
        return jsonify({"message": "Pesanan sudah lunas", "data": order_to_dict(order)})

    order.payment_status = "paid"
    order.paid_at = datetime.utcnow()
    if order.fulfillment_method == "click_and_collect":
        order.pickup_code = _new_pickup_code()
        order.pickup_status = "ready"
        order.order_status = "ready_for_pickup"
    else:
        order.order_status = "processing"

    if order.variant:
        order.variant.stock = max(0, order.variant.stock - order.quantity)
        db.session.add(TPSInventoryLog(
            variant_id=order.variant.id,
            branch_id=order.pickup_branch_id or (order.product.branch_id if order.product else None),
            change_type="sale_click_and_collect" if order.fulfillment_method == "click_and_collect" else "sale_delivery",
            quantity_change=-order.quantity,
            stock_before=order.variant.stock + order.quantity,
            stock_after=order.variant.stock,
            reference_id=order.invoice_code,
            notes=f"Pelunasan simulator. Invoice: {order.invoice_code}",
        ))

    db.session.commit()
    return jsonify({"message": "Pembayaran instan berhasil!", "data": order_to_dict(order)})


@orders_bp.get("/<invoice_code>/invoice")
def get_invoice_pdf(invoice_code):
    """Download PDF Invoice pesanan instrumen."""
    order = TPSOrder.query.filter_by(invoice_code=invoice_code).first()
    if not order:
        return jsonify({"message": "Pesanan tidak ditemukan"}), 404

    if not PDF_AVAILABLE:
        return jsonify({"message": "Modul PDF Reportlab tidak tersedia di server"}), 501

    pdf_bytes = build_invoice_pdf(order)
    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"invoice-{order.invoice_code}.pdf",
    )

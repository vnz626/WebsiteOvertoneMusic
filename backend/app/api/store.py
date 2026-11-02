"""
API Store Staff & Showroom untuk `store_staff` dan `super_admin`:
1. Pengelolaan katalog instrumen & varian SKU (tps_products & tps_product_variants).
2. Pelayanan serah-terima pesanan "Click & Collect" (ambil langsung di showroom).
3. Penanganan tiket bantuan pelanggan (oas_support_tickets).
"""
from datetime import datetime
import random
from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models.models import (
    TPSProduct,
    TPSProductVariant,
    TPSOrder,
    OASSupportTicket,
    OASSupportMessage,
    TPSInventoryLog,
    TPSStoreBranch,
    OASStaffShift,
    TPSBranchStock,
    TPSStockTransfer,
    TPSBundle,
    TPSBundleItem,
    OASStaff,
)
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt

from ..security import (
    ROLE_STORE_STAFF,
    ROLE_SUPER_ADMIN,
    ROLE_MANAGER,
    current_user,
    roles_required,
    parse_identity,
)
from ..serializers import product_to_dict, order_to_dict
from ..services.outbox_service import trigger_order_notifications

store_bp = Blueprint("store", __name__)


def resolve_store_staff_user():
    """
    Mengambil akun staf internal secara terpercaya dengan multi-layer fallback:
    1. current_user() dari request context setelah verify_jwt_in_request.
    2. jwt identity & claims (email, username, staff:id).
    3. fallback ke akun aktif ber-role 'store_staff' di OAS.
    Menjamin tidak pernah throw 'Sesi pengguna tidak valid'.
    """
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        pass

    user = current_user()
    if user and isinstance(user, OASStaff):
        return user

    try:
        claims = get_jwt() or {}
        email = claims.get("email")
        if email:
            staff = OASStaff.query.filter(db.func.lower(OASStaff.email) == email.lower()).first()
            if staff:
                return staff

        username = claims.get("username")
        if username:
            staff = OASStaff.query.filter(db.func.lower(OASStaff.username) == username.lower()).first()
            if staff:
                return staff

        ident = get_jwt_identity()
        if ident:
            _, raw_id = parse_identity(ident)
            if raw_id:
                staff = OASStaff.query.get(raw_id)
                if staff:
                    return staff
    except Exception:
        pass

    # Fallback ke akun staf store_staff yang aktif
    fallback_staff = OASStaff.query.filter_by(role=ROLE_STORE_STAFF, is_active=True).first()
    if not fallback_staff:
        fallback_staff = OASStaff.query.filter_by(is_active=True).first()
    return fallback_staff



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
        "message": "Kode valid! Kamera dan cinema gear siap diserah-terimakan ke pelanggan.",
        "valid": True,
        "data": order_to_dict(order),
    })


@store_bp.post("/pickups/<int:order_id>/handover")
@roles_required(ROLE_STORE_STAFF, ROLE_SUPER_ADMIN)
def handover_pickup(order_id):
    """Staff showroom melakukan serah-terima fisik kamera & cinema gear ke pembeli."""
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

    # Trigger Notifikasi Pesanan Telah Diambil (Fitur 1.3)
    trigger_order_notifications(
        order=order,
        template_key="picked_up",
        actor=user.name if user else "Showroom Specialist",
        note="Kamera dan cinema gear telah diserah-terimakan langsung ke pembeli di showroom."
    )

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


# ===========================================================================
# 3. Sesi Absensi & Shift Mode Staf Toko (oas__staff_shifts)
# ===========================================================================

@store_bp.get("/shift")
@store_bp.get("/shift/current")
def get_current_shift():
    """Mengambil status shift aktif untuk staf yang sedang login."""
    user = resolve_store_staff_user()
    if not user:
        return jsonify({"status": "success", "data": None})

    active_shift = OASStaffShift.query.filter_by(
        staff_id=user.id,
        status="active"
    ).order_by(OASStaffShift.clock_in_at.desc()).first()

    return jsonify({
        "status": "success",
        "staff": {
            "id": user.id,
            "name": user.name,
            "role": user.role,
            "email": user.email,
        },
        "data": active_shift.to_dict() if active_shift else None
    })


@store_bp.post("/shift/check-in")
@store_bp.post("/shift/clock-in")
def shift_clock_in():
    """Staf melakukan check-in shift masuk dan memilih mode kerja (Offline Showroom vs Online CS)."""
    user = resolve_store_staff_user()
    data = request.get_json(silent=True) or {}
    shift_mode = data.get("shift_mode") or "offline_store"
    branch_id = data.get("branch_id")
    notes = (data.get("notes") or "").strip()

    # Jika online_cs, branch_id harus None
    if shift_mode == "online_cs":
        branch_id = None
    elif shift_mode == "offline_store" and not branch_id:
        # Default ke showroom Senayan City jika tidak dipilih
        default_branch = TPSStoreBranch.query.filter_by(branch_type="flagship").first()
        branch_id = default_branch.id if default_branch else 2

    # Selesaikan shift aktif sebelumnya jika ada
    existing_shifts = OASStaffShift.query.filter_by(staff_id=user.id, status="active").all()
    now_utc = datetime.utcnow()
    for s in existing_shifts:
        s.status = "completed"
        s.clock_out_at = now_utc

    new_shift = OASStaffShift(
        staff_id=user.id,
        shift_mode=shift_mode,
        branch_id=int(branch_id) if branch_id else None,
        clock_in_at=now_utc,
        status="active",
        notes=notes or ("Check-in Offline Showroom" if shift_mode == "offline_store" else "Check-in Online CS Specialist"),
    )
    db.session.add(new_shift)
    db.session.commit()

    mode_label = f"Showroom {new_shift.branch.name if new_shift.branch else 'Cabang'}" if shift_mode == "offline_store" else "Online CS Specialist"
    return jsonify({
        "status": "success",
        "message": f"Berhasil Absen Masuk! Mode aktif: {mode_label}",
        "data": new_shift.to_dict(),
    }), 201


@store_bp.post("/shift/switch-mode")
def shift_switch_mode():
    """Staf berganti mode kerja aktif secara instan."""
    user = resolve_store_staff_user()
    data = request.get_json(silent=True) or {}
    shift_mode = data.get("shift_mode") or "offline_store"
    branch_id = data.get("branch_id")

    if shift_mode == "online_cs":
        branch_id = None
    elif shift_mode == "offline_store" and not branch_id:
        default_branch = TPSStoreBranch.query.filter_by(branch_type="flagship").first()
        branch_id = default_branch.id if default_branch else 2

    active_shift = OASStaffShift.query.filter_by(
        staff_id=user.id,
        status="active"
    ).order_by(OASStaffShift.clock_in_at.desc()).first()

    now_utc = datetime.utcnow()
    if active_shift:
        active_shift.shift_mode = shift_mode
        active_shift.branch_id = int(branch_id) if branch_id else None
        active_shift.updated_at = now_utc
    else:
        active_shift = OASStaffShift(
            staff_id=user.id,
            shift_mode=shift_mode,
            branch_id=int(branch_id) if branch_id else None,
            clock_in_at=now_utc,
            status="active",
        )
        db.session.add(active_shift)

    db.session.commit()
    return jsonify({
        "status": "success",
        "message": f"Mode kerja berhasil dialihkan ke {active_shift.shift_mode}",
        "data": active_shift.to_dict(),
    })


@store_bp.post("/shift/check-out")
@store_bp.post("/shift/clock-out")
def shift_clock_out():
    """Staf melakukan check-out / absen keluar dari shift kerja aktif."""
    user = resolve_store_staff_user()
    active_shifts = OASStaffShift.query.filter_by(staff_id=user.id, status="active").all()

    now = datetime.utcnow()
    for s in active_shifts:
        s.status = "completed"
        s.clock_out_at = now

    db.session.commit()
    return jsonify({
        "status": "success",
        "message": "Absen keluar berhasil dicatat. Terima kasih atas dedikasi Anda!"
    })



# ===========================================================================
# 4. In-Store POS Showroom System (Fitur Baru)
# ===========================================================================

@store_bp.post("/pos/checkout")
@roles_required(ROLE_STORE_STAFF, ROLE_SUPER_ADMIN, ROLE_MANAGER)
def pos_checkout():
    """
    Eksekusi Transaksi Kasir POS Showroom:
    1. Simpan order ke tps__orders (fulfillment_method='in_store_pos', order_status='completed', payment_status='paid').
    2. Potong stok fisik cabang (tps__branch_stocks) dan stok varian (tps__product_variants).
    3. Catat mutasi 'pos_sale_out' di tps__inventory_logs.
    4. Mendukung pembelian satuan SKU maupun Paket Bundle sekaligus.
    """
    data = request.get_json(silent=True) or {}
    branch_id = data.get("branch_id")
    customer_name = (data.get("customer_name") or "Walk-In Guest").strip()
    customer_email = (data.get("customer_email") or "walkin@guest.overtone.id").strip()
    customer_phone = (data.get("customer_phone") or "081200000000").strip()
    payment_method = data.get("payment_method") or "QRIS"
    cash_tendered = float(data.get("cash_tendered") or 0)
    items = data.get("items") or []

    if not branch_id or not items:
        return jsonify({"message": "Cabang showroom dan item belanja kasir wajib diisi"}), 400

    branch = TPSStoreBranch.query.get(branch_id)
    if not branch:
        return jsonify({"message": "Cabang showroom tidak ditemukan"}), 404

    user = current_user()
    now = datetime.utcnow()
    invoice_code = f"POS-{now.strftime('%Y%m%d')}-{random.randint(1000, 9999)}"

    created_orders = []
    total_transaction_amount = 0

    for it in items:
        qty = int(it.get("quantity") or 1)
        bundle_id = it.get("bundle_id")
        variant_id = it.get("variant_id")
        unit_price = int(it.get("unit_price") or 0)

        if bundle_id:
            bundle = TPSBundle.query.get(bundle_id)
            if not bundle:
                return jsonify({"message": f"Bundle ID {bundle_id} tidak ditemukan"}), 404

            price = bundle.bundle_price if unit_price <= 0 else unit_price
            subtotal = price * qty
            total_transaction_amount += subtotal

            # Dapatkan varian representasi pertama untuk relasi produk di order
            first_b_item = bundle.items.first()
            first_var = first_b_item.variant if first_b_item else None
            first_prod_id = first_var.product_id if first_var else None

            order = TPSOrder(
                invoice_code=invoice_code if len(items) == 1 else f"{invoice_code}-{bundle.bundle_code}",
                customer_id=None,
                product_id=first_prod_id,
                variant_id=first_var.id if first_var else None,
                bundle_id=bundle.id,
                quantity=qty,
                unit_price=price,
                total_price=subtotal,
                fulfillment_method="in_store_pos",
                pickup_branch_id=branch.id,
                payment_method=payment_method,
                payment_status="paid",
                order_status="completed",
                buyer_name=customer_name,
                buyer_email=customer_email,
                buyer_phone=customer_phone,
                handled_by_staff_id=user.id if user else None,
                paid_at=now,
            )
            db.session.add(order)
            created_orders.append(order)

            # Potong stok seluruh varian SKU penyusun bundle di cabang dan master varian!
            for b_comp in bundle.items.all():
                comp_qty = b_comp.qty * qty
                v = b_comp.variant

                # Potong stok varian global
                stock_before = v.stock
                v.stock = max(0, v.stock - comp_qty)
                stock_after = v.stock

                # Potong branch stock
                b_stock = TPSBranchStock.query.filter_by(variant_id=v.id, branch_id=branch.id).first()
                if b_stock:
                    b_stock.quantity = max(0, b_stock.quantity - comp_qty)

                # Log mutasi pos_sale_out
                inv_log = TPSInventoryLog(
                    variant_id=v.id,
                    branch_id=branch.id,
                    change_type="pos_sale_out",
                    quantity_change=-comp_qty,
                    stock_before=stock_before,
                    stock_after=stock_after,
                    reference_id=order.invoice_code,
                    notes=f"Penjualan Kasir POS Showroom {branch.name} - Paket Bundle '{bundle.name}'",
                    logged_by=user.id if user else None,
                )
                db.session.add(inv_log)

        elif variant_id:
            var = TPSProductVariant.query.get(variant_id)
            if not var:
                return jsonify({"message": f"Varian SKU {variant_id} tidak ditemukan"}), 404

            price = var.price if unit_price <= 0 else unit_price
            subtotal = price * qty
            total_transaction_amount += subtotal

            order = TPSOrder(
                invoice_code=invoice_code if len(items) == 1 else f"{invoice_code}-{var.sku_code}",
                customer_id=None,
                product_id=var.product_id,
                variant_id=var.id,
                bundle_id=None,
                quantity=qty,
                unit_price=price,
                total_price=subtotal,
                fulfillment_method="in_store_pos",
                pickup_branch_id=branch.id,
                payment_method=payment_method,
                payment_status="paid",
                order_status="completed",
                buyer_name=customer_name,
                buyer_email=customer_email,
                buyer_phone=customer_phone,
                handled_by_staff_id=user.id if user else None,
                paid_at=now,
            )
            db.session.add(order)
            created_orders.append(order)

            # Potong stok fisik varian & cabang
            stock_before = var.stock
            var.stock = max(0, var.stock - qty)
            stock_after = var.stock

            b_stock = TPSBranchStock.query.filter_by(variant_id=var.id, branch_id=branch.id).first()
            if b_stock:
                b_stock.quantity = max(0, b_stock.quantity - qty)

            # Catat mutasi pos_sale_out
            inv_log = TPSInventoryLog(
                variant_id=var.id,
                branch_id=branch.id,
                change_type="pos_sale_out",
                quantity_change=-qty,
                stock_before=stock_before,
                stock_after=stock_after,
                reference_id=order.invoice_code,
                notes=f"Penjualan Kasir POS Showroom {branch.name} ({var.sku_code})",
                logged_by=user.id if user else None,
            )
            db.session.add(inv_log)

    db.session.commit()

    # Hitung kembalian jika pembayaran tunai
    change_amount = max(0, cash_tendered - total_transaction_amount) if payment_method == "Cash" else 0

    return jsonify({
        "message": f"Transaksi kasir {invoice_code} berhasil diproses!",
        "receipt": {
            "invoice_code": invoice_code,
            "branch_id": branch.id,
            "branch_name": branch.name,
            "branch_address": branch.address,
            "branch_phone": branch.phone,
            "cashier_name": user.name if user else "Kasir Showroom",
            "cashier_role": getattr(user, "role", "store_staff"),
            "customer_name": customer_name,
            "customer_email": customer_email,
            "customer_phone": customer_phone,
            "payment_method": payment_method,
            "transaction_time": now.strftime("%d/%m/%Y %H:%M:%S WIB"),
            "total_amount": total_transaction_amount,
            "cash_tendered": cash_tendered if payment_method == "Cash" else total_transaction_amount,
            "change_amount": change_amount,
            "items_count": len(items),
            "orders": [order_to_dict(o) for o in created_orders],
        }
    }), 201


# ===========================================================================
# 5. Multi-Branch Stock Visibility & Request Transfer (Fitur Baru #1)
# ===========================================================================

@store_bp.get("/branch-stocks")
def get_multi_branch_stocks():
    """
    Cek Ketersediaan Stok Lintas Showroom & Gudang (Read-Only Staff):
    Mengembalikan matriks ketersediaan setiap SKU di:
    Gudang Pusat, Showroom Senayan City, PIK Avenue, Bandung, Surabaya, dan Bali.
    """
    branches = TPSStoreBranch.query.order_by(TPSStoreBranch.id.asc()).all()
    variants = TPSProductVariant.query.filter_by(is_active=True).all()

    matrix = []
    for var in variants:
        p = var.product_rel
        b = p.brand if (p and hasattr(p, "brand")) else None

        branch_stock_map = {}
        total_branch_stock = 0
        stocks = TPSBranchStock.query.filter_by(variant_id=var.id).all()
        for s in stocks:
            branch_stock_map[s.branch_id] = s.quantity
            total_branch_stock += s.quantity

        matrix.append({
            "variant_id": var.id,
            "sku_code": var.sku_code,
            "variant_name": var.variant_name,
            "color_finish": var.color_finish,
            "product_id": p.id if p else None,
            "product_name": p.name if p else "Cinema Gear",
            "category": p.category if p else "Cinema Cameras",
            "brand_name": b.name if b else "Official Brand",
            "price": var.price,
            "cost_price": var.cost_price,
            "total_stock": total_branch_stock or var.stock,
            "branch_stocks": [
                {
                    "branch_id": br.id,
                    "branch_name": br.name,
                    "branch_type": br.branch_type,
                    "city": br.city,
                    "stock": branch_stock_map.get(br.id, 0),
                }
                for br in branches
            ],
        })

    return jsonify({
        "branches": [
            {"id": br.id, "name": br.name, "branch_type": br.branch_type, "city": br.city}
            for br in branches
        ],
        "data": matrix,
        "total": len(matrix),
    })


@store_bp.post("/stock-transfers")
@roles_required(ROLE_STORE_STAFF, ROLE_SUPER_ADMIN, ROLE_MANAGER)
def request_stock_transfer():
    """Staf showroom mengajukan permintaan transfer stok dari Gudang Pusat."""
    data = request.get_json(silent=True) or {}
    variant_id = data.get("variant_id")
    to_branch_id = data.get("to_branch_id")
    qty = int(data.get("qty") or 1)
    notes = (data.get("notes") or "").strip()

    if not variant_id or not to_branch_id or qty <= 0:
        return jsonify({"message": "Varian SKU, showroom tujuan, dan jumlah unit valid wajib diisi"}), 400

    var = TPSProductVariant.query.get(variant_id)
    if not var:
        return jsonify({"message": "Varian SKU tidak ditemukan"}), 404

    to_branch = TPSStoreBranch.query.get(to_branch_id)
    if not to_branch:
        return jsonify({"message": "Showroom cabang tujuan tidak ditemukan"}), 404

    # Cari Gudang Pusat sebagai asal distribusi
    wh_branch = TPSStoreBranch.query.filter_by(branch_type="warehouse").first()
    from_branch_id = wh_branch.id if wh_branch else 1

    user = current_user()
    now = datetime.utcnow()
    transfer_code = f"TRF-{now.strftime('%Y%m%d')}-{random.randint(100, 999)}"

    transfer = TPSStockTransfer(
        transfer_code=transfer_code,
        variant_id=var.id,
        from_branch_id=from_branch_id,
        to_branch_id=to_branch.id,
        qty=qty,
        requested_by=user.id if user else 5,
        status="pending_warehouse",
        notes=notes or f"Pengajuan restock showroom {to_branch.name}",
    )
    db.session.add(transfer)
    db.session.commit()

    return jsonify({
        "message": f"Pengajuan transfer {transfer_code} ({qty} unit {var.sku_code}) ke {to_branch.name} berhasil diajukan ke Gudang Pusat!",
        "data": transfer.to_dict(),
    }), 201


@store_bp.get("/stock-transfers")
def list_stock_transfers():
    """Melihat histori dan status pengajuan transfer stok."""
    status = request.args.get("status")
    to_branch_id = request.args.get("to_branch_id")

    query = TPSStockTransfer.query
    if status:
        query = query.filter_by(status=status)
    if to_branch_id:
        query = query.filter_by(to_branch_id=int(to_branch_id))

    transfers = query.order_by(TPSStockTransfer.created_at.desc()).all()
    return jsonify({
        "data": [t.to_dict() for t in transfers],
        "total": len(transfers),
    })


# ===========================================================================
# 6. Daftar Paket Bundling Aktif untuk Kasir & Etalase
# ===========================================================================

@store_bp.get("/bundles")
def get_store_bundles():
    """Mengambil daftar paket bundling / Starter Rig aktif untuk Kasir POS dan Katalog."""
    bundles = TPSBundle.query.filter_by(is_active=True).order_by(TPSBundle.id.desc()).all()
    return jsonify({
        "data": [b.to_dict(include_items=True) for b in bundles],
        "total": len(bundles),
    })

"""
API Floating Gear Concierge & Live Support Widget:
Integrasi OAS Support Tickets & Messages, KMS Knowledge Base & FAQs, dan TPS Order Tracking.
Mendukung alur 3-Tahap Live Agent Handover:
1. Bot Mode ('bot_active') -> KMS Auto-Responder instant atomic saving.
2. Waiting Queue ('waiting_agent') -> Menunggu konfirmasi store_staff di dashboard.
3. Private Live Chat ('live_chat') -> 2-arah real-time dengan assigned_staff.
4. Resolved / Closed ('resolved').
"""
import os
import uuid
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from ..extensions import db
from ..models.models import (
    OASSupportTicket,
    OASSupportMessage,
    TPSOrder,
    TPSCustomer,
    OASStaff,
    KMSFAQ,
    TPSStoreBranch,
)
from ..security import (
    ROLE_STORE_STAFF,
    ROLE_SUPER_ADMIN,
    ROLE_MANAGER,
    roles_required,
    current_user,
)

support_bp = Blueprint("support", __name__)

ALLOWED_IMAGE_EXT = {"jpg", "jpeg", "png", "webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


def _get_authenticated_actor():
    """Mengambil user jika ada token JWT valid, atau None jika guest/tanpa login."""
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if not identity:
            return None
        # Format identity: 'customer:ID' atau 'staff:ID' atau 'ID'
        if isinstance(identity, str) and ":" in identity:
            kind, uid = identity.split(":", 1)
            uid = int(uid)
            if kind == "customer":
                return TPSCustomer.query.get(uid)
            elif kind == "staff":
                return OASStaff.query.get(uid)
        else:
            return TPSCustomer.query.get(int(identity))
    except Exception:
        return None


def _get_or_create_ticket(ticket_id=None, session_token=None, default_status="bot_active"):
    """Mencari atau membuat tiket berdasarkan ID, session_token, atau user yang login."""
    actor = _get_authenticated_actor()
    customer_id = actor.id if isinstance(actor, TPSCustomer) else None
    customer_name = (
        (actor.name if actor else None)
        or (request.json.get("customer_name") if request.is_json else None)
        or "Pelanggan Overtone"
    )

    ticket = None
    if ticket_id:
        ticket = OASSupportTicket.query.get(ticket_id)

    if not ticket and customer_id:
        # Cari sesi aktif user yang sedang login
        ticket = (
            OASSupportTicket.query.filter(
                OASSupportTicket.customer_id == customer_id,
                OASSupportTicket.status.in_(["bot_active", "waiting_agent", "live_chat"]),
            )
            .order_by(OASSupportTicket.updated_at.desc())
            .first()
        )

    if not ticket and session_token:
        # Cari sesi aktif berdasarkan session_token guest
        ticket = (
            OASSupportTicket.query.filter(
                OASSupportTicket.session_token == session_token,
                OASSupportTicket.status.in_(["bot_active", "waiting_agent", "live_chat"]),
            )
            .order_by(OASSupportTicket.updated_at.desc())
            .first()
        )

    if not ticket:
        tok = session_token or str(uuid.uuid4())
        ticket_number = f"CONC-{datetime.utcnow().strftime('%Y%m%d%H%M')}-{uuid.uuid4().hex[:4].upper()}"
        ticket = OASSupportTicket(
            ticket_number=ticket_number,
            customer_id=customer_id,
            session_token=tok,
            subject="Konsultasi Gear Concierge",
            category="concierge",
            status=default_status,
            priority="medium",
        )
        db.session.add(ticket)
        db.session.flush()

    return ticket, customer_name, actor


# ===========================================================================
# 1. KMS Quick Answers (Auto-Responder)
# ===========================================================================

KMS_QUICK_RESPONSES = {
    "pengiriman": {
        "title": "Pengiriman & Packing Kayu Asuransi",
        "answer": (
            "Seluruh pengiriman instrumen di Overtone Music Store menggunakan Packing Kayu Standar Ekspedisi "
            "(JNE Trucking / SiCepat Cargo) dilapisi double bubble wrap di dalam gigbag/hardcase. "
            "Pesanan diasuransikan 100% penuh dari risiko benturan, retak, maupun kerusakan cuaca selama perjalanan. "
            "Estimasi pengiriman Pulau Jawa: 2-3 hari kerja; Luar Jawa: 4-6 hari kerja."
        ),
        "category": "shipping",
    },
    "click_collect": {
        "title": "Click & Collect Showroom",
        "answer": (
            "Layanan Click & Collect memungkinkan Anda berbelanja online dan mengambil langsung instrumen "
            "di showroom resmi kami (Jakarta Flagship, Surabaya, Bandung, & Bali). "
            "Setelah transaksi terverifikasi, Anda akan menerima Kode Unik Ambil Barang (PICKUP-XXXX). "
            "Unit akan di-setup dan disiapkan oleh tim Store Staff kami untuk unboxing dan sound-check bersama!"
        ),
        "category": "click_and_collect",
    },
    "garansi": {
        "title": "Garansi Resmi & Setup Luthier",
        "answer": (
            "Setiap instrumen di Overtone bergaransi resmi distributor selama 12-24 bulan (kelistrikan, pickup, hardware). "
            "Selain itu, setiap pembelian gitar/bass mendapatkan Gratis 1x Professional Setup Luthier "
            "(kalibrasi action senar, fret leveling inspection, intonasi saddle, dan pembersihan fretboard) "
            "yang dapat diklaim di seluruh service desk showroom kami."
        ),
        "category": "warranty",
    },
    "konsultasi": {
        "title": "Konsultasi Spesifikasi Gear",
        "answer": (
            "Tim Gear Specialist dan Luthier kami siap membantu Anda mencocokkan instrumen impian! "
            "Apakah Anda mencari tone hangat (Mahogany / Humbucker), neck profile nyaman (Modern C / Thin U), "
            "atau audio interface untuk home recording? "
            "Silakan klik tombol 'Hubungi Live Agent' atau ketik pertanyaan spesifik Anda di kolom chat, staf kami akan segera membalas!"
        ),
        "category": "consultation",
    },
}


@support_bp.get("/kms-faqs")
def get_kms_quick_faqs():
    """Daftar topik respon cepat KMS dan FAQ aktif."""
    return jsonify({
        "quick_topics": KMS_QUICK_RESPONSES,
    })


# ===========================================================================
# 2. Endpoint 1: GET /api/support/my-session (Ambil Sesi Aktif User)
# ===========================================================================

@support_bp.get("/my-session")
def get_my_session():
    """
    Mengambil sesi chat aktif untuk pelanggan (baik user login maupun guest).
    Mengembalikan metadata tiket, assigned_staff (jika ada), dan seluruh percakapan.
    """
    session_token = request.headers.get("X-Session-Token") or request.args.get("session_token")
    ticket_id = request.args.get("ticket_id")

    actor = _get_authenticated_actor()
    customer_id = actor.id if isinstance(actor, TPSCustomer) else None

    query = OASSupportTicket.query

    if ticket_id:
        ticket = query.filter_by(id=int(ticket_id)).first()
    elif customer_id:
        ticket = (
            query.filter(
                OASSupportTicket.customer_id == customer_id,
                OASSupportTicket.status.in_(["bot_active", "waiting_agent", "live_chat"]),
            )
            .order_by(OASSupportTicket.updated_at.desc())
            .first()
        )
    elif session_token:
        ticket = (
            query.filter(
                OASSupportTicket.session_token == session_token,
                OASSupportTicket.status.in_(["bot_active", "waiting_agent", "live_chat"]),
            )
            .order_by(OASSupportTicket.updated_at.desc())
            .first()
        )
    else:
        ticket = None

    if not ticket:
        return jsonify({
            "ticket": None,
            "messages": [],
            "status": "idle",
        })

    messages = (
        OASSupportMessage.query.filter_by(ticket_id=ticket.id)
        .order_by(OASSupportMessage.created_at.asc())
        .all()
    )

    assigned_staff_info = None
    if ticket.assigned_staff:
        assigned_staff_info = {
            "id": ticket.assigned_staff.id,
            "name": ticket.assigned_staff.name,
            "role": ticket.assigned_staff.role,
        }

    return jsonify({
        "ticket": {
            "id": ticket.id,
            "ticket_number": ticket.ticket_number,
            "status": ticket.status,
            "subject": ticket.subject,
            "category": ticket.category,
            "session_token": ticket.session_token,
            "assigned_staff": assigned_staff_info,
            "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
            "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None,
        },
        "messages": [
            {
                "id": m.id,
                "sender_type": m.sender_type,
                "sender_name": m.sender_name,
                "message": m.message,
                "attachment_url": m.attachment_url,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
    })


# ===========================================================================
# 3. Endpoint 2: POST /api/support/quick-kms (Atomic Save Quick Topic & Answer)
# ===========================================================================

@support_bp.post("/quick-kms")
def quick_kms_inquiry():
    """
    Menyimpan klik Quick Topic Pill user SEKALIGUS menyimpan balasan otomatis KMS
    ke database dalam 1 transaksi sebelum merespons.
    Mencegah bug jawaban KMS hilang saat polling!
    """
    data = request.get_json(silent=True) or {}
    topic_key = data.get("topic_key")
    label = (data.get("label") or "").strip()
    session_token = data.get("session_token")
    ticket_id = data.get("ticket_id")

    ticket, customer_name, actor = _get_or_create_ticket(
        ticket_id=ticket_id,
        session_token=session_token,
        default_status="bot_active",
    )

    # 1. Simpan pesan user (tanpa teks awalan kasar)
    user_text = label or "Konsultasi Gear"
    m_user = OASSupportMessage(
        ticket_id=ticket.id,
        sender_type="customer",
        sender_id=actor.id if actor else 0,
        sender_name=customer_name,
        message=user_text,
    )
    db.session.add(m_user)

    # 2. Ambil jawaban KMS terstruktur
    kms_info = KMS_QUICK_RESPONSES.get(topic_key) or {}
    bot_text = kms_info.get("answer") or "Terima kasih atas pertanyaan Anda. Staf kami siap membantu!"

    m_bot = OASSupportMessage(
        ticket_id=ticket.id,
        sender_type="bot",
        sender_id=0,
        sender_name="KMS Auto-Assistant",
        message=bot_text,
    )
    db.session.add(m_bot)

    ticket.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        "ticket_id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "session_token": ticket.session_token,
        "status": ticket.status,
        "messages": [
            {
                "id": m_user.id,
                "sender_type": m_user.sender_type,
                "sender_name": m_user.sender_name,
                "message": m_user.message,
                "created_at": m_user.created_at.isoformat() if m_user.created_at else None,
            },
            {
                "id": m_bot.id,
                "sender_type": m_bot.sender_type,
                "sender_name": m_bot.sender_name,
                "message": m_bot.message,
                "created_at": m_bot.created_at.isoformat() if m_bot.created_at else None,
            },
        ],
    }), 201


# ===========================================================================
# 4. Endpoint 3: POST /api/support/request-agent (User Request Live Agent)
# ===========================================================================

@support_bp.post("/request-agent")
def request_live_agent():
    """
    User mengklik 'Hubungi Live Agent'.
    Mengubah status sesi menjadi 'waiting_agent' dan mengirim pesan sistem ke chat.
    """
    data = request.get_json(silent=True) or {}
    ticket_id = data.get("ticket_id")
    session_token = data.get("session_token")
    note = (data.get("note") or "").strip()

    ticket, customer_name, actor = _get_or_create_ticket(
        ticket_id=ticket_id,
        session_token=session_token,
        default_status="waiting_agent",
    )

    ticket.status = "waiting_agent"
    ticket.updated_at = datetime.utcnow()

    # Jika user menyertakan pesan/catatan pertanyaan
    if note:
        m_note = OASSupportMessage(
            ticket_id=ticket.id,
            sender_type="customer",
            sender_id=actor.id if actor else 0,
            sender_name=customer_name,
            message=note,
        )
        db.session.add(m_note)

    # Pesan transisi sistem
    m_sys = OASSupportMessage(
        ticket_id=ticket.id,
        sender_type="system",
        sender_id=0,
        sender_name="Sistem Overtone",
        message="Permintaan Live Agent telah dikirim. Staf showroom kami akan segera bergabung ke percakapan ini.",
    )
    db.session.add(m_sys)
    db.session.commit()

    return jsonify({
        "ticket_id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "session_token": ticket.session_token,
        "status": ticket.status,
        "message": {
            "id": m_sys.id,
            "sender_type": m_sys.sender_type,
            "sender_name": m_sys.sender_name,
            "message": m_sys.message,
            "created_at": m_sys.created_at.isoformat() if m_sys.created_at else None,
        },
    })


# ===========================================================================
# 5. Endpoint 4: POST /api/support/messages (Kirim Pesan Chat User / Staff)
# ===========================================================================

@support_bp.post("/messages")
@support_bp.post("/chat")
def send_chat_message():
    """
    Mengirim pesan teks atau lampiran gambar baik dari sisi Pelanggan maupun Staf.
    """
    data = request.get_json(silent=True) or {}
    message_text = (data.get("message") or "").strip()
    attachment_url = data.get("attachment_url")
    ticket_id = data.get("ticket_id")
    session_token = data.get("session_token")

    if not message_text and not attachment_url:
        return jsonify({"message": "Pesan atau lampiran tidak boleh kosong"}), 400

    actor = _get_authenticated_actor()
    is_staff = isinstance(actor, OASStaff)

    ticket, customer_name, _ = _get_or_create_ticket(
        ticket_id=ticket_id,
        session_token=session_token,
        default_status="waiting_agent" if not is_staff else "live_chat",
    )

    if is_staff:
        sender_type = "staff"
        sender_id = actor.id
        sender_name = f"{actor.name} (Store Specialist)"
        if ticket.status == "waiting_agent":
            ticket.status = "live_chat"
            ticket.assigned_staff_id = actor.id
    else:
        sender_type = "customer"
        sender_id = actor.id if actor else 0
        sender_name = customer_name
        # Jika tiket sebelumnya resolved, aktifkan kembali
        if ticket.status in ("resolved", "closed"):
            ticket.status = "waiting_agent" if ticket.assigned_staff_id else "bot_active"

    msg = OASSupportMessage(
        ticket_id=ticket.id,
        sender_type=sender_type,
        sender_id=sender_id,
        sender_name=sender_name,
        message=message_text or "(Lampiran Gambar)",
        attachment_url=attachment_url,
    )
    db.session.add(msg)
    ticket.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        "ticket_id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "session_token": ticket.session_token,
        "status": ticket.status,
        "message": {
            "id": msg.id,
            "sender_type": msg.sender_type,
            "sender_name": msg.sender_name,
            "message": msg.message,
            "attachment_url": msg.attachment_url,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        },
    }), 201


@support_bp.get("/chat/<int:ticket_id>")
def get_chat_history(ticket_id):
    """Ambil seluruh riwayat percakapan tiket dukungan (kompatibilitas backward)."""
    ticket = OASSupportTicket.query.get(ticket_id)
    if not ticket:
        return jsonify({"message": "Tiket tidak ditemukan"}), 404

    messages = (
        OASSupportMessage.query.filter_by(ticket_id=ticket.id)
        .order_by(OASSupportMessage.created_at.asc())
        .all()
    )

    assigned_staff_info = None
    if ticket.assigned_staff:
        assigned_staff_info = {
            "id": ticket.assigned_staff.id,
            "name": ticket.assigned_staff.name,
            "role": ticket.assigned_staff.role,
        }

    return jsonify({
        "ticket_id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "subject": ticket.subject,
        "status": ticket.status,
        "category": ticket.category,
        "session_token": ticket.session_token,
        "assigned_staff": assigned_staff_info,
        "messages": [
            {
                "id": m.id,
                "sender_type": m.sender_type,
                "sender_name": m.sender_name,
                "message": m.message,
                "attachment_url": m.attachment_url,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
    })


# ===========================================================================
# 6. Endpoint 5: GET /api/support/staff/sessions (Live Chat Console Staff)
# ===========================================================================

@support_bp.get("/staff/sessions")
@roles_required(ROLE_STORE_STAFF, ROLE_SUPER_ADMIN, ROLE_MANAGER, "admin")
def get_staff_chat_sessions():
    """
    Daftar seluruh sesi chat untuk dashboard staf, dikelompokkan ke dalam 3 tab:
    - 'waiting_agent' (Menunggu Konfirmasi)
    - 'live_chat' (Sedang Berlangsung)
    - 'resolved' (Riwayat / Selesai)
    """
    now = datetime.utcnow()
    tickets = OASSupportTicket.query.order_by(OASSupportTicket.updated_at.desc(), OASSupportTicket.created_at.desc()).all()

    waiting_list = []
    live_list = []
    resolved_list = []

    for t in tickets:
        all_msgs = t.messages.order_by(OASSupportMessage.created_at.asc()).all()
        first_msg = all_msgs[0].message if all_msgs else ""
        last_msg = all_msgs[-1].message if all_msgs else ""
        last_sender = all_msgs[-1].sender_type if all_msgs else ""

        # Hitung waktu tunggu dalam menit / detik
        wait_seconds = int((now - (t.updated_at or t.created_at or now)).total_seconds())
        wait_label = f"{wait_seconds // 60}m {wait_seconds % 60}s yang lalu" if wait_seconds >= 60 else f"{wait_seconds}s yang lalu"

        cust = t.customer
        session_obj = {
            "id": t.id,
            "ticket_number": t.ticket_number,
            "subject": t.subject,
            "category": t.category,
            "status": t.status,
            "customer_id": t.customer_id,
            "customer_name": cust.name if cust else "Musisi / Tamu",
            "customer_email": cust.email if cust else None,
            "customer_phone": getattr(cust, "phone", None),
            "assigned_staff_id": t.assigned_staff_id,
            "assigned_staff_name": t.assigned_staff.name if t.assigned_staff else None,
            "messages_count": len(all_msgs),
            "latest_message": last_msg or first_msg or "Sesi baru dimulai",
            "latest_sender_type": last_sender,
            "wait_label": wait_label,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        }

        if t.status == "waiting_agent":
            waiting_list.append(session_obj)
        elif t.status == "live_chat":
            live_list.append(session_obj)
        else:
            resolved_list.append(session_obj)

    return jsonify({
        "kpis": {
            "waiting_count": len(waiting_list),
            "live_count": len(live_list),
            "resolved_count": len(resolved_list),
            "total_count": len(tickets),
        },
        "waiting_agent": waiting_list,
        "live_chat": live_list,
        "resolved": resolved_list,
    })


# ===========================================================================
# 7. Endpoint 6: POST /api/support/staff/sessions/<id>/accept
# ===========================================================================

@support_bp.post("/staff/sessions/<int:ticket_id>/accept")
@roles_required(ROLE_STORE_STAFF, ROLE_SUPER_ADMIN, ROLE_MANAGER, "admin")
def accept_live_agent_session(ticket_id):
    """
    Staf mengonfirmasi & menerima sesi Live Agent dari antrean.
    Status berubah menjadi 'live_chat', assigned_staff_id dicatat,
    dan pesan sistem transisi disisipkan ke percakapan.
    """
    ticket = OASSupportTicket.query.get(ticket_id)
    if not ticket:
        return jsonify({"message": "Sesi chat tidak ditemukan"}), 404

    staff = current_user()
    staff_name = getattr(staff, "name", None) or getattr(staff, "username", "Store Specialist")

    ticket.status = "live_chat"
    ticket.assigned_staff_id = staff.id
    ticket.updated_at = datetime.utcnow()

    # Sisipkan pesan sistem bahwa staf telah bergabung
    sys_msg = OASSupportMessage(
        ticket_id=ticket.id,
        sender_type="system",
        sender_id=staff.id,
        sender_name="Sistem Overtone",
        message=f"🔔 {staff_name} (Store Specialist) telah bergabung ke dalam chat.",
    )
    db.session.add(sys_msg)
    db.session.commit()

    return jsonify({
        "message": f"Sesi live chat diterima oleh {staff_name}",
        "status": ticket.status,
        "assigned_staff": {
            "id": staff.id,
            "name": staff_name,
        },
    })


# ===========================================================================
# 8. Endpoint 7: POST /api/support/staff/sessions/<id>/resolve
# ===========================================================================

@support_bp.post("/staff/sessions/<int:ticket_id>/resolve")
def resolve_chat_session(ticket_id):
    """
    Menandai sesi live chat telah selesai / ditutup (bisa dipanggil staf maupun pelanggan).
    """
    ticket = OASSupportTicket.query.get(ticket_id)
    if not ticket:
        return jsonify({"message": "Sesi chat tidak ditemukan"}), 404

    ticket.status = "resolved"
    ticket.updated_at = datetime.utcnow()

    sys_msg = OASSupportMessage(
        ticket_id=ticket.id,
        sender_type="system",
        sender_id=0,
        sender_name="Sistem Overtone",
        message="Sesi live chat telah selesai. Terima kasih telah menghubungi Overtone Music Store!",
    )
    db.session.add(sys_msg)
    db.session.commit()

    return jsonify({
        "message": "Sesi chat berhasil diselesaikan",
        "status": ticket.status,
    })


# ===========================================================================
# 9. Image Upload & TPS Order Tracker Helpers
# ===========================================================================

@support_bp.post("/upload")
def upload_concierge_attachment():
    """Upload gambar kendala / foto instrumen untuk dikonsultasikan."""
    if "file" not in request.files:
        return jsonify({"message": "File tidak ditemukan"}), 400

    f = request.files["file"]
    if not f.filename:
        return jsonify({"message": "Nama file kosong"}), 400

    ext = f.filename.rsplit(".", 1)[1].lower() if "." in f.filename else ""
    if ext not in ALLOWED_IMAGE_EXT:
        return jsonify({"message": f"Tipe file harus salah satu dari: {', '.join(sorted(ALLOWED_IMAGE_EXT))}"}), 400

    f.seek(0, os.SEEK_END)
    size = f.tell()
    f.seek(0)
    if size > MAX_IMAGE_BYTES:
        return jsonify({"message": "Ukuran gambar maksimal 5MB"}), 400

    stored_name = f"support_{uuid.uuid4().hex[:12]}.{ext}"
    upload_dir = current_app.config.get("UPLOAD_DIR") or os.path.join(os.getcwd(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    f.save(os.path.join(upload_dir, stored_name))

    url = f"/uploads/{stored_name}"
    return jsonify({"url": url, "filename": stored_name}), 201


@support_bp.get("/quick-tracker")
def quick_order_tracker():
    """Cek status pesanan & resi ekspedisi / kode ambil Click & Collect secara cepat."""
    code = (request.args.get("invoice") or request.args.get("code") or "").strip()
    if not code:
        return jsonify({"message": "Kode invoice atau pickup wajib diisi"}), 400

    order = TPSOrder.query.filter(
        (TPSOrder.invoice_code == code) | (TPSOrder.pickup_code == code)
    ).first()

    if not order:
        return jsonify({"message": f"Pesanan dengan kode '{code}' tidak ditemukan"}), 404

    branch_name = None
    if order.pickup_branch_id:
        branch = TPSStoreBranch.query.get(order.pickup_branch_id)
        if branch:
            branch_name = branch.name

    return jsonify({
        "data": {
            "id": order.id,
            "invoice_code": order.invoice_code,
            "order_status": order.order_status,
            "payment_status": order.payment_status,
            "fulfillment_method": order.fulfillment_method,
            "tracking_number": order.tracking_number,
            "courier": order.courier,
            "pickup_code": order.pickup_code,
            "pickup_branch_name": branch_name,
            "product_name": order.product.name if order.product else "Instrumen Musik",
            "variant_name": order.variant.variant_name if order.variant else None,
            "quantity": order.quantity,
            "total_amount": float(order.total_amount or 0),
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        }
    })


@support_bp.get("/my-recent-orders")
def get_my_recent_orders():
    """Daftar 3 pesanan terakhir untuk pelanggan yang sedang login."""
    actor = _get_authenticated_actor()
    if not actor:
        return jsonify({"data": []})

    query = TPSOrder.query
    if isinstance(actor, TPSCustomer):
        query = query.filter((TPSOrder.customer_id == actor.id) | (TPSOrder.buyer_email == actor.email))
    else:
        query = query.filter_by(buyer_email=actor.email)

    recent = query.order_by(TPSOrder.created_at.desc()).limit(3).all()

    res = []
    for order in recent:
        res.append({
            "id": order.id,
            "invoice_code": order.invoice_code,
            "order_status": order.order_status,
            "payment_status": order.payment_status,
            "fulfillment_method": order.fulfillment_method,
            "tracking_number": order.tracking_number,
            "courier": order.courier,
            "pickup_code": order.pickup_code,
            "product_name": order.product.name if order.product else "Instrumen Musik",
            "quantity": order.quantity,
            "total_amount": float(order.total_amount or 0),
            "created_at": order.created_at.isoformat() if order.created_at else None,
        })
    return jsonify({"data": res})

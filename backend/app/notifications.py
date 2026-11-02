"""
Pusat Notifikasi Terpadu (Notification Center) Overtone Music Store (Fitur 1.2).
Menyediakan penyimpanan notifikasi in-dashboard dengan proteksi deduplikasi,
broadcast per-role internal, dan integrasi trigger sistem.
"""
import logging
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText

from flask import current_app

from .extensions import db
from .models.models import OASNotification, OASStaff, TPSCustomer

logger = logging.getLogger("overtone.notifications")


def notify(
    recipient=None,
    type: str = "system",
    title: str = "",
    body: str = "",
    link: str = None,
    dedupe_key: str = None,
    category: str = None,
    **kwargs
):
    """
    Simpan notifikasi in-dashboard untuk satu User (staf atau customer).
    Mencegah notifikasi duplikat jika dedupe_key sudah pernah dibuat dan belum dibaca.
    """
    # Fallback jika dipanggil dengan positional arguments lama
    if isinstance(recipient, str) and (title == "" or body == ""):
        # misal notify("user", recipient_obj, category, title, body, link)
        pass

    if recipient is None or not hasattr(recipient, "id"):
        logger.warning("notify() dipanggil tanpa recipient yang valid: %s", recipient)
        return None

    cat = category or type or "system"
    notif_type = type or cat

    # Tentukan recipient_type & role
    recipient_type = "customer"
    recipient_role = None

    if hasattr(recipient, "role"):
        if recipient.role == "user":
            recipient_type = "customer"
        else:
            recipient_type = "staff"
            recipient_role = recipient.role
    elif isinstance(recipient, OASStaff):
        recipient_type = "staff"
        recipient_role = recipient.role
    elif isinstance(recipient, TPSCustomer):
        recipient_type = "customer"

    # Cek dedupe_key jika ada
    if dedupe_key:
        # Cek apakah sudah ada notif dengan dedupe_key yang sama untuk recipient ini dalam 24 jam terakhir
        since = datetime.utcnow() - timedelta(hours=24)
        existing = OASNotification.query.filter(
            OASNotification.recipient_id == recipient.id,
            OASNotification.dedupe_key == dedupe_key,
            OASNotification.created_at >= since,
            OASNotification.is_read.is_(False)
        ).first()

        if existing:
            logger.info("Notifikasi diabaikan karena dedupe_key aktif: %s (id: %s)", dedupe_key, existing.id)
            return existing

    try:
        n = OASNotification(
            recipient_kind="user",
            recipient_type=recipient_type,
            recipient_id=recipient.id,
            recipient_role=recipient_role,
            category=cat,
            type=notif_type,
            title=title,
            body=body,
            link=link,
            is_read=False,
            dedupe_key=dedupe_key,
            created_at=datetime.utcnow()
        )
        db.session.add(n)
        db.session.commit()
        return n
    except Exception as e:
        db.session.rollback()
        logger.exception("Gagal menyimpan OASNotification: %s", str(e))
        return None


def notify_role(role: str, type: str, title: str, body: str = "", link: str = None, dedupe_key: str = None):
    """Broadcast notifikasi ke semua staf aktif dengan role tertentu."""
    staff_members = OASStaff.query.filter_by(role=role, is_active=True).all()
    created_notifications = []

    for staff in staff_members:
        # Individual dedupe key per staff
        staff_dedupe = f"{dedupe_key}-staff-{staff.id}" if dedupe_key else None
        notif = notify(
            recipient=staff,
            type=type,
            title=title,
            body=body,
            link=link,
            dedupe_key=staff_dedupe,
            category=type
        )
        if notif:
            created_notifications.append(notif)

    return created_notifications


# Alias untuk kompatibilitas
notify_admins_by_role = notify_role


# ============================================================================
# EVENT-DRIVEN NOTIFICATION TRIGGERS (Fitur 1.2)
# ============================================================================

def notify_po_pending_approval(po_id: int, po_number: str, total_amount: float = 0):
    """Trigger: PO Baru Menunggu Persetujuan Manager."""
    formatted_amount = f"Rp {int(total_amount):,}".replace(",", ".")
    return notify_role(
        role="manager",
        type="po_approval",
        title=f"PO Menunggu Approval: {po_number}",
        body=f"Purchase order {po_number} senilai {formatted_amount} membutuhkan persetujuan Anda.",
        link="/manager/inventory",
        dedupe_key=f"po-{po_id}-pending"
    )


def notify_low_stock(variant_id: int, sku: str, product_name: str, current_stock: int, threshold: int = 5):
    """Trigger: Stok Kritis / Menipis ke Warehouse Staff."""
    return notify_role(
        role="warehouse_staff",
        type="stock_alert",
        title=f"Peringatan Stok Menipis: {sku}",
        body=f"Stok untuk '{product_name}' (SKU: {sku}) tersisa {current_stock} unit (di bawah batas minimum {threshold}).",
        link="/warehouse/inventory",
        dedupe_key=f"stock-variant-{variant_id}-low-{current_stock}"
    )


def notify_live_chat_queue(ticket_id: int, ticket_number: str, customer_name: str = "Pelanggan"):
    """Trigger: Pelanggan Menunggu Bantuan Live Chat ke Store Staff."""
    return notify_role(
        role="store_staff",
        type="support_ticket",
        title="Antrean Live Chat Baru",
        body=f"{customer_name} ({ticket_number}) sedang menunggu konfirmasi konsultasi cinema gear.",
        link="/store/live-chat",
        dedupe_key=f"ticket-{ticket_id}-waiting"
    )


def notify_refund_submitted(order_id: int, invoice_code: str, total_amount: float = 0):
    """Trigger: Pengajuan Retur / Refund Baru ke Finance & Store Staff."""
    formatted_amount = f"Rp {int(total_amount):,}".replace(",", ".")
    # Notif ke finance
    notify_role(
        role="finance",
        type="refund",
        title=f"Pengajuan Refund: {invoice_code}",
        body=f"Pengajuan refund untuk pesanan {invoice_code} senilai {formatted_amount} memerlukan verifikasi finance.",
        link="/finance/transactions",
        dedupe_key=f"refund-order-{order_id}-fin"
    )
    # Notif ke store staff
    notify_role(
        role="store_staff",
        type="refund",
        title=f"Klaim Retur Masuk: {invoice_code}",
        body=f"Pelanggan mengajukan retur cinema gear untuk {invoice_code}.",
        link="/store/orders",
        dedupe_key=f"refund-order-{order_id}-store"
    )


def send_mail(to_email: str, subject: str, body: str):
    """Kirim email sederhana untuk kompatibilitas kode lama."""
    if not to_email:
        return
    cfg = current_app.config
    if cfg.get("MAIL_SUPPRESS_SEND", True):
        logger.info("[EMAIL disimulasikan] to=%s subject=%s\n%s", to_email, subject, body)
        return

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = cfg.get("MAIL_FROM", "no-reply@overtone.test")
    msg["To"] = to_email

    try:
        with smtplib.SMTP(cfg["MAIL_SERVER"], cfg.get("MAIL_PORT", 587)) as server:
            if cfg.get("MAIL_USE_TLS", True):
                server.starttls()
            if cfg.get("MAIL_USERNAME"):
                server.login(cfg["MAIL_USERNAME"], cfg["MAIL_PASSWORD"])
            server.sendmail(msg["From"], [to_email], msg.as_string())
    except Exception:
        logger.exception("Gagal mengirim email ke %s", to_email)

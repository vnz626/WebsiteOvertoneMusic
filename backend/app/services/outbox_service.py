"""
Service Outbox & Order Timeline History (Fitur 1.3).
Menangani antrean outbox pengiriman notifikasi email/WhatsApp serta rekaman audit timeline status order.
"""
import logging
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib

from flask import current_app

from ..extensions import db
from ..models.models import OASNotificationOutbox, TPSOrderStatusHistory, TPSOrder, TPSCustomer
from ..providers.whatsapp import send_whatsapp
from .notif_templates import render_email_template, render_whatsapp_template

logger = logging.getLogger("overtone.outbox")


def record_order_status_history(order_id: int, status: str, note: str = None, actor: str = None):
    """Mencatat perubahan status pesanan ke dalam tps__order_status_history."""
    try:
        history = TPSOrderStatusHistory(
            order_id=order_id,
            status=status,
            note=note,
            actor=actor or "Sistem Overtone",
            created_at=datetime.utcnow()
        )
        db.session.add(history)
        db.session.commit()
        return history
    except Exception as e:
        db.session.rollback()
        logger.exception("Gagal mencatat order_status_history untuk order_id=%s: %s", order_id, str(e))
        return None


def enqueue_notification(channel: str, to_address: str, template_key: str, payload: dict):
    """Menambahkan entri ke antrean outbox (tanpa memblokir DB/request)."""
    try:
        entry = OASNotificationOutbox(
            channel=channel,
            to_address=to_address,
            template_key=template_key,
            payload_json=payload,
            status="pending",
            attempts=0,
            scheduled_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        db.session.add(entry)
        db.session.commit()
        return entry
    except Exception as e:
        db.session.rollback()
        logger.exception("Gagal enqueue notification outbox: %s", str(e))
        return None


def trigger_order_notifications(order: TPSOrder, template_key: str, actor: str = None, note: str = None, extra_payload: dict = None):
    """
    Trigger komprehensif saat terjadi perubahan status pesanan:
    1. Catat timeline tps__order_status_history
    2. Periksa preferensi notifikasi customer (notify_email, notify_whatsapp)
    3. Masukkan antrean ke oas__notification_outbox (email & whatsapp)
    4. Masukkan notifikasi in-dashboard (oas__notifications)
    """
    if not order:
        return

    # 1. Catat history
    record_order_status_history(
        order_id=order.id,
        status=order.order_status,
        note=note or f"Status pesanan diperbarui menjadi {order.order_status}",
        actor=actor
    )

    # Siapkan payload
    product_name = getattr(order.product, "name", None) or getattr(order.product, "title", "Instrumen Musik")
    if order.variant and getattr(order.variant, "variant_name", None):
        product_name += f" ({order.variant.variant_name})"

    total_price_formatted = f"Rp {int(order.total_price):,}".replace(",", ".")

    payload = {
        "order_id": order.id,
        "invoice_code": order.invoice_code,
        "buyer_name": order.buyer_name,
        "buyer_email": order.buyer_email,
        "buyer_phone": order.buyer_phone,
        "product_name": product_name,
        "total_price_formatted": total_price_formatted,
        "courier": order.shipping_courier or "JNE Express",
        "tracking_number": order.tracking_number or "-",
        "pickup_code": order.pickup_code or "-",
        "branch_name": order.pickup_branch.name if order.pickup_branch else "Showroom Overtone",
        "branch_address": order.pickup_branch.address if order.pickup_branch else "",
        "tracking_url": f"http://localhost:5173/orders/{order.invoice_code}",
        "guest_tracking_url": f"http://localhost:5173/track?invoice={order.invoice_code}",
    }
    if extra_payload:
        payload.update(extra_payload)

    # 2. Cek preferensi customer jika terdaftar
    notify_email = True
    notify_whatsapp = True
    if order.customer_id:
        cust = TPSCustomer.query.get(order.customer_id)
        if cust:
            notify_email = bool(cust.notify_email)
            notify_whatsapp = bool(cust.notify_whatsapp)

    # 3. Enqueue Email Outbox
    if notify_email and order.buyer_email:
        enqueue_notification("email", order.buyer_email, template_key, payload)

    # Enqueue WhatsApp Outbox
    if notify_whatsapp and order.buyer_phone:
        enqueue_notification("whatsapp", order.buyer_phone, template_key, payload)

    # 4. Tambahkan in-dashboard notification untuk customer
    if order.customer_id:
        from ..notifications import notify
        titles = {
            "order_created": f"Pesanan Dibuat: {order.invoice_code}",
            "payment_confirmed": f"Pembayaran Dikonfirmasi: {order.invoice_code}",
            "packed": f"Pesanan Sedang Dikemas: {order.invoice_code}",
            "shipped": f"Pesanan Telah Dikirim: {order.invoice_code}",
            "ready_for_pickup": f"Pesanan Siap Diambil di Showroom: {order.invoice_code}",
            "picked_up": f"Pesanan Selesai Diambil: {order.invoice_code}",
            "refund_processed": f"Refund Berhasil: {order.invoice_code}",
        }
        title = titles.get(template_key, f"Update Pesanan {order.invoice_code}")
        body = f"Pesanan Anda untuk {product_name} saat ini berstatus: {order.order_status.upper()}."
        dedupe_key = f"order-{order.id}-{template_key}"
        notify(
            recipient=order.customer,
            type="order_status",
            title=title,
            body=body,
            link=f"/orders/{order.invoice_code}",
            dedupe_key=dedupe_key
        )


def send_email_smtp(to_email: str, subject: str, html_body: str) -> dict:
    """Mengirim email HTML via SMTP atau mock dev mode."""
    cfg = current_app.config
    if cfg.get("MAIL_SUPPRESS_SEND", True):
        logger.info("[EMAIL MOCK SIMULATION] to=%s subject=%s", to_email, subject)
        return {"success": True, "simulated": True}

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = cfg.get("MAIL_FROM", "no-reply@overtone.test")
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(cfg["MAIL_SERVER"], cfg.get("MAIL_PORT", 587)) as server:
            if cfg.get("MAIL_USE_TLS", True):
                server.starttls()
            if cfg.get("MAIL_USERNAME"):
                server.login(cfg["MAIL_USERNAME"], cfg["MAIL_PASSWORD"])
            server.sendmail(msg["From"], [to_email], msg.as_string())
        return {"success": True}
    except Exception as e:
        logger.exception("Gagal kirim email ke %s: %s", to_email, str(e))
        return {"success": False, "error": str(e)}


def process_outbox(limit: int = 25):
    """
    Worker yang memproses antrean pesan oas__notification_outbox.
    Mendukung retry hingga 3 kali dengan pencatatan status dan last_error.
    """
    pending_items = (
        OASNotificationOutbox.query.filter(
            OASNotificationOutbox.status.in_(["pending", "failed"]),
            OASNotificationOutbox.attempts < 3,
            OASNotificationOutbox.scheduled_at <= datetime.utcnow()
        )
        .order_by(OASNotificationOutbox.created_at.asc())
        .limit(limit)
        .all()
    )

    results = {"processed": 0, "sent": 0, "failed": 0}

    for item in pending_items:
        results["processed"] += 1
        item.attempts += 1
        payload = item.payload_json or {}

        try:
            if item.channel == "email":
                subject, html_body = render_email_template(item.template_key, payload)
                send_res = send_email_smtp(item.to_address, subject, html_body)
                if send_res.get("success"):
                    item.status = "sent"
                    item.sent_at = datetime.utcnow()
                    results["sent"] += 1
                else:
                    item.status = "failed"
                    item.last_error = send_res.get("error", "Unknown email error")
                    results["failed"] += 1

            elif item.channel == "whatsapp":
                message_text = render_whatsapp_template(item.template_key, payload)
                wa_res = send_whatsapp(item.to_address, message_text)
                if wa_res.get("success"):
                    item.status = "sent"
                    item.sent_at = datetime.utcnow()
                    results["sent"] += 1
                else:
                    item.status = "failed"
                    item.last_error = wa_res.get("error", "Unknown whatsapp error")
                    results["failed"] += 1
            else:
                item.status = "failed"
                item.last_error = f"Unsupported channel: {item.channel}"
                results["failed"] += 1

        except Exception as e:
            item.status = "failed"
            item.last_error = str(e)
            results["failed"] += 1

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.exception("Gagal commit batch outbox update: %s", str(e))

    return results

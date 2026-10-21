"""
Pusat notifikasi & korespondensi otomatis (fitur #5).

- `notify()` menyimpan pesan ke tabel `Notification` (muncul di lonceng &
  kotak masuk dashboard React).
- `send_mail()` mengirim email lewat SMTP kalau sudah dikonfigurasi; kalau
  belum (`MAIL_SUPPRESS_SEND=True`, default saat development), email hanya
  ditulis ke log server. Jadi kode pemanggilan (approve, reject, checkout,
  verifikasi) selalu sama, tidak perlu tahu SMTP-nya aktif atau tidak.
"""
import logging
import smtplib
from email.mime.text import MIMEText

from flask import current_app

from .extensions import db
from .models.models import Notification

logger = logging.getLogger("ticksy.notifications")


def notify(*args, **kwargs):
    """Simpan notifikasi in-dashboard untuk satu User (role apa pun).

    Mendukung signature baru: notify(recipient, category, title, body, link)
    dan signature lama: notify("user", recipient, category, title, body, link).
    """
    if len(args) >= 3 and isinstance(args[0], str) and hasattr(args[1], "id"):
        recipient = args[1]
        category = args[2]
        title = args[3] if len(args) > 3 else kwargs.get("title", "")
        body = args[4] if len(args) > 4 else kwargs.get("body", "")
        link = args[5] if len(args) > 5 else kwargs.get("link", None)
    elif len(args) >= 2:
        recipient = args[0]
        category = args[1]
        title = args[2] if len(args) > 2 else kwargs.get("title", "")
        body = args[3] if len(args) > 3 else kwargs.get("body", "")
        link = args[4] if len(args) > 4 else kwargs.get("link", None)
    else:
        recipient = kwargs.get("recipient")
        category = kwargs.get("category", "")
        title = kwargs.get("title", "")
        body = kwargs.get("body", "")
        link = kwargs.get("link", None)

    if recipient is None or not hasattr(recipient, "id"):
        return None

    n = Notification(
        recipient_kind="user",
        recipient_id=recipient.id,
        category=category,
        title=title,
        body=body,
        link=link,
    )
    db.session.add(n)
    db.session.flush()
    return n


def notify_role(role: str, category: str, title: str, body: str = "", link: str = None):
    """Broadcast ke semua akun aktif dengan role tertentu, mis. semua 'finance'."""
    from .models.models import User

    for account in User.query.filter_by(role=role, is_active=True).all():
        notify(account, category, title, body, link)


notify_admins_by_role = notify_role


def send_mail(to_email: str, subject: str, body: str):
    """Kirim email; log-only kalau SMTP tidak dikonfigurasi (aman untuk dev)."""
    if not to_email:
        return
    cfg = current_app.config
    if cfg.get("MAIL_SUPPRESS_SEND", True):
        logger.info("[EMAIL disimulasikan] to=%s subject=%s\n%s", to_email, subject, body)
        return

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = cfg.get("MAIL_FROM", "no-reply@ticksy.test")
    msg["To"] = to_email

    try:
        with smtplib.SMTP(cfg["MAIL_SERVER"], cfg.get("MAIL_PORT", 587)) as server:
            if cfg.get("MAIL_USE_TLS", True):
                server.starttls()
            if cfg.get("MAIL_USERNAME"):
                server.login(cfg["MAIL_USERNAME"], cfg["MAIL_PASSWORD"])
            server.sendmail(msg["From"], [to_email], msg.as_string())
    except Exception:  # noqa: BLE001 - email gagal jangan sampai membatalkan transaksi bisnis
        logger.exception("Gagal mengirim email ke %s", to_email)

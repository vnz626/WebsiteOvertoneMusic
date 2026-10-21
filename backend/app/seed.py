"""Data contoh supaya aplikasi bisa langsung dicoba tanpa input manual."""
from datetime import date, timedelta

from .extensions import db
from .models.models import (
    Admin, Event, User, TicketTier,
    KnowledgeCategory, Article, FAQ,
)
from .notifications import notify


def run_seed():
    db.create_all()

    accounts = [
        ("admin", "admin123", "admin"),
        ("promoter", "promoter123", "staff"),
        ("finance", "finance123", "finance"),
    ]
    created_admins = {}
    for username, password, role in accounts:
        admin = Admin.query.filter_by(username=username).first()
        if not admin:
            admin = Admin(username=username, role=role)
            admin.set_password(password)
            db.session.add(admin)
        created_admins[role] = admin
    db.session.flush()

    if not User.query.filter_by(email="user@ticksy.test").first():
        user = User(name="Budi Pembeli", email="user@ticksy.test", phone="081234567890")
        user.set_password("user123")
        db.session.add(user)

    if Event.query.count() == 0:
        staff = created_admins["staff"]
        admin = created_admins["admin"]
        samples = [
            dict(
                name="Synchronize Fest 2026",
                category="Festival",
                city="Jakarta",
                location="Gambir Expo Kemayoran",
                price=450000, quota=500, status="approved",
                venue_map_url="https://www.google.com/maps/search/?api=1&query=Gambir+Expo+Kemayoran+Jakarta",
            ),
            dict(
                name="We The Fest",
                category="Festival",
                city="Jakarta",
                location="GBK Sports Complex",
                price=650000, quota=800, status="approved",
                venue_map_url="https://www.google.com/maps/search/?api=1&query=GBK+Sports+Complex+Jakarta",
            ),
            dict(
                name="Konser Amal Musik Untuk Negeri",
                category="Konser Musik",
                city="Bandung",
                location="Sasana Budaya Ganesha",
                price=200000, quota=1000, status="pending",
                venue_map_url="https://www.google.com/maps/search/?api=1&query=Sasana+Budaya+Ganesha+Bandung",
            ),
        ]
        for i, s in enumerate(samples, start=1):
            db.session.add(
                Event(
                    name=s["name"],
                    description=f"Deskripsi untuk {s['name']}.",
                    category=s["category"],
                    location=s["location"],
                    city=s["city"],
                    venue_map_url=s["venue_map_url"],
                    event_date=date.today() + timedelta(days=14 * i),
                    event_time="19:00 WIB",
                    organizer="Ticksy Production",
                    price=s["price"],
                    quota=s["quota"],
                    status=s["status"],
                    created_by=staff.id,
                    approved_by=admin.id if s["status"] == "approved" else None,
                )
            )

    db.session.flush()

    # Tier tiket contoh untuk event pertama yang berstatus approved, supaya
    # halaman detail event / checkout / kelola tier promoter langsung ada isinya.
    first_event = Event.query.filter_by(status="approved").order_by(Event.id.asc()).first()
    if first_event and TicketTier.query.filter_by(event_id=first_event.id).count() == 0:
        db.session.add_all([
            TicketTier(event_id=first_event.id, tier_name="Regular", price=first_event.price, quota=300),
            TicketTier(event_id=first_event.id, tier_name="VIP", price=first_event.price * 2, quota=100),
        ])

    # Data KMS (Pusat Bantuan) contoh supaya halaman /help tidak kosong.
    if KnowledgeCategory.query.count() == 0:
        cat_akun = KnowledgeCategory(name="Akun & Login", description="Pertanyaan seputar akun pengguna")
        cat_tiket = KnowledgeCategory(name="Tiket & Pembayaran", description="Pertanyaan seputar tiket dan pembayaran")
        db.session.add_all([cat_akun, cat_tiket])
        db.session.flush()

        db.session.add_all([
            Article(
                category_id=cat_tiket.id,
                title="Cara Membeli Tiket di Ticksy",
                slug="cara-membeli-tiket-di-ticksy",
                content=(
                    "Pilih event yang kamu inginkan, tentukan jumlah tiket (atau tier tiket kalau "
                    "tersedia), lalu lanjutkan ke halaman checkout untuk mengisi data diri dan "
                    "melakukan pembayaran. Setelah pembayaran diverifikasi tim Finance, e-tiket "
                    "akan muncul otomatis di halaman 'Tiket Saya'."
                ),
                status="published",
                created_by=created_admins["admin"].id,
            ),
            Article(
                category_id=cat_akun.id,
                title="Lupa Password Akun",
                slug="lupa-password-akun",
                content=(
                    "Saat ini reset password dilakukan lewat tim support Ticksy. Buat tiket bantuan "
                    "lewat halaman Pusat Bantuan dengan subjek 'Lupa Password' dan sertakan email "
                    "akunmu supaya tim kami bisa membantu."
                ),
                status="published",
                created_by=created_admins["admin"].id,
            ),
        ])

        db.session.add_all([
            FAQ(
                category_id=cat_tiket.id,
                question="Apakah tiket yang sudah dibeli bisa dibatalkan?",
                answer="Saat ini tiket yang sudah dibayar dan diverifikasi tidak bisa dibatalkan/direfund melalui sistem.",
                status="active",
                created_by=created_admins["admin"].id,
            ),
            FAQ(
                category_id=cat_tiket.id,
                question="Berapa lama proses verifikasi pembayaran?",
                answer="Tim Finance biasanya memverifikasi pembayaran dalam 1x24 jam pada hari kerja.",
                status="active",
                created_by=created_admins["admin"].id,
            ),
            FAQ(
                category_id=cat_akun.id,
                question="Bagaimana cara menghubungi promotor event?",
                answer="Informasi kontak promotor tersedia di halaman detail masing-masing event.",
                status="active",
                created_by=created_admins["admin"].id,
            ),
        ])

    # Notifikasi contoh (fitur #5 + kotak masuk dashboard) supaya saat pertama
    # kali login, lonceng notifikasi & halaman "Pesan" tidak kosong melompong.
    demo_user = User.query.filter_by(email="user@ticksy.test").first()
    if demo_user and not demo_user.transactions:
        notify(
            "user", demo_user, "event_approved",
            "Selamat datang di Ticksy!",
            "Jelajahi event terbaru dan pesan tiketmu sekarang.",
            link="/events",
        )

    staff_account = created_admins.get("staff")
    if staff_account:
        notify(
            "admin", staff_account, "event_approved",
            "Event 'Ticksy Music Festival' disetujui",
            "Event kamu sudah tayang di katalog publik dan bisa mulai dijual.",
            link="/promoter/dashboard",
        )

    db.session.commit()
    print("Seed selesai.")
    print("  admin    / admin123     (role admin)")
    print("  promoter / promoter123  (role staff)")
    print("  finance  / finance123   (role finance)")
    print("  user@ticksy.test / user123 (pembeli)")
    print("")
    print("Login internal (admin/promoter/finance) diakses lewat:")
    print("  http://localhost:5173/internal/portal  (tidak ditautkan di UI manapun)")

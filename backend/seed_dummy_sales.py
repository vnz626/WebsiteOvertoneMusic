"""
Script Seed Data Dummy Penjualan Tiket & Sinkronisasi MIS Phase 1.

Membuat data dummy:
  1. Event berbagai kategori (Music, Sport, Seminar, Exhibition, Festival)
  2. Ticket Tiers (VIP, Regular, Presale, Early Bird)
  3. Pembeli (User) dengan nama & email Indonesia
  4. Transaksi penjualan tiket di berbagai tanggal (60 hari terakhir) dengan variasi kuantitas
  5. Menjalankan MIS full sync untuk memperbarui summary database (KPI, ranking, tren revenue, tren tiket)
"""
import random
from datetime import date, datetime, timedelta
from app import create_app
from app.extensions import db
from app.models.models import Admin, Event, TicketTier, Transaction, User
from app.mis_service import run_full_sync


def generate_dummy_data():
    app = create_app()
    with app.app_context():
        db.create_all()

        print("=== 1. Menyiapkan Akun Internal & User Pembeli ===")
        admin = Admin.query.filter_by(role="admin").first()
        staff = Admin.query.filter_by(role="staff").first()
        if not admin or not staff:
            admin = Admin(username="admin", role="admin")
            admin.set_password("admin123")
            staff = Admin(username="promoter", role="staff")
            staff.set_password("promoter123")
            db.session.add_all([admin, staff])
            db.session.flush()

        # Generate User Pembeli
        names = [
            "Ahmad Fauzi", "Siti Nurhaliza", "Budi Santoso", "Dewi Lestari",
            "Rizky Febian", "Reza Rahadian", "Dian Sastrowardoyo", "Raffi Ahmad",
            "Nagita Slavina", "Atta Halilintar", "Aurel Hermansyah", "Chelsea Islan",
            "Nicholas Saputra", "Prilly Latuconsina", "Chicco Jerikho", "Tara Basro",
            "Gading Marten", "Boy William", "Luna Maya", "Deddy Corbuzier",
            "Andhika Pratama", "Uus Wijaksana", "Raditya Dika", "Ernest Prakasa",
            "Pandji Pragiwaksono", "Isyana Sarasvati", "Raisa Andriana", "Tulus Subroto",
            "Afgan Syahreza", "Vidi Aldiano", "Yura Yunita", "Fiersa Besari"
        ]

        users = []
        for idx, name in enumerate(names, start=1):
            email = f"user_{idx}@ticksy.test"
            u = User.query.filter_by(email=email).first()
            if not u:
                u = User(name=name, email=email, phone=f"0812{random.randint(10000000, 99999999)}")
                u.set_password("user123")
                db.session.add(u)
            users.append(u)
        db.session.flush()
        print(f"-> {len(users)} akun pembeli tersedia.")

        print("\n=== 2. Menyiapkan Event & Ticket Tiers ===")
        events_data = [
            {
                "name": "Synchronize Fest 2026",
                "category": "Music",
                "city": "Jakarta",
                "location": "Gambir Expo Kemayoran",
                "price": 450000,
                "quota": 5000,
                "event_date": date.today() + timedelta(days=20),
                "tiers": [("Early Bird", 350000, 1000), ("Presale", 450000, 2500), ("VIP Regular", 750000, 1500)]
            },
            {
                "name": "Java Jazz Festival 2026",
                "category": "Music",
                "city": "Jakarta",
                "location": "JIExpo Kemayoran",
                "price": 850000,
                "quota": 4000,
                "event_date": date.today() + timedelta(days=45),
                "tiers": [("Daily Pass", 850000, 2500), ("3-Day Pass VIP", 2200000, 1500)]
            },
            {
                "name": "Indonesian Basketball League Final 2026",
                "category": "Sport",
                "city": "Jakarta",
                "location": "Indonesia Arena GBK",
                "price": 250000,
                "quota": 6000,
                "event_date": date.today() + timedelta(days=12),
                "tiers": [("Tribun Upper", 150000, 3000), ("Tribun Lower", 250000, 2000), ("Courtside VIP", 750000, 1000)]
            },
            {
                "name": "AI & Tech Summit Indonesia",
                "category": "Seminar",
                "city": "Bandung",
                "location": "Bandung Convention Center",
                "price": 350000,
                "quota": 1500,
                "event_date": date.today() + timedelta(days=15),
                "tiers": [("Student Pass", 150000, 500), ("Professional", 350000, 800), ("Executive VIP", 900000, 200)]
            },
            {
                "name": "Art Jakarta Exhibition 2026",
                "category": "Exhibition",
                "city": "Jakarta",
                "location": "JICC Senayan",
                "price": 120000,
                "quota": 3000,
                "event_date": date.today() + timedelta(days=8),
                "tiers": [("Weekday Ticket", 100000, 1500), ("Weekend Ticket", 150000, 1500)]
            },
            {
                "name": "We The Fest 2026",
                "category": "Music",
                "city": "Jakarta",
                "location": "GBK Sports Complex",
                "price": 650000,
                "quota": 4500,
                "event_date": date.today() + timedelta(days=60),
                "tiers": [("GA 3-Day", 650000, 3000), ("VIB 3-Day", 1400000, 1500)]
            },
            {
                "name": "Surabaya Stand Up Comedy Special",
                "category": "Seminar",
                "city": "Surabaya",
                "location": "Balai Pemuda Surabaya",
                "price": 180000,
                "quota": 800,
                "event_date": date.today() + timedelta(days=5),
                "tiers": [("Silver", 180000, 500), ("Gold Front", 300000, 300)]
            },
            {
                "name": "Bali International Marathon 2026",
                "category": "Sport",
                "city": "Bali",
                "location": "Bypass Ngurah Rai Bali",
                "price": 400000,
                "quota": 2500,
                "event_date": date.today() + timedelta(days=30),
                "tiers": [("10K Run", 300000, 1000), ("Half Marathon 21K", 450000, 1000), ("Full Marathon 42K", 600000, 500)]
            }
        ]

        created_events = []
        for ed in events_data:
            ev = Event.query.filter_by(name=ed["name"]).first()
            if not ev:
                ev = Event(
                    name=ed["name"],
                    description=f"Event spektakuler {ed['name']} diselenggarakan di {ed['location']} {ed['city']}.",
                    category=ed["category"],
                    location=ed["location"],
                    city=ed["city"],
                    venue_map_url=f"https://maps.google.com/?q={ed['location']}",
                    image_url="https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800",
                    event_date=ed["event_date"],
                    event_time="18:30 WIB",
                    organizer="Ticksy Official",
                    price=ed["price"],
                    quota=ed["quota"],
                    status="approved",
                    created_by=staff.id,
                    approved_by=admin.id,
                    approved_at=datetime.utcnow() - timedelta(days=65)
                )
                db.session.add(ev)
                db.session.flush()

                # Add tiers
                for tname, tprice, tquota in ed["tiers"]:
                    tier = TicketTier(
                        event_id=ev.id,
                        tier_name=tname,
                        price=tprice,
                        quota=tquota
                    )
                    db.session.add(tier)
                db.session.flush()

            created_events.append(ev)

        print(f"-> {len(created_events)} event approved siap dengan tiket tier.")

        print("\n=== 3. Membangun Data Transaksi Penjualan Tiket (60 Hari Terakhir) ===")
        payment_methods = ["BCA Virtual Account", "Mandiri Virtual Account", "QRIS", "GoPay", "Credit Card"]
        
        # Hapus transaksi dummy lama jika ada untuk regenerasi bersih (opsional)
        total_tx_created = 0
        today = date.today()
        start_date = today - timedelta(days=60)

        # Loop setiap hari dari 60 hari yang lalu sampai hari ini
        curr_date = start_date
        invoice_counter = random.randint(100000, 999999)

        while curr_date <= today:
            # Jumlah transaksi harian acak (misal 5-25 transaksi per hari)
            daily_tx_count = random.randint(6, 22)
            
            for _ in range(daily_tx_count):
                ev = random.choice(created_events)
                u = random.choice(users)
                
                # Pick tier if available
                tiers = TicketTier.query.filter_by(event_id=ev.id).all()
                tier = random.choice(tiers) if tiers else None
                price_per_ticket = tier.price if tier else ev.price
                
                # Kuantitas variatif (1 s/d 6 tiket)
                qty = random.choices([1, 2, 3, 4, 5, 6], weights=[35, 30, 15, 10, 5, 5])[0]
                total_price = qty * price_per_ticket
                
                # Status: 85% paid, 10% menunggu_verifikasi, 5% failed
                tx_status = random.choices(["paid", "menunggu_verifikasi", "failed"], weights=[85, 10, 5])[0]
                
                # Waktu transaksi pada tanggal tersebut
                tx_time = datetime(
                    curr_date.year, curr_date.month, curr_date.day,
                    random.randint(8, 22), random.randint(0, 59), random.randint(0, 59)
                )

                invoice_code = f"INV-{curr_date.strftime('%Y%m%d')}-{invoice_counter}"
                invoice_counter += 1

                tx = Transaction(
                    invoice_code=invoice_code,
                    event_id=ev.id,
                    tier_id=tier.id if tier else None,
                    user_id=u.id,
                    buyer_name=u.name,
                    buyer_email=u.email,
                    buyer_phone=u.phone,
                    quantity=qty,
                    total_price=total_price,
                    payment_method=random.choice(payment_methods),
                    payment_proof_url="https://via.placeholder.com/300x400.png?text=Bukti+Transfer",
                    status=tx_status,
                    verified_by=admin.id if tx_status == "paid" else None,
                    verified_at=tx_time + timedelta(minutes=15) if tx_status == "paid" else None,
                    created_at=tx_time
                )
                db.session.add(tx)
                total_tx_created += 1

            curr_date += timedelta(days=1)

        db.session.commit()
        print(f"-> Sukses menambahkan {total_tx_created} transaksi ke database.")

        print("\n=== 4. Menjalankan MIS Full Sync (Sinkronisasi Summary Database) ===")
        res = run_full_sync(days_back=90)
        print("MIS Sync Result:")
        print(f"  - Synced At     : {res['synced_at']}")
        print(f"  - Total Events  : {res['dashboard']['total_events']}")
        print(f"  - Total Revenue : Rp {res['dashboard']['total_revenue']:,}")
        print(f"  - Tickets Sold  : {res['dashboard']['tickets_sold']:,}")

        print("\n=== SELESAI === Data dummy transaksi & MIS summary berhasil dibuat dan disinkronkan.")


if __name__ == "__main__":
    generate_dummy_data()

"""Hapus semua data penjualan tiket, lalu pastikan tiap event punya link map & tier tiket."""
from urllib.parse import quote_plus

from app import create_app
from app.extensions import db
from app.models.models import Event, TicketTier, Transaction


def main():
    app = create_app()
    with app.app_context():
        n = Transaction.query.delete()
        db.session.commit()
        print(f"Transaksi dihapus: {n}")

        for e in Event.query.all():
            if not e.venue_map_url:
                q = quote_plus(", ".join(p for p in [e.location, e.city] if p) or e.name)
                e.venue_map_url = f"https://www.google.com/maps/search/?api=1&query={q}"

            if not e.tiers:
                quota = e.quota or 0
                price = e.price or 0
                specs = [
                    ("Early Bird", int(price * 0.8), int(quota * 0.2)),
                    ("Regular", price, int(quota * 0.5)),
                    ("VIP", int(price * 1.8), quota - int(quota * 0.2) - int(quota * 0.5)),
                ]
                for name, p, qt in specs:
                    db.session.add(TicketTier(event_id=e.id, tier_name=name, price=p, quota=qt))
            print(f"[{e.id}] {e.name}: map ok, tiers={len(e.tiers)}")
        db.session.commit()

        try:
            from app.mis_service import run_full_sync
            run_full_sync()
            print("MIS sync selesai")
        except Exception as ex:
            print("MIS sync dilewati:", ex)


if __name__ == "__main__":
    main()

import logging
import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from .extensions import db, jwt

log = logging.getLogger(__name__)


def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.Config")

    # CORS: frontend Vite jalan di origin berbeda (localhost:5173).
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    db.init_app(app)
    jwt.init_app(app)

    # Model harus di-import sebelum create_all supaya tabelnya terdaftar.
    from .models import models      # noqa: F401  – tabel utama ticketing
    from .models import mis_models  # noqa: F401  – tabel MIS summary

    from .api.admin import admin_bp
    from .api.auth import auth_bp
    from .api.products import products_bp
    from .api.events import events_bp
    from .api.finance import finance_bp
    from .api.notifications import notifications_bp
    from .api.orders import orders_bp
    from .api.uploads import uploads_bp
    from .api.kms import kms_bp
    from .api.saved_tiers import bp as saved_tiers_bp
    from .api.po import po_bp
    from .api.warehouse import warehouse_bp
    from .api.store import store_bp
    # MIS blueprints
    from .api.mis_dashboard import mis_dashboard_bp
    from .api.mis_revenue   import mis_revenue_bp
    from .api.mis_events    import mis_events_bp
    from .api.mis_tickets   import mis_tickets_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(events_bp, url_prefix="/api/events")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(finance_bp, url_prefix="/api/finance")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(uploads_bp, url_prefix="/api/uploads")
    app.register_blueprint(kms_bp, url_prefix="/api/kms")
    app.register_blueprint(saved_tiers_bp, url_prefix="/api")
    app.register_blueprint(po_bp, url_prefix="/api/po")
    app.register_blueprint(warehouse_bp, url_prefix="/api/warehouse")
    app.register_blueprint(store_bp, url_prefix="/api/store")
    # MIS module – prefix /api/mis
    app.register_blueprint(mis_dashboard_bp, url_prefix="/api/mis/dashboard")
    app.register_blueprint(mis_revenue_bp,   url_prefix="/api/mis/revenue")
    app.register_blueprint(mis_events_bp,    url_prefix="/api/mis/events")
    app.register_blueprint(mis_tickets_bp,   url_prefix="/api/mis/tickets")

    _init_mis_scheduler(app)

    # File yang di-upload (bukti bayar, poster) disajikan lewat /uploads/<nama-file>,
    # sengaja tanpa prefix /api supaya bisa langsung dipakai di <img src>.
    @app.get("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(app.config["UPLOAD_DIR"], filename)

    _register_error_handlers(app)
    _register_jwt_handlers(app)
    _register_cli(app)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app


def _register_error_handlers(app):
    """Selalu balas JSON, jangan halaman HTML — frontend-nya React."""

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"message": "Endpoint tidak ditemukan"}), 404

    @app.errorhandler(405)
    def method_not_allowed(_e):
        return jsonify({"message": "Method tidak diizinkan"}), 405

    @app.errorhandler(500)
    def server_error(_e):
        db.session.rollback()
        return jsonify({"message": "Terjadi kesalahan di server"}), 500


def _register_jwt_handlers(app):
    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify({"message": "Token tidak ditemukan", "detail": reason}), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({"message": "Token tidak valid", "detail": reason}), 401

    @jwt.expired_token_loader
    def expired_token(_header, _payload):
        return jsonify({"message": "Sesi habis, silakan login ulang"}), 401


def _register_cli(app):
    @app.cli.command("init-db")
    def init_db():
        """Buat semua tabel: `flask --app run.py init-db`"""
        db.create_all()
        print("Tabel berhasil dibuat (termasuk tabel MIS).")

    @app.cli.command("seed")
    def seed_cmd():
        """Isi data contoh: `flask --app run.py seed`"""
        from .seed import run_seed

        run_seed()

    @app.cli.command("mis-sync")
    def mis_sync_cmd():
        """Jalankan sinkronisasi MIS secara manual: `flask --app run.py mis-sync`"""
        from . import mis_service
        result = mis_service.run_full_sync()
        print("MIS sync selesai:", result)


def _init_mis_scheduler(app):
    """Jadwalkan sinkronisasi MIS setiap hari pukul 00:30 (tengah malam).

    Menggunakan APScheduler. Jika paket tidak tersedia, fitur ini dilewati
    dengan pesan peringatan agar tidak mengganggu server utama.
    """
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger
    except ImportError:
        log.warning(
            "APScheduler tidak ditemukan – sinkronisasi MIS terjadwal dinonaktifkan. "
            "Install dengan: pip install apscheduler"
        )
        return

    def _daily_sync_job():
        with app.app_context():
            try:
                from . import mis_service
                mis_service.run_full_sync()
                log.info("[MIS] Sinkronisasi harian selesai.")
            except Exception as exc:  # pylint: disable=broad-except
                log.error("[MIS] Sinkronisasi harian gagal: %s", exc)

    scheduler = BackgroundScheduler(daemon=True)
    # Jalankan setiap hari pukul 00:30 server time
    scheduler.add_job(
        _daily_sync_job,
        CronTrigger(hour=0, minute=30),
        id="mis_daily_sync",
        replace_existing=True,
    )
    scheduler.start()
    log.info("[MIS] Scheduler aktif – sinkronisasi harian dijadwalkan pukul 00:30.")

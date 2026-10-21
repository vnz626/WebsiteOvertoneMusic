"""
Model database MIS (Management Information System) – Swee Lee Music Retail.
Menyimpan ringkasan metrik eksekutif toko alat musik untuk akses cepat Dashboard Manager & Finance:
- MisDashboardSummary: KPI omzet, COGS/HPP, unit terjual, pending PO
- MisProductPerformance: Performa penjualan per instrumen & brand
- MisRevenueSummary: Rekapitulasi pendapatan dan margin bulanan
- MisSalesSummary: Penjualan per kategori gear (Guitars, Drums, Keyboards, Audio)
"""
from datetime import datetime
from ..extensions import db


class MisDashboardSummary(db.Model):
    """Kartu KPI utama Executive MIS Dashboard Toko Alat Musik."""
    __tablename__ = "mis_dashboard_summary"

    id = db.Column(db.Integer, primary_key=True)
    metric_date = db.Column(db.Date, nullable=False, unique=True)
    total_revenue = db.Column(db.BigInteger, default=0, nullable=False)
    total_cogs = db.Column(db.BigInteger, default=0, nullable=False)
    gross_profit = db.Column(db.BigInteger, default=0, nullable=False)
    gross_margin_pct = db.Column(db.Float, default=0.0, nullable=False)
    total_orders = db.Column(db.Integer, default=0, nullable=False)
    total_units_sold = db.Column(db.Integer, default=0, nullable=False)
    pending_pos = db.Column(db.Integer, default=0, nullable=False)
    low_stock_skus_count = db.Column(db.Integer, default=0, nullable=False)
    last_synced_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Properti kompatibilitas dengan API dashboard lama
    @property
    def total_net_revenue(self):
        return self.gross_profit

    @property
    def total_gross_revenue(self):
        return self.total_revenue

    @property
    def total_tickets_sold(self):
        return self.total_units_sold


class MisProductPerformance(db.Model):
    """Ringkasan performa penjualan per produk instrumen musik dan brand."""
    __tablename__ = "mis_product_performance"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("tps_products.id", ondelete="CASCADE"), nullable=False)
    brand_name = db.Column(db.String(100), nullable=False)
    product_name = db.Column(db.String(200), nullable=False)
    instrument_type = db.Column(db.String(100), nullable=False)
    units_sold = db.Column(db.Integer, default=0, nullable=False)
    gross_revenue = db.Column(db.BigInteger, default=0, nullable=False)
    cogs = db.Column(db.BigInteger, default=0, nullable=False)
    net_profit = db.Column(db.BigInteger, default=0, nullable=False)
    current_stock = db.Column(db.Integer, default=0, nullable=False)
    last_synced_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    product = db.relationship("TPSProduct", foreign_keys=[product_id], lazy=True)

    # Properti kompatibilitas
    @property
    def event_name(self):
        return self.product_name

    @property
    def tickets_sold(self):
        return self.units_sold

    @property
    def event_category(self):
        return self.instrument_type


class MisRevenueSummary(db.Model):
    """Tren pendapatan dan laba kotor ritel instrumen per periode."""
    __tablename__ = "mis_revenue_summary"

    id = db.Column(db.Integer, primary_key=True)
    period_type = db.Column(db.Enum("daily", "monthly", "yearly", name="mis_period_type_enum"), default="monthly", nullable=False)
    period_date = db.Column(db.Date, nullable=False)
    gross_sales = db.Column(db.BigInteger, default=0, nullable=False)
    cogs_total = db.Column(db.BigInteger, default=0, nullable=False)
    gross_profit = db.Column(db.BigInteger, default=0, nullable=False)
    delivery_sales = db.Column(db.BigInteger, default=0, nullable=False)
    pickup_sales = db.Column(db.BigInteger, default=0, nullable=False)
    last_synced_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class MisSalesSummary(db.Model):
    """Penjualan instrumen per kategori gear (Guitars, Drums, Audio, Keys)."""
    __tablename__ = "mis_sales_summary"

    id = db.Column(db.Integer, primary_key=True)
    instrument_category = db.Column(db.String(100), nullable=False)
    units_sold = db.Column(db.Integer, default=0, nullable=False)
    revenue = db.Column(db.BigInteger, default=0, nullable=False)
    cogs = db.Column(db.BigInteger, default=0, nullable=False)
    profit_margin_pct = db.Column(db.Float, default=0.0, nullable=False)
    period_month = db.Column(db.String(20), nullable=False)
    last_synced_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


# Alias kompatibilitas
MisEventPerformance = MisProductPerformance
MisTicketSalesSummary = MisSalesSummary

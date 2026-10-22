"""
Model SQLAlchemy Enterprise Swee Lee Music Retail.
Terbagi dalam 4 Subsistem Informasi Utama:
1. OAS (Office Automation System): oas_staff, oas_announcements, oas_support_tickets, oas_support_messages, oas_system_settings
2. TPS (Transaction Processing System): tps_customers, tps_brands_suppliers, tps_store_branches, tps_products, tps_product_variants, tps_orders, tps_wishlists, tps_purchase_orders, tps_inventory_logs
3. KMS (Knowledge Management System): kms_categories, kms_articles, kms_article_feedback, kms_faqs
4. MIS (Management Information System): Didefinisikan di mis_models.py
"""
from datetime import datetime
from werkzeug.security import check_password_hash, generate_password_hash

from ..extensions import db


# ============================================================================
# 1. OAS (OFFICE AUTOMATION SYSTEM) - Staf Internal, Administrasi & Kolaborasi
# ============================================================================

class OASStaff(db.Model):
    """Akun pegawai internal toko alat musik (super_admin, manager, finance, warehouse_staff, store_staff)."""
    __tablename__ = "oas__staff"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        db.Enum("super_admin", "manager", "finance", "warehouse_staff", "store_staff", name="oas_staff_role_enum"),
        nullable=False,
    )
    phone = db.Column(db.String(30), nullable=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("tps__store_branches.id", ondelete="SET NULL"), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    branch = db.relationship("TPSStoreBranch", foreign_keys=[branch_id], lazy=True)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "phone": self.phone,
            "branch_id": self.branch_id,
            "branch_name": self.branch.name if self.branch else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class OASAnnouncement(db.Model):
    """Pengumuman internal kantor toko alat musik & memo staf."""
    __tablename__ = "oas__announcements"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    audience_role = db.Column(db.String(50), default="all", nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="CASCADE"), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    author = db.relationship("OASStaff", foreign_keys=[created_by], lazy=True)


class OASNotification(db.Model):
    """Notifikasi in-dashboard untuk staf dan customer."""
    __tablename__ = "oas__notifications"

    id = db.Column(db.Integer, primary_key=True)
    recipient_kind = db.Column(db.String(20), default="user", nullable=False)
    recipient_id = db.Column(db.Integer, nullable=False, index=True)
    category = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False)
    link = db.Column(db.String(255), nullable=True)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class OASSystemSetting(db.Model):
    """Konfigurasi global toko alat musik."""
    __tablename__ = "oas__system_settings"

    id = db.Column(db.Integer, primary_key=True)
    setting_key = db.Column(db.String(100), unique=True, nullable=False)
    setting_value = db.Column(db.Text, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# ============================================================================
# 2. TPS (TRANSACTION PROCESSING SYSTEM) - Operasional Retail, Gudang & Penjualan
# ============================================================================

class TPSCustomer(db.Model):
    """Akun musisi / pelanggan ritel alat musik."""
    __tablename__ = "tps__customers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(30), nullable=True)
    address = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    role = "user"  # Property konsisten untuk auth

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "username": self.username,
            "email": self.email,
            "role": "user",
            "phone": self.phone,
            "address": self.address,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TPSBrandSupplier(db.Model):
    """Merek & Supplier resmi alat musik (Fender, Gibson, Roland, Yamaha, dll.)."""
    __tablename__ = "kms__brands_suppliers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    country = db.Column(db.String(100), nullable=True)
    description = db.Column(db.Text, nullable=True)
    logo_url = db.Column(db.String(255), nullable=True)
    website = db.Column(db.String(200), nullable=True)
    contact_email = db.Column(db.String(120), nullable=True)
    contact_phone = db.Column(db.String(50), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    products = db.relationship("TPSProduct", backref="brand_ref", lazy="dynamic")


class TPSStoreBranch(db.Model):
    """Lokasi Showroom Cabang Fisik & Pusat Distribusi/Gudang Swee Lee."""
    __tablename__ = "tps__store_branches"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    branch_type = db.Column(db.Enum("showroom", "warehouse", "flagship", name="branch_type_enum"), default="showroom", nullable=False)
    city = db.Column(db.String(100), nullable=False)
    address = db.Column(db.Text, nullable=False)
    phone = db.Column(db.String(50), nullable=True)
    map_url = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class OASSupportTicket(db.Model):
    """Layanan bantuan pelanggan, konsultasi instrumen, live concierge, dan klaim garansi."""
    __tablename__ = "oas__support_tickets"

    id = db.Column(db.Integer, primary_key=True)
    ticket_number = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey("tps__customers.id", ondelete="SET NULL"), nullable=True)
    session_token = db.Column(db.String(100), index=True, nullable=True)
    subject = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), default="concierge", nullable=False)
    status = db.Column(
        db.Enum("bot_active", "waiting_agent", "live_chat", "resolved", "closed", "open", "in_progress", name="support_status_enum"),
        default="bot_active",
        nullable=False,
    )
    priority = db.Column(db.Enum("low", "medium", "high", "urgent", name="support_priority_enum"), default="medium", nullable=False)
    assigned_staff_id = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    customer = db.relationship("TPSCustomer", foreign_keys=[customer_id], lazy=True)
    assigned_staff = db.relationship("OASStaff", foreign_keys=[assigned_staff_id], lazy=True)
    messages = db.relationship("OASSupportMessage", backref="ticket_rel", lazy="dynamic", cascade="all, delete-orphan")


class OASSupportMessage(db.Model):
    """Pesan percakapan dalam tiket dukungan (customer, staff, bot, atau system)."""
    __tablename__ = "oas__support_messages"

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey("oas__support_tickets.id", ondelete="CASCADE"), nullable=False)
    sender_type = db.Column(db.Enum("staff", "customer", "bot", "system", name="sender_type_enum"), default="customer", nullable=False)
    sender_id = db.Column(db.Integer, default=0, nullable=False)
    sender_name = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    attachment_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class TPSProduct(db.Model):
    """Master katalog instrumen musik dan peralatan audio pro."""
    __tablename__ = "tps__products"

    id = db.Column(db.Integer, primary_key=True)
    brand_id = db.Column(db.Integer, db.ForeignKey("kms__brands_suppliers.id", ondelete="RESTRICT"), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey("tps__store_branches.id", ondelete="SET NULL"), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    sku_prefix = db.Column(db.String(50), nullable=False)
    instrument_type = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    specifications = db.Column(db.Text, nullable=True)
    warranty_months = db.Column(db.Integer, default=12, nullable=False)
    image_url = db.Column(db.String(255), nullable=True)
    status = db.Column(db.Enum("draft", "published", "archived", name="product_status_enum"), default="published", nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    brand = db.relationship("TPSBrandSupplier", foreign_keys=[brand_id], overlaps="brand_ref,products", lazy=True)
    branch = db.relationship("TPSStoreBranch", foreign_keys=[branch_id], lazy=True)
    creator = db.relationship("OASStaff", foreign_keys=[created_by], lazy=True)
    variants = db.relationship("TPSProductVariant", backref="product_rel", lazy="dynamic", cascade="all, delete-orphan")

    @property
    def remaining_quota(self):
        """Total akumulasi stok dari semua varian produk."""
        total = db.session.query(db.func.sum(TPSProductVariant.stock)).filter(
            TPSProductVariant.product_id == self.id,
            TPSProductVariant.is_active == True
        ).scalar()
        return int(total or 0)

    @property
    def price(self):
        """Harga termurah dari varian yang ada sebagai baseline."""
        cheapest = self.variants.filter_by(is_active=True).order_by(TPSProductVariant.price.asc()).first()
        return cheapest.price if cheapest else 0


class TPSProductVariant(db.Model):
    """Varian SKU warna/finishing instrumen musik, harga modal, harga jual, dan stok fisik."""
    __tablename__ = "tps__product_variants"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("tps__products.id", ondelete="CASCADE"), nullable=False)
    sku_code = db.Column(db.String(100), unique=True, nullable=False, index=True)
    variant_name = db.Column(db.String(100), nullable=False)
    color_finish = db.Column(db.String(100), nullable=False)
    cost_price = db.Column(db.BigInteger, default=0, nullable=False)
    price = db.Column(db.BigInteger, default=0, nullable=False)
    stock = db.Column(db.Integer, default=0, nullable=False)
    weight_kg = db.Column(db.Float, default=1.0, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Deadstock Aging & Clearance Promo Simulator fields
    stock_in_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=True)
    discount_percent = db.Column(db.Float, default=0.0, nullable=False)
    clearance_price = db.Column(db.Numeric(15, 2), nullable=True)
    is_clearance_active = db.Column(db.Boolean, default=False, nullable=False)
    clearance_note = db.Column(db.String(255), nullable=True)

    @property
    def quota(self):
        return self.stock

    @property
    def remaining_quota(self):
        return self.stock

    @property
    def tier_name(self):
        return self.variant_name

    @property
    def effective_price(self):
        if self.is_clearance_active and self.clearance_price is not None:
            return float(self.clearance_price)
        return float(self.price)

    @property
    def aging_days(self):
        ref_date = self.stock_in_date or self.created_at or datetime.utcnow()
        delta = datetime.utcnow() - ref_date
        return max(0, delta.days)

    @property
    def aging_bucket(self):
        days = self.aging_days
        if days <= 30:
            return "fresh"
        elif days <= 60:
            return "moderate"
        elif days <= 90:
            return "slow"
        return "deadstock"


class TPSOrder(db.Model):
    """Order transaksi pembelian instrumen musik (Delivery via ekspedisi atau Click & Collect di showroom)."""
    __tablename__ = "tps__orders"

    id = db.Column(db.Integer, primary_key=True)
    invoice_code = db.Column(db.String(100), unique=True, nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("tps__customers.id", ondelete="SET NULL"), nullable=True)
    product_id = db.Column(db.Integer, db.ForeignKey("tps__products.id", ondelete="RESTRICT"), nullable=False)
    variant_id = db.Column(db.Integer, db.ForeignKey("tps__product_variants.id", ondelete="SET NULL"), nullable=True)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    unit_price = db.Column(db.BigInteger, default=0, nullable=False)
    total_price = db.Column(db.BigInteger, default=0, nullable=False)
    fulfillment_method = db.Column(
        db.Enum("delivery", "click_and_collect", name="fulfillment_method_enum"),
        default="delivery",
        nullable=False
    )
    pickup_branch_id = db.Column(db.Integer, db.ForeignKey("tps__store_branches.id", ondelete="SET NULL"), nullable=True)
    pickup_code = db.Column(db.String(50), nullable=True)
    pickup_status = db.Column(
        db.Enum("pending", "ready", "collected", name="pickup_status_enum"),
        default="pending",
        nullable=False
    )
    shipping_address = db.Column(db.Text, nullable=True)
    shipping_courier = db.Column(db.String(100), nullable=True)
    shipping_cost = db.Column(db.BigInteger, default=0, nullable=False)
    tracking_number = db.Column(db.String(100), nullable=True)
    payment_method = db.Column(db.String(100), default="Swee Lee Pay", nullable=False)
    payment_status = db.Column(
        db.Enum("pending", "paid", "refunded", "cancelled", name="payment_status_enum"),
        default="paid",
        nullable=False
    )
    order_status = db.Column(
        db.Enum("processing", "ready_for_pickup", "shipped", "delivered", "completed", "cancelled", name="order_status_enum"),
        default="processing",
        nullable=False
    )
    buyer_name = db.Column(db.String(100), nullable=False)
    buyer_email = db.Column(db.String(120), nullable=False)
    buyer_phone = db.Column(db.String(50), nullable=False)
    handled_by_staff_id = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="SET NULL"), nullable=True)
    paid_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    customer = db.relationship("TPSCustomer", foreign_keys=[customer_id], lazy=True)
    product = db.relationship("TPSProduct", foreign_keys=[product_id], lazy=True)
    variant = db.relationship("TPSProductVariant", foreign_keys=[variant_id], lazy=True)
    pickup_branch = db.relationship("TPSStoreBranch", foreign_keys=[pickup_branch_id], lazy=True)
    handled_by_staff = db.relationship("OASStaff", foreign_keys=[handled_by_staff_id], lazy=True)

    @property
    def status(self):
        return self.payment_status

    @property
    def ticket_code(self):
        return self.pickup_code

    @property
    def ticket_status(self):
        return "used" if self.pickup_status == "collected" else "valid"


class TPSWishlist(db.Model):
    """Daftar instrumen musik favorit / wishlist pembeli."""
    __tablename__ = "tps__wishlists"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("tps__customers.id", ondelete="CASCADE"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("tps__products.id", ondelete="CASCADE"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    customer = db.relationship("TPSCustomer", foreign_keys=[customer_id], lazy=True)
    product = db.relationship("TPSProduct", foreign_keys=[product_id], lazy=True)


class TPSPurchaseOrder(db.Model):
    """Alur restock pengadaan barang supplier (Warehouse Staff -> Manager -> Finance -> Supplier)."""
    __tablename__ = "tps__purchase_orders"

    id = db.Column(db.Integer, primary_key=True)
    po_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("kms__brands_suppliers.id", ondelete="RESTRICT"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("tps__products.id", ondelete="RESTRICT"), nullable=False)
    variant_id = db.Column(db.Integer, db.ForeignKey("tps__product_variants.id", ondelete="SET NULL"), nullable=True)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    unit_cost = db.Column(db.BigInteger, default=0, nullable=False)
    total_cost = db.Column(db.BigInteger, default=0, nullable=False)
    status = db.Column(
        db.Enum("draft", "submitted", "approved", "paid", "received", "rejected", name="po_status_enum"),
        default="submitted",
        nullable=False
    )
    destination_branch_id = db.Column(db.Integer, db.ForeignKey("tps__store_branches.id", ondelete="SET NULL"), nullable=True)
    requested_by = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="RESTRICT"), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="SET NULL"), nullable=True)
    paid_by = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="SET NULL"), nullable=True)
    received_by = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="SET NULL"), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    supplier = db.relationship("TPSBrandSupplier", foreign_keys=[supplier_id], lazy=True)
    product = db.relationship("TPSProduct", foreign_keys=[product_id], lazy=True)
    variant = db.relationship("TPSProductVariant", foreign_keys=[variant_id], lazy=True)
    destination_branch = db.relationship("TPSStoreBranch", foreign_keys=[destination_branch_id], lazy=True)
    requester = db.relationship("OASStaff", foreign_keys=[requested_by], lazy=True)
    approver = db.relationship("OASStaff", foreign_keys=[approved_by], lazy=True)
    payer = db.relationship("OASStaff", foreign_keys=[paid_by], lazy=True)
    receiver = db.relationship("OASStaff", foreign_keys=[received_by], lazy=True)


class TPSInventoryLog(db.Model):
    """Pencatatan mutasi stok fisik & nomor seri (serial number) instrumen."""
    __tablename__ = "tps__inventory_logs"

    id = db.Column(db.Integer, primary_key=True)
    variant_id = db.Column(db.Integer, db.ForeignKey("tps__product_variants.id", ondelete="CASCADE"), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey("tps__store_branches.id", ondelete="SET NULL"), nullable=True)
    change_type = db.Column(
        db.Enum("po_received", "sale_delivery", "sale_click_and_collect", "manual_adjustment", "return_refund", name="inventory_change_type_enum"),
        nullable=False
    )
    quantity_change = db.Column(db.Integer, nullable=False)
    stock_before = db.Column(db.Integer, nullable=False)
    stock_after = db.Column(db.Integer, nullable=False)
    serial_number = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    reference_id = db.Column(db.String(100), nullable=True)
    logged_by = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    variant = db.relationship("TPSProductVariant", foreign_keys=[variant_id], lazy=True)
    branch = db.relationship("TPSStoreBranch", foreign_keys=[branch_id], lazy=True)
    staff = db.relationship("OASStaff", foreign_keys=[logged_by], lazy=True)


# ============================================================================
# 3. KMS (KNOWLEDGE MANAGEMENT SYSTEM) - Pusat Pengetahuan & Panduan Gear
# ============================================================================

class KMSCategory(db.Model):
    """Kategori artikel pengetahuan dan FAQ."""
    __tablename__ = "kms__categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    icon = db.Column(db.String(50), nullable=True)
    sort_order = db.Column(db.Integer, default=0, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    articles = db.relationship("KMSArticle", backref="category_rel", lazy="dynamic")
    faqs = db.relationship("KMSFAQ", backref="category_rel", lazy="dynamic")


class KMSArticle(db.Model):
    """Artikel panduan gear publik (customer) dan SOP internal divisi (internal)."""
    __tablename__ = "kms__articles"

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey("kms__categories.id", ondelete="RESTRICT"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False)
    audience_type = db.Column(
        db.Enum("customer", "internal", name="kms_audience_enum"),
        default="customer",
        nullable=False,
    )
    target_role = db.Column(db.String(50), default="public", nullable=False)
    sop_code = db.Column(db.String(30), nullable=True)
    priority_level = db.Column(
        db.Enum("standard", "mandatory", "critical", name="kms_priority_enum"),
        default="standard",
        nullable=False,
    )
    content = db.Column(db.Text, nullable=False)
    excerpt = db.Column(db.Text, nullable=True)
    author_staff_id = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="SET NULL"), nullable=True)
    is_published = db.Column(db.Boolean, default=True, nullable=False)
    view_count = db.Column(db.Integer, default=0, nullable=False)
    helpful_count = db.Column(db.Integer, default=0, nullable=False)
    not_helpful_count = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    author = db.relationship("OASStaff", foreign_keys=[author_staff_id], lazy=True)
    feedbacks = db.relationship("KMSArticleFeedback", backref="article_rel", lazy="dynamic", cascade="all, delete-orphan")


class KMSArticleFeedback(db.Model):
    """Umpan balik pengunjung terhadap artikel KMS."""
    __tablename__ = "kms__article_feedback"

    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey("kms__articles.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.Integer, nullable=True)
    is_helpful = db.Column(db.Boolean, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class KMSFAQ(db.Model):
    """Tanya jawab resmi seputar garansi, pengiriman kayu, dan Click & Collect."""
    __tablename__ = "kms__faqs"

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey("kms__categories.id", ondelete="SET NULL"), nullable=True)
    question = db.Column(db.String(255), nullable=False)
    answer = db.Column(db.Text, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    sort_order = db.Column(db.Integer, default=0, nullable=False)
    view_count = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


# ============================================================================
# 5. DSS (DECISION SUPPORT SYSTEM) - Smart PO Restock Prioritization (AHP-TOPSIS)
# ============================================================================

class DSSCriterion(db.Model):
    """Master kriteria penilaian AHP-TOPSIS untuk prioritas restock pengadaan instrumen."""
    __tablename__ = "dss__criteria"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(10), unique=True, nullable=False, index=True)  # C1..C5
    name = db.Column(db.String(100), nullable=False)
    attribute_type = db.Column(
        db.Enum("benefit", "cost", name="dss_attribute_type_enum"),
        nullable=False
    )
    weight = db.Column(db.Float, default=0.0, nullable=False)  # Bobot eigenvector hasil AHP
    description = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    subcriteria_ranges = db.relationship("DSSSubcriterionRange", backref="criterion_rel", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "attribute_type": self.attribute_type,
            "weight": round(float(self.weight), 4) if self.weight is not None else 0.0,
            "description": self.description,
            "ranges": [r.to_dict() for r in self.subcriteria_ranges.order_by(DSSSubcriterionRange.score_value.desc()).all()],
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class DSSSubcriterionRange(db.Model):
    """Skala parameter & ambang batas kriteria penilaian sebagai acuan interpretasi manajerial."""
    __tablename__ = "dss__subcriteria_ranges"

    id = db.Column(db.Integer, primary_key=True)
    criterion_id = db.Column(db.Integer, db.ForeignKey("dss__criteria.id", ondelete="CASCADE"), nullable=False)
    range_label = db.Column(db.String(200), nullable=False)
    min_val = db.Column(db.Float, nullable=True)
    max_val = db.Column(db.Float, nullable=True)
    score_value = db.Column(db.Integer, nullable=False)  # 1 - 5
    notes = db.Column(db.String(255), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "criterion_id": self.criterion_id,
            "range_label": self.range_label,
            "min_val": self.min_val,
            "max_val": self.max_val,
            "score_value": self.score_value,
            "notes": self.notes,
        }


class DSSAHPMatrix(db.Model):
    """Matriks perbandingan berpasangan AHP 5x5 antar kriteria."""
    __tablename__ = "dss__ahp_matrices"

    id = db.Column(db.Integer, primary_key=True)
    row_criterion_id = db.Column(db.Integer, db.ForeignKey("dss__criteria.id", ondelete="CASCADE"), nullable=False)
    col_criterion_id = db.Column(db.Integer, db.ForeignKey("dss__criteria.id", ondelete="CASCADE"), nullable=False)
    comparison_value = db.Column(db.Float, nullable=False, default=1.0)
    updated_by = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="SET NULL"), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    row_criterion = db.relationship("DSSCriterion", foreign_keys=[row_criterion_id], lazy=True)
    col_criterion = db.relationship("DSSCriterion", foreign_keys=[col_criterion_id], lazy=True)
    staff = db.relationship("OASStaff", foreign_keys=[updated_by], lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "row_criterion_id": self.row_criterion_id,
            "col_criterion_id": self.col_criterion_id,
            "row_code": self.row_criterion.code if self.row_criterion else None,
            "col_code": self.col_criterion.code if self.col_criterion else None,
            "comparison_value": float(self.comparison_value),
            "updated_by": self.updated_by,
            "updated_by_name": self.staff.name if self.staff else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class DSSSession(db.Model):
    """Header sesi perhitungan simulasi anggaran restock PO berbasis TOPSIS."""
    __tablename__ = "dss__sessions"

    id = db.Column(db.Integer, primary_key=True)
    session_code = db.Column(db.String(100), unique=True, nullable=False, index=True)
    executed_by = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="SET NULL"), nullable=True)
    title = db.Column(db.String(200), nullable=False)
    budget_limit = db.Column(db.Numeric(15, 2), nullable=False)
    total_allocated_cost = db.Column(db.Numeric(15, 2), default=0, nullable=False)
    lambda_max = db.Column(db.Float, nullable=True)
    consistency_index = db.Column(db.Float, nullable=True)
    consistency_ratio = db.Column(db.Float, nullable=True)
    status = db.Column(
        db.Enum("simulated", "po_generated", "archived", name="dss_session_status_enum"),
        default="simulated",
        nullable=False
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    executor = db.relationship("OASStaff", foreign_keys=[executed_by], lazy=True)
    topsis_results = db.relationship("DSSTopsisResult", backref="session_rel", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self, include_results=False):
        data = {
            "id": self.id,
            "session_code": self.session_code,
            "executed_by": self.executed_by,
            "executed_by_name": self.executor.name if self.executor else "System / Manager",
            "title": self.title,
            "budget_limit": float(self.budget_limit or 0),
            "total_allocated_cost": float(self.total_allocated_cost or 0),
            "lambda_max": round(float(self.lambda_max), 4) if self.lambda_max is not None else None,
            "consistency_index": round(float(self.consistency_index), 5) if self.consistency_index is not None else None,
            "consistency_ratio": round(float(self.consistency_ratio), 5) if self.consistency_ratio is not None else None,
            "is_consistent": (self.consistency_ratio is not None and self.consistency_ratio <= 0.10),
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "total_skus": self.topsis_results.count(),
            "within_budget_skus": self.topsis_results.filter_by(is_within_budget=True).count(),
        }
        if include_results:
            data["results"] = [r.to_dict() for r in self.topsis_results.order_by(DSSTopsisResult.rank_number.asc()).all()]
        return data


class DSSTopsisResult(db.Model):
    """Detail perangkingan TOPSIS per varian SKU instrumen musik."""
    __tablename__ = "dss__topsis_results"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("dss__sessions.id", ondelete="CASCADE"), nullable=False)
    variant_id = db.Column(db.Integer, db.ForeignKey("tps__product_variants.id", ondelete="CASCADE"), nullable=False)
    raw_c1_stock = db.Column(db.Float, nullable=False)
    raw_c2_sales = db.Column(db.Float, nullable=False)
    raw_c3_margin = db.Column(db.Float, nullable=False)
    raw_c4_demand = db.Column(db.Float, nullable=False)
    raw_c5_cogs = db.Column(db.Float, nullable=False)
    norm_c1 = db.Column(db.Float, nullable=False)
    norm_c2 = db.Column(db.Float, nullable=False)
    norm_c3 = db.Column(db.Float, nullable=False)
    norm_c4 = db.Column(db.Float, nullable=False)
    norm_c5 = db.Column(db.Float, nullable=False)
    d_plus = db.Column(db.Float, nullable=False)
    d_minus = db.Column(db.Float, nullable=False)
    preference_score = db.Column(db.Float, nullable=False)
    rank_number = db.Column(db.Integer, nullable=False)
    priority_tier = db.Column(
        db.Enum("high_priority", "medium_priority", "low_priority", name="dss_priority_tier_enum"),
        nullable=False
    )
    recommended_restock_qty = db.Column(db.Integer, default=0, nullable=False)
    estimated_po_cost = db.Column(db.Numeric(15, 2), default=0, nullable=False)
    is_within_budget = db.Column(db.Boolean, default=False, nullable=False)

    variant = db.relationship("TPSProductVariant", foreign_keys=[variant_id], lazy=True)

    def to_dict(self):
        v = self.variant
        p = v.product_rel if (v and hasattr(v, "product_rel")) else None
        b = p.brand if (p and hasattr(p, "brand")) else None
        return {
            "id": self.id,
            "session_id": self.session_id,
            "variant_id": self.variant_id,
            "sku_code": v.sku_code if v else f"SKU-{self.variant_id}",
            "variant_name": v.variant_name if v else "Standard",
            "color_finish": v.color_finish if v else "",
            "product_id": p.id if p else None,
            "product_name": p.name if p else "Instrumen Musik",
            "instrument_type": p.instrument_type if p else "Instrument",
            "category": p.category if p else "Gear",
            "brand_id": b.id if b else None,
            "brand_name": b.name if b else "Official",
            "image_url": p.image_url if p else None,
            "cost_price": float(v.cost_price) if v else 0,
            "selling_price": float(v.price) if v else 0,
            "current_stock": int(v.stock) if v else int(self.raw_c1_stock),
            # Raw Criteria Values
            "raw_c1_stock": float(self.raw_c1_stock),
            "raw_c2_sales": float(self.raw_c2_sales),
            "raw_c3_margin": round(float(self.raw_c3_margin), 2),
            "raw_c4_demand": float(self.raw_c4_demand),
            "raw_c5_cogs": float(self.raw_c5_cogs),
            # Weighted Normalized (Y)
            "norm_c1": round(float(self.norm_c1), 5),
            "norm_c2": round(float(self.norm_c2), 5),
            "norm_c3": round(float(self.norm_c3), 5),
            "norm_c4": round(float(self.norm_c4), 5),
            "norm_c5": round(float(self.norm_c5), 5),
            # Distances & Score
            "d_plus": round(float(self.d_plus), 5),
            "d_minus": round(float(self.d_minus), 5),
            "preference_score": round(float(self.preference_score), 4),
            "rank_number": self.rank_number,
            "priority_tier": self.priority_tier,
            "recommended_restock_qty": self.recommended_restock_qty,
            "estimated_po_cost": float(self.estimated_po_cost or 0),
            "is_within_budget": bool(self.is_within_budget),
        }


# ============================================================================
# ALIAS KOMPATIBILITAS (Mencegah runtime break pada kode backend yang ada)
# ============================================================================
User = OASStaff
Customer = TPSCustomer
Organizer = TPSBrandSupplier
BrandSupplier = TPSBrandSupplier
Venue = TPSStoreBranch
StoreBranch = TPSStoreBranch
Event = TPSProduct
Product = TPSProduct
TicketTier = TPSProductVariant
ProductVariant = TPSProductVariant
Transaction = TPSOrder
Order = TPSOrder
PurchaseOrder = TPSPurchaseOrder
InventoryLog = TPSInventoryLog
KnowledgeCategory = KMSCategory
Article = KMSArticle
ArticleFeedback = KMSArticleFeedback
FAQ = KMSFAQ
Announcement = OASAnnouncement
SupportTicket = OASSupportTicket
SupportMessage = OASSupportMessage
SystemSetting = OASSystemSetting
SavedEvent = TPSWishlist
Notification = OASNotification
KMSBrandSupplier = TPSBrandSupplier
KMSFaq = KMSFAQ


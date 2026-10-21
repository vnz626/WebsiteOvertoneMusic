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
    __tablename__ = "oas_staff"

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
    branch_id = db.Column(db.Integer, db.ForeignKey("tps_store_branches.id", ondelete="SET NULL"), nullable=True)
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
    __tablename__ = "oas_announcements"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    audience_role = db.Column(db.String(50), default="all", nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("oas_staff.id", ondelete="CASCADE"), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    author = db.relationship("OASStaff", foreign_keys=[created_by], lazy=True)


class OASNotification(db.Model):
    """Notifikasi in-dashboard untuk staf dan customer."""
    __tablename__ = "oas_notifications"

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
    __tablename__ = "oas_system_settings"

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
    __tablename__ = "tps_customers"

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
    __tablename__ = "tps_brands_suppliers"

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
    __tablename__ = "tps_store_branches"

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
    """Layanan bantuan pelanggan, konsultasi instrumen, dan klaim garansi."""
    __tablename__ = "oas_support_tickets"

    id = db.Column(db.Integer, primary_key=True)
    ticket_number = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey("tps_customers.id", ondelete="SET NULL"), nullable=True)
    subject = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), default="product_inquiry", nullable=False)
    status = db.Column(db.Enum("open", "in_progress", "resolved", "closed", name="support_status_enum"), default="open", nullable=False)
    priority = db.Column(db.Enum("low", "medium", "high", "urgent", name="support_priority_enum"), default="medium", nullable=False)
    assigned_staff_id = db.Column(db.Integer, db.ForeignKey("oas_staff.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    customer = db.relationship("TPSCustomer", foreign_keys=[customer_id], lazy=True)
    assigned_staff = db.relationship("OASStaff", foreign_keys=[assigned_staff_id], lazy=True)
    messages = db.relationship("OASSupportMessage", backref="ticket_rel", lazy="dynamic", cascade="all, delete-orphan")


class OASSupportMessage(db.Model):
    """Pesan percakapan dalam tiket dukungan."""
    __tablename__ = "oas_support_messages"

    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey("oas_support_tickets.id", ondelete="CASCADE"), nullable=False)
    sender_type = db.Column(db.Enum("staff", "customer", name="sender_type_enum"), nullable=False)
    sender_id = db.Column(db.Integer, nullable=False)
    sender_name = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    attachment_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class TPSProduct(db.Model):
    """Master katalog instrumen musik dan peralatan audio pro."""
    __tablename__ = "tps_products"

    id = db.Column(db.Integer, primary_key=True)
    brand_id = db.Column(db.Integer, db.ForeignKey("tps_brands_suppliers.id", ondelete="RESTRICT"), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey("tps_store_branches.id", ondelete="SET NULL"), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    sku_prefix = db.Column(db.String(50), nullable=False)
    instrument_type = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    specifications = db.Column(db.Text, nullable=True)
    warranty_months = db.Column(db.Integer, default=12, nullable=False)
    image_url = db.Column(db.String(255), nullable=True)
    status = db.Column(db.Enum("draft", "published", "archived", name="product_status_enum"), default="published", nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("oas_staff.id", ondelete="SET NULL"), nullable=True)
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
    __tablename__ = "tps_product_variants"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("tps_products.id", ondelete="CASCADE"), nullable=False)
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

    @property
    def quota(self):
        return self.stock

    @property
    def remaining_quota(self):
        return self.stock

    @property
    def tier_name(self):
        return self.variant_name


class TPSOrder(db.Model):
    """Order transaksi pembelian instrumen musik (Delivery via ekspedisi atau Click & Collect di showroom)."""
    __tablename__ = "tps_orders"

    id = db.Column(db.Integer, primary_key=True)
    invoice_code = db.Column(db.String(100), unique=True, nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("tps_customers.id", ondelete="SET NULL"), nullable=True)
    product_id = db.Column(db.Integer, db.ForeignKey("tps_products.id", ondelete="RESTRICT"), nullable=False)
    variant_id = db.Column(db.Integer, db.ForeignKey("tps_product_variants.id", ondelete="SET NULL"), nullable=True)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    unit_price = db.Column(db.BigInteger, default=0, nullable=False)
    total_price = db.Column(db.BigInteger, default=0, nullable=False)
    fulfillment_method = db.Column(
        db.Enum("delivery", "click_and_collect", name="fulfillment_method_enum"),
        default="delivery",
        nullable=False
    )
    pickup_branch_id = db.Column(db.Integer, db.ForeignKey("tps_store_branches.id", ondelete="SET NULL"), nullable=True)
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
    handled_by_staff_id = db.Column(db.Integer, db.ForeignKey("oas_staff.id", ondelete="SET NULL"), nullable=True)
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
    __tablename__ = "tps_wishlists"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("tps_customers.id", ondelete="CASCADE"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("tps_products.id", ondelete="CASCADE"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    customer = db.relationship("TPSCustomer", foreign_keys=[customer_id], lazy=True)
    product = db.relationship("TPSProduct", foreign_keys=[product_id], lazy=True)


class TPSPurchaseOrder(db.Model):
    """Alur restock pengadaan barang supplier (Warehouse Staff -> Manager -> Finance -> Supplier)."""
    __tablename__ = "tps_purchase_orders"

    id = db.Column(db.Integer, primary_key=True)
    po_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("tps_brands_suppliers.id", ondelete="RESTRICT"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("tps_products.id", ondelete="RESTRICT"), nullable=False)
    variant_id = db.Column(db.Integer, db.ForeignKey("tps_product_variants.id", ondelete="SET NULL"), nullable=True)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    unit_cost = db.Column(db.BigInteger, default=0, nullable=False)
    total_cost = db.Column(db.BigInteger, default=0, nullable=False)
    status = db.Column(
        db.Enum("draft", "submitted", "approved", "paid", "received", "rejected", name="po_status_enum"),
        default="submitted",
        nullable=False
    )
    destination_branch_id = db.Column(db.Integer, db.ForeignKey("tps_store_branches.id", ondelete="SET NULL"), nullable=True)
    requested_by = db.Column(db.Integer, db.ForeignKey("oas_staff.id", ondelete="RESTRICT"), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey("oas_staff.id", ondelete="SET NULL"), nullable=True)
    paid_by = db.Column(db.Integer, db.ForeignKey("oas_staff.id", ondelete="SET NULL"), nullable=True)
    received_by = db.Column(db.Integer, db.ForeignKey("oas_staff.id", ondelete="SET NULL"), nullable=True)
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
    __tablename__ = "tps_inventory_logs"

    id = db.Column(db.Integer, primary_key=True)
    variant_id = db.Column(db.Integer, db.ForeignKey("tps_product_variants.id", ondelete="CASCADE"), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey("tps_store_branches.id", ondelete="SET NULL"), nullable=True)
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
    logged_by = db.Column(db.Integer, db.ForeignKey("oas_staff.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    variant = db.relationship("TPSProductVariant", foreign_keys=[variant_id], lazy=True)
    branch = db.relationship("TPSStoreBranch", foreign_keys=[branch_id], lazy=True)
    staff = db.relationship("OASStaff", foreign_keys=[logged_by], lazy=True)


# ============================================================================
# 3. KMS (KNOWLEDGE MANAGEMENT SYSTEM) - Pusat Pengetahuan & Panduan Gear
# ============================================================================

class KMSCategory(db.Model):
    """Kategori artikel pengetahuan dan FAQ."""
    __tablename__ = "kms_categories"

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
    """Artikel panduan gear, tips pemeliharaan instrumen, dan SOP internal."""
    __tablename__ = "kms_articles"

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey("kms_categories.id", ondelete="RESTRICT"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False)
    content = db.Column(db.Text, nullable=False)
    excerpt = db.Column(db.Text, nullable=True)
    author_staff_id = db.Column(db.Integer, db.ForeignKey("oas_staff.id", ondelete="SET NULL"), nullable=True)
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
    __tablename__ = "kms_article_feedback"

    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey("kms_articles.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.Integer, nullable=True)
    is_helpful = db.Column(db.Boolean, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class KMSFAQ(db.Model):
    """Tanya jawab resmi seputar garansi, pengiriman kayu, dan Click & Collect."""
    __tablename__ = "kms_faqs"

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey("kms_categories.id", ondelete="SET NULL"), nullable=True)
    question = db.Column(db.String(255), nullable=False)
    answer = db.Column(db.Text, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    sort_order = db.Column(db.Integer, default=0, nullable=False)
    view_count = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


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

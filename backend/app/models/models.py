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
    """Akun pegawai internal toko cinema gear (super_admin, manager, finance, warehouse_staff, store_staff)."""
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
    """Pengumuman internal kantor toko cinema gear & memo staf."""
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
    """Notifikasi in-dashboard untuk staf dan customer (Fitur 1.2)."""
    __tablename__ = "oas__notifications"

    id = db.Column(db.Integer, primary_key=True)
    recipient_kind = db.Column(db.String(20), default="user", nullable=False)
    recipient_type = db.Column(db.String(20), default="user", nullable=False)  # staff / customer / user
    recipient_id = db.Column(db.Integer, nullable=False, index=True)
    recipient_role = db.Column(db.String(50), nullable=True, index=True)  # manager, warehouse_staff, store_staff, etc.
    category = db.Column(db.String(50), nullable=False)
    type = db.Column(db.String(50), nullable=True)  # stock_alert, po_approval, support_ticket, order_status, refund
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False)
    link = db.Column(db.String(255), nullable=True)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    read_at = db.Column(db.DateTime, nullable=True)
    dedupe_key = db.Column(db.String(150), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "recipient_kind": self.recipient_kind,
            "recipient_type": self.recipient_type,
            "recipient_id": self.recipient_id,
            "recipient_role": self.recipient_role,
            "category": self.category,
            "type": self.type or self.category,
            "title": self.title,
            "body": self.body,
            "link": self.link,
            "is_read": self.is_read,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "dedupe_key": self.dedupe_key,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class OASNotificationOutbox(db.Model):
    """Antrean pengiriman pesan asynchronous email & WhatsApp (Fitur 1.3)."""
    __tablename__ = "oas__notification_outbox"

    id = db.Column(db.Integer, primary_key=True)
    channel = db.Column(db.String(20), nullable=False)  # 'email' / 'whatsapp'
    to_address = db.Column(db.String(150), nullable=False)
    template_key = db.Column(db.String(100), nullable=False)
    payload_json = db.Column(db.JSON, nullable=False)
    status = db.Column(db.String(20), default="pending", nullable=False)  # 'pending', 'sent', 'failed'
    attempts = db.Column(db.Integer, default=0, nullable=False)
    last_error = db.Column(db.Text, nullable=True)
    scheduled_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    sent_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.Index("idx_status_scheduled", "status", "scheduled_at"),
        db.Index("idx_channel", "channel"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "channel": self.channel,
            "to_address": self.to_address,
            "template_key": self.template_key,
            "payload_json": self.payload_json,
            "status": self.status,
            "attempts": self.attempts,
            "last_error": self.last_error,
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class OASSystemSetting(db.Model):
    """Konfigurasi global toko cinema gear."""
    __tablename__ = "oas__system_settings"

    id = db.Column(db.Integer, primary_key=True)
    setting_key = db.Column(db.String(100), unique=True, nullable=False)
    setting_value = db.Column(db.Text, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class OASAuditLog(db.Model):
    """Jejak audit trail seluruh aktivitas sensitif sistem (Fitur 1.1)."""
    __tablename__ = "oas__audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    actor_type = db.Column(db.String(20), default="staff", nullable=False)  # staff / customer / system
    actor_id = db.Column(db.Integer, nullable=True, index=True)
    actor_role = db.Column(db.String(50), nullable=True)
    actor_name = db.Column(db.String(150), nullable=True)
    action = db.Column(db.String(100), nullable=False, index=True)  # e.g. UPDATE_PRICE, APPROVE_PO, PAY_PO
    entity_type = db.Column(db.String(50), nullable=False)  # e.g. product, purchase_order, staff
    entity_id = db.Column(db.String(50), nullable=True)
    before_json = db.Column(db.JSON, nullable=True)
    after_json = db.Column(db.JSON, nullable=True)
    ip = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        db.Index("idx_entity", "entity_type", "entity_id"),
        db.Index("idx_actor_created", "actor_id", "created_at"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "actor_type": self.actor_type,
            "actor_id": self.actor_id,
            "actor_role": self.actor_role,
            "actor_name": self.actor_name or "System / Anon",
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": str(self.entity_id) if self.entity_id is not None else None,
            "before_json": self.before_json,
            "after_json": self.after_json,
            "ip": self.ip,
            "user_agent": self.user_agent,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ============================================================================
# 2. TPS (TRANSACTION PROCESSING SYSTEM) - Operasional Retail, Gudang & Penjualan
# ============================================================================

class TPSCustomer(db.Model):
    """Akun filmmaker / pelanggan ritel cinema gear."""
    __tablename__ = "tps__customers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(30), nullable=True)
    address = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    notify_email = db.Column(db.Boolean, default=True, nullable=False)
    notify_whatsapp = db.Column(db.Boolean, default=True, nullable=False)
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
            "notify_email": bool(self.notify_email),
            "notify_whatsapp": bool(self.notify_whatsapp),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TPSBrandSupplier(db.Model):
    """Merek & Supplier resmi cinema gear (Sony, RED, Canon, DJI, Aputure, Rode, dll.)."""
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
    product_id = db.Column(db.Integer, db.ForeignKey("tps__products.id", ondelete="RESTRICT"), nullable=True)
    variant_id = db.Column(db.Integer, db.ForeignKey("tps__product_variants.id", ondelete="SET NULL"), nullable=True)
    bundle_id = db.Column(db.Integer, db.ForeignKey("tps__bundles.id", ondelete="SET NULL"), nullable=True)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    unit_price = db.Column(db.BigInteger, default=0, nullable=False)
    total_price = db.Column(db.BigInteger, default=0, nullable=False)
    fulfillment_method = db.Column(
        db.String(50),
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
    bundle = db.relationship("TPSBundle", foreign_keys=[bundle_id], lazy=True)
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


class TPSOrderStatusHistory(db.Model):
    """Jejak kronologis timeline siklus order status (Fitur 1.3)."""
    __tablename__ = "tps__order_status_history"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("tps__orders.id", ondelete="CASCADE"), nullable=False, index=True)
    status = db.Column(db.String(50), nullable=False)
    note = db.Column(db.Text, nullable=True)
    actor = db.Column(db.String(150), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    order = db.relationship("TPSOrder", backref=db.backref("timeline_entries", lazy="dynamic", cascade="all, delete-orphan", order_by="TPSOrderStatusHistory.created_at.asc()"))

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "status": self.status,
            "note": self.note,
            "actor": self.actor or "Sistem OAS/TPS",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TPSReturnRequest(db.Model):
    """Pengajuan klaim retur / garansi dari pelanggan (Fitur 1.5)."""
    __tablename__ = "tps__return_requests"

    id = db.Column(db.Integer, primary_key=True)
    return_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    order_id = db.Column(db.Integer, db.ForeignKey("tps__orders.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("tps__customers.id", ondelete="SET NULL"), nullable=True, index=True)
    reason_code = db.Column(db.String(50), nullable=False)  # damaged_shipping, defective_hardware, wrong_item, not_as_described, change_of_mind
    description = db.Column(db.Text, nullable=False)
    resolution = db.Column(db.String(30), default="refund", nullable=False)  # refund, replace, repair
    status = db.Column(db.String(30), default="requested", nullable=False, index=True)  # requested, approved, rejected, received, refunded, cancelled
    reviewed_by = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="SET NULL"), nullable=True)
    review_note = db.Column(db.Text, nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    received_by = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="SET NULL"), nullable=True)
    received_note = db.Column(db.Text, nullable=True)
    received_at = db.Column(db.DateTime, nullable=True)
    refund_amount = db.Column(db.Numeric(15, 2), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    order = db.relationship("TPSOrder", backref=db.backref("return_requests", lazy="dynamic", cascade="all, delete-orphan"))
    customer = db.relationship("TPSCustomer", foreign_keys=[customer_id], lazy=True)
    reviewer = db.relationship("OASStaff", foreign_keys=[reviewed_by], lazy=True)
    receiver = db.relationship("OASStaff", foreign_keys=[received_by], lazy=True)
    photos = db.relationship("TPSReturnRequestPhoto", backref="return_request", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "return_number": self.return_number,
            "order_id": self.order_id,
            "invoice_code": self.order.invoice_code if self.order else None,
            "product_name": (getattr(self.order.product, "name", None) or getattr(self.order.product, "title", "Instrumen")) if self.order else None,
            "customer_id": self.customer_id,
            "customer_name": self.customer.name if self.customer else (self.order.buyer_name if self.order else None),
            "customer_email": self.customer.email if self.customer else (self.order.buyer_email if self.order else None),
            "customer_phone": self.customer.phone if self.customer else (self.order.buyer_phone if self.order else None),
            "reason_code": self.reason_code,
            "description": self.description,
            "resolution": self.resolution,
            "status": self.status,
            "reviewed_by": self.reviewed_by,
            "reviewer_name": self.reviewer.name if self.reviewer else None,
            "review_note": self.review_note,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "received_by": self.received_by,
            "receiver_name": self.receiver.name if self.receiver else None,
            "received_note": self.received_note,
            "received_at": self.received_at.isoformat() if self.received_at else None,
            "refund_amount": float(self.refund_amount) if self.refund_amount is not None else (float(self.order.total_price) if self.order else 0),
            "photos": [p.photo_url for p in self.photos.all()],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TPSReturnRequestPhoto(db.Model):
    """Foto bukti kerusakan/cacat fisik instrumen untuk klaim retur (Fitur 1.5)."""
    __tablename__ = "tps__return_request_photos"

    id = db.Column(db.Integer, primary_key=True)
    return_request_id = db.Column(db.Integer, db.ForeignKey("tps__return_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    photo_url = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "return_request_id": self.return_request_id,
            "photo_url": self.photo_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TPSWishlist(db.Model):
    """Daftar instrumen musik favorit / wishlist pembeli."""
    __tablename__ = "tps__wishlists"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("tps__customers.id", ondelete="CASCADE"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("tps__products.id", ondelete="CASCADE"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    customer = db.relationship("TPSCustomer", foreign_keys=[customer_id], lazy=True)
    product = db.relationship("TPSProduct", foreign_keys=[product_id], lazy=True)


class TPSProductReview(db.Model):
    """Rating bintang & ulasan kepuasan filmmaker ritel atas cinema gear yang dibeli."""
    __tablename__ = "tps__product_reviews"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("tps__products.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("tps__customers.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id = db.Column(db.Integer, db.ForeignKey("tps__orders.id", ondelete="SET NULL"), nullable=True)
    variant_name = db.Column(db.String(100), nullable=True)
    rating = db.Column(db.Integer, default=5, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    comment = db.Column(db.Text, nullable=False)
    is_verified_purchase = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    product = db.relationship("TPSProduct", foreign_keys=[product_id], lazy=True)
    customer = db.relationship("TPSCustomer", foreign_keys=[customer_id], lazy=True)
    order = db.relationship("TPSOrder", foreign_keys=[order_id], lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "customer_id": self.customer_id,
            "customer_name": self.customer.name if self.customer else "Filmmaker Overtone",
            "order_id": self.order_id,
            "variant_name": self.variant_name,
            "rating": self.rating,
            "title": self.title,
            "comment": self.comment,
            "is_verified_purchase": self.is_verified_purchase,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


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
        db.String(50),
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


class OASStaffShift(db.Model):
    """Sesi absensi & mode operasional staf toko (Offline Showroom Staff vs Online CS Staff)."""
    __tablename__ = "oas__staff_shifts"

    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="CASCADE"), nullable=False, index=True)
    shift_mode = db.Column(
        db.Enum("offline_store", "online_cs", name="staff_shift_mode_enum"),
        default="offline_store",
        nullable=False
    )
    branch_id = db.Column(db.Integer, db.ForeignKey("tps__store_branches.id", ondelete="SET NULL"), nullable=True)
    clock_in_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    clock_out_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(
        db.Enum("active", "completed", name="staff_shift_status_enum"),
        default="active",
        nullable=False
    )
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    staff = db.relationship("OASStaff", foreign_keys=[staff_id], lazy=True)
    branch = db.relationship("TPSStoreBranch", foreign_keys=[branch_id], lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "staff_id": self.staff_id,
            "staff_name": self.staff.name if self.staff else None,
            "staff_email": self.staff.email if self.staff else None,
            "shift_mode": self.shift_mode,
            "branch_id": self.branch_id,
            "branch_name": self.branch.name if self.branch else ("Online CS Specialist" if self.shift_mode == "online_cs" else "Showroom"),
            "clock_in_at": self.clock_in_at.isoformat() if self.clock_in_at else None,
            "clock_out_at": self.clock_out_at.isoformat() if self.clock_out_at else None,
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class TPSBranchStock(db.Model):
    """Penyimpanan kuota stok fisik per varian SKU di cabang showroom & gudang pusat."""
    __tablename__ = "tps__branch_stocks"

    id = db.Column(db.Integer, primary_key=True)
    variant_id = db.Column(db.Integer, db.ForeignKey("tps__product_variants.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = db.Column(db.Integer, db.ForeignKey("tps__store_branches.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = db.Column(db.Integer, default=0, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("variant_id", "branch_id", name="uq_variant_branch"),
    )

    variant = db.relationship("TPSProductVariant", foreign_keys=[variant_id], lazy=True)
    branch = db.relationship("TPSStoreBranch", foreign_keys=[branch_id], lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "variant_id": self.variant_id,
            "branch_id": self.branch_id,
            "branch_name": self.branch.name if self.branch else None,
            "branch_type": self.branch.branch_type if self.branch else None,
            "branch_city": self.branch.city if self.branch else None,
            "quantity": self.quantity,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TPSStockTransfer(db.Model):
    """Pengajuan & eksekusi mutasi distribusi stok dari Gudang Pusat ke Cabang Showroom."""
    __tablename__ = "tps__stock_transfers"

    id = db.Column(db.Integer, primary_key=True)
    transfer_code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    variant_id = db.Column(db.Integer, db.ForeignKey("tps__product_variants.id", ondelete="CASCADE"), nullable=False)
    from_branch_id = db.Column(db.Integer, db.ForeignKey("tps__store_branches.id", ondelete="SET NULL"), nullable=True)
    to_branch_id = db.Column(db.Integer, db.ForeignKey("tps__store_branches.id", ondelete="CASCADE"), nullable=False)
    qty = db.Column(db.Integer, default=1, nullable=False)
    serial_numbers = db.Column(db.Text, nullable=True)
    requested_by = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="RESTRICT"), nullable=False)
    processed_by = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="SET NULL"), nullable=True)
    status = db.Column(
        db.Enum("pending_warehouse", "shipped_to_branch", "completed", name="stock_transfer_status_enum"),
        default="pending_warehouse",
        nullable=False
    )
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    variant = db.relationship("TPSProductVariant", foreign_keys=[variant_id], lazy=True)
    from_branch = db.relationship("TPSStoreBranch", foreign_keys=[from_branch_id], lazy=True)
    to_branch = db.relationship("TPSStoreBranch", foreign_keys=[to_branch_id], lazy=True)
    requester = db.relationship("OASStaff", foreign_keys=[requested_by], lazy=True)
    processor = db.relationship("OASStaff", foreign_keys=[processed_by], lazy=True)

    def to_dict(self):
        v = self.variant
        p = v.product_rel if (v and hasattr(v, "product_rel")) else None
        return {
            "id": self.id,
            "transfer_code": self.transfer_code,
            "variant_id": self.variant_id,
            "sku_code": v.sku_code if v else None,
            "variant_name": v.variant_name if v else None,
            "product_name": p.name if p else None,
            "from_branch_id": self.from_branch_id,
            "from_branch_name": self.from_branch.name if self.from_branch else "Gudang Pusat",
            "to_branch_id": self.to_branch_id,
            "to_branch_name": self.to_branch.name if self.to_branch else None,
            "qty": self.qty,
            "serial_numbers": self.serial_numbers,
            "requested_by": self.requested_by,
            "requester_name": self.requester.name if self.requester else None,
            "processed_by": self.processed_by,
            "processor_name": self.processor.name if self.processor else None,
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TPSBundle(db.Model):
    """Paket Bundling instrumen musik / Starter Rig kurasi manajer."""
    __tablename__ = "tps__bundles"

    id = db.Column(db.Integer, primary_key=True)
    bundle_code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    bundle_price = db.Column(db.BigInteger, default=0, nullable=False)
    normal_total_price = db.Column(db.BigInteger, default=0, nullable=False)
    total_cogs = db.Column(db.BigInteger, default=0, nullable=False)
    savings_amount = db.Column(db.BigInteger, default=0, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    image_url = db.Column(db.String(255), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    creator = db.relationship("OASStaff", foreign_keys=[created_by], lazy=True)
    items = db.relationship("TPSBundleItem", backref="bundle_rel", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self, include_items=True):
        items_list = []
        if include_items:
            items_list = [item.to_dict() for item in self.items.all()]
        margin_pct = 0.0
        if self.bundle_price > 0:
            margin_pct = round(((self.bundle_price - self.total_cogs) / self.bundle_price) * 100, 2)
        return {
            "id": self.id,
            "bundle_code": self.bundle_code,
            "name": self.name,
            "description": self.description,
            "bundle_price": self.bundle_price,
            "normal_total_price": self.normal_total_price,
            "total_cogs": self.total_cogs,
            "savings_amount": self.savings_amount,
            "profit_margin_percent": margin_pct,
            "is_active": self.is_active,
            "image_url": self.image_url,
            "created_by": self.created_by,
            "creator_name": self.creator.name if self.creator else "Store Manager",
            "items_count": self.items.count(),
            "items": items_list,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TPSBundleItem(db.Model):
    """Daftar item varian SKU penyusun paket bundle."""
    __tablename__ = "tps__bundle_items"

    id = db.Column(db.Integer, primary_key=True)
    bundle_id = db.Column(db.Integer, db.ForeignKey("tps__bundles.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = db.Column(db.Integer, db.ForeignKey("tps__product_variants.id", ondelete="CASCADE"), nullable=False, index=True)
    qty = db.Column(db.Integer, default=1, nullable=False)

    variant = db.relationship("TPSProductVariant", foreign_keys=[variant_id], lazy=True)

    def to_dict(self):
        v = self.variant
        p = v.product_rel if (v and hasattr(v, "product_rel")) else None
        return {
            "id": self.id,
            "bundle_id": self.bundle_id,
            "variant_id": self.variant_id,
            "qty": self.qty,
            "sku_code": v.sku_code if v else None,
            "variant_name": v.variant_name if v else None,
            "product_name": p.name if p else None,
            "brand_name": p.brand.name if (p and p.brand) else None,
            "price": v.price if v else 0,
            "cost_price": v.cost_price if v else 0,
            "stock": v.stock if v else 0,
            "image_url": p.image_url if p else None,
        }


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
    version = db.Column(db.Integer, default=1, nullable=False)
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


class KMSSopAcknowledgement(db.Model):
    """Konfirmasi pemahaman SOP oleh staf internal (Fitur 1.6)."""
    __tablename__ = "kms__sop_acknowledgements"

    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey("oas__staff.id", ondelete="CASCADE"), nullable=False, index=True)
    article_id = db.Column(db.Integer, db.ForeignKey("kms__articles.id", ondelete="CASCADE"), nullable=False, index=True)
    article_version = db.Column(db.Integer, default=1, nullable=False)
    acknowledged_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("staff_id", "article_id", "article_version", name="uq_staff_sop_ver"),
    )

    staff = db.relationship("OASStaff", foreign_keys=[staff_id], lazy=True)
    article = db.relationship("KMSArticle", foreign_keys=[article_id], lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "staff_id": self.staff_id,
            "staff_name": self.staff.name if self.staff else None,
            "staff_role": self.staff.role if self.staff else None,
            "article_id": self.article_id,
            "sop_code": self.article.sop_code if self.article else None,
            "sop_title": self.article.title if self.article else None,
            "article_version": self.article_version,
            "acknowledged_at": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
        }


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
# SUBSISTEM 6: ES (EXPERT SYSTEM / SISTEM PAKAR ENTERPRISE)
# ============================================================================

class ESSymptomFact(db.Model):
    """Katalog fakta teknis, gejala kerusakan QC, dan parameter sinema."""
    __tablename__ = "es__symptoms_facts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    fact_code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    domain = db.Column(db.String(50), nullable=False, index=True)  # shoot_recommender, rig_compatibility, rma_diagnostic, deadstock_strategy, vendor_risk, concierge_triage
    category = db.Column(db.String(100), nullable=False)
    label = db.Column(db.String(255), nullable=False)
    weight = db.Column(db.Float, default=0.85, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "fact_code": self.fact_code,
            "domain": self.domain,
            "category": self.category,
            "label": self.label,
            "weight": float(self.weight),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ESRule(db.Model):
    """Basis Aturan Pakar Forward Chaining (IF-THEN) & Certainty Factor."""
    __tablename__ = "es__rules"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    rule_code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    domain = db.Column(db.String(50), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    conditions_json = db.Column(db.JSON, nullable=False)
    conclusion_verdict = db.Column(db.String(255), nullable=False)
    action_type = db.Column(db.String(50), nullable=False)  # RECOMMEND_GEAR, FLAG_INCOMPATIBLE, APPROVE_RMA_REPLACEMENT, REJECT_RMA_USER_FAULT, SUGGEST_BUNDLE_TRANSFER, PENALIZE_DSS_SCORE
    explanation = db.Column(db.Text, nullable=False)
    certainty_factor = db.Column(db.Float, default=0.90, nullable=False)
    kms_article_id = db.Column(db.Integer, db.ForeignKey("kms__articles.id", ondelete="SET NULL"), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relasi ke artikel/SOP KMS
    kms_article = db.relationship("KMSArticle", backref="es_rules", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "rule_code": self.rule_code,
            "domain": self.domain,
            "title": self.title,
            "conditions_json": self.conditions_json,
            "conclusion_verdict": self.conclusion_verdict,
            "action_type": self.action_type,
            "explanation": self.explanation,
            "certainty_factor": float(self.certainty_factor),
            "kms_article_id": self.kms_article_id,
            "kms_article_title": self.kms_article.title if self.kms_article else None,
            "kms_sop_code": getattr(self.kms_article, "sop_code", None) if self.kms_article else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ESConsultation(db.Model):
    """Log riwayat inferensi kepakaran & konsultasi lintas subsistem."""
    __tablename__ = "es__consultations"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_code = db.Column(db.String(60), unique=True, nullable=False, index=True)
    domain = db.Column(db.String(50), nullable=False, index=True)
    actor_role = db.Column(db.String(50), nullable=False)
    actor_id = db.Column(db.Integer, nullable=True)
    reference_type = db.Column(db.String(50), nullable=True)  # order, return_request, product, dss_session, support_ticket
    reference_id = db.Column(db.Integer, nullable=True)
    input_facts_json = db.Column(db.JSON, nullable=False)
    matched_rules_json = db.Column(db.JSON, nullable=False)
    final_verdict = db.Column(db.String(255), nullable=False)
    confidence_score = db.Column(db.Float, nullable=False)
    expert_advice = db.Column(db.Text, nullable=False)
    recommended_payload_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "session_code": self.session_code,
            "domain": self.domain,
            "actor_role": self.actor_role,
            "actor_id": self.actor_id,
            "reference_type": self.reference_type,
            "reference_id": self.reference_id,
            "input_facts_json": self.input_facts_json,
            "matched_rules_json": self.matched_rules_json,
            "final_verdict": self.final_verdict,
            "confidence_score": float(self.confidence_score),
            "expert_advice": self.expert_advice,
            "recommended_payload_json": self.recommended_payload_json,
            "created_at": self.created_at.isoformat() if self.created_at else None,
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
StaffShift = OASStaffShift
BranchStock = TPSBranchStock
StockTransfer = TPSStockTransfer
Bundle = TPSBundle
BundleItem = TPSBundleItem
ProductReview = TPSProductReview
ESSymptom = ESSymptomFact
SymptomFact = ESSymptomFact
ExpertRule = ESRule
ExpertConsultation = ESConsultation


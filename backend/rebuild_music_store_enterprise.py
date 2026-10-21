"""
Rebuild Database Enterprise Toko Alat Musik (Swee Lee Style)
Membangun ulang seluruh tabel dengan prefix standar:
- OAS (Office Automation System): oas_staff, oas_announcements, oas_support_tickets, oas_support_messages, oas_system_settings
- TPS (Transaction Processing System): tps_customers, tps_brands_suppliers, tps_store_branches, tps_products, tps_product_variants, tps_orders, tps_wishlists, tps_purchase_orders, tps_inventory_logs
- KMS (Knowledge Management System): kms_categories, kms_articles, kms_article_feedback, kms_faqs
- MIS (Management Information System): mis_dashboard_summary, mis_product_performance, mis_revenue_summary, mis_sales_summary
"""
import sys
import os
import pymysql
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta

DB_HOST = "localhost"
DB_PORT = 3306
DB_USER = "root"
DB_PASS = ""
DB_NAME = "ticketing_event"

def run_migration():
    print(f"Connecting to MySQL {DB_HOST}:{DB_PORT} as {DB_USER}...")
    conn = pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        autocommit=True,
        charset='utf8mb4'
    )
    cursor = conn.cursor()

    print("Dropping legacy ticketing tables...")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
    
    # Drop all existing tables
    cursor.execute("SHOW TABLES;")
    tables = [row[0] for row in cursor.fetchall()]
    for t in tables:
        print(f"  Dropping table {t}...")
        cursor.execute(f"DROP TABLE IF EXISTS `{t}`;")

    print("\nCreating new enterprise architecture tables...")

    # 1. OAS (Office Automation System)
    cursor.execute("""
    CREATE TABLE `oas_staff` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL,
        `username` VARCHAR(50) NOT NULL UNIQUE,
        `email` VARCHAR(120) NOT NULL UNIQUE,
        `password_hash` VARCHAR(255) NOT NULL,
        `role` ENUM('super_admin', 'manager', 'finance', 'warehouse_staff', 'store_staff') NOT NULL,
        `phone` VARCHAR(30) NULL,
        `branch_id` INT NULL,
        `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `oas_announcements` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `title` VARCHAR(200) NOT NULL,
        `content` TEXT NOT NULL,
        `audience_role` VARCHAR(50) NOT NULL DEFAULT 'all',
        `created_by` INT NOT NULL,
        `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`created_by`) REFERENCES `oas_staff`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `oas_system_settings` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `setting_key` VARCHAR(100) NOT NULL UNIQUE,
        `setting_value` TEXT NOT NULL,
        `description` VARCHAR(255) NULL,
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    # 2. TPS (Transaction Processing System)
    cursor.execute("""
    CREATE TABLE `tps_customers` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL,
        `username` VARCHAR(50) NOT NULL UNIQUE,
        `email` VARCHAR(120) NOT NULL UNIQUE,
        `password_hash` VARCHAR(255) NOT NULL,
        `phone` VARCHAR(30) NULL,
        `address` TEXT NULL,
        `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `tps_brands_suppliers` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL UNIQUE,
        `slug` VARCHAR(100) NOT NULL UNIQUE,
        `country` VARCHAR(100) NULL,
        `description` TEXT NULL,
        `logo_url` VARCHAR(255) NULL,
        `website` VARCHAR(200) NULL,
        `contact_email` VARCHAR(120) NULL,
        `contact_phone` VARCHAR(50) NULL,
        `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `tps_store_branches` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL UNIQUE,
        `branch_type` ENUM('showroom', 'warehouse', 'flagship') NOT NULL DEFAULT 'showroom',
        `city` VARCHAR(100) NOT NULL,
        `address` TEXT NOT NULL,
        `phone` VARCHAR(50) NULL,
        `map_url` TEXT NULL,
        `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    # OAS Support Tickets (relates to tps_customers & oas_staff)
    cursor.execute("""
    CREATE TABLE `oas_support_tickets` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `ticket_number` VARCHAR(50) NOT NULL UNIQUE,
        `customer_id` INT NULL,
        `subject` VARCHAR(200) NOT NULL,
        `category` VARCHAR(50) NOT NULL DEFAULT 'product_inquiry',
        `status` ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
        `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
        `assigned_staff_id` INT NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`customer_id`) REFERENCES `tps_customers`(`id`) ON DELETE SET NULL,
        FOREIGN KEY (`assigned_staff_id`) REFERENCES `oas_staff`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `oas_support_messages` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `ticket_id` INT NOT NULL,
        `sender_type` ENUM('staff', 'customer') NOT NULL,
        `sender_id` INT NOT NULL,
        `sender_name` VARCHAR(100) NOT NULL,
        `message` TEXT NOT NULL,
        `attachment_url` VARCHAR(255) NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`ticket_id`) REFERENCES `oas_support_tickets`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `tps_products` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `brand_id` INT NOT NULL,
        `branch_id` INT NULL,
        `name` VARCHAR(200) NOT NULL,
        `sku_prefix` VARCHAR(50) NOT NULL,
        `instrument_type` VARCHAR(100) NOT NULL,
        `category` VARCHAR(100) NOT NULL,
        `description` TEXT NULL,
        `specifications` TEXT NULL,
        `warranty_months` INT NOT NULL DEFAULT 12,
        `image_url` VARCHAR(255) NULL,
        `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'published',
        `created_by` INT NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`brand_id`) REFERENCES `tps_brands_suppliers`(`id`) ON DELETE RESTRICT,
        FOREIGN KEY (`branch_id`) REFERENCES `tps_store_branches`(`id`) ON DELETE SET NULL,
        FOREIGN KEY (`created_by`) REFERENCES `oas_staff`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `tps_product_variants` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `product_id` INT NOT NULL,
        `sku_code` VARCHAR(100) NOT NULL UNIQUE,
        `variant_name` VARCHAR(100) NOT NULL,
        `color_finish` VARCHAR(100) NOT NULL,
        `cost_price` BIGINT NOT NULL DEFAULT 0,
        `price` BIGINT NOT NULL DEFAULT 0,
        `stock` INT NOT NULL DEFAULT 0,
        `weight_kg` FLOAT NOT NULL DEFAULT 1.0,
        `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`product_id`) REFERENCES `tps_products`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `tps_orders` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `invoice_code` VARCHAR(100) NOT NULL UNIQUE,
        `customer_id` INT NULL,
        `product_id` INT NOT NULL,
        `variant_id` INT NULL,
        `quantity` INT NOT NULL DEFAULT 1,
        `unit_price` BIGINT NOT NULL DEFAULT 0,
        `total_price` BIGINT NOT NULL DEFAULT 0,
        `fulfillment_method` ENUM('delivery', 'click_and_collect') NOT NULL DEFAULT 'delivery',
        `pickup_branch_id` INT NULL,
        `pickup_code` VARCHAR(50) NULL,
        `pickup_status` ENUM('pending', 'ready', 'collected') NOT NULL DEFAULT 'pending',
        `shipping_address` TEXT NULL,
        `shipping_courier` VARCHAR(100) NULL,
        `shipping_cost` BIGINT NOT NULL DEFAULT 0,
        `tracking_number` VARCHAR(100) NULL,
        `payment_method` VARCHAR(100) NOT NULL DEFAULT 'Swee Lee Pay',
        `payment_status` ENUM('pending', 'paid', 'refunded', 'cancelled') NOT NULL DEFAULT 'paid',
        `order_status` ENUM('processing', 'ready_for_pickup', 'shipped', 'delivered', 'completed', 'cancelled') NOT NULL DEFAULT 'processing',
        `buyer_name` VARCHAR(100) NOT NULL,
        `buyer_email` VARCHAR(120) NOT NULL,
        `buyer_phone` VARCHAR(50) NOT NULL,
        `handled_by_staff_id` INT NULL,
        `paid_at` DATETIME NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`customer_id`) REFERENCES `tps_customers`(`id`) ON DELETE SET NULL,
        FOREIGN KEY (`product_id`) REFERENCES `tps_products`(`id`) ON DELETE RESTRICT,
        FOREIGN KEY (`variant_id`) REFERENCES `tps_product_variants`(`id`) ON DELETE SET NULL,
        FOREIGN KEY (`pickup_branch_id`) REFERENCES `tps_store_branches`(`id`) ON DELETE SET NULL,
        FOREIGN KEY (`handled_by_staff_id`) REFERENCES `oas_staff`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `tps_wishlists` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `customer_id` INT NOT NULL,
        `product_id` INT NOT NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_user_product` (`customer_id`, `product_id`),
        FOREIGN KEY (`customer_id`) REFERENCES `tps_customers`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`product_id`) REFERENCES `tps_products`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `tps_purchase_orders` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `po_number` VARCHAR(50) NOT NULL UNIQUE,
        `supplier_id` INT NOT NULL,
        `product_id` INT NOT NULL,
        `variant_id` INT NULL,
        `quantity` INT NOT NULL DEFAULT 1,
        `unit_cost` BIGINT NOT NULL DEFAULT 0,
        `total_cost` BIGINT NOT NULL DEFAULT 0,
        `status` ENUM('draft', 'submitted', 'approved', 'paid', 'received', 'rejected') NOT NULL DEFAULT 'submitted',
        `destination_branch_id` INT NULL,
        `requested_by` INT NOT NULL,
        `approved_by` INT NULL,
        `paid_by` INT NULL,
        `received_by` INT NULL,
        `notes` TEXT NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`supplier_id`) REFERENCES `tps_brands_suppliers`(`id`) ON DELETE RESTRICT,
        FOREIGN KEY (`product_id`) REFERENCES `tps_products`(`id`) ON DELETE RESTRICT,
        FOREIGN KEY (`variant_id`) REFERENCES `tps_product_variants`(`id`) ON DELETE SET NULL,
        FOREIGN KEY (`destination_branch_id`) REFERENCES `tps_store_branches`(`id`) ON DELETE SET NULL,
        FOREIGN KEY (`requested_by`) REFERENCES `oas_staff`(`id`) ON DELETE RESTRICT,
        FOREIGN KEY (`approved_by`) REFERENCES `oas_staff`(`id`) ON DELETE SET NULL,
        FOREIGN KEY (`paid_by`) REFERENCES `oas_staff`(`id`) ON DELETE SET NULL,
        FOREIGN KEY (`received_by`) REFERENCES `oas_staff`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `tps_inventory_logs` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `variant_id` INT NOT NULL,
        `branch_id` INT NULL,
        `change_type` ENUM('po_received', 'sale_delivery', 'sale_click_and_collect', 'manual_adjustment', 'return_refund') NOT NULL,
        `quantity_change` INT NOT NULL,
        `stock_before` INT NOT NULL,
        `stock_after` INT NOT NULL,
        `serial_number` VARCHAR(100) NULL,
        `notes` TEXT NULL,
        `reference_id` VARCHAR(100) NULL,
        `logged_by` INT NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`variant_id`) REFERENCES `tps_product_variants`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`branch_id`) REFERENCES `tps_store_branches`(`id`) ON DELETE SET NULL,
        FOREIGN KEY (`logged_by`) REFERENCES `oas_staff`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    # 3. KMS (Knowledge Management System)
    cursor.execute("""
    CREATE TABLE `kms_categories` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL UNIQUE,
        `slug` VARCHAR(100) NOT NULL UNIQUE,
        `description` TEXT NULL,
        `icon` VARCHAR(50) NULL,
        `sort_order` INT NOT NULL DEFAULT 0,
        `is_active` BOOLEAN NOT NULL DEFAULT TRUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `kms_articles` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `category_id` INT NOT NULL,
        `title` VARCHAR(255) NOT NULL,
        `slug` VARCHAR(255) NOT NULL UNIQUE,
        `content` LONGTEXT NOT NULL,
        `excerpt` TEXT NULL,
        `author_staff_id` INT NULL,
        `is_published` BOOLEAN NOT NULL DEFAULT TRUE,
        `view_count` INT NOT NULL DEFAULT 0,
        `helpful_count` INT NOT NULL DEFAULT 0,
        `not_helpful_count` INT NOT NULL DEFAULT 0,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`category_id`) REFERENCES `kms_categories`(`id`) ON DELETE RESTRICT,
        FOREIGN KEY (`author_staff_id`) REFERENCES `oas_staff`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `kms_article_feedback` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `article_id` INT NOT NULL,
        `user_id` INT NULL,
        `is_helpful` BOOLEAN NOT NULL,
        `comment` TEXT NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`article_id`) REFERENCES `kms_articles`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `kms_faqs` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `category_id` INT NULL,
        `question` VARCHAR(255) NOT NULL,
        `answer` TEXT NOT NULL,
        `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
        `sort_order` INT NOT NULL DEFAULT 0,
        `view_count` INT NOT NULL DEFAULT 0,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`category_id`) REFERENCES `kms_categories`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    # 4. MIS (Management Information System)
    cursor.execute("""
    CREATE TABLE `mis_dashboard_summary` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `metric_date` DATE NOT NULL UNIQUE,
        `total_revenue` BIGINT NOT NULL DEFAULT 0,
        `total_cogs` BIGINT NOT NULL DEFAULT 0,
        `gross_profit` BIGINT NOT NULL DEFAULT 0,
        `gross_margin_pct` FLOAT NOT NULL DEFAULT 0,
        `total_orders` INT NOT NULL DEFAULT 0,
        `total_units_sold` INT NOT NULL DEFAULT 0,
        `pending_pos` INT NOT NULL DEFAULT 0,
        `low_stock_skus_count` INT NOT NULL DEFAULT 0,
        `last_synced_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `mis_product_performance` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `product_id` INT NOT NULL,
        `brand_name` VARCHAR(100) NOT NULL,
        `product_name` VARCHAR(200) NOT NULL,
        `instrument_type` VARCHAR(100) NOT NULL,
        `units_sold` INT NOT NULL DEFAULT 0,
        `gross_revenue` BIGINT NOT NULL DEFAULT 0,
        `cogs` BIGINT NOT NULL DEFAULT 0,
        `net_profit` BIGINT NOT NULL DEFAULT 0,
        `current_stock` INT NOT NULL DEFAULT 0,
        `last_synced_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`product_id`) REFERENCES `tps_products`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `mis_revenue_summary` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `period_type` ENUM('daily', 'monthly', 'yearly') NOT NULL DEFAULT 'monthly',
        `period_date` DATE NOT NULL,
        `gross_sales` BIGINT NOT NULL DEFAULT 0,
        `cogs_total` BIGINT NOT NULL DEFAULT 0,
        `gross_profit` BIGINT NOT NULL DEFAULT 0,
        `delivery_sales` BIGINT NOT NULL DEFAULT 0,
        `pickup_sales` BIGINT NOT NULL DEFAULT 0,
        `last_synced_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_period` (`period_type`, `period_date`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
    CREATE TABLE `mis_sales_summary` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `instrument_category` VARCHAR(100) NOT NULL,
        `units_sold` INT NOT NULL DEFAULT 0,
        `revenue` BIGINT NOT NULL DEFAULT 0,
        `cogs` BIGINT NOT NULL DEFAULT 0,
        `profit_margin_pct` FLOAT NOT NULL DEFAULT 0,
        `period_month` VARCHAR(20) NOT NULL,
        `last_synced_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY `unique_category_period` (`instrument_category`, `period_month`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
    print("All enterprise tables created successfully!")

    # ----------------------------------------------------
    # SEEDING DATA
    # ----------------------------------------------------
    print("\nSeeding initial enterprise music retail data...")

    # 1. OAS Staff (5 Internal Roles)
    pwd_hash = generate_password_hash("password123")
    staff_data = [
        ("Super Administrator", "admin", "admin@sweelee.id", pwd_hash, "super_admin", "08111000100"),
        ("Store General Manager", "manager", "manager@sweelee.id", pwd_hash, "manager", "08111000200"),
        ("Finance Controller", "finance", "finance@sweelee.id", pwd_hash, "finance", "08111000300"),
        ("Warehouse Lead", "warehouse", "warehouse@sweelee.id", pwd_hash, "warehouse_staff", "08111000400"),
        ("Senior Store Specialist", "store", "store@sweelee.id", pwd_hash, "store_staff", "08111000500"),
    ]
    for s in staff_data:
        cursor.execute("""
        INSERT INTO `oas_staff` (`name`, `username`, `email`, `password_hash`, `role`, `phone`)
        VALUES (%s, %s, %s, %s, %s, %s);
        """, s)

    # 2. TPS Customers (3 Musician Customers)
    customers_data = [
        ("Ahmad Dhani Musician", "customer", "customer@sweelee.id", pwd_hash, "081234567890", "Pondok Indah Residence No. 12, Jakarta Selatan"),
        ("Eross Candra", "eross", "eross@sweelee.id", pwd_hash, "081298765432", "Jl. Kaliurang KM 9, Sleman, Yogyakarta"),
        ("John Petrucci", "petrucci", "petrucci@sweelee.id", pwd_hash, "081987654321", "Apartemen Senopati Suites, Jakarta Selatan"),
    ]
    for c in customers_data:
        cursor.execute("""
        INSERT INTO `tps_customers` (`name`, `username`, `email`, `password_hash`, `phone`, `address`)
        VALUES (%s, %s, %s, %s, %s, %s);
        """, c)

    # 3. Store Branches
    branches_data = [
        ("Swee Lee Flagship Showroom - Senayan City", "flagship", "Jakarta Pusat", "Senayan City Mall Lt. 3, Jl. Asia Afrika No. 19, Jakarta Pusat", "021-72781001", "https://maps.google.com/?q=Senayan+City"),
        ("Swee Lee Experience Store - Pondok Indah", "showroom", "Jakarta Selatan", "Pondok Indah Mall 2 Lt. 2, Jl. Metro Pondok Indah, Jakarta Selatan", "021-7506990", "https://maps.google.com/?q=Pondok+Indah+Mall"),
        ("Swee Lee Central Distribution Center - Cikarang", "warehouse", "Bekasi (Cikarang)", "Kawasan Industri MM2100 Blok C-10, Cikarang Barat, Bekasi", "021-8980123", "https://maps.google.com/?q=MM2100+Cikarang"),
    ]
    for b in branches_data:
        cursor.execute("""
        INSERT INTO `tps_store_branches` (`name`, `branch_type`, `city`, `address`, `phone`, `map_url`)
        VALUES (%s, %s, %s, %s, %s, %s);
        """, b)

    # 4. Brands & Suppliers
    brands_data = [
        ("Fender Musical Instruments", "fender", "United States", "Authorized Distributor Fender & Squier Indonesia", "/uploads/fender-logo.png", "https://fender.com", "supply@fender.com", "+1-800-488-181"),
        ("Gibson Brands Inc.", "gibson", "United States", "Official Partner for Gibson USA & Epiphone", "/uploads/gibson-logo.png", "https://gibson.com", "distribution@gibson.com", "+1-800-444-2766"),
        ("Yamaha Music", "yamaha", "Japan", "PT Yamaha Musik Indonesia Distributor", "/uploads/yamaha-logo.png", "https://id.yamaha.com", "sales@yamaha-musik.id", "021-5202577"),
        ("Roland Corporation", "roland", "Japan", "Roland Synthesizers, BOSS Pedals & Electronic Drums", "/uploads/roland-logo.png", "https://roland.com", "info@roland.id", "+81-53-523-0230"),
        ("Shure Microphones", "shure", "United States", "Industry Standard Microphones & Wireless Monitoring", "/uploads/shure-logo.png", "https://shure.com", "support@shure.id", "+1-847-600-2000"),
        ("Marshall Amplification", "marshall", "United Kingdom", "Legendary British Tube Amplifiers & Cabinets", "/uploads/marshall-logo.png", "https://marshall.com", "contact@marshall.com", "+44-1908-375411"),
    ]
    for br in brands_data:
        cursor.execute("""
        INSERT INTO `tps_brands_suppliers` (`name`, `slug`, `country`, `description`, `logo_url`, `website`, `contact_email`, `contact_phone`)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
        """, br)

    # 5. Products & Variants
    # Fetch brand & branch IDs
    cursor.execute("SELECT id, slug FROM `tps_brands_suppliers`;")
    brand_map = {slug: id for id, slug in cursor.fetchall()}
    
    cursor.execute("SELECT id, name FROM `tps_store_branches`;")
    branch_map = {name: id for id, name in cursor.fetchall()}
    senayan_id = branch_map.get("Swee Lee Flagship Showroom - Senayan City", 1)
    gudang_id = branch_map.get("Swee Lee Central Distribution Center - Cikarang", 3)

    products_spec = [
        {
            "brand_slug": "fender",
            "name": "Fender Player II Stratocaster",
            "sku_prefix": "FEN-PL2-STRAT",
            "instrument_type": "Electric Guitar",
            "category": "Electric Guitars",
            "description": "Fender Player II Stratocaster menghadirkan nada klasik Fender dengan playability modern. Dilengkapi pickup Player Series Alnico V Single-Coil, neck maple Modern C, dan bridge 2-Point Synchronized Tremolo.",
            "specifications": "Body: Alder\nNeck: Maple, Modern C Profile\nFingerboard: Rosewood / Maple, 9.5 Radius\nPickups: 3x Player Series Alnico 5 Strat Single-Coil\nFrets: 22 Medium Jumbo\nHardware: Nickel/Chrome\nTuning Machines: Standard Cast/Sealed",
            "warranty_months": 24,
            "image_url": "/uploads/fender-strat.jpg",
            "variants": [
                ("FEN-PL2-3TS", "3-Color Sunburst (Rosewood)", "3-Color Sunburst", 9500000, 13750000, 8, 3.6),
                ("FEN-PL2-BLK", "Gloss Black (Maple)", "Gloss Black", 9200000, 13500000, 5, 3.5),
                ("FEN-PL2-POL", "Polar White (Maple)", "Polar White", 9200000, 13500000, 4, 3.5),
            ]
        },
        {
            "brand_slug": "gibson",
            "name": "Gibson Les Paul Standard 50s",
            "sku_prefix": "GIB-LP-STD50",
            "instrument_type": "Electric Guitar",
            "category": "Electric Guitars",
            "description": "Menghidupkan kembali desain klasik 1950-an. Body solid mahogany dengan carved maple top, neck profil 50s rounded, dan sepasang pickup BurstBucker 1 & BurstBucker 2 bertenaga alnico II magnet.",
            "specifications": "Body: Solid Mahogany with Maple Top\nNeck: Mahogany, Vintage 50s Profile\nScale: 24.75 inch\nPickups: BurstBucker 1 (Neck), BurstBucker 2 (Bridge)\nElectronics: Hand-wired with Orange Drop Capacitors\nCase: Gibson Hard Shell Case Included",
            "warranty_months": 36,
            "image_url": "/uploads/gibson-lespaul.jpg",
            "variants": [
                ("GIB-LP50-HCS", "Heritage Cherry Sunburst", "Heritage Cherry Sunburst", 28000000, 39500000, 3, 4.3),
                ("GIB-LP50-TOB", "Tobacco Burst", "Tobacco Burst", 28000000, 39500000, 2, 4.2),
                ("GIB-LP50-GLD", "Goldtop", "Goldtop Finish", 27500000, 38900000, 1, 4.4),
            ]
        },
        {
            "brand_slug": "yamaha",
            "name": "Yamaha Stage Custom Birch Acoustic Drum Set",
            "sku_prefix": "YAM-SC-BIRCH",
            "instrument_type": "Acoustic Drums",
            "category": "Drums & Percussion",
            "description": "100% birch shell 6-ply drum kit legendaris dari Yamaha. Menghasilkan proyeksi suara renyah, low-end punch bertenaga, dan sustain resonan berkat Yamaha Enhanced Sustain System (Y.E.S.S.).",
            "specifications": "Configuration: 5-Piece Shell Pack\nBass Drum: 22x17\nTom Toms: 10x7, 12x8\nFloor Tom: 16x15\nSnare Drum: 14x5.5\nShell Material: 100% 6-Ply Birch\nMounting: Y.E.S.S. System",
            "warranty_months": 12,
            "image_url": "/uploads/yamaha-drums.jpg",
            "variants": [
                ("YAM-SCB-RB", "Raven Black 5-Piece", "Raven Black", 10500000, 15200000, 4, 32.0),
                ("YAM-SCB-NW", "Natural Wood 5-Piece", "Natural Wood", 10500000, 15200000, 3, 32.0),
                ("YAM-SCB-CR", "Cranberry Red 5-Piece", "Cranberry Red", 10500000, 15200000, 2, 32.0),
            ]
        },
        {
            "brand_slug": "roland",
            "name": "Roland Fantom-08 Workstation Synthesizer",
            "sku_prefix": "ROL-FANTOM-08",
            "instrument_type": "Synthesizer Workstation",
            "category": "Keyboards & Synths",
            "description": "Keyboard workstation panggung profesional 88-tuts berbobot PHA-4 Standard. Ditenagai sound engine ZEN-Core & SuperNATURAL Acoustic/Electric Pianos dengan arsitektur 16-part multitimbral.",
            "specifications": "Keyboard: 88 Keys PHA-4 Standard with Escapement & Ivory Feel\nSound Engine: ZEN-Core, SuperNATURAL Piano, SuperNATURAL E-Piano, Virtual ToneWheel Organ\nTones: 3,500+ Tones, 90+ Drum Kits\nDisplay: 5.5-inch Color Touchscreen\nInterface: 16 RGB Velocity Pads, Pitch/Mod Wheel, Real-time Control Sliders",
            "warranty_months": 24,
            "image_url": "/uploads/roland-synth.jpg",
            "variants": [
                ("ROL-F08-STD", "Standard Matte Charcoal 88-Key", "Matte Charcoal", 18500000, 25800000, 5, 14.8),
            ]
        },
        {
            "brand_slug": "shure",
            "name": "Shure SM7B Cardioid Dynamic Vocal Microphone",
            "sku_prefix": "SHU-SM7B",
            "instrument_type": "Studio Microphone",
            "category": "Pro Audio & Studio",
            "description": "Mikrofon vokal dinamik legendaris untuk siaran broadcast, rekaman vokal studio, dan podcasting profesional. Pola polar cardioid dengan proteksi electromagnetic hum shielded.",
            "specifications": "Type: Dynamic (Moving Coil)\nPolar Pattern: Cardioid\nFrequency Response: 50 to 20,000 Hz\nOutput Impedance: 150 ohms\nSensitivity: -59.0 dB (1.12 mV)\nSwitch: Bass Roll-off & Mid-range Emphasis (Presence Boost)",
            "warranty_months": 24,
            "image_url": "/uploads/shure-sm7b.jpg",
            "variants": [
                ("SHU-SM7B-BLK", "Matte Dark Gray Standard", "Matte Dark Gray", 4200000, 6250000, 15, 0.8),
            ]
        },
        {
            "brand_slug": "marshall",
            "name": "Marshall Studio Classic SC20H JCM800 Tube Head",
            "sku_prefix": "MAR-SC20H",
            "instrument_type": "Guitar Amplifier Head",
            "category": "Amplifiers & Effects",
            "description": "Replika 20-Watt all-valve dari amplifier legendaris Marshall JCM800 2203. Memiliki power reduction switch dari 20W menjadi 5W untuk volume ramah kamar namun tetap berkarakter high gain Inggris.",
            "specifications": "Power Output: 20W (Switchable to 5W)\nValves: 2x ECC83 Preamp, 1x ECC83 Phase Splitter, 2x EL34 Power Tube\nInputs: High & Low Sensitivity\nControls: Preamp Volume, Master Volume, Treble, Middle, Bass, Presence\nOutputs: 5x 1/4 inch Speaker Jacks, DI Out",
            "warranty_months": 12,
            "image_url": "/uploads/marshall-amp.jpg",
            "variants": [
                ("MAR-SC20H-BLK", "Classic Black Elephant Grain", "Black Elephant Grain", 12500000, 17800000, 3, 9.4),
            ]
        }
    ]

    for p in products_spec:
        b_id = brand_map.get(p["brand_slug"], 1)
        cursor.execute("""
        INSERT INTO `tps_products`
        (`brand_id`, `branch_id`, `name`, `sku_prefix`, `instrument_type`, `category`, `description`, `specifications`, `warranty_months`, `image_url`, `status`, `created_by`)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'published', 1);
        """, (b_id, senayan_id, p["name"], p["sku_prefix"], p["instrument_type"], p["category"], p["description"], p["specifications"], p["warranty_months"], p["image_url"]))
        
        prod_id = cursor.lastrowid
        for v in p["variants"]:
            cursor.execute("""
            INSERT INTO `tps_product_variants`
            (`product_id`, `sku_code`, `variant_name`, `color_finish`, `cost_price`, `price`, `stock`, `weight_kg`)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
            """, (prod_id, v[0], v[1], v[2], v[3], v[4], v[5], v[6]))

    # 6. Sample Orders (TPS Transactions)
    cursor.execute("SELECT id, price FROM `tps_product_variants` LIMIT 2;")
    var_rows = cursor.fetchall()
    v1_id, v1_price = var_rows[0]
    v2_id, v2_price = var_rows[1]

    cursor.execute("SELECT id FROM `tps_products` LIMIT 2;")
    prod_rows = cursor.fetchall()
    p1_id = prod_rows[0][0]
    p2_id = prod_rows[1][0]

    # Order 1: Delivery
    inv1 = "SWL-20261022-DEL001"
    cursor.execute("""
    INSERT INTO `tps_orders`
    (`invoice_code`, `customer_id`, `product_id`, `variant_id`, `quantity`, `unit_price`, `total_price`, `fulfillment_method`, `shipping_address`, `shipping_courier`, `shipping_cost`, `tracking_number`, `payment_method`, `payment_status`, `order_status`, `buyer_name`, `buyer_email`, `buyer_phone`, `paid_at`)
    VALUES (%s, 1, %s, %s, 1, %s, %s, 'delivery', 'Pondok Indah Residence No. 12, Jakarta Selatan', 'JNE Trucking', 50000, 'JNE-TRK-8829104', 'Swee Lee Pay', 'paid', 'shipped', 'Ahmad Dhani Musician', 'customer@sweelee.id', '081234567890', NOW());
    """, (inv1, p1_id, v1_id, v1_price, v1_price + 50000))

    # Order 2: Click & Collect (Showroom Pickup)
    inv2 = "SWL-20261022-PCK002"
    cursor.execute("""
    INSERT INTO `tps_orders`
    (`invoice_code`, `customer_id`, `product_id`, `variant_id`, `quantity`, `unit_price`, `total_price`, `fulfillment_method`, `pickup_branch_id`, `pickup_code`, `pickup_status`, `payment_method`, `payment_status`, `order_status`, `buyer_name`, `buyer_email`, `buyer_phone`, `paid_at`)
    VALUES (%s, 2, %s, %s, 1, %s, %s, 'click_and_collect', %s, 'SWL-PICKUP-8849', 'ready', 'Swee Lee Pay', 'paid', 'ready_for_pickup', 'Eross Candra', 'eross@sweelee.id', '081298765432', NOW());
    """, (inv2, p2_id, v2_id, v2_price, v2_price, senayan_id))

    # 7. Sample Purchase Orders (Restock Workflow)
    cursor.execute("""
    INSERT INTO `tps_purchase_orders`
    (`po_number`, `supplier_id`, `product_id`, `variant_id`, `quantity`, `unit_cost`, `total_cost`, `status`, `destination_branch_id`, `requested_by`, `approved_by`, `paid_by`, `notes`)
    VALUES ('PO-2026-FND-001', 1, %s, %s, 10, 9500000, 95000000, 'approved', %s, 4, 2, NULL, 'Restock kuartal IV instrumen Player II Stratocaster untuk Flagship Showroom.');
    """, (p1_id, v1_id, gudang_id))

    # 8. Sample Inventory Logs
    cursor.execute("""
    INSERT INTO `tps_inventory_logs`
    (`variant_id`, `branch_id`, `change_type`, `quantity_change`, `stock_before`, `stock_after`, `serial_number`, `notes`, `reference_id`, `logged_by`)
    VALUES (%s, %s, 'manual_adjustment', 5, 3, 8, 'SN-FEN-US2499104', 'Stok awal setup gudang pusat Swee Lee', 'INIT-STOCK', 4);
    """, (v1_id, gudang_id))

    # 9. KMS (Knowledge Management System) Categories & Articles
    cursor.execute("""
    INSERT INTO `kms_categories` (`name`, `slug`, `description`, `icon`, `sort_order`) VALUES
    ('Panduan Memilih Gitar & Bass', 'guitar-bass-guide', 'Tips setup, intonasi, pemilihan kayu neck & pickup gitar', 'guitar', 1),
    ('Perawatan & Setup Instrumen', 'maintenance-care', 'SOP pembersihan fretboard, humidity control & kalibrasi truss rod', 'tool', 2),
    ('Garansi Resmi & Klaim', 'warranty-claim', 'Syarat garansi distributor resmi Swee Lee Indonesia', 'shield', 3),
    ('Pengiriman Kargo & Click & Collect', 'shipping-fulfillment', 'Prosedur packing kayu, asuransi, dan pickup showroom', 'truck', 4);
    """)

    cursor.execute("""
    INSERT INTO `kms_articles`
    (`category_id`, `title`, `slug`, `content`, `excerpt`, `author_staff_id`, `is_published`, `view_count`, `helpful_count`)
    VALUES
    (1, 'Panduan Memilih Antara Maple vs Rosewood Fretboard', 'maple-vs-rosewood-fretboard', 'Fretboard kayu maple cenderung memberikan attack yang cerah (snappy) dengan sustain tajam, sedangkan rosewood memberikan warmth dan midrange tebal. Di iklim tropis Indonesia, pastikan kelembaban ruangan dijaga antara 45%-55% RH untuk kestabilan neck.', 'Perbandingan karakter suara dan perawatan material fretboard untuk instrumen gitar dan bass.', 1, TRUE, 142, 38),
    (3, 'Ketentuan Garansi 24 Bulan Distributor Resmi Swee Lee', 'ketentuan-garansi-resmi-swee-lee', 'Semua instrumen Fender, Gibson, Roland, dan Yamaha yang dibeli melalui Swee Lee Store mendapatkan garansi pabrik dan distributor resmi selama 12 hingga 36 bulan meliputi perbaikan elektronik, pickup, preamp, dan cacat pabrik. Tidak mencakup kerusakan aus pakai wajar seperti senar dan fretwire.', 'Tata cara klaim garansi resmi dan servis berkala di Swee Lee Service Center.', 1, TRUE, 260, 89);
    """)

    cursor.execute("""
    INSERT INTO `kms_faqs` (`category_id`, `question`, `answer`, `is_active`, `sort_order`) VALUES
    (4, 'Apakah pengiriman instrumen luar kota menggunakan packing kayu?', 'Ya, seluruh pengiriman gitar, drum, keyboard, dan amplifier ke seluruh Indonesia wajib menggunakan packing kayu tebal dan asuransi penuh ekspedisi.', TRUE, 1),
    (4, 'Bagaimana cara mengambil barang di Showroom (Click & Collect)?', 'Pilih opsi Click & Collect saat checkout, selesaikan pembayaran, dan Anda akan menerima Kode Ambil Barang (Pickup Pass). Tunjukkan kode ini ke Store Staff kami di showroom pilihan Anda.', TRUE, 2),
    (3, 'Apakah Swee Lee melayani setup neck & string action gratis?', 'Setiap pembelian instrumen di Swee Lee berhak mendapatkan 1x Full Professional Setup & Kalibrasi gratis di Showroom kami.', TRUE, 3);
    """)

    # 10. MIS Data (Management Information System)
    today = datetime.now().date()
    cursor.execute("""
    INSERT INTO `mis_dashboard_summary`
    (`metric_date`, `total_revenue`, `total_cogs`, `gross_profit`, `gross_margin_pct`, `total_orders`, `total_units_sold`, `pending_pos`, `low_stock_skus_count`)
    VALUES
    (%s, 53250000, 37500000, 15750000, 29.57, 2, 2, 1, 1);
    """, (today,))

    cursor.execute("""
    INSERT INTO `mis_product_performance`
    (`product_id`, `brand_name`, `product_name`, `instrument_type`, `units_sold`, `gross_revenue`, `cogs`, `net_profit`, `current_stock`)
    VALUES
    (%s, 'Fender', 'Fender Player II Stratocaster', 'Electric Guitar', 1, 13750000, 9500000, 4250000, 17),
    (%s, 'Gibson', 'Gibson Les Paul Standard 50s', 'Electric Guitar', 1, 39500000, 28000000, 11500000, 6);
    """, (p1_id, p2_id))

    cursor.execute("""
    INSERT INTO `mis_revenue_summary`
    (`period_type`, `period_date`, `gross_sales`, `cogs_total`, `gross_profit`, `delivery_sales`, `pickup_sales`)
    VALUES
    ('monthly', '2026-10-01', 53250000, 37500000, 15750000, 13750000, 39500000);
    """)

    cursor.execute("""
    INSERT INTO `mis_sales_summary`
    (`instrument_category`, `units_sold`, `revenue`, `cogs`, `profit_margin_pct`, `period_month`)
    VALUES
    ('Electric Guitars', 2, 53250000, 37500000, 29.57, '2026-10');
    """)

    # 11. OAS System Settings
    cursor.execute("""
    INSERT INTO `oas_system_settings` (`setting_key`, `setting_value`, `description`) VALUES
    ('store_name', 'Swee Lee Music Co. Indonesia', 'Nama entitas resmi retail musik'),
    ('currency', 'IDR', 'Mata uang toko'),
    ('tax_percentage', '11', 'PPN Indonesia'),
    ('click_collect_expiry_days', '7', 'Masa berlaku kode ambil barang sebelum auto-reminder');
    """)

    conn.close()
    print("\nDATABASE REBUILD & SEEDING COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    run_migration()

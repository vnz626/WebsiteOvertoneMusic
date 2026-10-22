from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    # 1. Update oas__support_tickets status ENUM
    db.session.execute(text("""
        ALTER TABLE oas__support_tickets 
        MODIFY COLUMN status ENUM('bot_active', 'waiting_agent', 'live_chat', 'resolved', 'closed', 'open', 'in_progress') NOT NULL DEFAULT 'bot_active'
    """))
    print("1. oas__support_tickets status enum updated.")

    # 2. Check if session_token column exists
    cols = [r[0] for r in db.session.execute(text("DESCRIBE oas__support_tickets")).fetchall()]
    if "session_token" not in cols:
        db.session.execute(text("ALTER TABLE oas__support_tickets ADD COLUMN session_token VARCHAR(100) NULL AFTER customer_id, ADD INDEX idx_session_token (session_token)"))
        print("2. Added session_token column to oas__support_tickets.")
    else:
        print("2. session_token column already exists.")

    # 3. Update oas__support_messages sender_type ENUM
    db.session.execute(text("""
        ALTER TABLE oas__support_messages 
        MODIFY COLUMN sender_type ENUM('staff', 'customer', 'bot', 'system') NOT NULL DEFAULT 'customer'
    """))
    print("3. oas__support_messages sender_type enum updated.")

    db.session.commit()
    print("All migrations committed successfully!")

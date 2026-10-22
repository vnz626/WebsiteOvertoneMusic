from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    cols = [r[0] for r in db.session.execute(text("DESCRIBE kms__articles")).fetchall()]
    print("Current columns in kms__articles:", cols)

    if "audience_type" not in cols:
        db.session.execute(text("""
            ALTER TABLE kms__articles 
            ADD COLUMN audience_type ENUM('customer', 'internal') NOT NULL DEFAULT 'customer' AFTER slug
        """))
        print("Added audience_type column.")
    else:
        print("audience_type already exists.")

    if "target_role" not in cols:
        db.session.execute(text("""
            ALTER TABLE kms__articles 
            ADD COLUMN target_role VARCHAR(50) NOT NULL DEFAULT 'public' AFTER audience_type
        """))
        print("Added target_role column.")
    else:
        print("target_role already exists.")

    if "sop_code" not in cols:
        db.session.execute(text("""
            ALTER TABLE kms__articles 
            ADD COLUMN sop_code VARCHAR(30) NULL AFTER target_role
        """))
        print("Added sop_code column.")
    else:
        print("sop_code already exists.")

    if "priority_level" not in cols:
        db.session.execute(text("""
            ALTER TABLE kms__articles 
            ADD COLUMN priority_level ENUM('standard', 'mandatory', 'critical') NOT NULL DEFAULT 'standard' AFTER sop_code
        """))
        print("Added priority_level column.")
    else:
        print("priority_level already exists.")

    # Ensure existing articles are customer/public
    db.session.execute(text("""
        UPDATE kms__articles 
        SET audience_type = 'customer', target_role = 'public' 
        WHERE audience_type IS NULL OR audience_type = ''
    """))

    db.session.commit()
    print("KMS articles schema migration completed successfully!")

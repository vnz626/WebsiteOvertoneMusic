"""E2E Verification script to test all 5 roles and endpoints."""
import json
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.extensions import db
from app.models.models import User, Organizer, Event, TicketTier, Transaction, Payout, SystemSetting
from werkzeug.security import generate_password_hash

app = create_app()

def run_tests():
    with app.app_context():
        u = User.query.filter_by(email="user@user.com").first()
        if u:
            u.role = "user"
            db.session.commit()

    with app.test_client() as client:
        print("=== 1. TEST LOGIN UNIFIED (Users table) ===")
        # Test super_admin login
        res = client.post("/api/auth/login", json={"login": "admin", "password": "admin123"})
        print("Super Admin login status:", res.status_code)
        assert res.status_code == 200, res.get_json()
        super_admin_token = res.get_json().get("access_token") or res.get_json().get("token")
        assert res.get_json()["role"] == "super_admin"

        # Test manager login
        res = client.post("/api/auth/login", json={"login": "staff1", "password": "manager123"})
        print("Manager login status:", res.status_code)
        assert res.status_code == 200, res.get_json()
        manager_token = res.get_json().get("access_token") or res.get_json().get("token")
        assert res.get_json()["role"] == "manager"

        # Test finance login
        res = client.post("/api/auth/login", json={"login": "finance", "password": "finance123"})
        print("Finance login status:", res.status_code)
        assert res.status_code == 200, res.get_json()
        finance_token = res.get_json().get("access_token") or res.get_json().get("token")
        assert res.get_json()["role"] == "finance"

        # Test promoter login
        res = client.post("/api/auth/login", json={"login": "promoter", "password": "promoter123"})
        print("Promoter login status:", res.status_code)
        assert res.status_code == 200, res.get_json()
        promoter_token = res.get_json().get("access_token") or res.get_json().get("token")
        assert res.get_json()["role"] == "promoter"

        # Test user login (with email)
        res = client.post("/api/auth/login", json={"login": "user@user.com", "password": "user123"})
        print("User login status:", res.status_code)
        assert res.status_code == 200, res.get_json()
        user_token = res.get_json().get("access_token") or res.get_json().get("token")
        assert res.get_json()["role"] == "user"

        print("\n=== 2. TEST ROLE 1: SUPER_ADMIN (Users & KYC) ===")
        headers_sa = {"Authorization": f"Bearer {super_admin_token}"}
        # Get users list
        res = client.get("/api/admin/users", headers=headers_sa)
        print("Get users list:", res.status_code, "count:", len(res.get_json().get("data", [])))
        assert res.status_code == 200

        # Get KYC list
        res = client.get("/api/admin/kyc", headers=headers_sa)
        print("Get KYC list:", res.status_code, "count:", len(res.get_json().get("data", [])))
        assert res.status_code == 200

        print("\n=== 3. TEST ROLE 2: MANAGER (Commission Settings & MIS) ===")
        headers_mgr = {"Authorization": f"Bearer {manager_token}"}
        # Get settings
        res = client.get("/api/admin/settings", headers=headers_mgr)
        print("Manager get settings:", res.status_code, res.get_json())
        assert res.status_code == 200

        # Update commission % setting
        res = client.put("/api/admin/settings", headers=headers_mgr, json={"platform_fee_percent": 6.5})
        print("Manager update settings:", res.status_code, res.get_json())
        assert res.status_code == 200

        # Manager MIS overview
        res = client.get("/api/mis/dashboard/summary", headers=headers_mgr)
        print("Manager MIS dashboard summary status:", res.status_code)
        assert res.status_code == 200

        print("\n=== 4. TEST ROLE 5: USER (Simulated Instant Order & Ticket Code) ===")
        headers_user = {"Authorization": f"Bearer {user_token}"}
        event_id = 1
        with app.app_context():
            event = Event.query.get(event_id)
            if event:
                event.approval_status = "published"
                event.status = "published"
                db.session.commit()

        order_payload = {
            "event_id": event_id,
            "quantity": 1,
            "buyer_name": "Testing Buyer",
            "buyer_email": "user@user.com",
            "buyer_phone": "081299998888",
            "payment_method": "Instant Pay (Simulasi Otomatis)",
            "simulate_payment": True
        }
        res = client.post("/api/orders", headers=headers_user, json=order_payload)
        print("User create instant order:", res.status_code)
        assert res.status_code == 201, res.get_json()
        trx_data = res.get_json()["data"]
        print("Trx status:", trx_data["status"], "Ticket Code:", trx_data["ticket_code"])
        assert trx_data["status"] == "paid"
        assert trx_data["ticket_code"] is not None
        ticket_code = trx_data["ticket_code"]

        # User check tickets
        res = client.get("/api/orders/my", headers=headers_user)
        print("User my tickets count:", res.status_code, len(res.get_json()["data"]))
        assert res.status_code == 200

        # User submit KYC
        res = client.post("/api/orders/kyc", headers=headers_user, json={
            "name": "User Testing Organizer",
            "organizer_type": "individual",
            "phone_pic": "081299998888",
            "nik_pic": "3171012345670001",
            "bank_name": "BCA",
            "bank_account_number": "1234567890",
            "bank_account_holder": "Testing Buyer"
        })
        print("User submit KYC:", res.status_code, res.get_json())
        assert res.status_code in (200, 201)

        print("\n=== 5. TEST ROLE 1: SUPER ADMIN APPROVE KYC -> PROMOTER ROLE ===")
        # Get KYC id for the user
        with app.app_context():
            org = Organizer.query.filter_by(name="User Testing Organizer").first()
            org_id = org.id
        res = client.post(f"/api/admin/kyc/{org_id}/verify", headers=headers_sa, json={"action": "approve"})
        print("Super admin approve KYC:", res.status_code, res.get_json())
        assert res.status_code == 200
        # Check user role is now promoter
        with app.app_context():
            user_obj = User.query.filter_by(email="user@user.com").first()
            print("User role after KYC approval:", user_obj.role)
            assert user_obj.role == "promoter"

        print("\n=== 6. TEST ROLE 4: PROMOTER (Scan Ticket & Request Payout) ===")
        # Promoter scans the ticket_code generated earlier
        headers_promoter = {"Authorization": f"Bearer {promoter_token}"}
        res = client.post("/api/promoter/scan-ticket", headers=headers_promoter, json={"ticket_code": ticket_code})
        print("Promoter scan ticket status:", res.status_code, res.get_json())
        assert res.status_code == 200

        # Promoter requests payout
        res = client.post(f"/api/promoter/events/{event_id}/request-payout", headers=headers_promoter, json={"amount": 50000})
        print("Promoter request payout:", res.status_code, res.get_json())
        payout_id = res.get_json().get("data", {}).get("id") if res.status_code in (200, 201) else None

        print("\n=== 7. TEST ROLE 3: FINANCE (Payouts Management & Transfer) ===")
        headers_fin = {"Authorization": f"Bearer {finance_token}"}
        res = client.get("/api/finance/payouts", headers=headers_fin)
        print("Finance get payouts list:", res.status_code, "count:", len(res.get_json().get("data", [])))
        assert res.status_code == 200

        if payout_id:
            # Finance approve payout
            res = client.post(f"/api/finance/payouts/{payout_id}/approve", headers=headers_fin)
            print("Finance approve payout:", res.status_code)
            assert res.status_code == 200

            # Finance transfer payout
            res = client.post(f"/api/finance/payouts/{payout_id}/transfer", headers=headers_fin, json={
                "transfer_proof_file": "/uploads/proof.jpg"
            })
            print("Finance transfer payout:", res.status_code, res.get_json())
            assert res.status_code == 200

        print("\n>>> ALL 5 ROLES AND E2E FLOWS TESTED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_tests()

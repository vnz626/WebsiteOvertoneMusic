import urllib.request
import json
from app import create_app
from app.models.models import User
from app.security import make_token

app = create_app()
with app.app_context():
    staff = User.query.filter_by(role='store_staff').first() or User.query.filter_by(role='super_admin').first()
    staff_token = make_token(staff, is_staff=True)

test_session_token = 'sess_test_handover_999'

# 1. User clicks Quick Topic Pill
p1 = json.dumps({
    'topic_key': 'pengiriman',
    'label': 'Pengiriman & Packing Kayu',
    'session_token': test_session_token
}).encode()
req1 = urllib.request.Request('http://127.0.0.1:5000/api/support/quick-kms', data=p1, headers={'Content-Type': 'application/json'}, method='POST')
with urllib.request.urlopen(req1) as resp1:
    res1 = json.loads(resp1.read().decode())
    ticket_id = res1['ticket_id']
    print(f"1. Quick KMS Atomic Save: status={res1['status']}, ticket_id={ticket_id}, msgs={len(res1['messages'])}")

# 2. Customer polls session
req2 = urllib.request.Request(f'http://127.0.0.1:5000/api/support/my-session?session_token={test_session_token}')
with urllib.request.urlopen(req2) as resp2:
    res2 = json.loads(resp2.read().decode())
    print(f"2. Customer Poll (No disappearing bug): {len(res2['messages'])} messages stored permanently in DB.")
    for m in res2['messages']:
        print(f"   - [{m['sender_type']}] {m['sender_name']}: {m['message'][:45]}...")

# 3. User requests Live Agent
p3 = json.dumps({'ticket_id': ticket_id, 'session_token': test_session_token}).encode()
req3 = urllib.request.Request('http://127.0.0.1:5000/api/support/request-agent', data=p3, headers={'Content-Type': 'application/json'}, method='POST')
with urllib.request.urlopen(req3) as resp3:
    res3 = json.loads(resp3.read().decode())
    print(f"3. Request Live Agent: status={res3['status']}")

# 4. Staff checks sessions list
req4 = urllib.request.Request('http://127.0.0.1:5000/api/support/staff/sessions', headers={'Authorization': f'Bearer {staff_token}'})
with urllib.request.urlopen(req4) as resp4:
    res4 = json.loads(resp4.read().decode())
    print(f"4. Staff Sessions Queue: waiting_count={res4['kpis']['waiting_count']}, live_count={res4['kpis']['live_count']}")

# 5. Staff accepts the session
req5 = urllib.request.Request(f'http://127.0.0.1:5000/api/support/staff/sessions/{ticket_id}/accept', headers={'Authorization': f'Bearer {staff_token}'}, method='POST')
with urllib.request.urlopen(req5) as resp5:
    res5 = json.loads(resp5.read().decode())
    print(f"5. Staff Accepted Session: status={res5['status']}, assigned={res5['assigned_staff']['name']}")

# 6. Customer polls session again (Handover transition detected)
req6 = urllib.request.Request(f'http://127.0.0.1:5000/api/support/my-session?session_token={test_session_token}')
with urllib.request.urlopen(req6) as resp6:
    res6 = json.loads(resp6.read().decode())
    print(f"6. Customer Detected Handover: status={res6['ticket']['status']}, staff={res6['ticket']['assigned_staff']['name']}")

# 7. Staff sends live reply
p7 = json.dumps({'ticket_id': ticket_id, 'message': 'Halo Kak, salam kenal! Saya luthier Overtone, ada tipe instrumen yang ingin ditanyakan?'}).encode()
req7 = urllib.request.Request('http://127.0.0.1:5000/api/support/messages', data=p7, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {staff_token}'}, method='POST')
with urllib.request.urlopen(req7) as resp7:
    res7 = json.loads(resp7.read().decode())
    print(f"7. Staff Sent Live Reply: from {res7['message']['sender_name']}")

# 8. Staff resolves session
req8 = urllib.request.Request(f'http://127.0.0.1:5000/api/support/staff/sessions/{ticket_id}/resolve', headers={'Authorization': f'Bearer {staff_token}'}, method='POST')
with urllib.request.urlopen(req8) as resp8:
    res8 = json.loads(resp8.read().decode())
    print(f"8. Session Resolved: status={res8['status']}")

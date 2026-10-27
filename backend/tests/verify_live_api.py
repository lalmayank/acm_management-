import requests
import uuid

BASE_URL = "http://127.0.0.1:8000"

def test_full_validator_flow():
    print("=" * 60)
    print("🚀 ACM SHARK TANK: LIVE TICKET VALIDATOR E2E VERIFICATION")
    print("=" * 60)

    # 1. Health check
    h = requests.get(f"{BASE_URL}/health").json()
    print(f"[1] Backend Health: {h['status']} (DB: {h['database']})")
    assert h["status"] == "healthy"

    # 2. Login as Admin
    email = "organizer@sharktank.acm.org"
    password = "SuperSecureAdminPassword123!"
    
    login_res = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"email_or_registration_id": email, "password": password},
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {token}"}
    print(f"[2] Authenticated as Admin! (Role: {login_res.json()['primary_role']})")

    # 3. Create a Ticket Type (e.g. Shark Access Pass)
    unique_suffix = uuid.uuid4().hex[:6]
    ticket_payload = {
        "name": f"Shark Access Pass {unique_suffix}",
        "category": "ENTRY",
        "description": "All-access badge for Shark Tank Pitch Day",
        "allowed_uses_per_member": 1,
        "is_active": True,
    }
    tt_res = requests.post(f"{BASE_URL}/api/v1/tickets/types", json=ticket_payload, headers=admin_headers)
    assert tt_res.status_code in [200, 201], f"Failed to create ticket type: {tt_res.text}"
    ticket_type = tt_res.json()
    tt_id = ticket_type["id"]
    print(f"[3] Created Ticket Type: '{ticket_type['name']}' (ID: {tt_id})")

    # 4. Create a Participant
    reg_code = f"PITCH-{unique_suffix.upper()}"
    part_payload = {
        "name": "Alex Founder",
        "email": f"alex_{unique_suffix}@startup.edu",
        "registration_code": reg_code,
        "password": "mypassword123",
        "college": "MIT Innovation Lab",
        "phone": "+1-555-0199",
    }
    p_res = requests.post(f"{BASE_URL}/api/v1/participants", json=part_payload, headers=admin_headers)
    assert p_res.status_code in [200, 201], f"Failed to create participant: {p_res.text}"
    participant = p_res.json()
    part_id = participant["id"]
    print(f"[4] Created Participant: '{participant['name']}' (Reg Code: {participant['registration_code']})")

    # 5. Issue Ticket Entitlement directly to Participant
    issue_payload = {
        "participant_ids": [part_id],
        "quantity_per_member": 1,
    }
    issue_res = requests.post(
        f"{BASE_URL}/api/v1/tickets/types/{tt_id}/issue",
        json=issue_payload,
        headers=admin_headers,
    )
    assert issue_res.status_code == 200, f"Failed to issue ticket: {issue_res.text}"
    print(f"[5] Issued Ticket to participant. Issued count: {issue_res.json().get('issued_count')}")

    # 6. Participant Logs in and retrieves their personal Ticket & QR Code
    part_login = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"email_or_registration_id": reg_code, "password": "mypassword123"},
    )
    assert part_login.status_code == 200, f"Participant login failed: {part_login.text}"
    part_token = part_login.json()["access_token"]
    part_headers = {"Authorization": f"Bearer {part_token}"}

    part_tickets = requests.get(f"{BASE_URL}/api/v1/participants/me/tickets", headers=part_headers).json()
    assert len(part_tickets) > 0, "No tickets found for participant"
    ticket = part_tickets[0]
    secret_code = ticket["secret_code"]
    print(f"[6] Participant retrieved ticket from portal! QR Secret: '{secret_code}'")

    # 7. VALIDATOR SCAN 1: Normal first-time check-in by volunteer/admin
    print("\n--- TEST SCAN 1: First Valid Check-in ---")
    scan1_res = requests.post(
        f"{BASE_URL}/api/v1/verification/qr",
        json={"ticket_reference": secret_code, "idempotency_key": f"scan_{uuid.uuid4().hex}"},
        headers=admin_headers,
    )
    assert scan1_res.status_code == 200, f"Scan failed: {scan1_res.text}"
    r1 = scan1_res.json()
    print(f"    Outcome:         {r1['outcome']}")
    print(f"    Message:         {r1['message']}")
    print(f"    Participant:     {r1.get('participant_name')}")
    print(f"    Ticket Type:     {r1.get('ticket_name')}")
    print(f"    Redemption Uses: {r1.get('used_count')} / {r1.get('allowed_uses')}")
    assert r1["outcome"] == "VALID", f"Expected VALID, got {r1['outcome']}"

    # 8. VALIDATOR SCAN 2: Duplicate scan attempt (Fraud/Double-entry prevention)
    print("\n--- TEST SCAN 2: Duplicate Scan (Double-entry detection) ---")
    scan2_res = requests.post(
        f"{BASE_URL}/api/v1/verification/qr",
        json={"ticket_reference": secret_code, "idempotency_key": f"scan_{uuid.uuid4().hex}"},
        headers=admin_headers,
    )
    assert scan2_res.status_code == 200, f"Duplicate scan failed: {scan2_res.text}"
    r2 = scan2_res.json()
    print(f"    Outcome:         {r2['outcome']}")
    print(f"    Message:         {r2['message']}")
    print(f"    Current Usage:   {r2.get('used_count')} / {r2.get('allowed_uses')}")
    assert r2["outcome"] == "ALREADY_REDEEMED", f"Expected ALREADY_REDEEMED, got {r2['outcome']}"

    # 9. VALIDATOR SCAN 3: Fake/Invalid QR code
    print("\n--- TEST SCAN 3: Invalid / Forged QR Code ---")
    scan3_res = requests.post(
        f"{BASE_URL}/api/v1/verification/qr",
        json={"ticket_reference": "FORGED-QR-TOKEN-99999", "idempotency_key": f"scan_{uuid.uuid4().hex}"},
        headers=admin_headers,
    )
    assert scan3_res.status_code == 200
    r3 = scan3_res.json()
    print(f"    Outcome:         {r3['outcome']}")
    print(f"    Message:         {r3['message']}")
    assert r3["outcome"] == "VERIFICATION_FAILED"

    # 10. Scan Attempts Audit Trail
    print("\n--- TEST SCAN 4: Volunteer Audit Trail Log ---")
    attempts_res = requests.get(f"{BASE_URL}/api/v1/verification/attempts", headers=admin_headers)
    assert attempts_res.status_code == 200
    attempts = attempts_res.json()
    print(f"    Total Scan Attempts in Audit Log: {len(attempts)}")
    for a in attempts[:3]:
        print(f"    • [{a['outcome']}] Ref: {a['ticket_reference'][:16]}... | By: {a['validator_name']}")

    print("\n" + "=" * 60)
    print("✅ VERDICT: THE TICKET VALIDATOR IS 100% OPERATIONAL & WORKING!")
    print("=" * 60)

if __name__ == "__main__":
    test_full_validator_flow()

"""
Full Multi-User Community Listings & MongoDB Atlas Verification Script
Tests all acceptance criteria using httpx:
- User A & B registration & persistence in Atlas
- Cross-user skill listings visibility with populated owner profile
- Cross-user resource listings visibility with populated owner profile
- People directory listing all registered students safely
- Security validations (401 unauthenticated, 403 unauthorized modification, no password hashes)
"""

import sys
import httpx
import json

BASE_URL = "http://localhost:8000"

def log_test(name, passed, detail=""):
    status = "PASSED" if passed else "FAILED"
    print(f"[{status}] {name} {('- ' + detail) if detail else ''}")
    if not passed:
        sys.exit(1)

def run_tests():
    print("=" * 60)
    print("RUNNING CAMPUSX REAL ATLAS COMMUNITY INTEGRATION TESTS")
    print("=" * 60)

    client = httpx.Client(timeout=20.0)

    # 1. Health & Database Status
    res = client.get(f"{BASE_URL}/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    log_test(
        "Health & Real Atlas DB Check",
        health_data.get("database", {}).get("connected") is True and health_data.get("database", {}).get("is_mock") is False,
        f"db_name={health_data.get('database', {}).get('database_name')}, is_mock={health_data.get('database', {}).get('is_mock')}"
    )

    student_a_email = "test_alice_qa@campus.edu"
    student_b_email = "test_bob_qa@campus.edu"
    password = "SecurePassword123!"

    # 2. Test A: Register Student A
    reg_a_payload = {
        "email": student_a_email,
        "password": password,
        "full_name": "Alice QA Tester",
        "username": "alice_qa",
        "department": "Computer Science",
        "academic_year": "3rd Year",
        "role": "student"
    }
    res_a = client.post(f"{BASE_URL}/api/auth/register", json=reg_a_payload)
    if res_a.status_code == 400 and "already registered" in res_a.text:
        login_a = client.post(f"{BASE_URL}/api/auth/login", json={"email": student_a_email, "password": password})
        assert login_a.status_code == 200, f"Login A failed: {login_a.text}"
        token_a = login_a.json()["access_token"]
        user_a = login_a.json()["user"]
    else:
        assert res_a.status_code == 201, f"Register A failed: {res_a.text}"
        token_a = res_a.json()["access_token"]
        user_a = res_a.json()["user"]
    
    log_test("Test A: Student A Registration & JWT Issuance", bool(token_a and user_a.get("email") == student_a_email))

    # 3. Register Student B
    reg_b_payload = {
        "email": student_b_email,
        "password": password,
        "full_name": "Bob QA Reviewer",
        "username": "bob_qa",
        "department": "Electrical Engineering",
        "academic_year": "2nd Year",
        "role": "student"
    }
    res_b = client.post(f"{BASE_URL}/api/auth/register", json=reg_b_payload)
    if res_b.status_code == 400 and "already registered" in res_b.text:
        login_b = client.post(f"{BASE_URL}/api/auth/login", json={"email": student_b_email, "password": password})
        assert login_b.status_code == 200, f"Login B failed: {login_b.text}"
        token_b = login_b.json()["access_token"]
        user_b = login_b.json()["user"]
    else:
        assert res_b.status_code == 201, f"Register B failed: {res_b.text}"
        token_b = res_b.json()["access_token"]
        user_b = res_b.json()["user"]

    log_test("Test A: Student B Registration & JWT Issuance", bool(token_b and user_b.get("email") == student_b_email))

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 4. Test B: Student A posts a skill listing
    skill_payload = {
        "title": "Full-Stack Web Development with React & FastAPI",
        "description": "Offering hands-on peer sessions in React hooks and asynchronous Python APIs.",
        "category": "Web Development",
        "skill_level": "Intermediate",
        "session_duration_minutes": 60
    }
    res_skill = client.post(f"{BASE_URL}/api/skills", json=skill_payload, headers=headers_a)
    assert res_skill.status_code == 201, f"Skill creation failed: {res_skill.text}"
    created_skill = res_skill.json()
    skill_id = created_skill.get("id") or created_skill.get("_id")
    log_test("Test B: Student A Creates Real Skill Listing", bool(skill_id), f"skill_id={skill_id}")

    # Student B queries /api/skills
    res_skills_b = client.get(f"{BASE_URL}/api/skills", headers=headers_b)
    assert res_skills_b.status_code == 200, f"Get skills failed: {res_skills_b.text}"
    skills_data = res_skills_b.json()
    skills_list = skills_data.get("items") if isinstance(skills_data, dict) else skills_data
    matched_skill = next((s for s in skills_list if (s.get("id") == skill_id or s.get("_id") == skill_id)), None)
    log_test(
        "Test B: Student B Views Student A's Skill with Populated Owner",
        matched_skill is not None and matched_skill.get("owner_name") == "Alice QA Tester",
        f"found={bool(matched_skill)}, owner_name={matched_skill.get('owner_name') if matched_skill else None}"
    )

    # 5. Test C: Student A lists a resource
    resource_payload = {
        "title": "Raspberry Pi 4 8GB + Sensors Starter Kit",
        "description": "Includes breadboard, jumper cables, ultrasonic sensor and power supply.",
        "category": "Electronics & Hardware",
        "condition": "Like New",
        "max_loan_days": 7
    }
    res_res = client.post(f"{BASE_URL}/api/resources", json=resource_payload, headers=headers_a)
    assert res_res.status_code == 201, f"Resource creation failed: {res_res.text}"
    created_res = res_res.json()
    resource_id = created_res.get("id") or created_res.get("_id")
    log_test("Test C: Student A Lists Real Resource", bool(resource_id), f"resource_id={resource_id}")

    # Student B queries /api/resources
    res_res_b = client.get(f"{BASE_URL}/api/resources", headers=headers_b)
    assert res_res_b.status_code == 200, f"Get resources failed: {res_res_b.text}"
    res_data = res_res_b.json()
    res_list = res_data.get("items") if isinstance(res_data, dict) else res_data
    matched_res = next((r for r in res_list if (r.get("id") == resource_id or r.get("_id") == resource_id)), None)
    log_test(
        "Test C: Student B Views Student A's Resource with Populated Owner",
        matched_res is not None and matched_res.get("owner_name") == "Alice QA Tester",
        f"found={bool(matched_res)}, owner_name={matched_res.get('owner_name') if matched_res else None}"
    )

    # 6. Test D: People page (/api/users and /api/v1/users)
    res_users = client.get(f"{BASE_URL}/api/users", headers=headers_b)
    assert res_users.status_code == 200, f"Get users failed: {res_users.text}"
    users_data = res_users.json()
    students = users_data.get("users", [])
    has_alice = any(u.get("email") == student_a_email or u.get("full_name") == "Alice QA Tester" for u in students)
    has_bob = any(u.get("email") == student_b_email or u.get("full_name") == "Bob QA Reviewer" for u in students)
    log_test(
        "Test D: Both Students Appear in People Directory (/api/users)",
        has_alice and has_bob,
        f"total_users={len(students)}, alice_found={has_alice}, bob_found={has_bob}"
    )

    # Check search query on /api/users?q=Alice
    res_search = client.get(f"{BASE_URL}/api/users?q=Alice", headers=headers_b)
    assert res_search.status_code == 200
    search_students = res_search.json().get("users", [])
    log_test(
        "Test D: People Directory Search by Query",
        any("Alice" in u.get("full_name", "") for u in search_students),
        f"found_count={len(search_students)}"
    )

    # 7. Test F: Security Checks
    # Unauthenticated create skill should return 401
    res_unauth = client.post(f"{BASE_URL}/api/skills", json=skill_payload)
    log_test("Test F: Unauthenticated Listing Creation Rejected (401)", res_unauth.status_code == 401)

    # Unauthorized delete (Bob cannot delete Alice's skill)
    res_hack_del = client.delete(f"{BASE_URL}/api/skills/{skill_id}", headers=headers_b)
    log_test("Test F: Unauthorized Modification Rejected (403)", res_hack_del.status_code == 403)

    # Password hash check: Verify no password/hashed_password exposed in /api/users
    passwords_exposed = any(
        "password" in u or "hashed_password" in u
        for u in students
    )
    log_test("Test F: Password Hashes Excluded from Public Profiles", not passwords_exposed)

    # 8. Test E: Persistence & Atlas Direct Connection
    res_v1_skills = client.get(f"{BASE_URL}/api/v1/skills", headers=headers_b)
    assert res_v1_skills.status_code == 200
    v1_skills_data = res_v1_skills.json()
    v1_skills_list = v1_skills_data.get("items") if isinstance(v1_skills_data, dict) else v1_skills_data
    v1_has_skill = any(s.get("id") == skill_id or s.get("_id") == skill_id for s in v1_skills_list)
    log_test("Test E: Cross-Prefix Compatibility (/api/v1/skills)", v1_has_skill)

    res_v1_users = client.get(f"{BASE_URL}/api/v1/users", headers=headers_b)
    assert res_v1_users.status_code == 200
    log_test("Test E: Cross-Prefix Compatibility (/api/v1/users)", res_v1_users.json().get("total", 0) > 0)

    print("=" * 60)
    print("ALL COMMUNITY INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()

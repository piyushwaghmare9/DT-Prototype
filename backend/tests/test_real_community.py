import asyncio
import os
import certifi
import sys
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.main import app
from app.core.database import connect_to_mongo, close_mongo_connection, get_db

async def run_tests():
    print("=" * 60)
    print("RUNNING CAMPUSX COMPLETE ACCEPTANCE TEST SUITE")
    print("=" * 60)

    await connect_to_mongo()
    db = get_db()
    
    # We will test using AsyncClient directly against our FastAPI app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:

        # -----------------------------------------------------------
        # TEST A: Registration & Login Persistence
        # -----------------------------------------------------------
        print("\n--- TEST A: Registration & Login Persistence ---")
        ts = int(datetime.now(timezone.utc).timestamp())
        student_a_email = f"student_a_{ts}@campus.edu"
        student_b_email = f"student_b_{ts}@campus.edu"
        password = "Password123!"

        reg_a = await client.post("/api/v1/auth/register", json={
            "full_name": "Student A",
            "email": student_a_email,
            "password": password,
            "department": "Computer Science",
            "academic_year": "2nd Year",
        })
        print(f"Register Student A ({student_a_email}): {reg_a.status_code}")
        assert reg_a.status_code == 201, f"Failed to register Student A: {reg_a.text}"
        data_a = reg_a.json()
        token_a = data_a["access_token"]
        user_a = data_a["user"]
        id_a = user_a["id"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Verify document exists in MongoDB Atlas
        doc_a = await db.users.find_one({"email": student_a_email})
        assert doc_a is not None, "Student A not found in MongoDB Atlas users collection"
        assert "password_hash" in doc_a, "password_hash missing from user document"
        assert doc_a["password_hash"] != password, "Password was not hashed"
        print(f"Verified Student A doc in MongoDB Atlas (ID: {doc_a['_id']})")

        # Register Student B
        reg_b = await client.post("/api/v1/auth/register", json={
            "full_name": "Student B",
            "email": student_b_email,
            "password": password,
            "department": "Mechanical Engineering",
            "academic_year": "3rd Year",
        })
        print(f"Register Student B ({student_b_email}): {reg_b.status_code}")
        assert reg_b.status_code == 201
        data_b = reg_b.json()
        token_b = data_b["access_token"]
        user_b = data_b["user"]
        id_b = user_b["id"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # Login as Student A
        login_a = await client.post("/api/v1/auth/login", json={
            "email": student_a_email,
            "password": password,
        })
        assert login_a.status_code == 200
        assert login_a.json()["user"]["full_name"] == "Student A"
        print("Login Student A: PASSED")

        # -----------------------------------------------------------
        # TEST B: Skills (Student A adds skill, Student B sees it)
        # -----------------------------------------------------------
        print("\n--- TEST B: Skills Multi-User Visibility ---")
        skill_title = f"Rust Systems Programming {ts}"
        post_skill = await client.post("/api/skills", json={
            "title": skill_title,
            "description": "Deep dive into Rust memory safety, concurrency, and WebAssembly.",
            "category": "Programming",
            "skill_level": "Advanced",
            "session_duration_minutes": 60,
            "preferred_language": "English",
            "session_format": "Online",
            "tags": ["rust", "systems", "wasm"],
        }, headers=headers_a)
        print(f"POST /api/skills (Student A): {post_skill.status_code}")
        assert post_skill.status_code == 201, f"Failed to post skill: {post_skill.text}"
        skill_data = post_skill.json()
        skill_id = skill_data["id"]

        # Student B fetches skills
        get_skills = await client.get("/api/skills", headers=headers_b)
        print(f"GET /api/skills (Student B): {get_skills.status_code}")
        assert get_skills.status_code == 200
        all_skills = get_skills.json()["items"]
        found_skill = next((s for s in all_skills if s.get("id") == skill_id or s.get("title") == skill_title), None)
        assert found_skill is not None, f"Student B cannot see Student A's skill: {skill_title}"
        assert found_skill["provider_name"] == "Student A" or found_skill["owner_name"] == "Student A"
        assert found_skill["owner_id"] == id_a or found_skill["provider_id"] == id_a
        print(f"Student B sees Student A's skill: '{found_skill['title']}' by {found_skill.get('owner_name')}: PASSED")

        # -----------------------------------------------------------
        # TEST C: Resources (Student A lists resource, Student B sees it)
        # -----------------------------------------------------------
        print("\n--- TEST C: Resources Multi-User Visibility ---")
        resource_title = f"Digital Multimeter {ts}"
        post_res = await client.post("/api/resources", json={
            "title": resource_title,
            "description": "True-RMS autoranging digital multimeter with leads and case.",
            "category": "Electronics",
            "condition": "Like New",
            "max_duration_days": 10,
            "pickup_location": "Hardware Lab 204",
            "is_deposit_required": False,
            "deposit_amount": 0,
            "tags": ["multimeter", "electronics", "lab"],
        }, headers=headers_a)
        print(f"POST /api/resources (Student A): {post_res.status_code}")
        assert post_res.status_code == 201, f"Failed to list resource: {post_res.text}"
        res_data = post_res.json()
        res_id = res_data["id"]

        # Student B fetches resources
        get_res = await client.get("/api/resources", headers=headers_b)
        print(f"GET /api/resources (Student B): {get_res.status_code}")
        assert get_res.status_code == 200
        all_resources = get_res.json()["items"]
        found_res = next((r for r in all_resources if r.get("id") == res_id or r.get("title") == resource_title), None)
        assert found_res is not None, f"Student B cannot see Student A's resource: {resource_title}"
        assert found_res["owner_name"] == "Student A"
        assert found_res["status"] == "available"
        print(f"Student B sees Student A's resource: '{found_res['title']}' by {found_res['owner_name']}: PASSED")

        # -----------------------------------------------------------
        # TEST D: People Directory (Both appear in /api/users)
        # -----------------------------------------------------------
        print("\n--- TEST D: People Page Directory ---")
        get_users = await client.get("/api/users", headers=headers_b)
        print(f"GET /api/users (Student B): {get_users.status_code}")
        assert get_users.status_code == 200
        users_list = get_users.json()["items"]
        user_ids = [u.get("id") or u.get("_id") for u in users_list]
        assert id_a in user_ids, "Student A is missing from People directory"
        assert id_b in user_ids, "Student B is missing from People directory"
        print(f"Both Student A (ID: {id_a}) and Student B (ID: {id_b}) appear in People Directory: PASSED")

        # Test Department & Year Filtering
        cs_filter = await client.get("/api/users?department=Computer Science", headers=headers_b)
        assert cs_filter.status_code == 200
        assert any((u.get("id") == id_a for u in cs_filter.json()["items"])), "Student A not found with department filter"

        year_filter = await client.get("/api/users?year=2nd Year", headers=headers_b)
        assert year_filter.status_code == 200
        assert any((u.get("id") == id_a for u in year_filter.json()["items"])), "Student A not found with year filter"
        print("Department and Year filtering: PASSED")

        # -----------------------------------------------------------
        # TEST E: Persistence
        # -----------------------------------------------------------
        print("\n--- TEST E: Persistence Verification ---")
        relogin_a = await client.post("/api/v1/auth/login", json={
            "email": student_a_email,
            "password": password,
        })
        assert relogin_a.status_code == 200
        new_token_a = relogin_a.json()["access_token"]
        me_res = await client.get("/api/users/me", headers={"Authorization": f"Bearer {new_token_a}"})
        assert me_res.status_code == 200
        assert me_res.json()["full_name"] == "Student A"
        print("Re-login and profile persistence: PASSED")

        # -----------------------------------------------------------
        # TEST F: Security & Privacy
        # -----------------------------------------------------------
        print("\n--- TEST F: Security & Privacy ---")
        # 1. Unauthenticated users cannot create listings
        unauth_post = await client.post("/api/skills", json={
            "title": "Hacker Skill",
            "description": "Should fail",
            "category": "Programming",
            "skill_level": "Beginner",
            "session_duration_minutes": 30,
        })
        assert unauth_post.status_code in [401, 403], f"Unauthenticated post succeeded with {unauth_post.status_code}"
        print("Unauthenticated listing blocked: PASSED")

        # 2. Student B cannot edit Student A's skill
        unauth_edit = await client.put(f"/api/skills/{skill_id}", json={
            "title": "Malicious Title",
        }, headers=headers_b)
        assert unauth_edit.status_code in [403, 401], f"Unauthorized edit succeeded with {unauth_edit.status_code}"
        print("Cross-student editing forbidden: PASSED")

        # 3. Public API never exposes password hashes
        for u in users_list:
            assert "password_hash" not in u, f"Sensitive password_hash exposed in user doc {u.get('id')}"
            assert "password" not in u, f"Sensitive password exposed in user doc {u.get('id')}"
        print("Password hashes strictly hidden from public APIs: PASSED")

        # 4. GET /api/users does not expose private email for other students
        other_students = [u for u in users_list if u.get("id") != id_b]
        for os_u in other_students:
            assert "email" not in os_u, f"Private email exposed for other student {os_u.get('id')}"
        print("Private contact details protected from other students: PASSED")

    print("\n" + "=" * 60)
    print("ALL ACCEPTANCE CRITERIA TESTS PASSED PERFECTLY!")
    print("=" * 60)
    await close_mongo_connection()

asyncio.run(run_tests())

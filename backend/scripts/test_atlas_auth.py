import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import connect_to_mongo, close_mongo_connection, get_db

async def run_verification():
    await connect_to_mongo()
    db = get_db()

    email = "test_verify_user@campus.edu"
    password = "VerifyPass2026!"

    # Clean up test user if previously exists to ensure clean run
    await db.users.delete_one({"email": email})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://localhost:8000") as client:
        # 1. Health check
        health_res = await client.get("/api/health")
        print("[1] Health check status:", health_res.status_code, health_res.json())
        assert health_res.status_code == 200

        # 2. Register
        reg_payload = {
            "email": email,
            "password": password,
            "full_name": "Atlas Verification User",
            "department": "Computer Science",
            "academic_year": "3rd Year"
        }
        reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
        print("[2] Registration status:", reg_res.status_code)
        assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
        reg_data = reg_res.json()
        assert "access_token" in reg_data
        assert reg_data["user"]["email"] == email

        # 3. Direct MongoDB Atlas verification
        atlas_doc = await db.users.find_one({"email": email})
        assert atlas_doc is not None, "CRITICAL: User document NOT found in MongoDB Atlas!"
        print("[3] MongoDB Atlas user document verified directly!")
        print("    _id:", atlas_doc["_id"])
        print("    email:", atlas_doc["email"])
        print("    full_name:", atlas_doc["full_name"])
        print("    department:", atlas_doc["department"])
        print("    role:", atlas_doc["role"])
        print("    password_hash is bcrypt:", atlas_doc["password_hash"].startswith("$2b$"))
        print("    plaintext password stored:", password in str(atlas_doc))

        # 4. Duplicate registration check
        dup_res = await client.post("/api/v1/auth/register", json=reg_payload)
        print("[4] Duplicate registration status:", dup_res.status_code, dup_res.json())
        assert dup_res.status_code == 400

        # 5. Wrong password login
        wrong_res = await client.post("/api/v1/auth/login", json={"email": email, "password": "WrongPassword123"})
        print("[5] Invalid password status:", wrong_res.status_code, wrong_res.json())
        assert wrong_res.status_code == 401

        # 6. Correct password login
        login_res = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
        print("[6] Valid login status:", login_res.status_code)
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]

        # 7. Fetch /me with token
        me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        print("[7] Fetch /me status:", me_res.status_code, me_res.json()["email"])
        assert me_res.status_code == 200

        # 8. Verify document count in MongoDB Atlas users collection
        user_count = await db.users.count_documents({})
        print(f"[8] Total user documents in MongoDB Atlas 'users' collection: {user_count}")

    await close_mongo_connection()
    print("\n>>> ALL ATLAS VERIFICATION CHECKS PASSED PERFECTLY! <<<")

if __name__ == "__main__":
    asyncio.run(run_verification())

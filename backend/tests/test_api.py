import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import connect_to_mongo, close_mongo_connection, get_db
from app.api.rewards import seed_quests
from app.core.seeder import seed_demo_data

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    await connect_to_mongo()
    db = get_db()
    await seed_quests(db)
    await seed_demo_data(db)
    yield
    await close_mongo_connection()

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "app" in data

@pytest.mark.asyncio
async def test_auth_workflow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Register new student
        user_payload = {
            "email": "fresh_student@campus.edu",
            "password": "Password123!",
            "full_name": "Fresh Student",
            "department": "Computer Science",
            "academic_year": "2nd Year",
        }
        reg_res = await ac.post("/api/v1/auth/register", json=user_payload)
        assert reg_res.status_code in [201, 400]

        # Login
        login_payload = {
            "email": "fresh_student@campus.edu",
            "password": "Password123!",
        }
        login_res = await ac.post("/api/v1/auth/login", json=login_payload)
        assert login_res.status_code == 200
        token_data = login_res.json()
        assert "access_token" in token_data
        token = token_data["access_token"]

        # Fetch current profile
        headers = {"Authorization": f"Bearer {token}"}
        me_res = await ac.get("/api/v1/profiles/me", headers=headers)
        assert me_res.status_code == 200
        profile = me_res.json()
        assert profile["email"] == "fresh_student@campus.edu"
        assert profile["full_name"] == "Fresh Student"

@pytest.mark.asyncio
async def test_skills_and_resources():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Login with seeded user
        login_payload = {
            "email": "arjun.sharma@campus.edu",
            "password": "CampusPass123!",
        }
        login_res = await ac.post("/api/v1/auth/login", json=login_payload)
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # List skills
        skills_res = await ac.get("/api/v1/skills/listings", headers=headers)
        assert skills_res.status_code == 200
        skills_data = skills_res.json()
        assert "items" in skills_data
        assert len(skills_data["items"]) >= 1

        # List resources
        res_res = await ac.get("/api/v1/resources/", headers=headers)
        assert res_res.status_code == 200
        res_data = res_res.json()
        assert "items" in res_data
        assert len(res_data["items"]) >= 1

@pytest.mark.asyncio
async def test_graph_nodes():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_payload = {
            "email": "arjun.sharma@campus.edu",
            "password": "CampusPass123!",
        }
        login_res = await ac.post("/api/v1/auth/login", json=login_payload)
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Fetch Graph
        graph_res = await ac.get("/api/v1/graph/nodes", headers=headers)
        assert graph_res.status_code == 200
        graph_data = graph_res.json()
        assert "nodes" in graph_data
        assert "edges" in graph_data
        assert len(graph_data["nodes"]) >= 1

@pytest.mark.asyncio
async def test_exchange_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Priya (requester) logs in
        login_priya = await ac.post("/api/v1/auth/login", json={
            "email": "priya.patel@campus.edu",
            "password": "CampusPass123!",
        })
        token_priya = login_priya.json()["access_token"]
        headers_priya = {"Authorization": f"Bearer {token_priya}"}

        # Arjun (provider) logs in
        login_arjun = await ac.post("/api/v1/auth/login", json={
            "email": "arjun.sharma@campus.edu",
            "password": "CampusPass123!",
        })
        token_arjun = login_arjun.json()["access_token"]
        headers_arjun = {"Authorization": f"Bearer {token_arjun}"}

        # Find Arjun's skill listing
        skills_res = await ac.get("/api/v1/skills/listings", headers=headers_priya)
        arjun_id = login_arjun.json()["user"]["id"]
        listing = next(item for item in skills_res.json()["items"] if item.get("provider_id") == arjun_id or item.get("owner_id") == arjun_id or item.get("provider_name") == "Arjun Sharma")
        listing_id = listing["id"]

        # Priya creates exchange request
        req_res = await ac.post("/api/v1/exchanges/", json={
            "request_type": "skill",
            "listing_id": listing_id,
            "message": "Hey Arjun, I'd love a 1-hour session on React!",
            "proposed_date": "2026-10-25",
            "duration_days": 1,
        }, headers=headers_priya)
        assert req_res.status_code == 201
        exchange = req_res.json()
        exchange_id = exchange["id"]
        assert exchange["status"] == "pending"

        # Arjun accepts session
        action_res = await ac.patch(f"/api/v1/exchanges/{exchange_id}/action", json={
            "action": "accept"
        }, headers=headers_arjun)
        assert action_res.status_code == 200
        assert action_res.json()["status"] == "accepted"

        # Arjun marks session completed (awards XP!)
        complete_res = await ac.patch(f"/api/v1/exchanges/{exchange_id}/action", json={
            "action": "complete"
        }, headers=headers_arjun)
        assert complete_res.status_code == 200
        assert complete_res.json()["status"] == "completed"

        # Priya leaves review
        review_res = await ac.post(f"/api/v1/exchanges/{exchange_id}/review", json={
            "rating": 5,
            "comment": "Awesome mentor! Explained components super clearly.",
            "is_public": True
        }, headers=headers_priya)
        assert review_res.status_code == 200

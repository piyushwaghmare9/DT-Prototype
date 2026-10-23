from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.core.database import get_db
from app.core.utils import serialize_doc, serialize_docs, to_object_id
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/rewards", tags=["Rewards & Quests"])

# Static quest definitions (seeded to DB on startup)
QUEST_DEFINITIONS = [
    {"key": "first_exchange", "title": "First Exchange", "description": "Complete your first skill exchange", "xp": 100, "icon": "🎓"},
    {"key": "teach_peer", "title": "Knowledge Sharer", "description": "Teach a peer one useful concept", "xp": 75, "icon": "💡"},
    {"key": "share_resource", "title": "Resource Hero", "description": "List and lend a resource", "xp": 50, "icon": "📦"},
    {"key": "join_project", "title": "Team Builder", "description": "Join a project team", "xp": 80, "icon": "🚀"},
    {"key": "complete_onboarding", "title": "Campus Welcome", "description": "Complete your profile onboarding", "xp": 30, "icon": "🌟"},
    {"key": "five_exchanges", "title": "Consistent Contributor", "description": "Complete 5 exchanges total", "xp": 200, "icon": "🏆"},
]

BADGE_DEFINITIONS = [
    {"key": "first_exchange", "title": "First Exchange", "description": "Completed your first exchange", "icon": "🎓", "color": "#6C4CF1"},
    {"key": "mentor", "title": "Helpful Mentor", "description": "Taught 3 or more peers", "icon": "🧑‍🏫", "color": "#FF7968"},
    {"key": "knowledge_sharer", "title": "Knowledge Sharer", "description": "Created 5+ skill listings", "icon": "💡", "color": "#FFD76A"},
    {"key": "resource_hero", "title": "Resource Hero", "description": "Lent 3+ resources", "icon": "📦", "color": "#71C8F7"},
    {"key": "team_builder", "title": "Team Builder", "description": "Joined or created a project", "icon": "🚀", "color": "#C7F36B"},
    {"key": "connector", "title": "Campus Connector", "description": "Connected with 10+ students", "icon": "🕸️", "color": "#4F35C8"},
]


@router.get("/me")
async def get_my_rewards(current_user=Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])

    # Quest progress
    quest_progress = await db.quest_progress.find({"user_id": user_id}).to_list(20)
    quests_with_def = []
    for qdef in QUEST_DEFINITIONS:
        prog = next((q for q in quest_progress if q.get("quest_key") == qdef["key"]), None)
        quests_with_def.append({
            **qdef,
            "progress": prog.get("progress", 0) if prog else 0,
            "completed": prog.get("completed", False) if prog else False,
            "completed_at": prog.get("completed_at") if prog else None,
        })

    # Credit history
    transactions = await db.credit_transactions.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(20).to_list(20)

    # XP to next level (100 XP per level)
    xp = current_user.get("xp", 0)
    level = max(1, xp // 100 + 1)
    xp_in_level = xp % 100
    xp_to_next = 100 - xp_in_level

    return {
        "xp": xp,
        "level": level,
        "xp_in_level": xp_in_level,
        "xp_to_next_level": xp_to_next,
        "skill_credits": current_user.get("skill_credits", 0),
        "badges": current_user.get("badges", []),
        "completed_exchanges": current_user.get("completed_exchanges", 0),
        "quests": quests_with_def,
        "credit_transactions": serialize_docs(transactions),
        "all_badges": BADGE_DEFINITIONS,
    }


@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = Query(10, ge=1, le=50),
    current_user=Depends(get_current_user),
):
    db = get_db()
    users = await db.users.find(
        {"is_profile_public": True, "is_suspended": False},
        {"full_name": 1, "avatar_url": 1, "xp": 1, "level": 1, "department": 1, "badges": 1, "completed_exchanges": 1},
    ).sort("xp", -1).limit(limit).to_list(limit)

    leaderboard = []
    for i, u in enumerate(users):
        leaderboard.append({
            "rank": i + 1,
            "id": str(u["_id"]),
            "name": u.get("full_name"),
            "avatar": u.get("avatar_url"),
            "department": u.get("department"),
            "xp": u.get("xp", 0),
            "level": u.get("level", 1),
            "badge_count": len(u.get("badges", [])),
            "exchanges": u.get("completed_exchanges", 0),
        })
    return leaderboard


async def seed_quests(db):
    """Seed quest definitions to database on startup."""
    for qdef in QUEST_DEFINITIONS:
        await db.quests.update_one(
            {"key": qdef["key"]},
            {"$setOnInsert": {**qdef, "created_at": datetime.now(timezone.utc)}},
            upsert=True,
        )

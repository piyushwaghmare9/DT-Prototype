from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.core.database import get_db
from app.core.utils import serialize_docs

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/")
async def global_search(
    q: str = Query(..., min_length=2),
    current_user=Depends(get_current_user),
):
    """Global search across skills, resources, students, and projects."""
    db = get_db()
    results = {
        "skills": [],
        "resources": [],
        "students": [],
        "projects": [],
    }

    regex = {"$regex": q, "$options": "i"}

    # Skills
    skills = await db.skill_listings.find(
        {"status": "active", "$or": [{"title": regex}, {"description": regex}, {"category": regex}]}
    ).limit(5).to_list(5)
    results["skills"] = serialize_docs(skills)

    # Resources
    resources = await db.resources.find(
        {"status": "available", "$or": [{"title": regex}, {"description": regex}]}
    ).limit(5).to_list(5)
    results["resources"] = serialize_docs(resources)

    # Students
    users = await db.users.find(
        {
            "is_profile_public": True,
            "is_suspended": False,
            "$or": [{"full_name": regex}, {"bio": regex}, {"skills_offered.name": regex}],
        },
        {"full_name": 1, "department": 1, "avatar_url": 1, "skills_offered": 1, "xp": 1},
    ).limit(5).to_list(5)
    results["students"] = serialize_docs(users)

    # Projects
    projects = await db.projects.find(
        {"status": "active", "$or": [{"title": regex}, {"description": regex}]}
    ).limit(5).to_list(5)
    results["projects"] = serialize_docs(projects)

    total = sum(len(v) for v in results.values())
    return {"query": q, "total": total, "results": results}

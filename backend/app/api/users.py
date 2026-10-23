import re
from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.security import get_current_user
from app.core.database import get_db
from app.core.utils import serialize_doc, serialize_docs, to_object_id
from app.schemas.schemas import UpdateProfileRequest
from datetime import datetime, timezone
import logging

logger = logging.getLogger("app.api.users")

router = APIRouter(prefix="/users", tags=["Users"])


def safe_public_user(user: dict, is_self: bool = False) -> dict:
    """Return safe public user profile, strictly excluding password hash and sensitive secrets."""
    u = serialize_doc(user)
    if not u:
        return None
    u.pop("password_hash", None)
    u.pop("password", None)
    if not is_self:
        u.pop("email", None)
        u.pop("is_suspended", None)
    # Guarantee aliases for frontend consumption
    u["name"] = u.get("full_name") or "Student"
    u["year"] = u.get("academic_year") or ""
    u["profile_image"] = u.get("avatar_url")
    return u


@router.get("")
@router.get("/")
async def list_users(
    q: str = Query(None, description="Search by name, username, bio, department, or skill"),
    department: str = Query(None, description="Filter by department"),
    year: str = Query(None, description="Filter by academic year"),
    skill: str = Query(None, description="Filter by skill offered"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user=Depends(get_current_user),
):
    """List real registered students from MongoDB Atlas."""
    db = get_db()
    query: dict = {
        "is_suspended": {"$ne": True},
        "is_profile_public": {"$ne": False},
        "role": {"$ne": "admin"},  # Student directory
    }

    if department and department != "All":
        query["department"] = {"$regex": f"^{re.escape(department.strip())}$", "$options": "i"}

    if year and year != "All":
        digit_match = re.search(r"\d+", year)
        if digit_match:
            d = digit_match.group(0)
            query["academic_year"] = {"$regex": f"({d}.*year|year.*{d})", "$options": "i"}
        else:
            query["academic_year"] = {"$regex": re.escape(year.strip()), "$options": "i"}

    if skill:
        query["skills_offered.name"] = {"$regex": re.escape(skill.strip()), "$options": "i"}

    if q and q.strip():
        term = q.strip()
        query["$or"] = [
            {"full_name": {"$regex": term, "$options": "i"}},
            {"username": {"$regex": term, "$options": "i"}},
            {"bio": {"$regex": term, "$options": "i"}},
            {"department": {"$regex": term, "$options": "i"}},
            {"skills_offered.name": {"$regex": term, "$options": "i"}},
            {"skills_wanted": {"$elemMatch": {"$regex": term, "$options": "i"}}},
        ]

    try:
        total = await db.users.count_documents(query)
        users = (
            await db.users.find(query)
            .sort("created_at", -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
            .to_list(page_size)
        )
    except Exception as e:
        logger.error(f"[Users] Database query error in list_users: {type(e).__name__}")
        raise HTTPException(status_code=503, detail="Database connection error while retrieving users.")

    current_uid = str(current_user.get("_id", ""))
    items = [safe_public_user(u, is_self=(str(u.get("_id")) == current_uid)) for u in users]
    pages = (total + page_size - 1) // page_size if total > 0 else 1

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


@router.get("/me")
async def get_my_user(current_user=Depends(get_current_user)):
    """Retrieve currently authenticated student's profile."""
    return safe_public_user(current_user, is_self=True)


@router.put("/me")
async def update_my_user(
    payload: UpdateProfileRequest, current_user=Depends(get_current_user)
):
    """Update currently authenticated student's profile."""
    db = get_db()
    update_data = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)

    await db.users.update_one({"_id": current_user["_id"]}, {"$set": update_data})
    updated = await db.users.find_one({"_id": current_user["_id"]})

    if "skills_offered" in update_data:
        from app.api.skills import sync_user_skills_to_listings
        await sync_user_skills_to_listings(db, updated)

    return safe_public_user(updated, is_self=True)


@router.get("/{user_id}")
async def get_user_by_id(user_id: str, current_user=Depends(get_current_user)):
    """Retrieve public profile for a single student."""
    db = get_db()
    oid = to_object_id(user_id)
    if not oid:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="Student profile not found")

    if user.get("is_suspended", False) and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Account is suspended")

    is_self = str(user["_id"]) == str(current_user["_id"])
    return safe_public_user(user, is_self=is_self)

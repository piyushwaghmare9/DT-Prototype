from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.security import get_current_user, require_admin
from app.core.database import get_db
from app.core.utils import serialize_doc, serialize_docs, to_object_id
from app.schemas.schemas import UpdateProfileRequest
from datetime import datetime, timezone

router = APIRouter(prefix="/profiles", tags=["Profiles"])


def _safe_public_profile(user: dict) -> dict:
    """Strip private fields from public profile."""
    u = serialize_doc(user)
    u.pop("password_hash", None)
    u.pop("email", None)
    if not u.get("show_department"):
        u.pop("department", None)
    if not u.get("show_year"):
        u.pop("academic_year", None)
    return u


@router.get("/me")
async def get_my_profile(current_user=Depends(get_current_user)):
    u = serialize_doc(current_user)
    u.pop("password_hash", None)
    return u


@router.put("/me")
async def update_my_profile(
    payload: UpdateProfileRequest, current_user=Depends(get_current_user)
):
    db = get_db()
    update_data = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)

    await db.users.update_one(
        {"_id": current_user["_id"]}, {"$set": update_data}
    )
    updated = await db.users.find_one({"_id": current_user["_id"]})
    if "skills_offered" in update_data:
        from app.api.skills import sync_user_skills_to_listings
        await sync_user_skills_to_listings(db, updated)
    u = serialize_doc(updated)
    u.pop("password_hash", None)
    return u


@router.post("/me/onboarding")
async def update_onboarding(
    step: int,
    data: dict,
    current_user=Depends(get_current_user),
):
    db = get_db()
    valid_steps = {
        1: ["bio", "avatar_url"],
        2: ["department", "academic_year"],
        3: ["skills_offered"],
        4: ["skills_wanted"],
        5: ["interests", "languages", "availability"],
        6: ["avatar_url"],
        7: [],  # completion step
    }
    allowed = valid_steps.get(step, [])
    update_data = {k: v for k, v in data.items() if k in allowed or not allowed}
    update_data["onboarding_step"] = step
    if step == 7:
        update_data["onboarding_completed"] = True
    update_data["updated_at"] = datetime.now(timezone.utc)

    await db.users.update_one({"_id": current_user["_id"]}, {"$set": update_data})
    updated_user = await db.users.find_one({"_id": current_user["_id"]})

    if "skills_offered" in update_data or step == 7:
        from app.api.skills import sync_user_skills_to_listings
        await sync_user_skills_to_listings(db, updated_user)

    return {"message": f"Step {step} saved", "step": step}


@router.get("/{user_id}")
async def get_public_profile(user_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    oid = to_object_id(user_id)
    if not oid:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.get("is_profile_public") and str(user["_id"]) != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="This profile is private")

    return _safe_public_profile(user)


@router.get("/")
async def list_profiles(
    q: str = Query(None),
    department: str = Query(None),
    skill: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user=Depends(get_current_user),
):
    db = get_db()
    query = {"is_profile_public": True, "is_suspended": False}
    if department:
        query["department"] = department
    if skill:
        query["skills_offered.name"] = {"$regex": skill, "$options": "i"}
    if q:
        query["$or"] = [
            {"full_name": {"$regex": q, "$options": "i"}},
            {"bio": {"$regex": q, "$options": "i"}},
        ]

    total = await db.users.count_documents(query)
    users = (
        await db.users.find(query)
        .skip((page - 1) * page_size)
        .limit(page_size)
        .to_list(page_size)
    )

    return {
        "items": [_safe_public_profile(u) for u in users],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }

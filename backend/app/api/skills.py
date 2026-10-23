from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.security import get_current_user
from app.core.database import get_db
from app.core.utils import serialize_doc, serialize_docs, to_object_id
from app.schemas.schemas import SkillListingCreate, SkillListingUpdate
from bson import ObjectId
from datetime import datetime, timezone
import logging
import re

logger = logging.getLogger("app.api.skills")

router = APIRouter(prefix="/skills", tags=["Skills"])

CATEGORIES = [
    "Programming",
    "Web Development",
    "Data Structures & Algorithms",
    "AI & Machine Learning",
    "Design & UI/UX",
    "Academic Subjects",
    "Communication & Soft Skills",
    "Public Speaking",
    "Music & Creative Arts",
    "Career Guidance",
    "Mathematics",
    "Science",
    "Languages",
    "Other",
]


async def sync_user_skills_to_listings(db, user_doc):
    """Ensure any skill in user_doc['skills_offered'] has a corresponding active listing in db.skill_listings."""
    if not user_doc or not user_doc.get("_id"):
        return
    uid = str(user_doc["_id"])
    skills_offered = user_doc.get("skills_offered", [])
    now = datetime.now(timezone.utc)

    for s in skills_offered:
        skill_name = s.get("name") if isinstance(s, dict) else str(s)
        if not skill_name or not skill_name.strip():
            continue
        skill_name_clean = skill_name.strip()
        skill_level = (s.get("level") if isinstance(s, dict) else "Intermediate") or "Intermediate"
        skill_cat = (s.get("category") if isinstance(s, dict) else "Programming") or "Programming"

        # Check if listing already exists for this provider
        existing = await db.skill_listings.find_one({
            "$or": [{"provider_id": uid}, {"owner_id": uid}],
            "title": {"$regex": f"^{re.escape(skill_name_clean)}$", "$options": "i"},
        })
        if not existing:
            doc = {
                "title": skill_name_clean,
                "description": f"Learn {skill_name_clean} with {user_doc.get('full_name', 'Student')}. Interactive peer mentorship session tailored to your learning goals.",
                "category": skill_cat if skill_cat in CATEGORIES else "Programming",
                "skill_level": skill_level if skill_level in ["Beginner", "Intermediate", "Advanced", "Expert"] else "Intermediate",
                "session_duration_minutes": 60,
                "preferred_language": user_doc.get("languages", ["English"])[0] if user_doc.get("languages") else "English",
                "session_format": "Hybrid",
                "tags": [skill_name_clean.lower().replace(" ", "_"), skill_cat.lower()],
                "provider_id": uid,
                "provider_name": user_doc.get("full_name", "Student"),
                "provider_avatar": user_doc.get("avatar_url"),
                "provider_department": user_doc.get("department", ""),
                "owner_id": uid,
                "owner_name": user_doc.get("full_name", "Student"),
                "owner_avatar": user_doc.get("avatar_url"),
                "owner_department": user_doc.get("department", ""),
                "status": "active",
                "views": 0,
                "request_count": 0,
                "rating": None,
                "review_count": 0,
                "created_at": now,
                "updated_at": now,
            }
            await db.skill_listings.insert_one(doc)


async def sync_all_registered_skills(db):
    """Scan all registered users in MongoDB Atlas and guarantee their skills are listed."""
    try:
        users = await db.users.find({
            "is_suspended": {"$ne": True},
            "skills_offered": {"$exists": True, "$ne": []},
        }).to_list(200)
        for u in users:
            await sync_user_skills_to_listings(db, u)
    except Exception as e:
        logger.warning(f"[Skills] Error synchronizing registered skills: {e}")


@router.get("/categories")
async def get_categories():
    return {"categories": CATEGORIES}


@router.post("", status_code=201)
@router.post("/", status_code=201)
@router.post("/listings", status_code=201)
async def create_listing(
    payload: SkillListingCreate, current_user=Depends(get_current_user)
):
    db = get_db()
    now = datetime.now(timezone.utc)
    uid = str(current_user["_id"])
    doc = {
        **payload.dict(),
        "provider_id": uid,
        "provider_name": current_user.get("full_name", "Student"),
        "provider_avatar": current_user.get("avatar_url"),
        "provider_department": current_user.get("department", ""),
        "owner_id": uid,
        "owner_name": current_user.get("full_name", "Student"),
        "owner_avatar": current_user.get("avatar_url"),
        "owner_department": current_user.get("department", ""),
        "status": "active",
        "views": 0,
        "request_count": 0,
        "rating": None,
        "review_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.skill_listings.insert_one(doc)
    doc["_id"] = result.inserted_id
    doc["id"] = str(result.inserted_id)

    # Synchronize into user's skills_offered profile array
    try:
        await db.users.update_one(
            {"_id": current_user["_id"], "skills_offered.name": {"$ne": payload.title}},
            {
                "$push": {
                    "skills_offered": {
                        "name": payload.title,
                        "level": payload.skill_level,
                        "category": payload.category,
                    }
                }
            },
        )
    except Exception as ue:
        logger.warning(f"[Skills] Could not update user skills_offered: {ue}")

    s_doc = serialize_doc(doc)
    s_doc["skill_name"] = s_doc.get("title")
    s_doc["name"] = s_doc.get("title")
    s_doc["level"] = s_doc.get("skill_level")
    s_doc["proficiency_level"] = s_doc.get("skill_level")
    s_doc["profile_image"] = s_doc.get("provider_avatar")
    return s_doc


@router.get("")
@router.get("/")
@router.get("/listings")
async def list_listings(
    q: str = Query(None),
    category: str = Query(None),
    level: str = Query(None),
    language: str = Query(None),
    format: str = Query(None),
    sort: str = Query("recent"),  # recent | rating | requests
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user=Depends(get_current_user),
):
    db = get_db()
    query = {"status": "active"}
    if category and category != "All":
        query["category"] = category
    if level and level != "All":
        query["skill_level"] = level
    if language:
        query["preferred_language"] = {"$regex": language, "$options": "i"}
    if format:
        query["session_format"] = format
    if q and q.strip():
        term = q.strip()
        query["$or"] = [
            {"title": {"$regex": term, "$options": "i"}},
            {"description": {"$regex": term, "$options": "i"}},
            {"category": {"$regex": term, "$options": "i"}},
            {"tags": {"$elemMatch": {"$regex": term, "$options": "i"}}},
        ]

    sort_map = {
        "recent": [("created_at", -1)],
        "rating": [("rating", -1)],
        "requests": [("request_count", -1)],
    }
    sort_order = sort_map.get(sort, [("created_at", -1)])

    total = await db.skill_listings.count_documents(query)
    listings = (
        await db.skill_listings.find(query)
        .sort(sort_order)
        .skip((page - 1) * page_size)
        .limit(page_size)
        .to_list(page_size)
    )

    # Populate current owner information from MongoDB Atlas users collection
    serialized = []
    for item in listings:
        s_item = serialize_doc(item)
        pid = s_item.get("provider_id") or s_item.get("owner_id")
        owner_suspended = False
        if pid:
            oid = to_object_id(pid)
            if oid:
                try:
                    owner = await db.users.find_one(
                        {"_id": oid},
                        {"full_name": 1, "avatar_url": 1, "department": 1, "academic_year": 1, "is_suspended": 1}
                    )
                    if owner:
                        if owner.get("is_suspended", False):
                            owner_suspended = True
                        name = owner.get("full_name") or s_item.get("provider_name") or "Student"
                        avatar = owner.get("avatar_url") or s_item.get("provider_avatar")
                        dept = owner.get("department") or s_item.get("provider_department")
                        s_item["provider_name"] = name
                        s_item["owner_name"] = name
                        s_item["provider_avatar"] = avatar
                        s_item["owner_avatar"] = avatar
                        s_item["provider_department"] = dept
                        s_item["owner_department"] = dept
                except Exception:
                    pass

        if owner_suspended and current_user.get("role") != "admin":
            continue

        # Guarantee field aliases for all clients
        if not s_item.get("owner_id"):
            s_item["owner_id"] = s_item.get("provider_id")
        if not s_item.get("provider_id"):
            s_item["provider_id"] = s_item.get("owner_id")
        if not s_item.get("owner_name"):
            s_item["owner_name"] = s_item.get("provider_name") or "Student"
        if not s_item.get("provider_name"):
            s_item["provider_name"] = s_item.get("owner_name")
        s_item["skill_name"] = s_item.get("title")
        s_item["name"] = s_item.get("title")
        s_item["level"] = s_item.get("skill_level")
        s_item["proficiency_level"] = s_item.get("skill_level")
        s_item["profile_image"] = s_item.get("provider_avatar") or s_item.get("owner_avatar")

        serialized.append(s_item)

    return {
        "items": serialized,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total > 0 else 1,
    }


@router.get("/listings/my")
@router.get("/my")
async def my_listings(current_user=Depends(get_current_user)):
    db = get_db()
    uid = str(current_user["_id"])
    listings = await db.skill_listings.find(
        {"$or": [{"provider_id": uid}, {"owner_id": uid}]}
    ).sort("created_at", -1).to_list(100)
    return serialize_docs(listings)


@router.get("/{listing_id}")
@router.get("/listings/{listing_id}")
async def get_listing(listing_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    oid = to_object_id(listing_id)
    if not oid:
        raise HTTPException(status_code=400, detail="Invalid listing ID")

    listing = await db.skill_listings.find_one({"_id": oid})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    # Increment view count
    await db.skill_listings.update_one({"_id": oid}, {"$inc": {"views": 1}})

    s_item = serialize_doc(listing)
    pid = s_item.get("provider_id") or s_item.get("owner_id")
    if pid:
        o_oid = to_object_id(pid)
        if o_oid:
            owner = await db.users.find_one({"_id": o_oid}, {"full_name": 1, "avatar_url": 1, "department": 1})
            if owner:
                s_item["provider_name"] = owner.get("full_name", s_item.get("provider_name"))
                s_item["owner_name"] = s_item["provider_name"]
                s_item["provider_avatar"] = owner.get("avatar_url", s_item.get("provider_avatar"))
                s_item["owner_avatar"] = s_item["provider_avatar"]

    return s_item


@router.put("/{listing_id}")
@router.put("/listings/{listing_id}")
async def update_listing(
    listing_id: str,
    payload: SkillListingUpdate,
    current_user=Depends(get_current_user),
):
    db = get_db()
    oid = to_object_id(listing_id)
    if not oid:
        raise HTTPException(status_code=400, detail="Invalid listing ID")

    listing = await db.skill_listings.find_one({"_id": oid})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    uid = str(current_user["_id"])
    if listing.get("provider_id") != uid and listing.get("owner_id") != uid and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your listing")

    update_data = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.skill_listings.update_one({"_id": oid}, {"$set": update_data})
    updated = await db.skill_listings.find_one({"_id": oid})
    return serialize_doc(updated)


@router.delete("/{listing_id}", status_code=204)
@router.delete("/listings/{listing_id}", status_code=204)
async def delete_listing(listing_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    oid = to_object_id(listing_id)
    if not oid:
        raise HTTPException(status_code=400, detail="Invalid listing ID")

    listing = await db.skill_listings.find_one({"_id": oid})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    uid = str(current_user["_id"])
    if listing.get("provider_id") != uid and listing.get("owner_id") != uid and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.skill_listings.delete_one({"_id": oid})
    return None


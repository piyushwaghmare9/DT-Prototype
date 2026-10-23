from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.security import require_admin, get_current_user
from app.core.database import get_db
from app.core.utils import serialize_doc, serialize_docs, to_object_id
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/admin", tags=["Administration"])


@router.get("/stats")
async def get_stats(admin=Depends(require_admin)):
    db = get_db()
    return {
        "users": {
            "total": await db.users.count_documents({}),
            "verified": await db.users.count_documents({"is_verified": True}),
            "suspended": await db.users.count_documents({"is_suspended": True}),
        },
        "listings": {
            "skills": await db.skill_listings.count_documents({}),
            "active_skills": await db.skill_listings.count_documents({"status": "active"}),
            "resources": await db.resources.count_documents({}),
            "available_resources": await db.resources.count_documents({"status": "available"}),
        },
        "exchanges": {
            "total": await db.exchange_requests.count_documents({}),
            "completed": await db.exchange_requests.count_documents({"status": "completed"}),
            "pending": await db.exchange_requests.count_documents({"status": "pending"}),
        },
        "projects": {
            "total": await db.projects.count_documents({}),
            "active": await db.projects.count_documents({"status": "active"}),
        },
        "reports": {
            "total": await db.reports.count_documents({}),
            "pending": await db.reports.count_documents({"status": "pending"}),
        },
    }


@router.get("/users")
async def list_users(
    q: str = Query(None),
    role: str = Query(None),
    is_suspended: bool = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    admin=Depends(require_admin),
):
    db = get_db()
    query = {}
    if role:
        query["role"] = role
    if is_suspended is not None:
        query["is_suspended"] = is_suspended
    if q:
        query["$or"] = [
            {"full_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]

    total = await db.users.count_documents(query)
    users = await db.users.find(query, {"password_hash": 0}).sort("created_at", -1).skip(
        (page - 1) * page_size
    ).limit(page_size).to_list(page_size)

    return {
        "items": serialize_docs(users),
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.post("/users/{user_id}/suspend")
async def suspend_user(user_id: str, admin=Depends(require_admin)):
    db = get_db()
    oid = to_object_id(user_id)
    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot suspend admin")

    await db.users.update_one({"_id": oid}, {"$set": {"is_suspended": True}})
    # Log action
    await db.admin_audit.insert_one({
        "action": "suspend_user",
        "target_id": user_id,
        "performed_by": str(admin["_id"]),
        "timestamp": datetime.now(timezone.utc),
    })
    return {"message": "User suspended"}


@router.post("/users/{user_id}/restore")
async def restore_user(user_id: str, admin=Depends(require_admin)):
    db = get_db()
    oid = to_object_id(user_id)
    await db.users.update_one({"_id": oid}, {"$set": {"is_suspended": False}})
    await db.admin_audit.insert_one({
        "action": "restore_user",
        "target_id": user_id,
        "performed_by": str(admin["_id"]),
        "timestamp": datetime.now(timezone.utc),
    })
    return {"message": "User restored"}


@router.post("/users/{user_id}/verify")
async def verify_user(user_id: str, admin=Depends(require_admin)):
    db = get_db()
    oid = to_object_id(user_id)
    await db.users.update_one({"_id": oid}, {"$set": {"is_verified": True}})
    return {"message": "User verified"}


@router.post("/users/{user_id}/make-admin")
async def make_admin(user_id: str, admin=Depends(require_admin)):
    db = get_db()
    oid = to_object_id(user_id)
    await db.users.update_one({"_id": oid}, {"$set": {"role": "admin"}})
    await db.admin_audit.insert_one({
        "action": "make_admin",
        "target_id": user_id,
        "performed_by": str(admin["_id"]),
        "timestamp": datetime.now(timezone.utc),
    })
    return {"message": "User promoted to admin"}


@router.get("/reports")
async def list_reports(
    status: str = Query("pending"),
    admin=Depends(require_admin),
):
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    reports = await db.reports.find(query).sort("created_at", -1).to_list(50)
    return serialize_docs(reports)


@router.post("/reports/{report_id}/resolve")
async def resolve_report(report_id: str, admin=Depends(require_admin)):
    db = get_db()
    oid = to_object_id(report_id)
    await db.reports.update_one(
        {"_id": oid},
        {"$set": {"status": "resolved", "resolved_by": str(admin["_id"]), "resolved_at": datetime.now(timezone.utc)}},
    )
    return {"message": "Report resolved"}


@router.delete("/listings/skill/{listing_id}")
async def remove_skill_listing(listing_id: str, admin=Depends(require_admin)):
    db = get_db()
    oid = to_object_id(listing_id)
    await db.skill_listings.delete_one({"_id": oid})
    await db.admin_audit.insert_one({
        "action": "delete_skill_listing",
        "target_id": listing_id,
        "performed_by": str(admin["_id"]),
        "timestamp": datetime.now(timezone.utc),
    })
    return {"message": "Listing removed"}
